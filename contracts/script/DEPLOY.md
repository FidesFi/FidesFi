# Deploying Fides Frontier + v4 router (Robinhood Chain)

`DeployFidesFrontier.s.sol` deploys, in one broadcast:

1. `FidesUniV4Router` — the Uniswap v4 adapter (`IFidesRouter`) the vault's `rebalance()` swaps through.
2. `FidesVault` ("Fides Frontier", `fFRNT`) — the fully-backed 6-stock index.
3. Every asset↔asset swap route, hopping through a common quote currency.

> **Mint/redeem go live the instant the vault deploys** — they never touch the router. Routes only
> matter once the agent rebalances. So even a routes-less deploy is already a usable product.

## Run

```bash
export PK=0x...                       # deployer key (also the tx sender)
source script/frontier.env           # the vars below
forge script script/DeployFidesFrontier.s.sol:DeployFidesFrontier \
  --rpc-url "$ALCHEMY_RHC_URL" --private-key "$PK" --broadcast
```

Every value is read from env and **reverts loudly if unset** — no silent zero-address deploys.

## Env vars

### Known / decided

| Var | Value | Source |
|---|---|---|
| `FIDES_POOL_MANAGER` | `0x8366a39CC670B4001A1121B8F6A443A643e40951` | Uniswap v4 PoolManager on RHC (The Index docs) |
| `FIDES_NVDA_TOKEN` | `0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec` | verified on-chain (konsep-fides.md) |
| `FIDES_OWNER` / `FIDES_GUARDIAN` / `FIDES_REBALANCER` / `FIDES_FEE_RECIPIENT` | your addresses | you |
| `FIDES_MINT_FEE_BPS` | e.g. `20` (0.20%, ≤ 50) | policy |
| `FIDES_MAX_SLIPPAGE_BPS` | e.g. `100` (1%) | policy |
| `FIDES_MAX_TURNOVER_BPS` | e.g. `5000` (50%) | policy |
| `FIDES_REBALANCE_COOLDOWN` | e.g. `604800` (7d) | policy |
| `FIDES_SUPPLY_CEILING` / `FIDES_SUPPLY_CAP` | share caps (wei) | policy |
| `FIDES_<SYM>_UNIT` | initial backing per 1e18 shares, per token decimals | you (defines 1 share) |

### 🔒 BLOCKED — must fetch from RHC before deploy

`docs.robinhood.com/chain` is JS-rendered / blocked from static fetch. Get these via **browser MCP**
on the docs, or `cast`/Blockscout against chain 4663:

| Var | What | How |
|---|---|---|
| `FIDES_QUOTE` | USD-like currency each stock has a v4 pool against | RHC DEX docs / GeckoTerminal (browser MCP) |
| `FIDES_<SYM>_TOKEN` (AMD, MU, PLTR, GOOGL, SPCX) | tokenized-stock addresses | RHC token list / Blockscout |
| `FIDES_<SYM>_ORACLE` | Chainlink `AggregatorV3Interface` feed per stock (8-dec) | docs.robinhood.com/chain/oracles-and-price-feeds |
| `FIDES_POOL_FEE` | v4 fee tier of the stock/quote pools (e.g. `3000`) | RHC pool config |
| `FIDES_POOL_SPACING` | v4 tickSpacing (e.g. `60`) | RHC pool config |
| `FIDES_POOL_HOOKS` | hooks addr (often `0x0`) | RHC pool config |

> ⚠️ **Before mainnet:** fork-test the router against live RHC v4 pools. `IUniswapV4Minimal.sol` is a
> hand-written subset; `test/mocks/MockV4PoolManager.sol` validates *our* accounting, not RHC's real
> pool behaviour (fees, hooks, price impact).

## Assumption to verify

The router routes stock→stock via `FIDES_QUOTE` (2 hops), because tokenized stocks pair against a
quote, not each other. **If RHC has direct stock↔stock v4 pools**, register 1-hop routes instead
(cheaper) — the adapter already supports any hop count via `setRoute`.
