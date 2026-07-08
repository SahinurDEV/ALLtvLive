"use client";

import useSWR from "swr";
import { FEATURED_CHANNEL_IDS, PRIMARY_CHANNEL_ID } from "@/lib/featured/featured";

interface FeaturedResponse {
  ids: string[];
  primary: string | null;
  source?: "db" | "fallback";
  updatedAt?: number;
  error?: string;
}

const fetcher = async (url: string): Promise<FeaturedResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("failed");
  return res.json();
};

export function useFeatured() {
  const { data, error, isLoading, mutate } = useSWR<FeaturedResponse>(
    "/api/featured",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      fallbackData: {
        ids: FEATURED_CHANNEL_IDS,
        primary: PRIMARY_CHANNEL_ID,
        source: "fallback",
      },
    }
  );

  return {
    ids: data?.ids ?? FEATURED_CHANNEL_IDS,
    primary: data?.primary ?? PRIMARY_CHANNEL_ID,
    source: data?.source ?? "fallback",
    updatedAt: data?.updatedAt,
    isLoading,
    error,
    refresh: mutate,
  };
}
