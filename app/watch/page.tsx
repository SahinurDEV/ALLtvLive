"use client";

import { useMemo, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { InlinePlayer } from "@/components/InlinePlayer";
import { ChannelGrid } from "@/components/ChannelGrid";
import { FavoritesView } from "@/components/FavoritesView";
import { CustomChannelDialog } from "@/components/CustomChannelDialog";
import { AdSlot } from "@/components/ads/AdSlot";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import { ForYouRow } from "@/components/home/ForYouRow";
import { TrendingRow } from "@/components/home/TrendingRow";
import { QuickFilterChips } from "@/components/home/QuickFilterChips";
import { FeaturedRow } from "@/components/home/FeaturedRow";
import { WatchHeroBar } from "@/components/home/WatchHeroBar";
import { DiscoverCategoryTiles } from "@/components/home/DiscoverCategoryTiles";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { ReportBrokenStreamDialog } from "@/components/ReportBrokenStreamDialog";
import { FloatingMiniPlayer } from "@/components/player/FloatingMiniPlayer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useChannels } from "@/hooks/useChannels";
import { useFeatured } from "@/hooks/useFeatured";
import { useAppStore } from "@/lib/store";
import { Tv, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WatchPage() {
  const {
    channels,
    allChannels,
    trendingChannels,
    localChannels,
    countries,
    categories,
    languages,
    isLoading,
    error,
  } = useChannels();

  const activeView = useAppStore((s) => s.activeView);
  const filters = useAppStore((s) => s.filters);
  const openPlayer = useAppStore((s) => s.openPlayer);
  const hydrateFavorites = useAppStore((s) => s.hydrateFavorites);
  const hydrateHistory = useAppStore((s) => s.hydrateHistory);
  const hydrateSettings = useAppStore((s) => s.hydrateSettings);
  const hydrateBrokenChannels = useAppStore((s) => s.hydrateBrokenChannels);
  const hydrateCustomChannels = useAppStore((s) => s.hydrateCustomChannels);
  const settings = useAppStore((s) => s.settings);
  const userCountry = useAppStore((s) => s.userCountry);
  const userCountryName = useAppStore((s) => s.userCountryName);
  const userCountryFlag = useAppStore((s) => s.userCountryFlag);
  const setUserCountry = useAppStore((s) => s.setUserCountry);
  const currentChannel = useAppStore((s) => s.currentChannel);
  const theaterMode = useAppStore((s) => s.theaterMode);
  const setTheaterMode = useAppStore((s) => s.setTheaterMode);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const openCustomDialog = useAppStore((s) => s.openCustomDialog);
  const hasAutoPlayed = useRef(false);
  const { ids: featuredIds, primary: primaryId } = useFeatured();

  const featuredChannels = useMemo(
    () =>
      featuredIds
        .map((id) => allChannels.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => !!c),
    [allChannels, featuredIds]
  );

  const primaryChannel = useMemo(
    () => (primaryId ? allChannels.find((c) => c.id === primaryId) ?? null : null),
    [allChannels, primaryId]
  );

  useEffect(() => {
    hydrateFavorites();
    hydrateHistory();
    hydrateSettings();
    hydrateBrokenChannels();
    hydrateCustomChannels();
  }, [
    hydrateFavorites,
    hydrateHistory,
    hydrateSettings,
    hydrateBrokenChannels,
    hydrateCustomChannels,
  ]);

  // "My Channels" is now a centered modal — redirect any stale nav to it
  useEffect(() => {
    if (activeView === "custom") {
      openCustomDialog();
      setActiveView("home");
    }
  }, [activeView, openCustomDialog, setActiveView]);

  // Detect user country via IP geolocation (with fallback)
  useEffect(() => {
    if (userCountry) return;

    const codeToFlag = (code: string) =>
      code
        .toUpperCase()
        .split("")
        .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
        .join("");

    fetch("https://ipapi.co/json/")
      .then((res) => {
        if (!res.ok) throw new Error("ipapi failed");
        return res.json();
      })
      .then((data) => {
        if (data?.country_code && data?.country_name) {
          const code = data.country_code.toUpperCase();
          setUserCountry(code, data.country_name, codeToFlag(code));
        } else {
          throw new Error("no data");
        }
      })
      .catch(() => {
        fetch("https://ipwho.is/")
          .then((res) => res.json())
          .then((data) => {
            if (data?.country_code && data?.country) {
              const code = data.country_code.toUpperCase();
              setUserCountry(code, data.country, codeToFlag(code));
            }
          })
          .catch(() => {});
      });
  }, [userCountry, setUserCountry]);

  // Auto-play — prefer featured, then user's country, then random top-50
  useEffect(() => {
    if (hasAutoPlayed.current) return;
    if (allChannels.length === 0) return;
    if (!settings.autoplay) {
      hasAutoPlayed.current = true;
      return;
    }

    const pickFrom = (list: typeof allChannels) => {
      if (list.length === 0) return null;
      return list[Math.floor(Math.random() * list.length)];
    };

    // 1. Primary channel wins — admin has pinned a specific channel to play first
    if (primaryChannel) {
      hasAutoPlayed.current = true;
      openPlayer(primaryChannel);
      return;
    }

    // 2. Featured — pick randomly from the curated list
    if (featuredChannels.length > 0) {
      const pick = pickFrom(featuredChannels);
      if (pick) {
        hasAutoPlayed.current = true;
        openPlayer(pick);
        return;
      }
    }

    if (!userCountry) {
      const timer = setTimeout(() => {
        if (hasAutoPlayed.current) return;
        hasAutoPlayed.current = true;
        const pick = pickFrom(allChannels.slice(0, 50));
        if (pick) openPlayer(pick);
      }, 1500);
      return () => clearTimeout(timer);
    }

    hasAutoPlayed.current = true;

    if (localChannels.length > 0) {
      const pick = pickFrom(localChannels.slice(0, Math.min(20, localChannels.length)));
      if (pick) openPlayer(pick);
    } else {
      const pick = pickFrom(allChannels.slice(0, 50));
      if (pick) openPlayer(pick);
    }
  }, [
    allChannels,
    localChannels,
    userCountry,
    openPlayer,
    settings.autoplay,
    featuredChannels,
    primaryChannel,
  ]);

  const viewTitle = useMemo(() => {
    switch (activeView) {
      case "countries": {
        if (filters.countries.length === 1) {
          const country = countries.find((c) => c.code === filters.countries[0]);
          return country ? `${country.flag} ${country.name}` : "Countries";
        }
        return "All Countries";
      }
      case "categories": {
        if (filters.categories.length === 1) {
          const cat = categories.find((c) => c.id === filters.categories[0]);
          return cat ? cat.name : "Categories";
        }
        return "All Categories";
      }
      case "languages": {
        if (filters.languages.length === 1) {
          const lang = languages.find((l) => l.code === filters.languages[0]);
          return lang ? lang.name : "Languages";
        }
        return "All Languages";
      }
      default:
        return "";
    }
  }, [activeView, filters, countries, categories, languages]);

  const isFiltered =
    filters.search ||
    filters.countries.length > 0 ||
    filters.categories.length > 0 ||
    filters.languages.length > 0;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Couldn&apos;t load channels</h1>
          <p className="text-muted-foreground mb-6">
            The channel data source isn&apos;t reachable right now. Check your
            connection and try again.
          </p>
          <Button
            variant="neon"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {!theaterMode && (
        <Sidebar
          countries={countries}
          categories={categories}
          languages={languages}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          {isLoading && allChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-neon/20 border-t-neon animate-spin motion-reduce:animate-none" />
                <Tv className="absolute inset-0 m-auto h-8 w-8 text-neon" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">ALLtvLive</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Loading thousands of live channels...
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-[1800px] mx-auto">
              <div className="sticky top-0 z-30 p-2 sm:p-3 md:p-4 lg:p-6 pb-2 md:pb-3 bg-background/95 backdrop-blur space-y-2 sm:space-y-3">
                {!theaterMode && (
                  <WatchHeroBar
                    totalChannels={allChannels.length}
                    totalCountries={countries.length}
                    userCountryName={userCountryName}
                    userCountryFlag={userCountryFlag}
                    currentChannel={currentChannel}
                    primaryChannel={primaryChannel}
                    featuredCount={featuredChannels.length}
                  />
                )}
                <InlinePlayer />
                {theaterMode && (
                  <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-neon" />
                    Theater mode is on — press
                    <kbd className="px-1 py-0.5 rounded bg-muted text-foreground font-mono">T</kbd>
                    or
                    <button
                      onClick={() => setTheaterMode(false)}
                      className="underline hover:text-foreground"
                    >
                      exit
                    </button>
                    to bring the sidebar back.
                  </div>
                )}
              </div>

              <div
                className={`p-2 sm:p-3 md:p-4 lg:p-6 space-y-6 sm:space-y-8 ${
                  theaterMode ? "opacity-40 hover:opacity-100 transition-opacity" : ""
                }`}
              >
                {/* Search / filter results */}
                {isFiltered && (
                  <>
                    {filters.search && (
                      <p className="text-sm text-muted-foreground -mb-2">
                        {channels.length.toLocaleString()} result
                        {channels.length === 1 ? "" : "s"} for
                        <span className="text-foreground font-medium ml-1">
                          &ldquo;{filters.search}&rdquo;
                        </span>
                      </p>
                    )}
                    <ChannelGrid
                      channels={channels}
                      isLoading={false}
                      title={
                        filters.search
                          ? `Results for "${filters.search}"`
                          : viewTitle
                      }
                      showViewToggle
                    />
                  </>
                )}

                {/* Home layout */}
                {!isFiltered && activeView === "home" && (
                  <>
                    <ContinueWatchingRow allChannels={allChannels} />

                    <ForYouRow allChannels={allChannels} />

                    <FeaturedRow channels={featuredChannels} />

                    <DiscoverCategoryTiles allChannels={allChannels} />

                    <QuickFilterChips
                      categories={categories}
                      countries={countries}
                      allChannels={allChannels}
                    />

                    <TrendingRow
                      allChannels={allChannels}
                      fallbackChannels={trendingChannels}
                    />

                    <AdSlot slot="1111111111" />

                    {localChannels.length > 0 && userCountryName && (
                      <ChannelGrid
                        channels={localChannels}
                        isLoading={false}
                        title={`${userCountryFlag || ""} ${userCountryName} Channels`}
                        pageSize={12}
                        showLoadMore={localChannels.length > 12}
                      />
                    )}

                    <ChannelGrid
                      channels={channels}
                      isLoading={false}
                      title="All Channels"
                      pageSize={24}
                      showLoadMore={true}
                      showViewToggle
                    />

                    <AdSlot slot="2222222222" />
                  </>
                )}

                {!isFiltered && activeView === "favorites" && (
                  <FavoritesView allChannels={allChannels} />
                )}

                {!isFiltered &&
                  (activeView === "countries" ||
                    activeView === "categories" ||
                    activeView === "languages") && (
                    <ChannelGrid
                      channels={channels}
                      isLoading={false}
                      title={viewTitle}
                      showViewToggle
                    />
                  )}
              </div>

              <footer className="px-3 sm:px-4 lg:px-6 pt-2 pb-6 border-t border-border/30 mt-8">
                <div className="max-w-3xl mx-auto text-center space-y-2">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    ALLtvLive aggregates publicly available live TV streams from the open-source{" "}
                    <a
                      href="https://github.com/iptv-org/iptv"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon hover:underline"
                    >
                      iptv-org
                    </a>{" "}
                    project. All streams are delivered directly by their original broadcasters —
                    we do not host, cache, or redistribute any video content.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <a href="/" className="hover:text-neon transition-colors">
                      Home
                    </a>
                    <span className="mx-2">·</span>
                    <a href="/about" className="hover:text-neon transition-colors">
                      About &amp; Disclaimer
                    </a>
                    <span className="mx-2">·</span>
                    <a href="/public-api" className="hover:text-neon transition-colors">
                      Public API
                    </a>
                    <span className="mx-2">·</span>
                    <a
                      href="https://github.com/devSahinur/ALLtvLive"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-neon transition-colors"
                    >
                      GitHub
                    </a>
                  </p>
                </div>
              </footer>
            </div>
          )}
        </main>

        <MobileNav />
      </div>

      {/* Global overlays */}
      <SettingsSheet />
      <ReportBrokenStreamDialog />
      <CustomChannelDialog />
      <FloatingMiniPlayer />
      <InstallPrompt />
    </div>
  );
}
