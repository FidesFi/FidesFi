# Testnet deploy (Robinhood Chain testnet, chain 46630)

RHC testnet **does have real Robinhood stock tokens** (obtainable from a testnet faucet — verified
`uiMultiplier()==1e18`), but **no Chainlink stock feeds** (those are mainnet-only). Two deploy paths:

**A. `DeployFidesTestnet.s.sol` — fully self-contained** (no dependencies, deploy anywhere):
- 5 `MockStockToken` (NVDA/AMD/MU/PLTR/GOOGL, 18-dec, open mint)
- 5 `MockStockOracle` (8-dec, settable price, seeded to the live mainnet prices)
- 1 `MockV4PoolManager`
- the **real** `FidesUniV4Router` + `FidesVault` on top

**B. `DeployFidesTestnetReal.s.sol` — real testnet stock tokens** (TSLA/AMD/AMZN/NFLX/PLTR the deployer
holds), with `MockStockOracle` standing in for the missing feeds. Mint/redeem/backing run on genuine
testnet stock tokens; only the price feed is mocked.

…then smoke-mints 1 share to the deployer. Everything the mainnet system does, with fakes for the
assets RH only ships on mainnet. **Never deploy these mocks to mainnet.**

## Validated

Simulated on a blank EVM (no key needed) — deploys the whole stack and mints 1 share end-to-end:

```bash
forge script script/DeployFidesTestnet.s.sol:DeployFidesTestnet    # -> "shares held by deployer: 1e18"
```

## Broadcast to testnet 46630

```bash
export PK=0x...                       # deployer key, funded with testnet ETH for gas
forge script script/DeployFidesTestnet.s.sol:DeployFidesTestnet \
  --rpc-url <RHC_TESTNET_RPC> --private-key "$PK" --broadcast
```

Needs: a **testnet RPC** (Alchemy RHC testnet endpoint, or the public testnet RPC) and **testnet ETH**
in the deployer for gas. The script logs every deployed address (vault, router, mock tokens/oracles).

Handy testnet infra (from `docs.robinhood.com/chain/protocol-contracts`, testnet column):
`L2 WETH = 0x7943e237c7F95DA44E0301572D358911207852Fa`, `Permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3`.
(Fides itself needs neither — quote is USDG-equivalent mock, gas is native ETH.)

## After deploy

- **Mint/redeem are live immediately** — that's the "product is alive" milestone.
- Move a mock price: `MockStockOracle.setAnswer(newPrice8)` to simulate market moves.
- **Rebalance demo (next):** fund the `MockV4PoolManager` with output tokens, `setRate` per pool,
  `router.setRoute(...)`, then call `vault.rebalance(...)` as the rebalancer. (Unit-tested already in
  `test/FidesUniV4Router.t.sol`; wiring it on testnet is a follow-up.)

## Live on testnet — proven end-to-end (19 Jul 2026, chain 46630)

Explorer: `explorer.testnet.chain.robinhood.com/address/<addr>` · `/tx/<hash>`

| What | Address / tx |
|---|---|
| **Vault — real assets** (TSLA/AMD/AMZN/NFLX/PLTR) | `0x1Fb3f8c9569bd45D1D7b9417Cb7aDa64D7552A94` |
| Vault — self-contained (mock) | `0xbbc3297beb20e8eD59db8d6DbB9FcC1A35b19fef` |
| Router (mock vault) · PoolManager | `0xbf8F1434d35D68CD3db1183a50B4084D2529a6a1` · `0xDcd709b2e6fD72A2bdf28257AeF88a7bfd35B92c` |
| **Redeem** in-kind (0.5 share → 5 tokens) | `0x0ec9829b5ed8bea7c18154c4ff616fc1934caadc7509aabc250d9672afee12b3` |
| **Rebalance** (agent: AMD→NVDA, stayed fully backed) | `0x43d2f29ed9c479fae75c823e3240ade758a7839ac57daded119129b18cf47dd8` |

Proven: **mint** (deposit basket → index token), **redeem** (burn → basket back, in-kind), **rebalance**
(agent rotates weights, backing invariant holds before & after). All verified with `cast`.

> Deploying via forge needs `--legacy --gas-estimate-multiplier 300` — the chain is "unsupported" so
> forge under-estimates the Arbitrum L1-calldata gas and deploys OOG without it.

## Mainnet is different

Mainnet deploy uses the **real** verified addresses in `frontier.env.example` via
`DeployFidesFrontier.s.sol` — no mocks. See `DEPLOY.md`.
