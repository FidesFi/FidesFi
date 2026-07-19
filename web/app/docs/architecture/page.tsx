import { H1, H2, P, Ul, Callout, Table, Mono, NextPage } from "../ui";

export default function Architecture() {
  return (
    <article>
      <H1 kicker="Docs · system design">Architecture</H1>

      <P>
        Three components, each with the minimum power it needs. The vault is the only one that ever
        holds funds.
      </P>

      <Table
        head={["Component", "Where", "Role", "Power over funds"]}
        rows={[
          [
            <Mono key="v">FidesVault</Mono>,
            "onchain",
            "ERC-20 index token + custody + every rule (mint, redeem, rebalance rails, invariants)",
            <b key="vp">Full — and rule-bound</b>,
          ],
          [
            <Mono key="r">FidesUniV4Router</Mono>,
            "onchain",
            "Adapter that executes the vault's swaps over Uniswap v4 (multi-hop through a quote currency)",
            "Transient only — pulls in, swaps, pushes back in one call",
          ],
          [
            "Agent",
            "offchain",
            "Momentum strategy → swap plan → submits rebalance() with its rationale",
            <b key="ap">None — holds only the rebalancer key</b>,
          ],
        ]}
      />

      <H2 id="vault">FidesVault</H2>
      <P>
        A single contract per index: ERC-20 token, asset custody, and all policy. Configuration
        that matters for safety — the asset set, slippage/turnover caps, cooldown, fee cap, supply
        ceiling — is <b>immutable after deploy</b>. The mutable surface (guardian actions) is
        deliberately tiny and can never move balances or block redemption.
      </P>

      <H2 id="router">FidesUniV4Router</H2>
      <P>
        The vault doesn&apos;t speak Uniswap; it calls one clean interface —{" "}
        <Mono>swap(tokenIn, tokenOut, amountIn, minOut)</Mono>. The adapter walks an owner-registered
        route of v4 pools (stock → quote → stock, since stocks pair against a quote currency, not
        each other) inside a single lock. It is stateless with respect to funds: a malicious or
        buggy route can at worst waste one approved <Mono>amountIn</Mono> — already bounded by the
        vault&apos;s turnover and slippage rails — and can never drain custody.
      </P>

      <H2 id="agent">The agent</H2>
      <P>
        Runs offchain: fetch prices → compute momentum-tilted target weights (with per-asset caps)
        → plan the smallest set of swaps within the turnover budget → submit. Its key is a{" "}
        <b>rebalancer session key</b>: the only function it can successfully call on the vault is{" "}
        <Mono>rebalance()</Mono>.
      </P>
      <Ul
        items={[
          <>If the agent dies, the product degrades gracefully: mint and redeem keep working; the basket just stops rotating.</>,
          <>If the key leaks, the attacker inherits the same cage — bounded trades inside the rails, no withdrawals.</>,
        ]}
      />

      <H2 id="oracles">Price oracles</H2>
      <P>
        Valuation uses Chainlink stock feeds (<Mono>AggregatorV3Interface</Mono>, 8 decimals) — the
        official oracle stack on Robinhood Chain. Oracles gate <i>rebalance quality</i> (slippage
        checks and NAV); they are intentionally <b>not</b> in the redemption path.
      </P>
      <Callout title="Testnet note" tone="amber">
        Chainlink stock feeds exist on mainnet only. The testnet deployment uses settable mock
        oracles seeded to real prices so the full loop can run; the tokens themselves are genuine
        Robinhood testnet stock tokens. Mainnet uses the verified Chainlink proxies.
      </Callout>

      <NextPage href="/docs/security" label="Security & invariants" />
    </article>
  );
}
