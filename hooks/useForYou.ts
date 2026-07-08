"use client";

import useSWR from "swr";

interface ForYouResponse {
  channelIds: string[];
  details?: Array<{ channelId: string; count: number; lastPlayedAt: number }>;
  source: "db" | "fallback" | "no_ip";
}

const fetcher = async (url: string): Promise<ForYouResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("failed");
  return res.json();
};

export function useForYou() {
  const { data, isLoading, error, mutate } = useSWR<ForYouResponse>(
    "/api/foryou",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60_000,
      fallbackData: { channelIds: [], source: "fallback" },
    }
  );

  return {
    channelIds: data?.channelIds ?? [],
    details: data?.details ?? [],
    source: data?.source ?? "fallback",
    isLoading,
    error,
    refresh: mutate,
  };
}
