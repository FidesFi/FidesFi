import { Landing } from "./components/Landing";
import { getVaultData } from "./lib/vault";

// live on-chain read every request (cheap, low traffic); keeps the numbers real
export const dynamic = "force-dynamic";

export default async function Home() {
  const vault = await getVaultData();
  return <Landing vault={vault} />;
}
