import type { Metadata } from "next";
import { Workbench } from "./workbench";

export const metadata: Metadata = {
  title: "Aurelis Re | Analytics Workbench",
  description: "Governed reinsurance model execution and result analysis.",
};

export default function Home() {
  return <Workbench />;
}
