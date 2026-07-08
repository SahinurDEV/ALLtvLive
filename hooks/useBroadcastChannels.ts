"use client";

import useSWR from "swr";
import type { BroadcastChannel } from "@/lib/types";

interface BroadcastResponse {
  channels: BroadcastChannel[];
  source?: "db" | "fallback";
  updatedAt?: number;
  error?: string;
}

const fetcher = async (url: string): Promise<BroadcastResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("failed");
  return res.json();
};

export function useBroadcastChannels() {
  const { data, error, isLoading, mutate } = useSWR<BroadcastResponse>(
    "/api/broadcast-channels",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      fallbackData: { channels: [], source: "fallback" },
    }
  );

  return {
    channels: data?.channels ?? [],
    source: data?.source ?? "fallback",
    updatedAt: data?.updatedAt,
    isLoading,
    error,
    refresh: mutate,
  };
}
