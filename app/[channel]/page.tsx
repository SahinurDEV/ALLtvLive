import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchApp } from "@/components/WatchApp";
import { isBlocked } from "@/lib/blocklist";
import { getCatalog, SITE_URL, type CatalogChannel } from "@/lib/server/catalog";

interface Props {
  params: Promise<{ channel: string }>;
}

// Channels that live only in the browser (user-added) or in the admin
// broadcast list are not in the iptv-org catalog but are valid URLs.
const LOCAL_PREFIXES = ["custom-", "bc-"];

type Lookup = { status: "found"; channel: CatalogChannel } | { status: "missing" } | { status: "unknown" };

async function lookup(id: string): Promise<Lookup> {
  try {
    const catalog = await getCatalog();
    const channel = catalog.get(id);
    return channel ? { status: "found", channel } : { status: "missing" };
  } catch {
    return { status: "unknown" };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent((await params).channel);
  const res = await lookup(id);
  if (res.status !== "found") {
    return {
      title: "ALLtvLive - Live TV Channel",
      description: "Watch this live TV channel free on ALLtvLive.",
      robots: { index: false },
    };
  }
  const meta = res.channel;
  const title = `${meta.name} - Live on ALLtvLive`;
  const description = `Watch ${meta.name} live for free: ${
    meta.categories.join(", ") || "TV"
  } from ${meta.country || "worldwide"}. No signup required.`;
  const url = `${SITE_URL}/${encodeURIComponent(meta.id)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: meta.logo ? [{ url: meta.logo }] : undefined,
      type: "video.other",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: meta.logo ? [meta.logo] : undefined,
    },
  };
}

export default async function ChannelPage({ params }: Props) {
  const id = decodeURIComponent((await params).channel);
  if (isBlocked(id)) notFound();
  const isLocal = LOCAL_PREFIXES.some((p) => id.startsWith(p));
  const res = isLocal ? ({ status: "unknown" } as Lookup) : await lookup(id);
  if (res.status === "missing") notFound();

  const ch = res.status === "found" ? res.channel : null;
  const jsonLd = ch
    ? {
        "@context": "https://schema.org",
        "@type": "BroadcastService",
        name: ch.name,
        url: `${SITE_URL}/${encodeURIComponent(ch.id)}`,
        logo: ch.logo || undefined,
        areaServed: ch.country || undefined,
        inLanguage: ch.languages.length ? ch.languages : undefined,
        genre: ch.categories.length ? ch.categories : undefined,
      }
    : null;

  return (
    <>
      {ch && (
        <>
          <h1 className="sr-only">{`${ch.name} live stream`}</h1>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
          />
        </>
      )}
      <WatchApp initialChannelId={id} />
    </>
  );
}
