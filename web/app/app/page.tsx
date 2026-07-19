import type { Metadata } from "next";
import { Logo } from "../components/Logo";
import { AppClient } from "./AppClient";

export const metadata: Metadata = {
  title: "Fides App — mint & redeem on testnet",
  description: "Mint and redeem the live Fides index on Robinhood Chain testnet.",
};

export default function AppPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="sticky top-0 z-40 border-b border-hair bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3.5">
          <a href="/" className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-tight">
            <Logo className="h-5 w-auto" />
            Fides
            <span className="ml-1 rounded-md bg-green/10 px-1.5 py-0.5 font-mono text-[10.5px] font-normal uppercase tracking-[0.1em] text-green-deep">
              app · testnet
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/docs"
              className="rounded-full border border-hair bg-white px-4 py-2 font-display text-[13.5px] font-medium text-ink transition-colors hover:border-ink/30"
            >
              Docs
            </a>
            <a
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-hair bg-white px-4 py-2 font-display text-[13.5px] font-medium text-ink transition-colors hover:border-ink/30"
            >
              <span aria-hidden className="text-green-deep transition-transform group-hover:-translate-x-0.5">
                ←
              </span>
              Back to site
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[880px] px-6 pt-12 pb-6">
        <h1 className="font-display text-[clamp(1.7rem,3.2vw,2.2rem)] font-semibold tracking-[-0.02em]">
          Mint &amp; redeem, straight from the contract.
        </h1>
        <p className="mt-2 max-w-[58ch] text-[14.5px] leading-relaxed text-muted">
          No backend, no order book — your wallet talks to the vault. Deposit the basket to mint the
          index token; burn it to take the basket back. Live on Robinhood Chain testnet.
        </p>
      </div>

      <AppClient />
    </div>
  );
}
