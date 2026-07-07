import type { Metadata } from "next";
import { ChannelRedirect } from "./ChannelRedirect";

interface Props {
  params: Promise<{ channel: string }>;
}

async function fetchChannelMeta(id: string): Promise<{
  name?: string;
  logo?: string | null;
  country?: string;
  categories?: string[];
} | null> {
  try {
    const [channelsRes, logosRes] = await Promise.all([
      fetch("https://iptv-org.github.io/api/channels.json", {
        next: { revalidate: 3600 },
      }),
      fetch("https://iptv-org.github.io/api/logos.json", {
        next: { revalidate: 3600 },
      }),
    ]);
    if (!channelsRes.ok) return null;
    const channels: Array<{
      id: string;
      name: string;
      country: string;
      categories: string[];
    }> = await channelsRes.json();
    const channel = channels.find((c) => c.id === id);
    if (!channel) return null;
    let logo: string | null = null;
    if (logosRes.ok) {
      const logos: Array<{ channel: string; url: string }> = await logosRes.json();
      logo = logos.find((l) => l.channel === id)?.url || null;
    }
    return {
      name: channel.name,
      logo,
      country: channel.country,
      categories: channel.categories,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { channel: id } = await params;
  const meta = await fetchChannelMeta(id);
  if (!meta?.name) {
    return {
      title: "ALLtvLive - Live TV Channel",
      description: "Watch this live TV channel free on ALLtvLive.",
    };
  }
  const title = `${meta.name} - Live on ALLtvLive`;
  const description = `Watch ${meta.name} live for free — ${
    meta.categories?.join(", ") || "TV"
  } from ${meta.country || "worldwide"}. No signup required.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: meta.logo ? [{ url: meta.logo }] : undefined,
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: meta.logo ? [meta.logo] : undefined,
    },
  };
}

export default async function ChannelPage({ params }: Props) {
  const { channel } = await params;
  return <ChannelRedirect channelId={channel} />;
}
