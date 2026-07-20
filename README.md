# Fides

Managed, fully-backed stock indexes on **Robinhood Chain** (chain 4663). One token per index, minted and redeemed in-kind against tokenized stocks. An autonomous agent rebalances the weights — **within on-chain guardrails it cannot escape** — and every rebalance is a public on-chain transaction.

> Verify, don't trust. The agent can *manage* your basket. It can never *withdraw* it.

**Live on testnet** → **[fidesfi-protocol.vercel.app](https://fidesfi-protocol.vercel.app)** — mint & redeem straight from the contract.

## Baskets

- **Fides Frontier** — AI & compute: NVDA, AMD, MU, PLTR, GOOGL, SPCX
- **Fides Blue** — mega-cap core: AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA

## What's here

| Path | |
|---|---|
| `contracts/` | the vault + **89 tests** (unit · fuzz · invariant · fork · adversarial). See `contracts/README.md`. |
| `web/` | the live app + site (Next.js), deployed at [fidesfi-protocol.vercel.app](https://fidesfi-protocol.vercel.app) |
| `brand/` | logo & assets |

## The agent

A momentum strategy rebalances the baskets on a schedule. It holds the `rebalancer` role — but that role is boxed in by the contract: whitelist, slippage cap, turnover cap, cooldown, and **no withdrawal path**. It can rotate weights; it can never move funds out. Every rebalance is a public on-chain transaction you can verify. The strategy code runs off-repo.

## Guarantees (enforced by the contract)

- **Backing** — every share is always fully backed; redemption is always solvent.
- **No drain** — funds leave only via your own redemption or whitelisted-router swaps during a rebalance.
- **Redeem is never pausable.**
- **Closed asset set** — the whitelist is fixed at deploy.
- **Bounded guardian** — can pause *mint*, lower the cap, and set the fee recipient / rebalancer. It can never touch balances, change weights, or pause redeem.

An invariant test proves backing holds under randomized mint / redeem / rebalance sequences.

## Build

```bash
cd contracts && forge test              # 89 tests
cd web && npm install && npm run dev    # the app + site
```

## Status

Preview / testnet. Not audited yet. Underlying stock tokens are debt instruments of Robinhood Assets (Jersey) Ltd — **not equity**, no voting rights. Nothing here is investment advice.

---

**$FIDES** · on Robinhood Chain · [@FidesFi](https://x.com/FidesFi) · [live app](https://fidesfi-protocol.vercel.app)
