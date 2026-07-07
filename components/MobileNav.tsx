"use client";

import {
  Home,
  Globe,
  Heart,
  Shuffle,
  Settings,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

export function MobileNav() {
  const {
    activeView,
    setActiveView,
    clearFilters,
    favorites,
    allChannels,
    openPlayer,
    setSettingsOpen,
    userCountry,
  } = useAppStore();

  const handleNav = (view: typeof activeView) => {
    setActiveView(view);
    clearFilters();
  };

  const handleRandom = () => {
    if (allChannels.length === 0) return;
    const pool = userCountry
      ? allChannels.filter(
          (ch) => ch.country.toUpperCase() === userCountry.toUpperCase()
        )
      : [];
    const source = pool.length >= 5 ? pool : allChannels;
    openPlayer(source[Math.floor(Math.random() * source.length)]);
  };

  const items = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "countries" as const, label: "Browse", icon: Globe },
    { id: "random" as const, label: "Random", icon: Shuffle },
    {
      id: "favorites" as const,
      label: "Favorites",
      icon: Heart,
      count: favorites.length,
    },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/50 bg-background/95 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-around h-14 px-1">
        {items.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "random") return handleRandom();
                if (item.id === "settings") return setSettingsOpen(true);
                handleNav(item.id);
              }}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-neon" : "text-muted-foreground"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {"count" in item && (item.count ?? 0) > 0 && (
                <span className="absolute top-0.5 right-1 min-w-[16px] h-4 px-1 bg-neon text-black text-[8px] font-bold rounded-full flex items-center justify-center">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
