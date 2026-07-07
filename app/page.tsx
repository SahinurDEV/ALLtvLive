"use client";

import { useMemo, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { InlinePlayer } from "@/components/InlinePlayer";
import { ChannelGrid } from "@/components/ChannelGrid";
import { FavoritesView } from "@/components/FavoritesView";
import { CustomChannelsView } from "@/components/CustomChannelsView";
import { CustomChannelDialog } from "@/components/CustomChannelDialog";
import { AdSlot } from "@/components/ads/AdSlot";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import { TrendingRow } from "@/components/home/TrendingRow";
import { QuickFilterChips } from "@/components/home/QuickFilterChips";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { ReportBrokenStreamDialog } from "@/components/ReportBrokenStreamDialog";
import { FloatingMiniPlayer } from "@/components/player/FloatingMiniPlayer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useChannels } from "@/hooks/useChannels";
import { useAppStore } from "@/lib/store";
import { Tv, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
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
  const hasAutoPlayed = useRef(false);

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

  // Auto-play
  useEffect(() => {
    if (hasAutoPlayed.current) return;
    if (allChannels.length === 0) return;
    if (!settings.autoplay) {
      hasAutoPlayed.current = true;
      return;
    }

    if (!userCountry) {
      const timer = setTimeout(() => {
        if (hasAutoPlayed.current) return;
        hasAutoPlayed.current = true;
        const top = allChannels.slice(0, 50);
        openPlayer(top[Math.floor(Math.random() * top.length)]);
      }, 1500);
      return () => clearTimeout(timer);
    }

    hasAutoPlayed.current = true;

    if (localChannels.length > 0) {
      const top = localChannels.slice(0, Math.min(20, localChannels.length));
      openPlayer(top[Math.floor(Math.random() * top.length)]);
    } else {
      const top = allChannels.slice(0, 50);
      openPlayer(top[Math.floor(Math.random() * top.length)]);
    }
  }, [allChannels, localChannels, userCountry, openPlayer, settings.autoplay]);

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
      <Sidebar
        countries={countries}
        categories={categories}
        languages={languages}
      />

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
              <div className="sticky top-0 z-30 p-2 sm:p-3 md:p-4 lg:p-6 pb-2 md:pb-3 bg-background/95 backdrop-blur">
                <InlinePlayer />
              </div>

              <div className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-6 sm:space-y-8">
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

                {!isFiltered && activeView === "custom" && (
                  <CustomChannelsView allChannels={allChannels} />
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
