import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, SITE_URL } from "@/lib/server/catalog";
import { getHiddenSet } from "@/lib/server/hiddenChannels";
import { LANDING_LIMIT, pickChannels } from "@/lib/server/landing";
import { ChannelListPage } from "@/components/seo/ChannelListPage";

export const revalidate = 86400;

type Props = { params: Promise<{ code: string }> };

const label = (k: string) => k.toUpperCase();

async function load(key: string) {
  if (!/^[a-z0-9-]{2,30}$/.test(key)) return null;
  try {
    const [catalog, hidden] = await Promise.all([getCatalog(), getHiddenSet()]);
    const list = pickChannels(catalog.values(), "country", key, hidden);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = (await params).code.toLowerCase();
  const name = label(key);
  const url = `${SITE_URL}/country/${key}`;
  const title = `${name} live TV channels - ALLtvLive`;
  return {
    title,
    description: `Watch ${name} live TV channels free on ALLtvLive. No signup required.`,
    alternates: { canonical: url },
    openGraph: { title, url, type: "website" },
  };
}

export default async function Page({ params }: Props) {
  const key = (await params).code.toLowerCase();
  const list = await load(key);
  if (!list) notFound();
  const name = label(key);
  const shown = list.slice(0, LANDING_LIMIT);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${name} live TV channels`,
    numberOfItems: list.length,
    itemListElement: shown.slice(0, 50).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/${encodeURIComponent(c.id)}`,
      name: c.name,
    })),
  };
  return <ChannelListPage kind="country" name={name} channels={shown} jsonLd={jsonLd} />;
}
