# Testnet deploy (Robinhood Chain testnet, chain 46630)

RHC **testnet has no real stock tokens or Chainlink feeds** — those are a mainnet-only Robinhood
product. So `DeployFidesTestnet.s.sol` stands up a **self-contained** stack:

- 5 `MockStockToken` (NVDA/AMD/MU/PLTR/GOOGL, 18-dec, open mint)
- 5 `MockStockOracle` (8-dec, settable price, seeded to the live mainnet prices)
- 1 `MockV4PoolManager`
- the **real** `FidesUniV4Router` + `FidesVault` on top

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

## Mainnet is different

Mainnet deploy uses the **real** verified addresses in `frontier.env.example` via
`DeployFidesFrontier.s.sol` — no mocks. See `DEPLOY.md`.
