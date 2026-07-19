import { H1, H2, P, Callout, Table, Code, Mono } from "../ui";

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
const VAULT = "0x1Fb3f8c9569bd45D1D7b9417Cb7aDa64D7552A94";

const A = ({ path, children }: { path: string; children: React.ReactNode }) => (
  <a
    href={`${EXPLORER}/${path}`}
    target="_blank"
    rel="noopener noreferrer"
    className="border-b border-green font-mono text-[12.5px] text-ink"
  >
    {children}
  </a>
);
const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

export default function Contracts() {
  return (
    <article>
      <H1 kicker="Docs · live records">Contracts &amp; addresses</H1>

      <P>
        Everything below is live on Robinhood Chain <b>testnet</b> (chain id <Mono>46630</Mono>,
        explorer <Mono>explorer.testnet.chain.robinhood.com</Mono>). Don&apos;t take the docs&apos;
        word for any of it — every row links to the chain.
      </P>

      <H2 id="vault">The live vault</H2>
      <Table
        head={["Contract", "Address"]}
        rows={[
          [
            <span key="v"><b>FidesVault</b> — &quot;Fides Frontier (testnet, real assets)&quot;</span>,
            <A key="va" path={`address/${VAULT}`}>{short(VAULT)} ↗</A>,
          ],
          [
            <span key="r"><b>FidesUniV4Router</b> — swap adapter</span>,
            <A key="ra" path="address/0xBa8DbbE3C24B38ea48acc2d530331aD8aFc90998">{short("0xBa8DbbE3C24B38ea48acc2d530331aD8aFc90998")} ↗</A>,
          ],
        ]}
      />

      <H2 id="basket">The basket — real Robinhood testnet stock tokens</H2>
      <Table
        head={["Stock", "Token address"]}
        rows={[
          ["Tesla (TSLA)", <A key="1" path="address/0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E">{short("0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E")} ↗</A>],
          ["AMD (AMD)", <A key="2" path="address/0x71178BAc73cBeb415514eB542a8995b82669778d">{short("0x71178BAc73cBeb415514eB542a8995b82669778d")} ↗</A>],
          ["Amazon (AMZN)", <A key="3" path="address/0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02">{short("0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02")} ↗</A>],
          ["Netflix (NFLX)", <A key="4" path="address/0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93">{short("0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93")} ↗</A>],
          ["Palantir (PLTR)", <A key="5" path="address/0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0">{short("0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0")} ↗</A>],
        ]}
      />

      <H2 id="proof">The proven loop — receipts</H2>
      <Table
        head={["Operation", "What happened", "Transaction"]}
        rows={[
          [
            <b key="m">Mint</b>,
            "deposited the 5-stock basket → minted 1 index token, fully backed",
            <A key="mt" path="tx/0x4f8a9a416df7e71d9ac0b8b518a063197a740c1ac5c9e8aaf6b46865e32f90df">{short("0x4f8a9a416df7e71d9ac0b8b518a063197a740c1ac5c9e8aaf6b46865e32f90df")} ↗</A>,
          ],
          [
            <b key="rb">Rebalance</b>,
            "agent trimmed AMD → added TSLA; fully backed before and after; supply untouched",
            <A key="rbt" path="tx/0x1c00daa3a0ea3f7db0191a26d1b66456a4e8ce31278bbecc99da8b6abbebab32">{short("0x1c00daa3a0ea3f7db0191a26d1b66456a4e8ce31278bbecc99da8b6abbebab32")} ↗</A>,
          ],
          [
            <b key="rd">Redeem</b>,
            "burned 0.5 index token → all 5 stocks returned in-kind, one tx",
            <A key="rdt" path="tx/0xb5efff6a5e72fdaea677d07c057e94d0ef2debeb4c30403191b7a79fdb0ba98f">{short("0xb5efff6a5e72fdaea677d07c057e94d0ef2debeb4c30403191b7a79fdb0ba98f")} ↗</A>,
          ],
        ]}
      />

      <H2 id="verify">Verify it yourself</H2>
      <P>With Foundry&apos;s <Mono>cast</Mono> against any testnet RPC:</P>
      <Code>{`# is one token still fully backed by the basket?
cast call ${VAULT} "isFullyBacked()(bool)" --rpc-url https://rpc.testnet.chain.robinhood.com

# portfolio value (USD, 18 decimals) and supply
cast call ${VAULT} "nav()(uint256)"         --rpc-url https://rpc.testnet.chain.robinhood.com
cast call ${VAULT} "totalSupply()(uint256)" --rpc-url https://rpc.testnet.chain.robinhood.com

# what the vault actually holds (e.g. TSLA)
cast call 0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E \\
  "balanceOf(address)(uint256)" ${VAULT} \\
  --rpc-url https://rpc.testnet.chain.robinhood.com`}</Code>

      <Callout title="Mainnet">
        Mainnet (chain 4663) deployment config is prepared with on-chain-verified addresses — the
        USDG quote, the stock tokens, the Chainlink feed proxies, and the Uniswap v4 PoolManager —
        and ships after the hardening pass. Source and deploy scripts are public on{" "}
        <a href="https://github.com/FidesFi/FidesFi" target="_blank" rel="noopener noreferrer" className="border-b border-green text-ink">
          GitHub
        </a>.
      </Callout>
    </article>
  );
}
