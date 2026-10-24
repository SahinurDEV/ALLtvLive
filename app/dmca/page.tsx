import type { Metadata } from "next";
import Link from "next/link";
import { Tv, Scale, Github, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Copyright & Takedown (DMCA) — ALLtvLive",
  description:
    "How rights holders can ask for a channel to be removed from ALLtvLive, and what happens after a request.",
  alternates: { canonical: "/dmca" },
};

const ISSUE_URL =
  "https://github.com/SahinurDEV/ALLtvLive/issues/new?template=takedown.md&labels=takedown";

export default function DmcaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-neon transition-colors mb-6"
        >
          <Tv className="h-4 w-4" />
          Back to ALLtvLive
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
          <Scale className="h-8 w-8 text-neon shrink-0" />
          Copyright &amp; Takedown
        </h1>
        <p className="text-muted-foreground mb-8">
          We respect the rights of broadcasters and content owners.
        </p>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">What ALLtvLive is</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ALLtvLive is a directory and player for links listed in the public{" "}
            <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noopener noreferrer" className="text-neon hover:underline">
              iptv-org
            </a>{" "}
            catalog. We do not host, cache, transcode or re-upload any video. When you
            press play, your browser connects directly to the stream&apos;s own server.
            A link being listed does not mean ALLtvLive or iptv-org has a license for it.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">How to request removal</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>Open a takedown request with the channel name and its ALLtvLive link.</li>
            <li>Say which rights holder you represent and which work is affected.</li>
            <li>Include a good-faith statement that the use is not authorized.</li>
          </ol>
          <a
            href={ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-neon text-black font-semibold text-sm px-4 py-2 hover:opacity-90 transition-opacity"
          >
            <Github className="h-4 w-4" />
            Open a takedown request
            <ExternalLink className="h-3 w-3" />
          </a>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">What happens next</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Valid requests are added to our blocklist, which hides the channel from the
            catalog, search, channel pages, the public API and the mobile app. We aim to
            act within 72 hours. Because the stream itself lives on another server, you may
            also want to contact the iptv-org project at{" "}
            <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noopener noreferrer" className="text-neon hover:underline">
              github.com/iptv-org/iptv
            </a>{" "}
            and the stream&apos;s host.
          </p>
        </section>

        <hr className="border-border/40 my-8" />
        <p className="text-xs text-muted-foreground">
          ALLtvLive is not affiliated with, endorsed by, or sponsored by any broadcaster,
          network, or the iptv-org project. All trademarks and logos belong to their owners.
        </p>
      </div>
    </div>
  );
}
