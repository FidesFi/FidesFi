"use client";

import {
  motion,
  animate,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import type { VaultData } from "../lib/vault";

const ease = [0.22, 1, 0.36, 1] as const;

/* ---------- real on-chain links (RHC testnet 46630) ---------- */
const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
const VAULT = "0x1Fb3f8c9569bd45D1D7b9417Cb7aDa64D7552A94";
const LINKS = {
  github: "https://github.com/FidesFi/FidesFi",
  x: "https://x.com/FidesFi",
  docs: "https://github.com/FidesFi/FidesFi", // real docs live in the repo until a docs site ships
  vault: `${EXPLORER}/address/${VAULT}`,
};
const tx = (h: string) => `${EXPLORER}/tx/${h}`;
const TX = {
  rebalance: "0x1c00daa3a0ea3f7db0191a26d1b66456a4e8ce31278bbecc99da8b6abbebab32",
  redeem: "0xb5efff6a5e72fdaea677d07c057e94d0ef2debeb4c30403191b7a79fdb0ba98f",
  mint: "0x4f8a9a416df7e71d9ac0b8b518a063197a740c1ac5c9e8aaf6b46865e32f90df",
};
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

function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease, delay: 0.1 }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div className="flex items-center gap-1 rounded-full border border-hair/80 bg-canvas/80 px-2 py-2 shadow-[0_8px_30px_rgba(23,25,27,0.06)] backdrop-blur-md">
        <a href="#top" className="flex items-center gap-2 pl-2 pr-3 font-display text-[17px] font-semibold tracking-tight">
          <Logo className="h-6 w-auto" />
          Fides
        </a>
        <div className="hidden items-center gap-1 md:flex">
          {[
            ["How it works", "#how"],
            ["Indexes", "#indexes"],
            ["Ledger", "#ledger"],
            ["Security", "#security"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3.5 py-2 text-[14.5px] text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
            >
              {label}
            </a>
          ))}
        </div>
        <Ext
          href={LINKS.vault}
          className="ml-1 rounded-full bg-ink px-4 py-2 font-display text-[14.5px] font-medium text-canvas transition-transform hover:-translate-y-px"
        >
          Launch app
        </Ext>
      </div>
    </motion.nav>
  );
}

function Hero() {
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
      <div className="relative mx-auto max-w-[980px] px-6 pt-40 pb-20 text-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.p variants={fadeUp} className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
            Fides · on Robinhood Chain
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="mx-auto mt-5 max-w-[16ch] font-display text-[clamp(2.5rem,6.2vw,4.6rem)] font-semibold leading-[1.03] tracking-[-0.03em]"
          >
            Managed stock indexes,{" "}
            <span className="text-green">every move on the record.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-[52ch] text-[18px] leading-relaxed text-[#3b3f42]">
            One token for a whole basket of tokenized stocks. An autonomous agent
            rebalances it — every weight, trade, and reason published on-chain.
            Verify, don&apos;t trust.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#indexes"
              className="rounded-full bg-ink px-6 py-3 font-display text-[15px] font-medium text-canvas transition-transform hover:-translate-y-px"
            >
              Explore the indexes
            </a>
            <a
              href="#security"
              className="rounded-full border border-ink/15 bg-white px-6 py-3 font-display text-[15px] font-medium text-ink transition-colors hover:border-ink/40"
            >
              How it&apos;s secured
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
              live on testnet
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

        <Receipt />
      </div>
    </header>
  );
}

function Receipt() {
  const rows: [string, string, "up" | "dn" | "hold"][] = [
    ["TSLA · added", "+5.8%", "up"],
    ["AMD · trimmed", "−5.0%", "dn"],
    ["AMZN · held", "—", "hold"],
    ["NFLX · held", "—", "hold"],
    ["PLTR · held", "—", "hold"],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease, delay: 0.55 }}
      className="mx-auto mt-14 max-w-[520px] overflow-hidden rounded-3xl border border-hair bg-white text-left shadow-[0_20px_60px_-24px_rgba(23,25,27,0.25)]"
    >
      <div className="flex items-center justify-between border-b border-hair px-6 py-4">
        <span className="font-display text-[15px] font-semibold">Latest rebalance · Fides Frontier</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-green-deep">
          <Check className="h-3.5 w-3.5" />
          on-chain
        </span>
      </div>
      <div className="border-b border-hair px-6 py-4 text-[13.5px] text-[#3b3f42]">
        <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Agent rationale</span>
        TSLA momentum edged out AMD — trimmed AMD into TSLA. Value-neutral, within
        the turnover cap.
      </div>
      <div className="py-1.5">
        {rows.map(([k, v, dir], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease, delay: 0.95 + i * 0.12 }}
            className="flex items-baseline justify-between border-b border-dashed border-hair px-6 py-3 last:border-0"
          >
            <span className="text-[13.5px] text-muted">{k}</span>
            <span
              className={`font-mono text-[14px] tnum ${
                dir === "up" ? "text-green-deep" : dir === "dn" ? "text-[#a23b2f]" : "text-muted"
              }`}
            >
              {v}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-canvas px-6 py-3.5 font-mono text-[12px] text-muted">
        <span>testnet · agent rebalancer</span>
        <Ext href={tx(TX.rebalance)} className="border-b border-green text-ink">
          view tx ↗
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

function HowItWorks() {
  const steps: [string, string, string][] = [
    [
      "01",
      "Deposit the basket, mint the token",
      "Bring the underlying stocks; the vault mints your index token against them. Fully backed from the first block — supply can never exceed what it holds.",
    ],
    [
      "02",
      "The agent manages it",
      "A momentum strategy rotates the weights on schedule. Every trade is submitted on-chain with its rationale — you can read why, not just what.",
    ],
    [
      "03",
      "Guardrails do the policing",
      "Fixed whitelist, capped slippage, capped turnover, cooldown between moves. Anything outside the rails, the contract simply rejects.",
    ],
    [
      "04",
      "Redeem anytime, in-kind",
      "Burn the token, take the stocks back — one transaction, no permission, no queue. Redemption can never be paused by anyone.",
    ],
  ];
  return (
    <section id="how" className="mx-auto max-w-[1120px] px-6 py-24">
      <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-5">
        <h2 className="max-w-[18ch] font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
          How it works
        </h2>
        <p className="max-w-[46ch] text-[15px] text-muted">
          One loop: mint, manage, redeem. The agent handles the weights; the
          contract keeps custody. Neither can reach past its lane.
        </p>
      </Reveal>

      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        {/* steps */}
        <div className="relative pl-8">
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease }}
            className="absolute left-[9px] top-3 bottom-3 w-px origin-top bg-hair"
          />
          {steps.map(([n, t, d], i) => (
            <Reveal key={n} delay={i * 0.1} className="relative pb-8 last:pb-0">
              <span className="absolute -left-8 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-green/50 bg-canvas font-mono text-[9.5px] font-medium text-green-deep">
                {n}
              </span>
              <h3 className="font-display text-[17px] font-semibold tracking-tight">{t}</h3>
              <p className="mt-1.5 max-w-[52ch] text-[14px] leading-relaxed text-muted">{d}</p>
            </Reveal>
          ))}
        </div>

        {/* animated flow diagram */}
        <Reveal delay={0.15}>
          <div className="rounded-3xl border border-hair bg-white p-6">
            <svg viewBox="0 0 520 300" className="block w-full" role="img" aria-label="Flow: you mint and redeem with the vault; the agent only rebalances">
              {/* you */}
              <rect x="24" y="112" width="116" height="64" rx="16" fill="var(--color-canvas)" stroke="var(--color-hair)" />
              <text x="82" y="140" textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fontWeight="600" fill="var(--color-ink)">
                You
              </text>
              <text x="82" y="160" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--color-muted)">
                hold the token
              </text>

              {/* vault */}
              <rect x="204" y="86" width="128" height="116" rx="18" fill="var(--color-dark)" />
              <text x="268" y="118" textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fontWeight="600" fill="#F7F7F4">
                Vault
              </text>
              <text x="268" y="136" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="#9ba1a4">
                holds every stock
              </text>
              {/* lock */}
              <rect x="252" y="150" width="32" height="24" rx="6" fill="none" stroke="var(--color-green)" strokeWidth="2" />
              <path d="M258 150 v-6 a10 10 0 0 1 20 0 v6" fill="none" stroke="var(--color-green)" strokeWidth="2" />
              <circle cx="268" cy="162" r="2.6" fill="var(--color-green)" />
              <text x="268" y="192" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8.5" fill="#9ba1a4">
                custody stays here
              </text>

              {/* agent */}
              <rect x="396" y="112" width="100" height="64" rx="16" fill="var(--color-canvas)" stroke="var(--color-hair)" />
              <text x="446" y="140" textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fontWeight="600" fill="var(--color-ink)">
                Agent
              </text>
              <text x="446" y="160" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--color-muted)">
                decides weights
              </text>

              {/* mint: you -> vault */}
              <line x1="140" y1="128" x2="196" y2="128" stroke="var(--color-green)" strokeWidth="2" className="dash-anim" />
              <path d="M196 128 l-7 -4.5 v9 z" fill="var(--color-green)" />
              <text x="168" y="118" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-green-deep)">
                mint
              </text>

              {/* redeem: vault -> you */}
              <line x1="204" y1="162" x2="148" y2="162" stroke="var(--color-muted)" strokeWidth="2" className="dash-anim" />
              <path d="M148 162 l7 -4.5 v9 z" fill="var(--color-muted)" />
              <text x="176" y="180" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-muted)">
                redeem · in-kind
              </text>

              {/* rebalance: agent -> vault */}
              <line x1="396" y1="144" x2="340" y2="144" stroke="var(--color-green)" strokeWidth="2" className="dash-anim" />
              <path d="M340 144 l7 -4.5 v9 z" fill="var(--color-green)" />
              <text x="368" y="134" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-green-deep)">
                rebalance
              </text>

              {/* agent cannot withdraw */}
              <text x="368" y="216" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="#a23b2f">
                ✕ withdraw — not possible
              </text>
              <path d="M368 208 q0 -40 -36 -48" fill="none" stroke="#a23b2f" strokeWidth="1.3" strokeDasharray="3 4" opacity="0.55" />

              {/* base line */}
              <text x="260" y="262" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--color-muted)">
                every arrow above = a public transaction on Robinhood Chain
              </text>
            </svg>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

type Basket = {
  name: string;
  sub: string;
  nav: number;
  chg: string;
  holds: string[];
  points: string;
};

function Baskets() {
  const baskets: Basket[] = [
    {
      name: "Fides Frontier",
      sub: "AI & compute · 6 holdings",
      nav: 104.62,
      chg: "▲ 2.41% 24h",
      holds: ["NVDA", "AMD", "MU", "PLTR", "GOOGL", "SPCX"],
      points: "0,34 30,30 60,33 90,24 120,26 150,18 180,21 210,12 240,16 270,8 300,6",
    },
    {
      name: "Fides Blue",
      sub: "Mega-cap core · 7 holdings",
      nav: 101.18,
      chg: "▲ 0.83% 24h",
      holds: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"],
      points: "0,28 30,26 60,29 90,25 120,27 150,23 180,25 210,20 240,22 270,19 300,17",
    },
  ];
  return (
    <section id="indexes" className="mx-auto max-w-[1120px] px-6 py-24">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <h2 className="max-w-[18ch] font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
          Two indexes. One transparent manager.
        </h2>
        <p className="max-w-[46ch] text-[15px] text-muted">
          Each basket is a single token backed 1:1 by its tokenized stocks. An
          autonomous agent rotates the weights by momentum — on schedule, in the
          open.
        </p>
      </Reveal>

      <div className="grid gap-5 md:grid-cols-2">
        {baskets.map((b, i) => (
          <Reveal key={b.name} delay={i * 0.08}>
            <motion.a
              href={LINKS.vault}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="group block rounded-3xl border border-hair bg-white p-6 transition-colors hover:border-[#cfcfc8]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-[21px] font-semibold tracking-tight">{b.name}</div>
                  <div className="mt-0.5 text-[13.5px] text-muted">{b.sub}</div>
                </div>
                <span className="rounded-full bg-green/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-green-deep">
                  ● managed
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-3">
                <span className="font-mono text-[30px] font-medium tracking-[-0.02em]">
                  <CountUp to={b.nav} prefix="$" />
                </span>
                <span className="font-mono text-[14px] text-green-deep">{b.chg}</span>
              </div>

              <svg className="my-4 block h-11 w-full" viewBox="0 0 300 44" preserveAspectRatio="none">
                <motion.polyline
                  fill="none"
                  stroke="var(--color-green)"
                  strokeWidth={2}
                  points={b.points}
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 1.4, ease, delay: 0.2 + i * 0.15 }}
                />
                <motion.circle
                  r={3}
                  fill="var(--color-green)"
                  cx={b.points.split(" ").at(-1)?.split(",")[0]}
                  cy={b.points.split(" ").at(-1)?.split(",")[1]}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.35, ease, delay: 1.55 + i * 0.15 }}
                />
              </svg>

              <motion.div
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="flex flex-wrap gap-1.5"
              >
                {b.holds.map((h) => (
                  <motion.span
                    key={h}
                    variants={chipPop}
                    className="rounded-md border border-hair px-2 py-1 font-mono text-[11.5px] text-[#3b3f42]"
                  >
                    {h}
                  </motion.span>
                ))}
              </motion.div>

              <div className="mt-5 flex items-center justify-between font-mono text-[12px] text-muted">
                <span>momentum · weekly</span>
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  Open index
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
              Built so it can&apos;t be rugged.
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

function Ledger() {
  const feed: {
    type: string;
    title: string;
    detail: string;
    hash: string;
  }[] = [
    {
      type: "Rebalance",
      title: "Agent rotated the basket",
      detail: "trimmed AMD → added TSLA · TSLA momentum > AMD · stayed fully backed",
      hash: TX.rebalance,
    },
    {
      type: "Redeem",
      title: "Holder exited in-kind",
      detail: "burned 0.5 index token → received all 5 underlying stocks, one tx",
      hash: TX.redeem,
    },
    {
      type: "Mint",
      title: "Holder entered",
      detail: "deposited the basket → minted 1 index token, fully backed",
      hash: TX.mint,
    },
  ];
  return (
    <section id="ledger" className="mx-auto max-w-[1120px] px-6 pb-24">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
          The ledger
        </h2>
        <p className="max-w-[46ch] text-[15px] text-muted">
          Every move, on-chain and in order — with the reason and the receipt. Real
          testnet activity from the live vault. Click any row to verify.
        </p>
      </Reveal>

      <div className="relative pl-6">
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-hair" />
        {feed.map((f, i) => (
          <Reveal key={f.hash} delay={i * 0.06} className="relative pb-6 last:pb-0">
            <span className="absolute -left-[23px] top-2 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-green" />
            <Ext
              href={tx(f.hash)}
              className="block rounded-2xl border border-hair bg-white px-5 py-4 transition-colors hover:border-[#cfcfc8]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex items-baseline gap-2.5">
                  <span className="rounded-md bg-green/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-green-deep">
                    {f.type}
                  </span>
                  <b className="text-[14.5px] font-semibold">{f.title}</b>
                </div>
                <span className="font-mono text-[12px] text-green-deep">{short(f.hash)} ↗</span>
              </div>
              <p className="mt-1.5 text-[13.5px] text-muted">{f.detail}</p>
            </Ext>
          </Reveal>
        ))}
      </div>
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
          Fides is a preview build on testnet — index figures are illustrative; ledger
          entries are real on-chain transactions. Underlying stock tokens are debt
          instruments of Robinhood Assets (Jersey) Ltd, not equity. Not investment advice.
        </p>
        <div className="flex gap-5 font-mono text-[13px]">
          {links.map(([label, href]) => (
            <Ext key={label} href={href} className="text-muted transition-colors hover:text-ink">
              {label}
            </Ext>
          ))}
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
              <span className="font-display text-[15px] font-semibold">Live on testnet · {data.name}</span>
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

export function Landing({ vault }: { vault: VaultData }) {
  return (
    <main>
      <Nav />
      <Hero />
      <Ticker />
      <LiveVault data={vault} />
      <HowItWorks />
      <Baskets />
      <Security />
      <Ledger />
      <Footer />
    </main>
  );
}
