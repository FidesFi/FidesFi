import type { Metadata } from "next";
import { Logo } from "../components/Logo";
import { EXPLORER, VAULT_ADDRESS } from "../lib/appchain";
import { getAgentData } from "../lib/vault";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fides Agent — the rebalancer on the record",
  description:
    "The autonomous rebalancer that manages the Fides index: its live status, every rebalance on-chain, and the guardrails it can never step outside.",
};

const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

function timeAgo(ts: number): string {
  if (!ts) return "—";
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 90) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AgentPage() {
  const a = await getAgentData();

  return (
    <div className="min-h-screen text-ink">
      {/* top bar */}
      <div className="sticky top-0 z-40 border-b border-hair bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between px-4 py-3.5 sm:px-6">
          <a href="/" className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-tight">
            <Logo className="h-5 w-auto" />
            Fides
            <span className="ml-1 hidden rounded-md bg-ink/[0.05] px-1.5 py-0.5 font-mono text-[10.5px] font-normal uppercase tracking-[0.1em] text-muted sm:inline-block">
              agent
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/app" className="rounded-full border border-hair bg-white px-4 py-2 font-display text-[13.5px] font-medium transition-colors hover:border-ink/30">
              Open app
            </a>
            <a href="/" className="group inline-flex items-center gap-2 rounded-full border border-hair bg-white px-4 py-2 font-display text-[13.5px] font-medium transition-colors hover:border-ink/30">
              <span aria-hidden className="text-green-deep transition-transform group-hover:-translate-x-0.5">←</span>
              Back to site
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] px-6 pt-12 pb-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green-deep">The manager, on the record</p>
        <h1 className="mt-3 max-w-[20ch] font-display text-[clamp(1.8rem,3.6vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
          An agent that can manage the basket — and can never take it.
        </h1>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          A momentum strategy rotates the weights on a schedule. Every move it makes is a public
          transaction, and every move it <em>can&apos;t</em> make is enforced by the vault itself.
        </p>

        {!a ? (
          <div className="mt-10 rounded-3xl border border-hair bg-white px-6 py-8 text-[14.5px] text-muted">
            The live on-chain read is momentarily unavailable. The vault and its history stay fully
            verifiable on the explorer.
          </div>
        ) : (
          <>
            {/* identity + live status */}
            <div className="mt-10 overflow-hidden rounded-3xl border border-hair bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-6 py-4">
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Rebalancer</p>
                  <a
                    href={`${EXPLORER}/address/${a.rebalancer}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[13.5px] text-ink hover:text-green-deep"
                  >
                    {short(a.rebalancer)} ↗
                  </a>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-green/10 px-3 py-1.5 font-mono text-[11px] text-green-deep">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
                  </span>
                  managing live
                </span>
              </div>
              <div className="grid grid-cols-2 divide-hair sm:grid-cols-4 sm:divide-x">
                <Stat label="Last rebalance" value={timeAgo(a.lastRebalance)} />
                <Stat label="Cadence" value="weekly" />
                <Stat label="Vault AUM" value={money(a.navUsd)} />
                <Stat label="NAV / token" value={money(a.navPerToken)} />
              </div>
            </div>

            {/* performance — honest placeholder until daily NAV snapshots accumulate */}
            <div className="mt-6 rounded-3xl border border-hair bg-white px-6 py-6">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Managed NAV vs. frozen basket</p>
                <span className="font-mono text-[11px] text-muted">building</span>
              </div>
              <div className="mt-5 flex h-[150px] items-center justify-center rounded-2xl border border-dashed border-hair bg-canvas/60 px-6 text-center">
                <p className="max-w-[46ch] text-[13px] leading-relaxed text-muted">
                  This chart plots the managed index against the same basket left untouched — the gap
                  is the agent&apos;s real contribution, net of costs. It starts the day daily NAV
                  snapshots begin and fills in from there. No back-fill, no invented history.
                </p>
              </div>
            </div>

            {/* track record */}
            <div className="mt-6 rounded-3xl border border-hair bg-white px-6 py-6">
              <p className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Track record</p>
              {a.rebalances.length === 0 ? (
                <p className="text-[14px] text-muted">No rebalances recorded yet.</p>
              ) : (
                <div>
                  {a.rebalances.map((r) => {
                    const delta = r.navAfter - r.navBefore;
                    const held = Math.abs(delta) / Math.max(r.navBefore, 1e-9) < 1e-4;
                    return (
                      <div
                        key={r.txHash}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-hair py-3.5 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-[14px]">
                            Rotated weights on momentum
                            <span className="ml-2 font-mono text-[11.5px] text-muted">rationale {short(r.rationale)}</span>
                          </p>
                          <p className="mt-0.5 font-mono text-[12px] text-muted">
                            {timeAgo(r.timestamp)} · NAV {money(r.navBefore)} → {money(r.navAfter)}{" "}
                            <span className={held ? "text-green-deep" : delta > 0 ? "text-green-deep" : "text-[#a23b2f]"}>
                              {held ? "· value-neutral" : delta > 0 ? "· up" : "· down"}
                            </span>
                          </p>
                        </div>
                        <a
                          href={`${EXPLORER}/tx/${r.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 font-mono text-[12.5px] text-green-deep"
                        >
                          {short(r.txHash)} ↗
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* guardrails */}
            <div className="mt-6 rounded-3xl border border-hair bg-white px-6 py-6">
              <p className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">The box it lives in</p>
              <div className="flex flex-wrap gap-2.5">
                <Rail>whitelist · {a.assetCount} assets</Rail>
                <Rail>turnover cap · {(a.turnoverCapBps / 100).toFixed(a.turnoverCapBps % 100 ? 1 : 0)}%</Rail>
                <Rail>slippage cap · {(a.slippageCapBps / 100).toFixed(a.slippageCapBps % 100 ? 1 : 0)}%</Rail>
                <Rail>cooldown · {a.cooldownSecs >= 86400 ? `${Math.round(a.cooldownSecs / 86400)}d` : `${Math.round(a.cooldownSecs / 3600)}h`}</Rail>
                <Rail good>no withdrawal path</Rail>
                <Rail good>redeem can&apos;t be paused</Rail>
              </div>
              <p className="mt-4 max-w-[64ch] text-[13px] leading-relaxed text-muted">
                Weights can move inside these limits; funds can&apos;t leave the vault except through
                your own redemption. The agent holds the <span className="font-mono text-[12px]">rebalancer</span> role
                and nothing more — it can never touch balances or pause redeem.
              </p>
            </div>

            <p className="mt-8 font-mono text-[11.5px] text-muted">
              vault{" "}
              <a href={`${EXPLORER}/address/${VAULT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-green-deep">
                {short(VAULT_ADDRESS)} ↗
              </a>{" "}
              · testnet
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-hair px-6 py-4 last:border-b-0 sm:border-b-0">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 font-display text-[18px] font-semibold tnum">{value}</p>
    </div>
  );
}

function Rail({ children, good }: { children: React.ReactNode; good?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[12.5px] ${
        good ? "border-green/40 text-green-deep" : "border-hair text-muted"
      }`}
    >
      {good && (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M8 1.6 3.2 3.5v3.6c0 3 2 4.8 4.8 5.9 2.8-1.1 4.8-2.9 4.8-5.9V3.5L8 1.6Z" strokeLinejoin="round" />
        </svg>
      )}
      {children}
    </span>
  );
}
