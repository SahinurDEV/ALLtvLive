"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { Search, X, Radio, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import type { ChannelWithMeta } from "@/lib/types";

const MAX_RESULTS = 8;

function scoreMatch(query: string, ch: ChannelWithMeta): number {
  const q = query.toLowerCase();
  const name = ch.name.toLowerCase();
  if (name === q) return 1000;
  if (name.startsWith(q)) return 900 - Math.min(name.length, 100);
  const idx = name.indexOf(q);
  if (idx !== -1) return 700 - idx;
  if (ch.id.toLowerCase().includes(q)) return 500;
  if (ch.alt_names?.some((n) => n.toLowerCase().includes(q))) return 400;
  if (ch.countryInfo?.name.toLowerCase().includes(q)) return 200;
  if (ch.categories?.some((c) => c.toLowerCase().includes(q))) return 100;
  return -1;
}

export function SearchBar() {
  const setSearch = useAppStore((s) => s.setSearch);
  const searchValue = useAppStore((s) => s.filters.search);
  const allChannels = useAppStore((s) => s.allChannels);
  const openPlayer = useAppStore((s) => s.openPlayer);

  const [localValue, setLocalValue] = useState(searchValue);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = localValue.trim();

  const results = useMemo<ChannelWithMeta[]>(() => {
    if (!trimmed || trimmed.length < 1) return [];
    const scored: Array<{ ch: ChannelWithMeta; s: number }> = [];
    for (const ch of allChannels) {
      const s = scoreMatch(trimmed, ch);
      if (s > 0) scored.push({ ch, s });
    }
    scored.sort((a, b) => b.s - a.s || b.ch.viewerCount - a.ch.viewerCount);
    return scored.slice(0, MAX_RESULTS).map((x) => x.ch);
  }, [trimmed, allChannels]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [trimmed]);

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
    setDropdownOpen(false);
    inputRef.current?.focus();
  }, [setSearch]);

  const handleSelect = useCallback(
    (ch: ChannelWithMeta) => {
      openPlayer(ch);
      setDropdownOpen(false);
      inputRef.current?.blur();
    },
    [openPlayer]
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
    if (!dropdownOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[highlightIdx] || results[0];
      if (pick) handleSelect(pick);
    }
  };

  const showDropdown = dropdownOpen && trimmed.length > 0;

  return (
    <div ref={containerRef} className="relative flex items-center w-full max-w-md">
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search channels... (Ctrl+K)"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (trimmed.length > 0) setDropdownOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-9 bg-secondary/50 border-border/50 focus:border-neon/50 focus:ring-neon/20"
        aria-label="Search channels"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        role="combobox"
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
          {results.length === 0 ? (
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
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto">
                {results.map((ch, idx) => {
                  const highlighted = idx === highlightIdx;
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
                        highlighted
                          ? "bg-neon/10"
                          : "hover:bg-secondary/60"
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

                      {highlighted && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-neon shrink-0" />
                      )}
                    </button>
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
                <span>
                  {results.length} match{results.length === 1 ? "" : "es"}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
