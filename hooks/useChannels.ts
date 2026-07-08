"use client";

import useSWR from "swr";
import { useMemo, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import type {
  Channel,
  Stream,
  Country,
  Category,
  Language,
  Logo,
  ChannelWithMeta,
  CustomChannel,
  BroadcastChannel,
} from "@/lib/types";
import { fetcher } from "@/lib/api";
import { generateViewerCount } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useBroadcastChannels } from "@/hooks/useBroadcastChannels";

const BASE_URL = "https://iptv-org.github.io/api";

function customToChannelWithMeta(c: CustomChannel): ChannelWithMeta {
  return {
    id: c.id,
    name: c.name,
    alt_names: [],
    network: null,
    owners: [],
    country: "INT",
    subdivision: null,
    city: null,
    broadcast_area: [],
    languages: [],
    categories: c.category ? [c.category] : [],
    is_nsfw: false,
    launched: null,
    closed: null,
    replaced_by: null,
    website: null,
    logo: c.logo || null,
    streams: [
      {
        channel: c.id,
        feed: null,
        title: c.name,
        url: c.url,
        quality: null,
        user_agent: null,
        referrer: null,
      },
    ],
    countryInfo: undefined,
    viewerCount: 0,
    isLive: true,
  };
}

function broadcastToChannelWithMeta(
  c: BroadcastChannel,
  countryMap: Map<string, Country>
): ChannelWithMeta {
  const countryCode = c.country || "INT";
  return {
    id: c.id,
    name: c.name,
    alt_names: [],
    network: null,
    owners: [],
    country: countryCode,
    subdivision: null,
    city: null,
    broadcast_area: [],
    languages: [],
    categories: c.category ? [c.category] : [],
    is_nsfw: false,
    launched: null,
    closed: null,
    replaced_by: null,
    website: null,
    logo: c.logo || null,
    streams: [
      {
        channel: c.id,
        feed: null,
        title: c.name,
        url: c.url,
        quality: null,
        user_agent: null,
        referrer: null,
      },
    ],
    countryInfo: countryMap.get(countryCode),
    viewerCount: 0,
    isLive: true,
  };
}

export function useChannels() {
  const {
    data: channels,
    error: channelsError,
    isLoading: channelsLoading,
  } = useSWR<Channel[]>(`${BASE_URL}/channels.json`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  });

  const {
    data: streams,
    error: streamsError,
    isLoading: streamsLoading,
  } = useSWR<Stream[]>(`${BASE_URL}/streams.json`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  });

  const { data: logos } = useSWR<Logo[]>(
    `${BASE_URL}/logos.json`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const { data: countries } = useSWR<Country[]>(
    `${BASE_URL}/countries.json`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const { data: categories } = useSWR<Category[]>(
    `${BASE_URL}/categories.json`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const { data: languages } = useSWR<Language[]>(
    `${BASE_URL}/languages.json`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const filters = useAppStore((s) => s.filters);
  const setAllChannels = useAppStore((s) => s.setAllChannels);
  const userCountry = useAppStore((s) => s.userCountry);
  const brokenChannelIds = useAppStore((s) => s.brokenChannelIds);
  const hideBroken = useAppStore((s) => s.settings.hideBrokenChannels);
  const customChannels = useAppStore((s) => s.customChannels);

  const { channels: broadcastChannels } = useBroadcastChannels();

  const brokenSet = useMemo(() => new Set(brokenChannelIds), [brokenChannelIds]);

  // Build stream lookup map (channel id -> streams)
  const streamMap = useMemo(() => {
    if (!streams) return new Map<string, Stream[]>();
    const map = new Map<string, Stream[]>();
    for (const stream of streams) {
      // Skip streams without a channel ID
      if (!stream.channel) continue;
      const existing = map.get(stream.channel);
      if (existing) {
        existing.push(stream);
      } else {
        map.set(stream.channel, [stream]);
      }
    }
    return map;
  }, [streams]);

  // Build logo lookup map (channel id -> logo url)
  const logoMap = useMemo(() => {
    if (!logos) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const logo of logos) {
      if (!map.has(logo.channel)) {
        map.set(logo.channel, logo.url);
      }
    }
    return map;
  }, [logos]);

  // Country lookup map
  const countryMap = useMemo(() => {
    if (!countries) return new Map<string, Country>();
    return new Map(countries.map((c) => [c.code, c]));
  }, [countries]);

  // Stable viewer counts
  const viewerCountRef = useRef(new Map<string, number>());

  // Convert custom channels to ChannelWithMeta format
  const customEnriched = useMemo(() => {
    return customChannels.map<ChannelWithMeta>((c) => customToChannelWithMeta(c));
  }, [customChannels]);

  // Convert admin-managed broadcast channels
  const broadcastEnriched = useMemo(() => {
    return broadcastChannels.map<ChannelWithMeta>((c) =>
      broadcastToChannelWithMeta(c, countryMap)
    );
  }, [broadcastChannels, countryMap]);

  // Build enriched channels — only those with at least one stream
  const enrichedChannels = useMemo(() => {
    if (!channels || !streams) return [...customEnriched, ...broadcastEnriched];

    const result: ChannelWithMeta[] = [];
    const vcMap = viewerCountRef.current;

    for (const channel of channels) {
      if (channel.is_nsfw) continue;

      const channelStreams = streamMap.get(channel.id);
      // Skip channels with no streams at all
      if (!channelStreams || channelStreams.length === 0) continue;

      // Filter or deprioritize broken channels
      if (hideBroken && brokenSet.has(channel.id)) continue;

      if (!vcMap.has(channel.id)) {
        vcMap.set(channel.id, generateViewerCount());
      }

      const logoUrl = logoMap.get(channel.id) || null;

      result.push({
        ...channel,
        logo: logoUrl,
        streams: channelStreams,
        countryInfo: countryMap.get(channel.country),
        viewerCount: vcMap.get(channel.id)!,
        isLive: true,
      });
    }

    // Sort by viewer count, but push any broken channels to the bottom
    // (they only reach here if hideBroken is false)
    result.sort((a, b) => {
      const aBroken = brokenSet.has(a.id) ? 1 : 0;
      const bBroken = brokenSet.has(b.id) ? 1 : 0;
      if (aBroken !== bBroken) return aBroken - bBroken;
      return b.viewerCount - a.viewerCount;
    });

    // Order: user's own custom channels first, then admin broadcast, then catalog
    return [...customEnriched, ...broadcastEnriched, ...result];
  }, [
    channels,
    streams,
    streamMap,
    countryMap,
    logoMap,
    brokenSet,
    hideBroken,
    customEnriched,
    broadcastEnriched,
  ]);

  // Store all channels for player navigation
  useEffect(() => {
    if (enrichedChannels.length > 0) {
      setAllChannels(enrichedChannels);
    }
  }, [enrichedChannels, setAllChannels]);

  // Fuse.js index for fuzzy search
  const fuse = useMemo(() => {
    if (enrichedChannels.length === 0) return null;
    return new Fuse(enrichedChannels, {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "alt_names", weight: 0.2 },
        { name: "country", weight: 0.15 },
        { name: "categories", weight: 0.15 },
      ],
      threshold: 0.3,
      includeScore: true,
    });
  }, [enrichedChannels]);

  // Filtered channels
  const filteredChannels = useMemo(() => {
    let result = enrichedChannels;

    if (filters.search && fuse) {
      const searchResults = fuse.search(filters.search, { limit: 200 });
      result = searchResults.map((r) => r.item);
    }

    if (filters.countries.length > 0) {
      result = result.filter((ch) => filters.countries.includes(ch.country));
    }

    if (filters.categories.length > 0) {
      result = result.filter((ch) =>
        ch.categories?.some((cat) => filters.categories.includes(cat))
      );
    }

    if (filters.languages.length > 0) {
      result = result.filter((ch) =>
        ch.languages?.some((lang) => filters.languages.includes(lang))
      );
    }

    return result;
  }, [enrichedChannels, filters, fuse]);

  // Featured channels (top 10)
  const featuredChannels = useMemo(
    () => enrichedChannels.slice(0, 10),
    [enrichedChannels]
  );

  // Trending (next 12)
  const trendingChannels = useMemo(
    () => enrichedChannels.slice(10, 22),
    [enrichedChannels]
  );

  // Local channels — from user's detected country
  const localChannels = useMemo(() => {
    if (!userCountry) return [];
    return enrichedChannels.filter(
      (ch) => ch.country.toUpperCase() === userCountry.toUpperCase()
    );
  }, [enrichedChannels, userCountry]);

  return {
    channels: filteredChannels,
    allChannels: enrichedChannels,
    featuredChannels,
    trendingChannels,
    localChannels,
    countries: countries || [],
    categories: categories || [],
    languages: languages || [],
    isLoading: channelsLoading || streamsLoading,
    error: channelsError || streamsError,
    streamMap,
  };
}
