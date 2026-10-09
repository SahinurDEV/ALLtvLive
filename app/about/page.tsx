import type { Metadata } from "next";
import Link from "next/link";
import { Tv, Shield, Github, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "About ALLtvLive",
  description:
    "ALLtvLive aggregates publicly available live TV streams from the open-source iptv-org project. Learn how it works and how to report issues.",
};

export default function AboutPage() {
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

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          About <span className="text-neon">ALLtvLive</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          A free directory of publicly available live TV channels from around the world.
        </p>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-neon" />
            How it works
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ALLtvLive is a directory and player interface for the open-source
            {" "}
            <a
              href="https://github.com/iptv-org/iptv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon hover:underline"
            >
              iptv-org
            </a>{" "}
            project — a community-maintained catalog of publicly broadcast live TV
            streams. When you click play, your browser connects directly to the
            broadcaster&apos;s server. We do not host, cache, transcode, or
            redistribute any video content.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            No account, no signup, no tracking beyond basic anonymous analytics.
            Favorites and settings live only in your browser&apos;s local
            storage.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">Content & copyright</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            All stream URLs are sourced from the public iptv-org catalog.
            Availability, licensing, and regional restrictions are controlled by
            each individual broadcaster. If you are a rights holder and believe
            a stream should not be listed, please open an issue directly at{" "}
            <a
              href="https://github.com/iptv-org/iptv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon hover:underline"
            >
              github.com/iptv-org/iptv
            </a>
            {" "}where the catalog is maintained.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">Privacy</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We use IP-based geolocation via a public API to suggest channels
            from your country. No personal data is stored on our servers.
            Advertisements, when enabled, are served by Google AdSense subject
            to Google&apos;s privacy policy.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">Open source</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ALLtvLive is open source under the MIT license.
          </p>
          <a
            href="https://github.com/SahinurDEV/ALLtvLive"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-neon hover:underline"
          >
            <Github className="h-4 w-4" />
            View on GitHub
            <ExternalLink className="h-3 w-3" />
          </a>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">Report a problem</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Broken stream? Use the &ldquo;Report&rdquo; button on the player
            when a channel fails. Security concerns can be filed as a GitHub
            issue.
          </p>
        </section>

        <hr className="border-border/40 my-8" />

        <p className="text-xs text-muted-foreground">
          ALLtvLive is not affiliated with, endorsed by, or sponsored by any
          broadcaster, network, or the iptv-org project. All trademarks belong
          to their respective owners.
        </p>
      </div>
    </div>
  );
}
