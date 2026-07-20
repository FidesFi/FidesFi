import { createPublicClient, decodeEventLog, http, formatUnits } from "viem";

// RHC testnet (46630). Public RPC works with VPN; override with RHC_TESTNET_RPC (e.g. Alchemy) in prod.
const RPC = process.env.RHC_TESTNET_RPC ?? "https://rpc.testnet.chain.robinhood.com";
export const VAULT_ADDRESS = "0x1Fb3f8c9569bd45D1D7b9417Cb7aDa64D7552A94" as const;

const rhcTestnet = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
} as const;

const client = createPublicClient({ chain: rhcTestnet, transport: http(RPC) });

const vaultAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "nav", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isFullyBacked", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "assets", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
] as const;

const erc20Abi = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type Holding = { symbol: string; balance: number };
export type VaultData = {
  name: string;
  symbol: string;
  navUsd: number;
  navPerShare: number;
  supply: number;
  fullyBacked: boolean;
  holdings: Holding[];
} | null;

export async function getVaultData(): Promise<VaultData> {
  try {
    const read = <T,>(functionName: (typeof vaultAbi)[number]["name"]) =>
      client.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName }) as Promise<T>;

    const [name, symbol, nav, supply, backed, assets] = await Promise.all([
      read<string>("name"),
      read<string>("symbol"),
      read<bigint>("nav"),
      read<bigint>("totalSupply"),
      read<boolean>("isFullyBacked"),
      read<readonly `0x${string}`[]>("assets"),
    ]);

    const holdings = await Promise.all(
      assets.map(async (a): Promise<Holding> => {
        const [sym, bal] = await Promise.all([
          client.readContract({ address: a, abi: erc20Abi, functionName: "symbol" }) as Promise<string>,
          client.readContract({
            address: a,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [VAULT_ADDRESS],
          }) as Promise<bigint>,
        ]);
        return { symbol: sym, balance: Number(formatUnits(bal, 18)) };
      }),
    );

    const navUsd = Number(formatUnits(nav, 18));
    const supplyN = Number(formatUnits(supply, 18));
    return {
      name,
      symbol,
      navUsd,
      supply: supplyN,
      navPerShare: supplyN > 0 ? navUsd / supplyN : 0,
      fullyBacked: backed,
      holdings,
    };
  } catch {
    return null; // graceful: page renders without the live panel if the RPC is unreachable
  }
}

/* ---------- latest rebalance, read from the on-chain event ---------- */

const rebalancedEvent = {
  type: "event",
  name: "Rebalanced",
  inputs: [
    { name: "by", type: "address", indexed: true },
    { name: "rationale", type: "bytes32", indexed: false },
    { name: "navBefore", type: "uint256", indexed: false },
    { name: "navAfter", type: "uint256", indexed: false },
  ],
} as const;

// keccak256("Rebalanced(address,bytes32,uint256,uint256)") — topic0 for the receipt-scan fallback
const REBALANCED_TOPIC = "0xcf986d19c22854be6987b1926a0867c513f4b216f16c38b5fc864c783c7030b9";

// the vault came online just before its first rebalance; scanning from here keeps
// the getLogs range bounded while still catching every rebalance, past and future.
const REBALANCE_SCAN_FROM = 91_000_000n;

// The public RHC RPC allows full-range eth_getLogs; the Alchemy endpoint we use for
// contract reads caps it at a 10-block range on the free tier. So we scan the event on
// the public RPC, and fall back to reading a known rebalance tx's receipt on the main
// RPC (getTransactionReceipt has no range limit). Either path reads values live off-chain.
const PUBLIC_RPC = "https://rpc.testnet.chain.robinhood.com";
const publicClient = createPublicClient({ chain: rhcTestnet, transport: http(PUBLIC_RPC, { timeout: 5_000 }) });

// pointer to the newest known rebalance, used only by the fallback path; the agent bumps
// this (env override) after each run. The displayed values are still read live from chain.
const KNOWN_REBALANCE_TX = (process.env.LATEST_REBALANCE_TX ??
  "0xea6f2f353ba787548507dd6d899672f51b2da9eba600da3a67490f1fc13ec49e") as `0x${string}`;

export type LatestRebalance = {
  by: `0x${string}`;
  rationale: `0x${string}`; // bytes32 keccak commitment of the agent's note — tamper-proof, not human text
  navBefore: number;
  navAfter: number;
  txHash: `0x${string}`;
  timestamp: number; // unix seconds
} | null;

async function toRebalance(
  rpc: typeof client,
  args: { by?: `0x${string}`; rationale?: `0x${string}`; navBefore?: bigint; navAfter?: bigint },
  txHash: `0x${string}`,
  blockNumber: bigint,
): Promise<LatestRebalance> {
  const { by, rationale, navBefore, navAfter } = args;
  if (by === undefined || rationale === undefined || navBefore === undefined || navAfter === undefined) return null;
  const block = await rpc.getBlock({ blockNumber });
  return {
    by,
    rationale,
    navBefore: Number(formatUnits(navBefore, 18)),
    navAfter: Number(formatUnits(navAfter, 18)),
    txHash,
    timestamp: Number(block.timestamp),
  };
}

export async function getLatestRebalance(): Promise<LatestRebalance> {
  // 1) preferred: scan the event on the public RPC (truly dynamic, full range)
  try {
    const logs = await publicClient.getLogs({
      address: VAULT_ADDRESS,
      event: rebalancedEvent,
      fromBlock: REBALANCE_SCAN_FROM,
      toBlock: "latest",
    });
    if (logs.length > 0) {
      const last = logs[logs.length - 1]; // ascending — the last one is newest
      const r = await toRebalance(publicClient, last.args, last.transactionHash, last.blockNumber);
      if (r) return r;
    }
  } catch {
    // fall through to the receipt path
  }

  // 2) fallback: decode the known rebalance tx's receipt on the main RPC (no range limit)
  try {
    const receipt = await client.getTransactionReceipt({ hash: KNOWN_REBALANCE_TX });
    const log = receipt.logs.find(
      (l) => l.address.toLowerCase() === VAULT_ADDRESS.toLowerCase() && l.topics[0] === REBALANCED_TOPIC,
    );
    if (!log) return null;
    const decoded = decodeEventLog({ abi: [rebalancedEvent], data: log.data, topics: log.topics });
    return await toRebalance(client, decoded.args, KNOWN_REBALANCE_TX, receipt.blockNumber);
  } catch {
    return null; // graceful: the card falls back to a static explorer link
  }
}
