import { createPublicClient, http, formatUnits } from "viem";

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
