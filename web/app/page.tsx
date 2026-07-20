import { Landing } from "./components/Landing";
import { getVaultData, getLatestRebalance } from "./lib/vault";

// live on-chain read every request (cheap, low traffic); keeps the numbers real
export const dynamic = "force-dynamic";

export default async function Home() {
  const [vault, rebalance] = await Promise.all([getVaultData(), getLatestRebalance()]);
  return <Landing vault={vault} rebalance={rebalance} />;
}
