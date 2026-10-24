import type { Metadata } from "next";
import { MultiView } from "@/components/multiview/MultiView";

export const metadata: Metadata = {
  title: "Multi-view: watch up to 4 channels — ALLtvLive",
  description: "Watch two to four live TV channels side by side.",
  alternates: { canonical: "/multiview" },
};

export default function MultiViewPage() {
  return <MultiView />;
}
