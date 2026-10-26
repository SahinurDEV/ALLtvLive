"use client";

import { HeroBanner } from "./HeroBanner";
import { useT } from "@/lib/i18n";
import { ChannelGrid } from "./ChannelGrid";
import type { ChannelWithMeta } from "@/lib/types";

interface HomeViewProps {
  channels: ChannelWithMeta[];
  featuredChannels: ChannelWithMeta[];
  trendingChannels: ChannelWithMeta[];
  isLoading: boolean;
}

export function HomeView({
  channels,
  featuredChannels,
  trendingChannels,
  isLoading,
}: HomeViewProps) {
  const t = useT();
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      {featuredChannels.length > 0 && (
        <HeroBanner channels={featuredChannels} />
      )}

      {/* Trending Now */}
      <section>
        <ChannelGrid
          channels={trendingChannels}
          isLoading={isLoading}
          title={t("home.trending")}
          pageSize={12}
          showLoadMore={false}
        />
      </section>

      {/* All Live TV */}
      <section>
        <ChannelGrid
          channels={channels}
          isLoading={isLoading}
          title={t("home.liveTv")}
          pageSize={20}
          showLoadMore={true}
        />
      </section>
    </div>
  );
}
