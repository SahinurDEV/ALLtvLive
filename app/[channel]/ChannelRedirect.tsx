"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChannels } from "@/hooks/useChannels";
import { useAppStore } from "@/lib/store";
import { Loader2 } from "lucide-react";

export function ChannelRedirect({ channelId }: { channelId: string }) {
  const router = useRouter();
  const { allChannels, isLoading } = useChannels();
  const openPlayer = useAppStore((s) => s.openPlayer);

  useEffect(() => {
    if (isLoading || allChannels.length === 0) return;

    const channel = allChannels.find((ch) => ch.id === channelId);
    if (channel) {
      openPlayer(channel);
    }
    router.replace("/watch");
  }, [channelId, allChannels, isLoading, openPlayer, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 text-neon animate-spin" />
        <p className="text-muted-foreground">Loading channel...</p>
      </div>
    </div>
  );
}
