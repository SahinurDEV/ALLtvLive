import type { Metadata } from "next";
import Link from "next/link";
import { Tv, Shield, Lock, Mail, Server } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — ALLtvLive",
  description:
    "How ALLtvLive handles your data. No accounts, no ads, no trackers in the mobile app — your favorites and settings stay on your device.",
};

const UPDATED = "9 July 2026";
const SUPPORT_EMAIL = "support@livetv.sahinur.dev";
const DMCA_EMAIL = "dmca@livetv.sahinur.dev";

export default function PrivacyPage() {
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
          Privacy <span className="text-neon">Policy</span>
        </h1>
        <p className="text-muted-foreground mb-8">Last updated: {UPDATED}</p>

        <section className="space-y-3 mb-8">
          <p className="text-sm leading-relaxed text-muted-foreground">
            ALLtvLive (&ldquo;the App&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
            is a live-TV directory that lets you watch publicly available
            television streams aggregated from the open-source{" "}
            <a
              href="https://github.com/iptv-org/iptv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon hover:underline"
            >
              iptv-org
            </a>{" "}
            project. This policy explains what data the App and this website do
            and do not handle.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-neon" />
            Summary
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">
              Our mobile app collects no personal data.
            </strong>{" "}
            It has no user accounts, no advertising, no analytics, and no
            third-party trackers.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5 text-neon" />
            Stored on your device only
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your favorite channels, recently-watched history, in-app settings,
            and any custom channels you add are saved locally on your device and
            are never transmitted to us or anyone else. You can erase all of it
            at any time by clearing the app&apos;s storage or uninstalling it.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Server className="h-5 w-5 text-neon" />
            Network connections
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            To function, the App connects to iptv-org to download the public
            channel catalog, to the ALLtvLive service to fetch the curated
            featured list, and to broadcasters&apos; stream servers/CDNs (only
            when you play a channel). As with any internet app, your
            device&apos;s IP address is necessarily visible to the servers it
            connects to in order to deliver data to you. We do not log, profile,
            or associate this information with you.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">No ads, no trackers</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The mobile app contains no advertising, no analytics, and no tracking
            technologies. We do not build advertising profiles and do not sell
            data. This website may use privacy-friendly, cookieless, aggregate
            analytics that do not identify individual visitors.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">Content ownership</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The App does not host, upload, cache, or redistribute any video
            content. All streams are delivered directly by their original
            broadcasters. If you believe a stream infringes your rights, contact
            us and we will remove it promptly.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">Children</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The App is not directed to children under 13 and does not knowingly
            collect any information from them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-neon" />
            Contact
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Support:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-neon hover:underline">
              {SUPPORT_EMAIL}
            </a>
            <br />
            Copyright / removal requests:{" "}
            <a href={`mailto:${DMCA_EMAIL}`} className="text-neon hover:underline">
              {DMCA_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
