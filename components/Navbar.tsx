"use client";

import { Shuffle, Menu, Tv, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./SearchBar";
import { useAppStore } from "@/lib/store";
import { useFeatured } from "@/hooks/useFeatured";
import { useMemo } from "react";

export function Navbar() {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const allChannels = useAppStore((s) => s.allChannels);
  const openPlayer = useAppStore((s) => s.openPlayer);
  const userCountry = useAppStore((s) => s.userCountry);
  const { ids: featuredIds, primary: primaryId } = useFeatured();

  const featuredChannels = useMemo(
    () =>
      featuredIds
        .map((id) => allChannels.find((c) => c.id === id))
        .filter((c): c is NonNullable<(typeof allChannels)[number]> => !!c),
    [featuredIds, allChannels]
  );

  const primaryChannel = useMemo(
    () => (primaryId ? allChannels.find((c) => c.id === primaryId) ?? null : null),
    [primaryId, allChannels]
  );

  const hasFeatured = featuredChannels.length > 0 || !!primaryChannel;

  const handleRandomChannel = () => {
    if (allChannels.length === 0) return;
    const pool = userCountry
      ? allChannels.filter(
          (ch) => ch.country.toUpperCase() === userCountry.toUpperCase()
        )
      : [];
    const source = pool.length >= 5 ? pool : allChannels;
    const random = source[Math.floor(Math.random() * source.length)];
    openPlayer(random);
  };

  const handleFeaturedChannel = () => {
    // Always pick a random channel from the 24/7 Live list
    if (featuredChannels.length === 0) {
      if (primaryChannel) openPlayer(primaryChannel);
      return;
    }
    const pick =
      featuredChannels[Math.floor(Math.random() * featuredChannels.length)];
    openPlayer(pick);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-2 sm:gap-4">
        {/* Left: hamburger + logo (mobile) */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 lg:hidden">
            <Tv className="h-5 w-5 text-neon" />
            <span className="font-bold">
              ALL<span className="text-neon">tv</span>
            </span>
          </div>
        </div>

        {/* Center: search */}
        <div className="flex-1 flex justify-center max-w-xl">
          <SearchBar />
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {hasFeatured && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFeaturedChannel}
                className="gap-1.5 hidden sm:flex border-neon/40 hover:border-neon hover:bg-neon/10 hover:text-neon"
                aria-label="Play a 24/7 live channel"
                title="Play a random 24/7 Live channel"
              >
                <Sparkles className="h-4 w-4 text-neon" />
                24/7 Live
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFeaturedChannel}
                className="sm:hidden border-neon/40 hover:border-neon hover:bg-neon/10 hover:text-neon"
                aria-label="Play a 24/7 live channel"
              >
                <Sparkles className="h-4 w-4 text-neon" />
              </Button>
            </>
          )}

          <Button
            variant="neon"
            size="sm"
            onClick={handleRandomChannel}
            className="gap-1.5 hidden sm:flex"
            aria-label="Play a random channel"
          >
            <Shuffle className="h-4 w-4" />
            Surprise Me
          </Button>
          <Button
            variant="neon"
            size="icon"
            onClick={handleRandomChannel}
            className="sm:hidden"
            aria-label="Play a random channel"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
