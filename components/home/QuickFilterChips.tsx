"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { Category, Country, ChannelWithMeta } from "@/lib/types";

interface Props {
  categories: Category[];
  countries: Country[];
  allChannels: ChannelWithMeta[];
}

// Curated most-loved categories on top
const PRIORITY_CATEGORIES = ["news", "sports", "movies", "kids", "music", "entertainment", "documentary", "series"];

export function QuickFilterChips({ categories, countries, allChannels }: Props) {
  const filters = useAppStore((s) => s.filters);
  const setCategoryFilter = useAppStore((s) => s.setCategoryFilter);
  const setCountryFilter = useAppStore((s) => s.setCountryFilter);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const orderedCategories = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c]));
    const priority = PRIORITY_CATEGORIES
      .map((id) => map.get(id))
      .filter((c): c is Category => !!c);
    const priorityIds = new Set(priority.map((c) => c.id));
    const rest = categories.filter((c) => !priorityIds.has(c.id));
    return [...priority, ...rest];
  }, [categories]);

  const topCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ch of allChannels) {
      counts.set(ch.country, (counts.get(ch.country) || 0) + 1);
    }
    return countries
      .filter((c) => counts.has(c.code))
      .sort((a, b) => (counts.get(b.code) || 0) - (counts.get(a.code) || 0))
      .slice(0, 12);
  }, [countries, allChannels]);

  const toggleCategory = (id: string) => {
    const isActive = filters.categories.includes(id);
    setCategoryFilter(isActive ? filters.categories.filter((c) => c !== id) : [id]);
    if (!isActive) setActiveView("categories");
  };

  const toggleCountry = (code: string) => {
    const isActive = filters.countries.includes(code);
    setCountryFilter(isActive ? filters.countries.filter((c) => c !== code) : [code]);
    if (!isActive) setActiveView("countries");
  };

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {orderedCategories.slice(0, 12).map((cat) => {
          const active = filters.categories.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-neon text-black border-neon"
                  : "bg-secondary/50 text-foreground border-border/50 hover:bg-secondary"
              }`}
              aria-pressed={active}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {topCountries.map((country) => {
          const active = filters.countries.includes(country.code);
          return (
            <button
              key={country.code}
              onClick={() => toggleCountry(country.code)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                active
                  ? "bg-neon text-black border-neon"
                  : "bg-secondary/50 text-foreground border-border/50 hover:bg-secondary"
              }`}
              aria-pressed={active}
            >
              <span>{country.flag}</span>
              {country.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
