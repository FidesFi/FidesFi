"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatUnits,
  parseUnits,
  type Address,
  type EIP1193Provider,
} from "viem";
import { Logo } from "../components/Logo";
import {
  CHAIN_ID,
  CHAIN_ID_HEX,
  EXPLORER,
  VAULT_ADDRESS,
  addChainParams,
  erc20Abi,
  redeemPayout,
  requiredDeposit,
  rhcTestnet,
  vaultAbi,
} from "../lib/appchain";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

type AssetRow = {
  address: Address;
  symbol: string;
  unit: bigint;
  wallet: bigint;
  allowance: bigint;
};

type VaultState = {
  assets: AssetRow[];
  nav: bigint;
  supply: bigint;
  supplyCap: bigint;
  fullyBacked: boolean;
  mintPaused: boolean;
  mintFeeBps: number;
  shares: bigint; // user's index-token balance
};

type TxItem = { label: string; hash: string; status: "pending" | "ok" | "fail" };

const fmt = (v: bigint, dp = 4) =>
  Number(formatUnits(v, 18)).toLocaleString("en-US", { maximumFractionDigits: dp });

export function AppClient() {
  const [account, setAccount] = useState<Address | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [vault, setVault] = useState<VaultState | null>(null);
  const [tab, setTab] = useState<"mint" | "redeem">("mint");
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState<string | null>(null);
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loadStale, setLoadStale] = useState(false);

  const eth = typeof window !== "undefined" ? window.ethereum : undefined;

  // Reads go through our same-origin proxy (-> Alchemy server-side): reliable regardless of the
  // wallet's own RPC config, no CORS, key never reaches the browser. The wallet only signs.
  const pub = useMemo(() => createPublicClient({ chain: rhcTestnet, transport: http("/api/rpc") }), []);
  const wallet = useMemo(
    () => (eth ? createWalletClient({ chain: rhcTestnet, transport: custom(eth) }) : null),
    [eth],
  );

  /* ---------- connection & chain ---------- */

  const refreshChain = useCallback(async () => {
    if (!eth) return;
    const id = (await eth.request({ method: "eth_chainId" })) as string;
    setChainOk(parseInt(id, 16) === CHAIN_ID);
  }, [eth]);

  const connect = useCallback(async () => {
    if (!eth) return;
    setErr(null);
    try {
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (accs[0]) setAccount(accs[0] as Address);
      await refreshChain();
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [eth, refreshChain]);

  const switchChain = useCallback(async () => {
    if (!eth) return;
    setErr(null);
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch {
      // unknown chain → offer to add it
      try {
        await eth.request({ method: "wallet_addEthereumChain", params: [addChainParams] });
      } catch (e2) {
        setErr((e2 as Error).message);
      }
    }
    await refreshChain();
  }, [eth, refreshChain]);

  /* ---------- data ---------- */

  const load = useCallback(async (attempt = 0) => {
    if (!pub || !account || !chainOk) return;
    try {
      const [assets, units, nav, supply, cap, backed, paused, feeBps, shares] = await Promise.all([
        pub.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "assets" }),
        pub.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "units" }),
        pub.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "nav" }),
        pub.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "totalSupply" }),
        pub.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "supplyCap" }),
        pub.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "isFullyBacked" }),
        pub.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "mintPaused" }),
        pub.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "mintFeeBps" }),
        pub.readContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "balanceOf", args: [account] }),
      ]);
      const rows = await Promise.all(
        (assets as readonly Address[]).map(async (a, i): Promise<AssetRow> => {
          const [symbol, bal, allo] = await Promise.all([
            pub.readContract({ address: a, abi: erc20Abi, functionName: "symbol" }),
            pub.readContract({ address: a, abi: erc20Abi, functionName: "balanceOf", args: [account] }),
            pub.readContract({ address: a, abi: erc20Abi, functionName: "allowance", args: [account, VAULT_ADDRESS] }),
          ]);
          return { address: a, symbol: symbol as string, unit: (units as readonly bigint[])[i], wallet: bal as bigint, allowance: allo as bigint };
        }),
      );
      setVault({
        assets: rows,
        nav: nav as bigint,
        supply: supply as bigint,
        supplyCap: cap as bigint,
        fullyBacked: backed as boolean,
        mintPaused: paused as boolean,
        mintFeeBps: Number(feeBps),
        shares: shares as bigint,
      });
      setLoadStale(false);
    } catch {
      // background read hiccup (RPC blip): retry quietly, never paint a scary tx-style error
      if (attempt < 3) {
        setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
      } else {
        setLoadStale(true);
      }
    }
  }, [pub, account, chainOk]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!eth) return;
    const onAccounts = (accs: unknown) => setAccount(((accs as string[])[0] as Address) ?? null);
    const onChain = () => refreshChain();
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [eth, refreshChain]);

  /* ---------- amounts ---------- */

  const shares = useMemo(() => {
    try {
      const v = parseUnits((amount || "0").replace(",", "."), 18);
      return v > 0n ? v : 0n;
    } catch {
      return 0n;
    }
  }, [amount]);

  const mintRows = useMemo(
    () =>
      vault?.assets.map((a) => {
        const need = requiredDeposit(shares, a.unit);
        return { ...a, need, enough: a.wallet >= need, approved: a.allowance >= need };
      }) ?? [],
    [vault, shares],
  );
  const allEnough = mintRows.every((r) => r.enough);
  const allApproved = mintRows.every((r) => r.approved);
  const feeShares = vault ? (shares * BigInt(vault.mintFeeBps)) / 10_000n : 0n;

  /* ---------- txs ---------- */

  const sendTx = useCallback(
    async (label: string, fn: () => Promise<`0x${string}`>) => {
      if (!pub) return;
      setBusy(label);
      setErr(null);
      try {
        const hash = await fn();
        setTxs((t) => [{ label, hash, status: "pending" as const }, ...t].slice(0, 6));
        const rcpt = await pub.waitForTransactionReceipt({ hash });
        setTxs((t) => t.map((x) => (x.hash === hash ? { ...x, status: rcpt.status === "success" ? "ok" : "fail" } : x)));
        await load();
      } catch (e) {
        setErr((e as Error).message.split("\n")[0]);
      } finally {
        setBusy(null);
      }
    },
    [pub, load],
  );

  const approve = (row: AssetRow & { need: bigint }) =>
    sendTx(`Approve ${row.symbol}`, () =>
      wallet!.writeContract({
        address: row.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [VAULT_ADDRESS, row.need],
        account: account!,
        chain: rhcTestnet,
      }),
    );

  const doMint = () =>
    sendTx(`Mint ${fmt(shares)} `, () =>
      wallet!.writeContract({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "mint",
        args: [shares, account!],
        account: account!,
        chain: rhcTestnet,
      }),
    );

  const doRedeem = () =>
    sendTx(`Redeem ${fmt(shares)} `, () =>
      wallet!.writeContract({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "redeem",
        args: [shares, account!],
        account: account!,
        chain: rhcTestnet,
      }),
    );

  /* ---------- ui ---------- */

  const pill =
    "rounded-full bg-ink px-5 py-2.5 font-display text-[14px] font-medium text-canvas transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0";

  if (!eth)
    return (
      <Gate title="No wallet detected">
        This app talks to Robinhood Chain testnet through your wallet. Install MetaMask (or any
        EIP-1193 wallet), then reload.
      </Gate>
    );

  if (!account)
    return (
      <Gate title="Connect to launch">
        Connect a wallet to mint and redeem the live testnet index. Testnet only — nothing here has
        mainnet value.
        <button onClick={connect} className={`${pill} mt-6`}>
          Connect wallet
        </button>
        {err && <ErrLine msg={err} />}
      </Gate>
    );

  if (!chainOk)
    return (
      <Gate title="Wrong network">
        This vault lives on Robinhood Chain <b>testnet</b> (chain 46630). Switch — or let your
        wallet add it.
        <button onClick={switchChain} className={`${pill} mt-6`}>
          Switch to RHC testnet
        </button>
        {err && <ErrLine msg={err} />}
      </Gate>
    );

  return (
    <div className="mx-auto max-w-[880px] px-6 pb-24">
      {/* vault header */}
      <div className="mb-6 rounded-3xl border border-hair bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
            </span>
            <span className="font-display text-[16px] font-semibold">Fides Frontier · testnet</span>
          </div>
          <a
            href={`${EXPLORER}/address/${VAULT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[12px] text-green-deep"
          >
            {VAULT_ADDRESS.slice(0, 6)}…{VAULT_ADDRESS.slice(-4)} ↗
          </a>
        </div>
        {vault && (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Your index tokens" value={fmt(vault.shares)} />
            <Metric label="NAV / token" value={vault.supply > 0n ? `$${fmt((vault.nav * 10n ** 18n) / vault.supply, 2)}` : "—"} />
            <Metric label="Total supply" value={fmt(vault.supply)} />
            <Metric label="Backing" value={vault.fullyBacked ? "Fully backed ✓" : "—"} good={vault.fullyBacked} />
          </div>
        )}
        {loadStale && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#c98a2b]/30 bg-[#c98a2b]/[0.06] px-3.5 py-2 font-mono text-[12px] text-[#9a6a1f]">
            <span>network hiccup — figures may be stale</span>
            <button onClick={() => load()} className="rounded-md border border-[#9a6a1f]/30 px-2.5 py-1 transition-colors hover:border-[#9a6a1f]/60">
              refresh
            </button>
          </div>
        )}
      </div>

      {/* action card */}
      <div className="rounded-3xl border border-hair bg-white p-6">
        <div className="mb-5 flex gap-1 rounded-full border border-hair bg-canvas p-1 font-display text-[14px] font-medium">
          {(["mint", "redeem"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-4 py-2 capitalize transition-colors ${
                tab === t ? "bg-ink text-canvas" : "text-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          Index tokens to {tab}
        </label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="1.0"
          className="w-full rounded-2xl border border-hair bg-canvas px-4 py-3 font-mono text-[20px] tnum outline-none transition-colors focus:border-green"
        />

        {vault && shares > 0n && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-hair">
            <div className="border-b border-hair bg-canvas px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {tab === "mint" ? "You deposit (rounded up, in the vault's favor)" : "You receive (rounded down)"}
            </div>
            {(tab === "mint" ? mintRows : vault.assets).map((a) => {
              const row = a as AssetRow & { need?: bigint; enough?: boolean; approved?: boolean };
              const amt = tab === "mint" ? row.need! : redeemPayout(shares, a.unit);
              return (
                <div key={a.address} className="flex items-center justify-between border-b border-hair/60 px-4 py-3 last:border-0">
                  <span className="font-mono text-[13px]">{a.symbol}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[13.5px] tnum">{fmt(amt, 6)}</span>
                    {tab === "mint" &&
                      (!row.enough ? (
                        <span className="rounded-md bg-[#a23b2f]/10 px-2 py-0.5 font-mono text-[10.5px] text-[#a23b2f]">
                          insufficient
                        </span>
                      ) : row.approved ? (
                        <span className="rounded-md bg-green/10 px-2 py-0.5 font-mono text-[10.5px] text-green-deep">
                          approved
                        </span>
                      ) : (
                        <button
                          onClick={() => approve(row as AssetRow & { need: bigint })}
                          disabled={busy !== null}
                          className="rounded-md border border-ink/20 px-2.5 py-1 font-mono text-[10.5px] transition-colors hover:border-ink/50 disabled:opacity-40"
                        >
                          {busy === `Approve ${a.symbol}` ? "approving…" : "approve"}
                        </button>
                      ))}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {tab === "mint" && vault && shares > 0n && feeShares > 0n && (
          <p className="mt-3 font-mono text-[12px] text-muted">
            mint fee {vault.mintFeeBps / 100}% → you receive {fmt(shares - feeShares)} index tokens
          </p>
        )}
        {tab === "redeem" && vault && (
          <p className="mt-3 font-mono text-[12px] text-muted">
            balance: {fmt(vault.shares)} — redemption is always on; no admin can pause it
          </p>
        )}

        <div className="mt-5">
          {tab === "mint" ? (
            <button
              onClick={doMint}
              disabled={busy !== null || shares === 0n || !allEnough || !allApproved || vault?.mintPaused}
              className={`${pill} w-full`}
            >
              {vault?.mintPaused
                ? "Minting is paused"
                : busy?.startsWith("Mint")
                  ? "Minting…"
                  : !allEnough
                    ? "Insufficient basket balance"
                    : !allApproved
                      ? "Approve all assets first"
                      : "Mint"}
            </button>
          ) : (
            <button
              onClick={doRedeem}
              disabled={busy !== null || shares === 0n || (vault ? shares > vault.shares : true)}
              className={`${pill} w-full`}
            >
              {busy?.startsWith("Redeem") ? "Redeeming…" : vault && shares > vault.shares ? "Exceeds balance" : "Redeem in-kind"}
            </button>
          )}
        </div>

        {err && <ErrLine msg={err} />}

        {tab === "mint" && (
          <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
            Need testnet stocks? They come from the Robinhood testnet faucet (5 of each). This is
            testnet — tokens carry no value.
          </p>
        )}
      </div>

      {/* tx log */}
      {txs.length > 0 && (
        <div className="mt-6 rounded-3xl border border-hair bg-white p-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Recent transactions</p>
          {txs.map((t) => (
            <a
              key={t.hash}
              href={`${EXPLORER}/tx/${t.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border-b border-hair/60 py-2.5 font-mono text-[12.5px] last:border-0"
            >
              <span>{t.label}</span>
              <span
                className={
                  t.status === "ok" ? "text-green-deep" : t.status === "fail" ? "text-[#a23b2f]" : "text-muted"
                }
              >
                {t.status === "pending" ? "pending…" : t.status === "ok" ? "confirmed ✓" : "failed ✕"}{" "}
                {t.hash.slice(0, 8)}… ↗
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- little pieces ---------- */

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={`mt-1 font-mono text-[18px] font-medium tnum ${good ? "text-green-deep" : ""}`}>{value}</div>
    </div>
  );
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[560px] px-6 pb-24">
      <div className="rounded-3xl border border-hair bg-white p-8 text-center">
        <Logo className="mx-auto h-8 w-auto" />
        <h1 className="mt-4 font-display text-[24px] font-semibold tracking-tight">{title}</h1>
        <div className="mt-3 text-[14.5px] leading-relaxed text-muted">{children}</div>
      </div>
    </div>
  );
}

function ErrLine({ msg }: { msg: string }) {
  return (
    <p className="mt-3 break-words rounded-xl bg-[#a23b2f]/[0.06] px-3 py-2 font-mono text-[12px] text-[#a23b2f]">
      {msg}
    </p>
  );
}
