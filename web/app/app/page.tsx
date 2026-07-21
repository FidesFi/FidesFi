import type { Metadata } from "next";
import { AppClient } from "./AppClient";

export const metadata: Metadata = {
  title: "Fides App — mint & redeem on testnet",
  description: "Mint and redeem the live Fides index on Robinhood Chain testnet.",
};

// The app is wallet-stateful end to end (header chip included), so it lives in one client tree.
export default function AppPage() {
  return <AppClient />;
}
