"use client";

import { X, Trash2, Sun, Moon, Monitor, LayoutGrid, List, LayoutList, PlayCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useAppStore, type ViewMode } from "@/lib/store";
import { toast } from "sonner";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function ThemeChoice({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs transition-colors ${
        active
          ? "border-neon/50 bg-neon/5 text-foreground"
          : "border-border/50 text-muted-foreground hover:bg-secondary/50"
      }`}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

function ViewChoice({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs transition-colors ${
        active
          ? "border-neon/50 bg-neon/5 text-foreground"
          : "border-border/50 text-muted-foreground hover:bg-secondary/50"
      }`}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

export function SettingsSheet() {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const clearWatchHistory = useAppStore((s) => s.clearWatchHistory);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const { theme, setTheme } = useTheme();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const clearFavs = () => {
    // Toggle each currently favorited channel off
    favorites.slice().forEach((id) => toggleFavorite(id));
    toast.success("Favorites cleared");
  };

  const clearHistory = () => {
    clearWatchHistory();
    toast.success("Watch history cleared");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-card border-l border-border shadow-2xl overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 id="settings-title" className="font-bold text-lg">Settings</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close settings"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              {/* Autoplay */}
              <section>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-neon" />
                  Autoplay
                </h3>
                <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 cursor-pointer hover:bg-secondary/50">
                  <div className="text-sm">
                    <div className="font-medium">Auto-play on load</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Automatically start a channel when the app opens
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoplay}
                    onChange={(e) => updateSettings({ autoplay: e.target.checked })}
                    className="h-5 w-5 accent-neon"
                    aria-label="Toggle autoplay"
                  />
                </label>
              </section>

              {/* View mode */}
              <section>
                <h3 className="font-semibold text-sm mb-2">Channel view</h3>
                <div className="flex gap-2">
                  <ViewChoice
                    active={settings.viewMode === "grid"}
                    onClick={() => updateSettings({ viewMode: "grid" as ViewMode })}
                    icon={<LayoutGrid className="h-4 w-4" />}
                    label="Grid"
                  />
                  <ViewChoice
                    active={settings.viewMode === "list"}
                    onClick={() => updateSettings({ viewMode: "list" as ViewMode })}
                    icon={<List className="h-4 w-4" />}
                    label="List"
                  />
                  <ViewChoice
                    active={settings.viewMode === "compact"}
                    onClick={() => updateSettings({ viewMode: "compact" as ViewMode })}
                    icon={<LayoutList className="h-4 w-4" />}
                    label="Compact"
                  />
                </div>
              </section>

              {/* Theme */}
              <section>
                <h3 className="font-semibold text-sm mb-2">Theme</h3>
                <div className="flex gap-2">
                  <ThemeChoice
                    active={theme === "light"}
                    onClick={() => setTheme("light")}
                    icon={<Sun className="h-4 w-4" />}
                    label="Light"
                  />
                  <ThemeChoice
                    active={theme === "dark"}
                    onClick={() => setTheme("dark")}
                    icon={<Moon className="h-4 w-4" />}
                    label="Dark"
                  />
                  <ThemeChoice
                    active={theme === "system"}
                    onClick={() => setTheme("system")}
                    icon={<Monitor className="h-4 w-4" />}
                    label="System"
                  />
                </div>
              </section>

              {/* Data */}
              <section>
                <h3 className="font-semibold text-sm mb-2">Your data</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={clearFavs}
                    disabled={favorites.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear favorites ({favorites.length})
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={clearHistory}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear watch history
                  </Button>
                </div>
              </section>

              {/* Data note */}
              <section>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Streams are provided by third parties via the public
                  <a
                    href="https://github.com/iptv-org/iptv"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neon hover:underline mx-1"
                  >
                    iptv-org
                  </a>
                  project. Availability and quality can vary. Nothing plays through
                  our own servers — you connect directly to each broadcaster.
                </p>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
