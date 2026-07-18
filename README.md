# Fides

Managed, fully-backed stock indexes on **Robinhood Chain** (chain 4663). One token per index, minted and redeemed in-kind against tokenized stocks. An autonomous agent rebalances the weights — **within on-chain guardrails it cannot escape** — and every rebalance is published on-chain.

> Verify, don't trust. The agent can *manage* your basket. It can never *withdraw* it.

## Baskets

- **Fides Frontier** — AI & compute: NVDA, AMD, MU, PLTR, GOOGL, SPCX
- **Fides Blue** — mega-cap core: AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA

## What's here

| Path | |
|---|---|
| `contracts/` | the vault + **73 tests** (unit · fuzz · invariant · fork · adversarial). See `contracts/README.md`. |
| `web-preview/` | design preview — **mock data, labeled `preview`**, not live |
| `brand/` | logo |

## Guarantees (enforced by the contract)

- **Backing** — every share is always fully backed; redemption is always solvent.
- **No drain** — funds leave only via your own redemption or whitelisted-router swaps during a rebalance.
- **Redeem is never pausable.**
- **Closed asset set** — the whitelist is fixed at deploy.
- **Bounded guardian** — can pause *mint*, lower the cap, and set the fee recipient / rebalancer. It can never touch balances, change weights, or pause redeem.

An invariant test proves backing holds under randomized mint / redeem / rebalance sequences.

## Build

```bash
cd contracts && forge test
```

## Status

Preview / testnet. Not audited yet. Underlying stock tokens are debt instruments of Robinhood Assets (Jersey) Ltd — **not equity**, no voting rights. Nothing here is investment advice.

---

**$FIDES** · on Robinhood Chain · [@FidesFi](https://x.com/FidesFi)
