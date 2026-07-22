"use client";

import {
  motion,
  AnimatePresence,
  animate,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import type { VaultData, LatestRebalance, LedgerRow } from "../lib/vault";

// 3D pieces: client-only, code-split — the page never waits for three.js
const Terrain = dynamic(() => import("./Terrain").then((m) => m.Terrain), { ssr: false });
const HowStory = dynamic(() => import("./HowStory").then((m) => m.HowStory), { ssr: false });
const HowSteps = dynamic(() => import("./HowStory").then((m) => m.HowSteps), { ssr: false });

const ease = [0.22, 1, 0.36, 1] as const;

/* ---------- real on-chain links (RHC mainnet 4663) ---------- */
const EXPLORER = "https://robinhoodchain.blockscout.com";
const VAULT = "0x4504483Ea748e630A9368F44f0Ee5B4350462Db8";
const LINKS = {
  github: "https://github.com/FidesFi/FidesFi",
  x: "https://x.com/FidesFi",
  docs: "/docs",
  vault: `${EXPLORER}/address/${VAULT}`,
};
const tx = (h: string) => `${EXPLORER}/tx/${h}`;
// only shown if the live rebalance read fails — empty until the first mainnet rebalance is pinned
const REBALANCE_FALLBACK_TX = "";
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const chipPop: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease } },
};

/** noomo-style headline: each word rises out of its own mask, staggered. */
function SplitWords({
  words,
  className,
  delay = 0,
}: {
  words: { t: string; green?: boolean }[];
  className?: string;
  delay?: number;
}) {
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-baseline">
          <motion.span
            initial={{ y: "115%", rotate: 6, opacity: 0 }}
            animate={delay >= 0 ? { y: 0, rotate: 0, opacity: 1 } : undefined}
            whileInView={delay < 0 ? { y: 0, rotate: 0, opacity: 1 } : undefined}
            viewport={delay < 0 ? { once: true, margin: "-80px" } : undefined}
            transition={{ duration: 0.85, ease, delay: Math.abs(delay) + i * 0.07 }}
            className={`inline-block origin-bottom-left ${w.green ? "text-green" : ""}`}
          >
            {w.t}
          </motion.span>
          {" "}
        </span>
      ))}
    </span>
  );
}

/* ---------- helpers ---------- */

function Ext({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isIn = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={isIn ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CountUp({
  to,
  prefix = "",
  decimals = 2,
}: {
  to: number;
  prefix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isIn = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!isIn) return;
    if (reduce) {
      setV(to);
      return;
    }
    const controls = animate(0, to, { duration: 1.1, ease, onUpdate: setV });
    return () => controls.stop();
  }, [isIn, to, reduce]);
  return (
    <span ref={ref} className="tnum">
      {prefix}
      {v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

const Check = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className={className}>
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------- sections ---------- */

const NAV_LINKS: [string, string][] = [
  ["How it works", "#how"],
  ["Indexes", "#indexes"],
  ["Agent", "/agent"],
  ["Security", "#security"],
  ["Docs", "/docs"],
];

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <motion.nav
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease, delay: 0.1 }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div className="relative">
        <div className="flex items-center gap-1 rounded-full border border-hair/80 bg-canvas/80 px-2 py-2 shadow-[0_8px_30px_rgba(23,25,27,0.06)] backdrop-blur-md">
          <a href="#top" className="flex items-center gap-2 pl-2 pr-3 font-display text-[17px] font-semibold tracking-tight">
            <Logo className="h-6 w-auto" />
            Fides
          </a>
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3.5 py-2 text-[14.5px] text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
              >
                {label}
              </a>
            ))}
          </div>
          <a
            href="/app"
            className="ml-1 rounded-full bg-ink px-4 py-2 font-display text-[14.5px] font-medium text-canvas transition-transform hover:-translate-y-px"
          >
            Launch app
          </a>
          {/* mobile menu toggle — desktop keeps the inline links */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] md:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? (
                <>
                  <path d="M5 5l10 10" />
                  <path d="M15 5L5 15" />
                </>
              ) : (
                <>
                  <path d="M3 6h14" />
                  <path d="M3 10h14" />
                  <path d="M3 14h14" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* mobile dropdown */}
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 -z-10 md:hidden"
                aria-hidden
              />
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease }}
                className="absolute left-1/2 top-[calc(100%+8px)] w-[min(88vw,320px)] -translate-x-1/2 rounded-3xl border border-hair/80 bg-canvas/95 p-2 shadow-[0_20px_60px_-24px_rgba(23,25,27,0.3)] backdrop-blur-md md:hidden"
              >
                {NAV_LINKS.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-3 font-display text-[15px] text-ink transition-colors hover:bg-ink/[0.05]"
                  >
                    {label}
                  </a>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

function Hero({ rebalance }: { rebalance: LatestRebalance }) {
  return (
    <header id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-hair) 1px, transparent 1px), linear-gradient(90deg, var(--color-hair) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(120% 90% at 50% 0%, #000 40%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 50% 0%, #000 40%, transparent 78%)",
        }}
      />
      {/* the signature: an index terrain, generated purely in code — mouse raises it, scroll swells it */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease, delay: 0.5 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[58%] sm:block"
        style={{
          maskImage: "linear-gradient(180deg, transparent, #000 55%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, #000 55%)",
        }}
      >
        <Terrain />
      </motion.div>

      <HeroParallax>
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, letterSpacing: "0.18em" }}
            transition={{ duration: 1.1, ease, delay: 0.15 }}
            className="font-mono text-[12px] uppercase text-muted"
          >
            Fides · on Robinhood Chain
          </motion.p>

          <h1 className="mx-auto mt-5 max-w-[16ch] font-display text-[clamp(2.5rem,6.2vw,4.6rem)] font-semibold leading-[1.03] tracking-[-0.03em]">
            <SplitWords
              delay={0.35}
              words={[
                { t: "Managed" },
                { t: "stock" },
                { t: "indexes," },
                { t: "every", green: true },
                { t: "move", green: true },
                { t: "on", green: true },
                { t: "the", green: true },
                { t: "record.", green: true },
              ]}
            />
          </h1>

          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-[52ch] text-[18px] leading-relaxed text-[#3b3f42]">
            One token for a whole basket of tokenized stocks. An autonomous agent
            rebalances it — every weight, trade, and reason published on-chain.
            Verify, don&apos;t trust.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/app"
              className="rounded-full bg-ink px-6 py-3 font-display text-[15px] font-medium text-canvas transition-transform hover:-translate-y-px"
            >
              Launch the app
            </a>
            <a
              href="#how"
              className="rounded-full border border-ink/15 bg-white px-6 py-3 font-display text-[15px] font-medium text-ink transition-colors hover:border-ink/40"
            >
              How it works
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 font-mono text-[12.5px] text-muted"
          >
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
              </span>
              live on mainnet
            </span>
            <span className="text-hair">·</span>
            <Ext
              href={LINKS.vault}
              className="inline-flex items-center gap-2 rounded-full border border-hair bg-white/70 px-3 py-1.5 transition-colors hover:border-ink/30"
            >
              vault <span className="text-ink">{short(VAULT)}</span>
              <span className="text-green-deep">↗</span>
            </Ext>
          </motion.div>
        </motion.div>

        <Receipt rebalance={rebalance} />

        {/* scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="mt-14 flex flex-col items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted"
          aria-hidden
        >
          scroll
          <span className="relative h-9 w-px overflow-hidden bg-hair">
            <motion.span
              animate={{ y: ["-100%", "220%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-0 top-0 h-1/2 w-px bg-green"
            />
          </span>
        </motion.div>
      </HeroParallax>
    </header>
  );
}

/** hero content lifts + fades as you scroll away — the canvas stays, the words leave first. */
function HeroParallax({ children }: { children: React.ReactNode }) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.1], [0, -40]);
  const opacity = useTransform(scrollYProgress, [0, 0.12], [1, 0.88]);
  return (
    <motion.div style={{ y, opacity }} className="relative mx-auto max-w-[980px] px-6 pt-40 pb-16 text-center">
      {children}
    </motion.div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 90) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const usd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

/** The "latest rebalance" receipt — every field read straight from the on-chain
 *  Rebalanced(by, rationale, navBefore, navAfter) event. No prose is invented:
 *  the rationale is a keccak commitment (the agent's note, hashed & tamper-proof),
 *  and NAV before/after is the actual value-neutrality proof. */
function Receipt({ rebalance }: { rebalance: LatestRebalance }) {
  const delta = rebalance ? rebalance.navAfter - rebalance.navBefore : 0;
  const held = rebalance ? Math.abs(delta) / Math.max(rebalance.navBefore, 1e-9) < 1e-4 : false;
  // no rebalance yet (fresh vault) and nothing pinned -> point at the vault itself
  const txHref = rebalance?.txHash
    ? tx(rebalance.txHash)
    : REBALANCE_FALLBACK_TX
      ? tx(REBALANCE_FALLBACK_TX)
      : LINKS.vault;

  const rows: [string, React.ReactNode, "up" | "dn" | "hold"][] = rebalance
    ? [
        [
          "Outcome",
          held ? "value-neutral · held flat" : `${delta > 0 ? "+" : "−"}${usd(Math.abs(delta)).slice(1)}`,
          held ? "up" : delta > 0 ? "up" : "dn",
        ],
        [
          "Vault NAV · at this rebalance",
          <span key="nav">
            {usd(rebalance.navBefore)} <span className="text-muted">→</span> {usd(rebalance.navAfter)}
          </span>,
          "hold",
        ],
        ["Rebalancer", short(rebalance.by), "hold"],
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease, delay: 0.55 }}
      className="mx-auto mt-14 max-w-[520px] overflow-hidden rounded-3xl border border-hair bg-white text-left shadow-[0_20px_60px_-24px_rgba(23,25,27,0.25)]"
    >
      <div className="flex items-start justify-between border-b border-hair px-6 py-4">
        <div>
          <span className="font-display text-[15px] font-semibold">Last rebalance · Fides Frontier</span>
          {rebalance && (
            <span className="mt-0.5 block font-mono text-[11px] text-muted">recorded {timeAgo(rebalance.timestamp)}</span>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-green-deep">
          <Check className="h-3.5 w-3.5" />
          on-chain
        </span>
      </div>

      {rebalance ? (
        <>
          <p className="border-b border-hair px-6 py-3 text-[12.5px] leading-relaxed text-muted">
            A snapshot of the agent&apos;s last move, exactly as it hit the chain — not a live figure. It
            changes when the agent rebalances again, not when you mint or redeem.
          </p>
          <div className="border-b border-hair px-6 py-4 text-[13.5px] text-[#3b3f42]">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              Rationale · committed on-chain
            </span>
            <span className="font-mono text-[12.5px] text-ink">{short(rebalance.rationale)}</span>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              The agent&apos;s note is hashed into the event — tamper-proof, not editable after the fact.
            </p>
          </div>
          <div className="py-1.5">
            {rows.map(([k, v, dir], i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease, delay: 0.95 + i * 0.1 }}
                className="flex items-baseline justify-between border-b border-dashed border-hair px-6 py-3 last:border-0"
              >
                <span className="text-[13.5px] text-muted">{k}</span>
                <span
                  className={`font-mono text-[14px] tnum ${
                    dir === "up" ? "text-green-deep" : dir === "dn" ? "text-[#a23b2f]" : "text-ink"
                  }`}
                >
                  {v}
                </span>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <div className="border-b border-hair px-6 py-5 text-[13.5px] leading-relaxed text-muted">
          No rebalance on mainnet yet — the vault is freshly deployed. The agent&apos;s first move
          will appear here, straight from the on-chain event.
        </div>
      )}

      <div className="flex items-center justify-between bg-canvas px-6 py-3.5 font-mono text-[12px] text-muted">
        <span>mainnet · agent rebalancer</span>
        <Ext href={txHref} className="border-b border-green text-ink">
          {rebalance ? "view tx ↗" : "view vault ↗"}
        </Ext>
      </div>
    </motion.div>
  );
}

function Ticker() {
  // all real Robinhood stock tokens on RHC (mainnet registry / testnet faucet)
  const syms = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "META",
    "NVDA",
    "TSLA",
    "AMD",
    "MU",
    "PLTR",
    "NFLX",
    "QQQ",
    "COIN",
    "MSTR",
  ];
  const Row = ({ hidden }: { hidden?: boolean }) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden}>
      {syms.map((s) => (
        <span
          key={s}
          className="mx-6 inline-flex items-center gap-2.5 font-mono text-[13.5px] tracking-[0.02em] text-[#3b3f42]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green/60" />${s}
        </span>
      ))}
    </div>
  );
  return (
    <section className="border-y border-hair bg-white/70 py-6">
      <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        Backed by real stock tokens on Robinhood Chain
      </p>
      <div className="marquee-mask overflow-hidden">
        <div className="flex w-max animate-marquee">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  );
}

function Baskets({ vault }: { vault: VaultData }) {
  const frontierHolds = vault?.holdings.length ? vault.holdings.map((h) => h.symbol) : ["NVDA", "MSFT", "TSLA", "GOOGL", "SPCX"];
  const cards = [
    {
      name: "Fides Frontier",
      sub: `${frontierHolds.length} tokenized stocks`,
      live: true,
      nav: vault?.navPerShare ?? null,
      backed: vault?.fullyBacked ?? true,
      holds: frontierHolds,
      href: "/app",
    },
    {
      name: "Fides Blue",
      sub: "Mega-cap core",
      live: false,
      nav: null,
      backed: false,
      holds: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"],
      href: "/docs",
    },
  ];
  return (
    <section id="indexes" className="mx-auto max-w-[1120px] px-6 py-24">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <h2 className="max-w-[18ch] font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
          <SplitWords
            delay={-0.05}
            words={[
              { t: "One" },
              { t: "index" },
              { t: "live." },
              { t: "The" },
              { t: "next", green: true },
              { t: "on", green: true },
              { t: "the", green: true },
              { t: "way.", green: true },
            ]}
          />
        </h2>
        <p className="max-w-[46ch] text-[15px] text-muted">
          Each basket is a single token backed 1:1 by its tokenized stocks, rotated by the
          agent on schedule. Frontier is live on mainnet; Blue is next.
        </p>
      </Reveal>

      <div className="grid gap-5 md:grid-cols-2">
        {cards.map((b, i) => (
          <Reveal key={b.name} delay={i * 0.08}>
            <motion.a
              href={b.href}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className={`group block rounded-3xl border border-hair p-6 transition-colors hover:border-[#cfcfc8] ${b.live ? "bg-white" : "bg-white/55"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-[21px] font-semibold tracking-tight">{b.name}</div>
                  <div className="mt-0.5 text-[13.5px] text-muted">{b.sub}</div>
                </div>
                {b.live ? (
                  <span className="rounded-full bg-green/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-green-deep">
                    ● live · mainnet
                  </span>
                ) : (
                  <span className="rounded-full border border-hair px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                    planned
                  </span>
                )}
              </div>

              {b.live ? (
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="font-mono text-[30px] font-medium tracking-[-0.02em]">
                    {b.nav != null ? <CountUp to={b.nav} prefix="$" /> : "—"}
                  </span>
                  <span className="font-mono text-[13px] text-muted">NAV / token</span>
                  {b.backed && (
                    <span className="ml-auto inline-flex items-center gap-1 font-mono text-[12px] text-green-deep">
                      <Check className="h-3.5 w-3.5" />
                      fully backed
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-5 max-w-[42ch] text-[13.5px] leading-relaxed text-muted">
                  Launching after Frontier — same guarantees, a mega-cap basket.
                </p>
              )}

              <motion.div
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="mt-5 flex flex-wrap gap-1.5"
              >
                {b.holds.map((h) => (
                  <motion.span
                    key={h}
                    variants={chipPop}
                    className={`rounded-md border border-hair px-2 py-1 font-mono text-[11.5px] ${b.live ? "text-[#3b3f42]" : "text-muted"}`}
                  >
                    {h}
                  </motion.span>
                ))}
              </motion.div>

              <div className="mt-5 flex items-center justify-between font-mono text-[12px] text-muted">
                <span>{b.live ? "momentum · weekly" : "mega-cap core"}</span>
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  {b.live ? "Open index" : "Read the docs"}
                  <span className="transition-transform group-hover:translate-x-0.5">↗</span>
                </span>
              </div>
            </motion.a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Security() {
  const cells = [
    ["Redeem", "Always on"],
    ["Admin over funds", "None"],
    ["Custody", "In the contract"],
    ["Every decision", "On-chain"],
  ];
  return (
    <section id="security" className="mx-auto max-w-[1120px] px-6 pb-24">
      <Reveal>
        <div className="rounded-[28px] bg-dark px-8 py-12 text-canvas sm:px-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <h2 className="max-w-[16ch] font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-white">
              <SplitWords
                delay={-0.05}
                words={[{ t: "Built" }, { t: "so" }, { t: "it" }, { t: "can't" }, { t: "be" }, { t: "rugged.", green: true }]}
              />
            </h2>
            <p className="max-w-[44ch] text-[15px] text-[#9ba1a4]">
              The agent decides weights. It never touches custody. These aren&apos;t
              promises — they&apos;re what the contract will and won&apos;t let anyone do.
            </p>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-dark-hair md:grid-cols-4">
            {cells.map(([lab, val], i) => (
              <div
                key={lab}
                className={`bg-dark px-5 py-6 ${i % 2 === 0 ? "border-r border-dark-hair" : ""} ${
                  i < 2 ? "border-b border-dark-hair" : ""
                } md:border-b-0 ${i < 3 ? "md:border-r" : ""} md:border-dark-hair`}
              >
                <div className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#9ba1a4]">{lab}</div>
                <div className="mt-2 flex items-center gap-2 font-display text-[17px] font-medium">
                  <Check className="h-[15px] w-[15px] text-green" />
                  {val}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 font-mono text-[12.5px] text-[#9ba1a4]">
            Agent&apos;s only powers:{" "}
            <b className="font-medium text-white">rebalance within a fixed whitelist</b>, capped
            slippage and turnover. It cannot withdraw, cannot pause your redemption,
            cannot change the rules after deploy.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function Ledger({ rows }: { rows: LedgerRow[] }) {
  return (
    <section id="ledger" className="mx-auto max-w-[1120px] px-6 pb-24">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
          <SplitWords delay={-0.05} words={[{ t: "The" }, { t: "ledger", green: true }]} />
        </h2>
        <p className="max-w-[46ch] text-[15px] text-muted">
          Every move, on-chain and in order — read live from the vault&apos;s own Mint,
          Redeem, and Rebalanced events. Click any row to verify.
        </p>
      </Reveal>

      {rows.length === 0 ? (
        <Reveal className="rounded-2xl border border-hair bg-white px-5 py-6 text-[14px] leading-relaxed text-muted">
          No activity on mainnet yet — the vault is freshly deployed. The first mint, redeem, and
          rebalance will appear here, read live from the vault&apos;s own events.
        </Reveal>
      ) : (
        <div className="relative pl-6">
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.2, ease }}
            className="absolute left-[5px] top-2 bottom-2 w-px origin-top bg-hair"
          />
          {rows.map((f, i) => (
            <Reveal key={`${f.txHash}-${i}`} delay={i * 0.06} className="relative pb-6 last:pb-0">
              <span className="absolute -left-[23px] top-2 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-green" />
              <Ext
                href={tx(f.txHash)}
                className="block rounded-2xl border border-hair bg-white px-5 py-4 transition-colors hover:border-[#cfcfc8]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="flex items-baseline gap-2.5">
                    <span className="rounded-md bg-green/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-green-deep">
                      {f.type}
                    </span>
                    <b className="text-[14.5px] font-semibold">{f.title}</b>
                    <span className="font-mono text-[11.5px] text-muted">{timeAgo(f.timestamp)}</span>
                  </div>
                  <span className="font-mono text-[12px] text-green-deep">{short(f.txHash)} ↗</span>
                </div>
                <p className="mt-1.5 text-[13.5px] text-muted">{f.detail}</p>
              </Ext>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

function Footer() {
  const links: [string, string][] = [
    ["X", LINKS.x],
    ["Docs", LINKS.docs],
    ["Explorer", LINKS.vault],
    ["GitHub", LINKS.github],
  ];
  return (
    <footer className="border-t border-hair py-12">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-5 px-6">
        <p className="max-w-[60ch] text-[12.5px] leading-relaxed text-muted">
          Fides is live on Robinhood Chain mainnet — vault figures and ledger entries are
          real on-chain reads. Underlying stock tokens are debt instruments of Robinhood
          Assets (Jersey) Ltd, not equity. Early-stage software; not investment advice.
        </p>
        <div className="flex gap-5 font-mono text-[13px]">
          {links.map(([label, href]) =>
            href.startsWith("/") ? (
              <a key={label} href={href} className="text-muted transition-colors hover:text-ink">
                {label}
              </a>
            ) : (
              <Ext key={label} href={href} className="text-muted transition-colors hover:text-ink">
                {label}
              </Ext>
            ),
          )}
        </div>
      </div>
    </footer>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-2 font-mono text-[26px] font-medium tracking-[-0.02em] tnum">{value}</div>
    </div>
  );
}

function LiveVault({ data }: { data: VaultData }) {
  if (!data) return null;
  return (
    <section className="mx-auto max-w-[1120px] px-6 pb-6 pt-2">
      <Reveal>
        <div className="rounded-3xl border border-hair bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair pb-5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
              </span>
              <span className="font-display text-[15px] font-semibold">Live on mainnet · {data.name}</span>
            </div>
            <Ext href={LINKS.vault} className="font-mono text-[12.5px] text-green-deep">
              {short(VAULT)} ↗
            </Ext>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-7 py-7 sm:grid-cols-4">
            <Stat label="NAV / token" value={<CountUp to={data.navPerShare} prefix="$" />} />
            <Stat label="Total value" value={<CountUp to={data.navUsd} prefix="$" />} />
            <Stat label="Tokens outstanding" value={<CountUp to={data.supply} decimals={2} />} />
            <Stat
              label="Backing"
              value={
                data.fullyBacked ? (
                  <span className="inline-flex items-center gap-1.5 text-green-deep">
                    <Check className="h-4 w-4" />
                    <span className="font-display text-[20px]">Fully backed</span>
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-wrap gap-2 border-t border-hair pt-5"
          >
            <span className="mr-1 self-center font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              holds
            </span>
            {data.holdings.map((h) => (
              <motion.span
                key={h.symbol}
                variants={chipPop}
                whileHover={{ y: -2 }}
                className="rounded-lg border border-hair px-2.5 py-1.5 font-mono text-[12px]"
              >
                <span className="text-ink">{h.symbol}</span>{" "}
                <span className="tnum text-muted">{h.balance.toFixed(4)}</span>
              </motion.span>
            ))}
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

export function Landing({
  vault,
  rebalance,
  ledger,
}: {
  vault: VaultData;
  rebalance: LatestRebalance;
  ledger: LedgerRow[];
}) {
  return (
    <main>
      <Nav />
      <Hero rebalance={rebalance} />
      <Ticker />
      <LiveVault data={vault} />
      <HowStory />
      <HowSteps />
      <Baskets vault={vault} />
      <Security />
      <Ledger rows={ledger} />
      <Footer />
    </main>
  );
}
