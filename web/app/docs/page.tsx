import { H1, H2, P, Ul, Callout, NextPage } from "./ui";

export default function Overview() {
  return (
    <article>
      <H1 kicker="Fides · documentation">Managed stock indexes with no custodian to trust</H1>

      <P>
        Fides is a set of onchain stock indexes on Robinhood Chain. Each index is a single ERC-20
        token backed one-to-one by a basket of tokenized stocks held in a vault contract. An
        autonomous agent manages the basket — rotating weights on a schedule — but it operates
        inside guardrails enforced by the contract itself.
      </P>
      <P>
        The point is a clean separation that traditional funds cannot offer:{" "}
        <b>management and custody are different powers</b>. The agent decides weights. The contract
        holds the assets. Neither can reach past its lane.
      </P>

      <H2 id="why">Why this exists</H2>
      <P>
        Every managed fund runs on one quiet assumption: the manager won&apos;t touch your money.
        Custody sits with people and processes you can&apos;t inspect, and redemption happens on
        their timeline, not yours.
      </P>
      <Ul
        items={[
          <>
            <b>Fully backed, provably.</b> Token supply can never exceed what the vault holds — an
            invariant checked on every mint, redeem, and rebalance, not a monthly attestation.
          </>,
          <>
            <b>Redeemable anytime, in-kind.</b> Burn the token, receive every underlying stock in
            one transaction. No queue, no approval, and no admin can pause it.
          </>,
          <>
            <b>Managed in the open.</b> Every rebalance is a public transaction with its rationale
            attached. You can read <i>why</i>, not just <i>what</i>.
          </>,
        ]}
      />

      <H2 id="loop">The loop</H2>
      <P>
        <b>Mint</b> — deposit the basket, receive the index token. <b>Manage</b> — the agent
        rotates weights within fixed rails (whitelist, slippage cap, turnover cap, cooldown).{" "}
        <b>Redeem</b> — burn the token, take the stocks back. That&apos;s the whole product; every
        arrow in it is a transaction anyone can verify.
      </P>

      <Callout title="Status · mainnet">
        Fides is live on Robinhood Chain <b>mainnet</b> (chain 4663): a vault backed by real
        Robinhood stock tokens with verified Chainlink feeds, in-kind mint/redemption, and
        agent rebalancing wired through live Uniswap v4 pools. Contracts are open source with a
        111-test suite (unit, fuzz, invariant, and fork tests against mainnet state) — see{" "}
        <a href="/docs/contracts" className="border-b border-green text-ink">
          Contracts &amp; addresses
        </a>{" "}
        for the live records.
      </Callout>

      <NextPage href="/docs/how-it-works" label="How it works" />
    </article>
  );
}
