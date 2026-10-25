"use client";

import { X, Trash2, Sun, Moon, Monitor, LayoutGrid, List, LayoutList, PlayCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useAppStore, type ViewMode } from "@/lib/store";
import { toast } from "sonner";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KidsModeSection } from "@/components/settings/KidsModeSection";
import { WatchStatsSection } from "@/components/settings/WatchStatsSection";
import { ProfilesSection } from "@/components/settings/ProfilesSection";
import { ParentalLockSection } from "@/components/settings/ParentalLockSection";
import { useT } from "@/lib/i18n";
import { LanguagePicker } from "@/components/settings/LanguagePicker";
import { DataBackup } from "@/components/settings/DataBackup";

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
  const t = useT();
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const settings = useAppStore((s) => s.settings);
  const hiddenCount = useAppStore((s) => s.hiddenChannelIds.length);
  const clearHiddenChannels = useAppStore((s) => s.clearHiddenChannels);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const clearWatchHistory = useAppStore((s) => s.clearWatchHistory);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const brokenCount = useAppStore((s) => s.brokenChannelIds.length);
  const clearAllBrokenChannels = useAppStore((s) => s.clearAllBrokenChannels);
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
              <h2 id="settings-title" className="font-bold text-lg">{t("settings.title")}</h2>
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
              <LanguagePicker />

              {/* Autoplay */}
              <section>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-neon" />
                  {t("settings.autoplay")}
                </h3>
                <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 cursor-pointer hover:bg-secondary/50">
                  <div className="text-sm">
                    <div className="font-medium">{t("settings.autoplayOn")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t("settings.autoplayHint")}
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

              {/* Text size and easy mode */}
              <section data-testid="text-size">
                <h3 className="font-semibold text-sm mb-2">{t("settings.textSize")}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 1, k: "settings.textNormal" as const },
                    { v: 1.125, k: "settings.textLarge" as const },
                    { v: 1.25, k: "settings.textXL" as const },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      aria-pressed={settings.fontScale === o.v}
                      onClick={() => updateSettings({ fontScale: o.v })}
                      className={`h-10 rounded-lg border text-sm ${
                        settings.fontScale === o.v ? "border-neon bg-neon/10 text-neon" : "border-border/50"
                      }`}
                      style={{ fontSize: `${o.v * 0.875}rem` }}
                    >
                      {t(o.k)}
                    </button>
                  ))}
                </div>
                <label className="mt-2 flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 cursor-pointer hover:bg-secondary/50">
                  <div className="text-sm">
                    <div className="font-medium">{t("settings.easyMode")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t("settings.easyModeHint")}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.easyMode}
                    onChange={(e) => updateSettings({ easyMode: e.target.checked })}
                    className="h-5 w-5 accent-neon shrink-0"
                    aria-label={t("settings.easyMode")}
                  />
                </label>
              </section>

              {/* Data saver */}
              <section>
                <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 cursor-pointer hover:bg-secondary/50">
                  <div className="text-sm">
                    <div className="font-medium">{t("settings.dataSaver")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t("settings.dataSaverHint")}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dataSaver}
                    onChange={(e) => updateSettings({ dataSaver: e.target.checked })}
                    className="h-5 w-5 accent-neon shrink-0"
                    aria-label={t("settings.dataSaver")}
                    data-testid="data-saver-toggle"
                  />
                </label>
              </section>

              {hiddenCount > 0 && (
                <section>
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-border/50">
                    <div className="text-sm">
                      <div className="font-medium">{t("hide.settingsTitle")}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t("hide.count", { n: hiddenCount })}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearHiddenChannels} data-testid="unhide-all">
                      {t("hide.showAll")}
                    </Button>
                  </div>
                </section>
              )}

              {/* Channel reliability */}
              <section>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-neon" />
                  {t("settings.reliability")}
                </h3>
                <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 cursor-pointer hover:bg-secondary/50">
                  <div className="text-sm">
                    <div className="font-medium">{t("settings.hideBroken")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t("settings.hideBrokenHint")}
                      {brokenCount > 0 && (
                        <span className="text-neon"> · {brokenCount} known broken</span>
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.hideBrokenChannels}
                    onChange={(e) => updateSettings({ hideBrokenChannels: e.target.checked })}
                    className="h-5 w-5 accent-neon"
                    aria-label="Toggle hide broken channels"
                  />
                </label>
                {brokenCount > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 mt-2"
                    onClick={() => {
                      clearAllBrokenChannels();
                      toast.success("Reset — all channels are eligible again");
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset broken list ({brokenCount})
                  </Button>
                )}
              </section>

              <WatchStatsSection />
              <ProfilesSection />
              <KidsModeSection />
              <ParentalLockSection />

              {/* View mode */}
              <section>
                <h3 className="font-semibold text-sm mb-2">{t("settings.view")}</h3>
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
                <h3 className="font-semibold text-sm mb-2">{t("settings.theme")}</h3>
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
                <h3 className="font-semibold text-sm mb-2">{t("settings.data")}</h3>
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
                  <DataBackup />
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
