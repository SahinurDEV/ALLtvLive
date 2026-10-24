import Link from "next/link";
import { Tv } from "lucide-react";

export const metadata = {
  title: "Channel not found — ALLtvLive",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-neon/10 flex items-center justify-center">
          <Tv className="h-7 w-7 text-neon" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">This page or channel isn&apos;t here</h1>
        <p className="text-sm text-muted-foreground">
          The link may be mistyped, or the channel may have been removed from the
          catalog or taken down at the rights holder&apos;s request.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/watch"
            className="rounded-lg bg-neon text-black font-semibold text-sm px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Browse channels
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border text-sm px-4 py-2 hover:bg-secondary transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
