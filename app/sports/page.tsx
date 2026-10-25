import type { Metadata } from "next";
import { SportsHub } from "@/components/sports/SportsHub";

export const metadata: Metadata = {
  title: "Sports hub: today's live sports on TV — ALLtvLive",
  description: "Live and upcoming sports on free live TV channels today, with reminders.",
  alternates: { canonical: "/sports" },
};

export default function SportsPage() {
  return <SportsHub />;
}
