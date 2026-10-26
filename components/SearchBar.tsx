"use client";

import { rankChannels } from "@/lib/search/smartSearch";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { Search, X, Radio, CornerDownLeft, Clock, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import type { ChannelWithMeta } from "@/lib/types";
import { useT, useFormatNumber } from "@/lib/i18n";

const MAX_RESULTS = 8;
const MAX_SUGGESTIONS = 6;


function formatViewers(count: number): string | null {
  if (!count || count < 10) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

interface Section {
  label: string;
  icon: typeof Clock;
  items: ChannelWithMeta[];
}

export function SearchBar() {
  const setSearch = useAppStore((s) => s.setSearch);
  const t = useT();
  const fmtN = useFormatNumber();
  const searchValue = useAppStore((s) => s.filters.search);
  const allChannels = useAppStore((s) => s.allChannels);
  const historyIds = useAppStore((s) => s.historyIds);
  const openPlayer = useAppStore((s) => s.openPlayer);

  const [localValue, setLocalValue] = useState(searchValue);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  // Phones get a short placeholder so it is not cut off at 375px.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // Follow searches set from outside the box (e.g. /watch?q=, voice search).
  useEffect(() => {
    setLocalValue((v) => (v.trim() === searchValue.trim() ? v : searchValue));
  }, [searchValue]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = localValue.trim();

  const results = useMemo<ChannelWithMeta[]>(() => {
    if (!trimmed) return [];
    return rankChannels(trimmed, allChannels, MAX_RESULTS);
  }, [trimmed, allChannels]);

  const suggestions = useMemo<Section[]>(() => {
    if (trimmed) return [];
    if (allChannels.length === 0) return [];

    const byId = new Map(allChannels.map((c) => [c.id, c]));

    const recent = historyIds
      .map((id) => byId.get(id))
      .filter((c): c is ChannelWithMeta => !!c)
      .slice(0, MAX_SUGGESTIONS);

    const recentSet = new Set(recent.map((c) => c.id));
    const trending = [...allChannels]
      .filter((c) => !recentSet.has(c.id))
      .sort((a, b) => b.viewerCount - a.viewerCount)
      .slice(0, MAX_SUGGESTIONS);

    const sections: Section[] = [];
    if (recent.length > 0) sections.push({ label: t("search.recent"), icon: Clock, items: recent });
    if (trending.length > 0) sections.push({ label: t("search.trending"), icon: Flame, items: trending });
    return sections;
  }, [trimmed, allChannels, historyIds]);

  // Flat list of items in visible order — used for keyboard navigation
  const navItems = useMemo(() => {
    if (results.length > 0) return results;
    return suggestions.flatMap((s) => s.items);
  }, [results, suggestions]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [trimmed, dropdownOpen]);

  const handleChange = useCallback(
    (value: string) => {
      setLocalValue(value);
      setDropdownOpen(true);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearch(value);
      }, 300);
    },
    [setSearch]
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    setSearch("");
    setDropdownOpen(true);
    inputRef.current?.focus();
  }, [setSearch]);

  const handleSelect = useCallback(
    (ch: ChannelWithMeta) => {
      openPlayer(ch);
      setLocalValue("");
      setSearch("");
      setDropdownOpen(false);
      inputRef.current?.blur();
    },
    [openPlayer, setSearch]
  );

  // Ctrl+K / Cmd+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setDropdownOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Click outside closes
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setDropdownOpen(true);
      return;
    }
    if (e.key === "Escape") {
      if (dropdownOpen) {
        e.preventDefault();
        setDropdownOpen(false);
      }
      return;
    }
    if (!dropdownOpen || navItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % navItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + navItems.length) % navItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = navItems[highlightIdx] || navItems[0];
      if (pick) handleSelect(pick);
    }
  };

  const showDropdown = dropdownOpen;
  const searching = trimmed.length > 0;

  return (
    <div ref={containerRef} className="relative flex items-center w-full max-w-md">
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={narrow ? t("search.placeholderShort") : t("search.placeholder")}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setDropdownOpen(true)}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-16 bg-secondary/50 border-border/50 focus:border-neon/50 focus:ring-neon/20"
        aria-label={t("search.label")}
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        role="combobox"
      />
      <VoiceSearchButton
        onResult={(text) => {
          handleChange(text);
          inputRef.current?.focus();
        }}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showDropdown && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border/70 bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {searching && results.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No channels match{" "}
                <span className="text-foreground font-medium">
                  &ldquo;{trimmed}&rdquo;
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Try a shorter query or a country name.
              </p>
            </div>
          ) : !searching && suggestions.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t("search.startTyping", { n: fmtN(allChannels.length) })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Search by name, country, or category.
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                {searching
                  ? renderRows(results, 0, highlightIdx, setHighlightIdx, handleSelect)
                  : suggestions.map((section, sIdx) => {
                      const offset = suggestions
                        .slice(0, sIdx)
                        .reduce((sum, s) => sum + s.items.length, 0);
                      const Icon = section.icon;
                      return (
                        <div key={section.label}>
                          <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                            <Icon className="h-3 w-3 text-neon" />
                            {section.label}
                          </div>
                          {renderRows(
                            section.items,
                            offset,
                            highlightIdx,
                            setHighlightIdx,
                            handleSelect
                          )}
                        </div>
                      );
                    })}
              </div>

              <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-background/40 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary/60 border border-border/60 font-mono">
                    ↑↓
                  </kbd>
                  navigate
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary/60 border border-border/60 font-mono ml-1">
                    ↵
                  </kbd>
                  play
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary/60 border border-border/60 font-mono ml-1">
                    esc
                  </kbd>
                  close
                </div>
                {searching && (
                  <span>
                    {results.length} match{results.length === 1 ? "" : "es"}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function renderRows(
  items: ChannelWithMeta[],
  offset: number,
  highlightIdx: number,
  setHighlightIdx: (i: number) => void,
  handleSelect: (ch: ChannelWithMeta) => void
) {
  return items.map((ch, i) => {
    const idx = offset + i;
    const highlighted = idx === highlightIdx;
    const viewers = formatViewers(ch.viewerCount);
    return (
      <button
        key={ch.id}
        type="button"
        role="option"
        aria-selected={highlighted}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => setHighlightIdx(idx)}
        onClick={() => handleSelect(ch)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
          highlighted ? "bg-neon/10" : "hover:bg-secondary/60"
        }`}
      >
        <div className="w-10 h-10 rounded-lg bg-black/40 border border-border/60 flex items-center justify-center relative overflow-hidden shrink-0">
          {ch.logo ? (
            <Image
              src={ch.logo}
              alt=""
              fill
              sizes="40px"
              className="object-contain p-1"
              unoptimized
            />
          ) : (
            <Radio className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium truncate ${
              highlighted ? "text-neon" : "text-foreground"
            }`}
          >
            {ch.name}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {ch.countryInfo?.flag} {ch.countryInfo?.name}
            {ch.categories.length > 0 && (
              <>
                {" · "}
                {ch.categories.slice(0, 2).join(", ")}
              </>
            )}
          </p>
        </div>

        {viewers && (
          <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
            {viewers}
          </span>
        )}

        {highlighted && (
          <CornerDownLeft className="h-3.5 w-3.5 text-neon shrink-0" />
        )}
      </button>
    );
  });
}
