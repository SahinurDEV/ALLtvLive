"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Search,
  Star,
  Download,
  Copy,
  Check,
  LogOut,
  Loader2,
  Radio,
  Filter,
  Trash2,
  Play,
  X,
  Save,
  Database,
  AlertTriangle,
  LayoutDashboard,
  RadioTower,
  ExternalLink,
  ChevronRight,
  Menu,
  ArrowRight,
  Activity,
} from "lucide-react";
import { useChannels } from "@/hooks/useChannels";
import { Button } from "@/components/ui/button";
import { AdminMiniPlayer } from "@/components/admin/AdminMiniPlayer";
import { AdminBroadcastPanel } from "@/components/admin/AdminBroadcastPanel";
import { AdminHistoryPanel } from "@/components/admin/AdminHistoryPanel";
import { toast } from "sonner";
import type { BroadcastChannel, ChannelWithMeta, Country } from "@/lib/types";

type AdminSection = "overview" | "featured" | "broadcast" | "history";

export default function AdminPage() {
  const [authState, setAuthState] = useState<"checking" | "signed-out" | "signed-in">(
    "checking"
  );
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) =>
        setAuthState(d?.authenticated ? "signed-in" : "signed-out")
      )
      .catch(() => setAuthState("signed-out"));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAuthState("signed-in");
        setPasswordInput("");
      } else {
        setAuthError(
          data.error === "invalid_credentials"
            ? "Incorrect password."
            : "Sign-in failed."
        );
      }
    } catch {
      setAuthError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setAuthState("signed-out");
  };

  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    );
  }

  if (authState === "signed-out") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-neon/10 border border-neon/30 flex items-center justify-center mb-4">
              <Shield className="h-7 w-7 text-neon" />
            </div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to manage featured &amp; broadcast channels.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              autoFocus
              placeholder="Admin password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-card border border-border focus:outline-none focus:border-neon transition-colors"
            />
            {authError && (
              <p className="text-sm text-destructive">{authError}</p>
            )}
            <Button
              type="submit"
              variant="neon"
              className="w-full"
              disabled={submitting || !passwordInput}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sign in"
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-3 leading-relaxed">
              Verified server-side against{" "}
              <code className="text-foreground">ADMIN_PASSWORD</code>. Sessions are
              signed httpOnly cookies valid for 7 days.
            </p>
          </form>
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

interface FeaturedResponse {
  ids: string[];
  primary: string | null;
  source?: "db" | "fallback";
  updatedAt?: number;
  error?: string;
}

interface BroadcastListResponse {
  channels: BroadcastChannel[];
  updatedAt?: number;
  source?: "db" | "fallback";
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { allChannels, isLoading, error, categories, countries } = useChannels();
  const [section, setSection] = useState<AdminSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [committedIds, setCommittedIds] = useState<string[]>([]);
  const [committedPrimary, setCommittedPrimary] = useState<string | null>(null);
  const [featured, setFeatured] = useState<string[]>([]);
  const [primary, setPrimary] = useState<string | null>(null);
  const [featuredSource, setFeaturedSource] = useState<"db" | "fallback">(
    "fallback"
  );
  const [featuredUpdatedAt, setFeaturedUpdatedAt] = useState<number | undefined>();
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [saving, setSaving] = useState(false);

  const [broadcastCount, setBroadcastCount] = useState<number>(0);
  const [broadcastUpdatedAt, setBroadcastUpdatedAt] = useState<
    number | undefined
  >();

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewChannel, setPreviewChannel] = useState<ChannelWithMeta | null>(null);

  const loadFeatured = useCallback(async () => {
    setLoadingFeatured(true);
    try {
      const res = await fetch("/api/featured", { cache: "no-store" });
      const data: FeaturedResponse = await res.json();
      setCommittedIds(data.ids || []);
      setCommittedPrimary(data.primary ?? null);
      setFeatured(data.ids || []);
      setPrimary(data.primary ?? null);
      setFeaturedSource(data.source === "db" ? "db" : "fallback");
      setFeaturedUpdatedAt(data.updatedAt);
    } catch {
      toast.error("Couldn't load featured list.");
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  const loadBroadcastMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/broadcast-channels", { cache: "no-store" });
      const data: BroadcastListResponse = await res.json();
      setBroadcastCount((data.channels || []).length);
      setBroadcastUpdatedAt(data.updatedAt);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadFeatured();
    loadBroadcastMeta();
  }, [loadFeatured, loadBroadcastMeta]);

  const featuredSet = useMemo(() => new Set(featured), [featured]);
  const committedSet = useMemo(() => new Set(committedIds), [committedIds]);
  const isDirty = useMemo(() => {
    if (primary !== committedPrimary) return true;
    if (committedIds.length !== featured.length) return true;
    return featured.some((id) => !committedSet.has(id));
  }, [committedIds, featured, committedSet, primary, committedPrimary]);

  const primaryChannel = useMemo(
    () => (primary ? allChannels.find((c) => c.id === primary) ?? null : null),
    [primary, allChannels]
  );

  const filteredChannels = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allChannels;

    if (onlyFeatured) list = list.filter((c) => featuredSet.has(c.id));
    if (countryFilter) list = list.filter((c) => c.country === countryFilter);
    if (categoryFilter)
      list = list.filter((c) => c.categories?.includes(categoryFilter));
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.alt_names?.some((n) => n.toLowerCase().includes(q))
      );
    }
    if (!onlyFeatured) {
      list = [...list].sort((a, b) => {
        const af = featuredSet.has(a.id) ? 0 : 1;
        const bf = featuredSet.has(b.id) ? 0 : 1;
        return af - bf;
      });
    }
    return list.slice(0, 300);
  }, [allChannels, featuredSet, search, countryFilter, categoryFilter, onlyFeatured]);

  const toggleFeatured = (id: string) => {
    setFeatured((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePrimary = (id: string) => {
    setPrimary((prev) => (prev === id ? null : id));
    setFeatured((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  };

  const clearAll = () => {
    if (featured.length === 0 && !primary) return;
    if (!confirm(`Clear all ${featured.length} featured channels?`)) return;
    setFeatured([]);
    setPrimary(null);
  };

  const revertChanges = () => {
    setFeatured([...committedIds]);
    setPrimary(committedPrimary);
  };

  const saveToDatabase = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/featured", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: featured, primary }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "save_failed");
      }
      toast.success(
        `Saved ${data.count} featured channels${
          data.primary ? ` (primary: ${data.primary})` : ""
        }`
      );
      await loadFeatured();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(
        msg === "database_unavailable"
          ? "Database is not reachable. Check MONGODB_URI."
          : "Failed to save. Check server logs."
      );
    } finally {
      setSaving(false);
    }
  };

  const exportedJson = useMemo(
    () => JSON.stringify(featured, null, 2),
    [featured]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedJson);
      setCopied(true);
      toast.success("Copied JSON to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([exportedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "featured.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const previewBroadcast = (bc: BroadcastChannel) => {
    setPreviewChannel(broadcastToChannel(bc, countries));
  };

  const goToSection = (s: AdminSection) => {
    setSection(s);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <AdminSidebar
        section={section}
        onSectionChange={goToSection}
        onLogout={onLogout}
        counts={{
          featured: featured.length,
          broadcast: broadcastCount,
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <AdminTopBar
          section={section}
          featuredSource={featuredSource}
          isDirty={isDirty}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {section === "overview" && (
              <OverviewSection
                totalChannels={allChannels.length}
                featuredCount={featured.length}
                committedCount={committedIds.length}
                primaryChannel={primaryChannel}
                primaryId={primary}
                featuredIds={featured}
                featuredUpdatedAt={featuredUpdatedAt}
                broadcastCount={broadcastCount}
                broadcastUpdatedAt={broadcastUpdatedAt}
                allChannels={allChannels}
                isDirty={isDirty}
                onGoFeatured={() => setSection("featured")}
                onGoBroadcast={() => setSection("broadcast")}
                onPreview={setPreviewChannel}
                onRemoveFeatured={toggleFeatured}
                onSetPrimary={togglePrimary}
                onSave={saveToDatabase}
                saving={saving}
              />
            )}

            {section === "featured" && (
              <FeaturedSection
                allChannels={allChannels}
                filteredChannels={filteredChannels}
                featuredSet={featuredSet}
                primary={primary}
                previewChannel={previewChannel}
                search={search}
                setSearch={setSearch}
                countryFilter={countryFilter}
                setCountryFilter={setCountryFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                onlyFeatured={onlyFeatured}
                setOnlyFeatured={setOnlyFeatured}
                countries={countries}
                categories={categories}
                isLoading={isLoading}
                loadingFeatured={loadingFeatured}
                error={!!error}
                setPreviewChannel={setPreviewChannel}
                toggleFeatured={toggleFeatured}
                togglePrimary={togglePrimary}
                clearAll={clearAll}
                revertChanges={revertChanges}
                saveToDatabase={saveToDatabase}
                isDirty={isDirty}
                saving={saving}
                copied={copied}
                onCopy={handleCopy}
                onDownload={handleDownloadJson}
                committedCount={committedIds.length}
              />
            )}

            {section === "broadcast" && (
              <>
                <AdminBroadcastPanel
                  countries={countries}
                  categories={categories}
                  onPreview={previewBroadcast}
                />
                {/* Re-fetch broadcast meta after user actions in the panel */}
                <BroadcastMetaSync onSyncNeeded={loadBroadcastMeta} />
              </>
            )}

            {section === "history" && <AdminHistoryPanel />}
          </div>
        </main>
      </div>

      {/* Floating mini-player */}
      {previewChannel && (
        <div className="fixed bottom-4 right-4 z-40 w-full max-w-md">
          <AdminMiniPlayer
            channel={previewChannel}
            isFeatured={featuredSet.has(previewChannel.id)}
            isPrimary={primary === previewChannel.id}
            onToggleFeatured={() => toggleFeatured(previewChannel.id)}
            onSetPrimary={() => togglePrimary(previewChannel.id)}
            onClose={() => setPreviewChannel(null)}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                          Sidebar & Top bar                         */
/* ------------------------------------------------------------------ */

function AdminSidebar({
  section,
  onSectionChange,
  onLogout,
  counts,
  open,
  onClose,
}: {
  section: AdminSection;
  onSectionChange: (s: AdminSection) => void;
  onLogout: () => void;
  counts: { featured: number; broadcast: number };
  open: boolean;
  onClose: () => void;
}) {
  const items: Array<{
    id: AdminSection;
    label: string;
    hint: string;
    icon: React.ReactNode;
    badge?: string | number;
  }> = [
    {
      id: "overview",
      label: "Dashboard",
      hint: "At-a-glance status",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "featured",
      label: "Featured",
      hint: "Curate the featured row",
      icon: <Star className="h-4 w-4" />,
      badge: counts.featured || undefined,
    },
    {
      id: "broadcast",
      label: "Broadcast",
      hint: "Custom channels for all users",
      icon: <RadioTower className="h-4 w-4" />,
      badge: counts.broadcast || undefined,
    },
    {
      id: "history",
      label: "History",
      hint: "IP-level viewing logs",
      icon: <Activity className="h-4 w-4" />,
    },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-card/95 backdrop-blur border-r border-border/60 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Brand */}
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center">
            <Shield className="h-4 w-4 text-neon" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-sm">
              ALL<span className="text-neon">tvLive</span>
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Admin console
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 mb-1">
          Manage
        </p>
        {items.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                active
                  ? "bg-neon/[0.08] text-neon border border-neon/25 shadow-[0_0_20px_rgba(0,255,157,0.08)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
              }`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  active
                    ? "bg-neon/10 text-neon"
                    : "bg-background/60 text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1 text-left">
                <span className="block font-medium leading-tight">
                  {item.label}
                </span>
                <span className="block text-[10px] text-muted-foreground/80 mt-0.5">
                  {item.hint}
                </span>
              </span>
              {item.badge !== undefined && item.badge !== 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    active
                      ? "bg-neon text-black"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 mb-1">
            Shortcuts
          </p>
          <Link
            href="/watch"
            target="_blank"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open /watch
          </Link>
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Homepage
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/60">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function AdminTopBar({
  section,
  featuredSource,
  isDirty,
  onToggleSidebar,
}: {
  section: AdminSection;
  featuredSource: "db" | "fallback";
  isDirty: boolean;
  onToggleSidebar: () => void;
}) {
  const titles: Record<AdminSection, { title: string; subtitle: string }> = {
    overview: {
      title: "Dashboard",
      subtitle: "Everything you're running, at a glance.",
    },
    featured: {
      title: "Featured channels",
      subtitle: "Pick which channels appear in the featured row on /watch.",
    },
    broadcast: {
      title: "Broadcast channels",
      subtitle: "Custom channels that every user sees.",
    },
    history: {
      title: "Viewing history",
      subtitle: "Every play is recorded with IP and channel.",
    },
  };

  const info = titles[section];

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground"
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Admin</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{info.title}</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {info.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDirty && section === "featured" && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              Unsaved changes
            </span>
          )}
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border font-semibold ${
              featuredSource === "db"
                ? "bg-neon/10 border-neon/30 text-neon"
                : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
            }`}
          >
            {featuredSource === "db" ? (
              <Database className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {featuredSource === "db" ? "MongoDB" : "Fallback"}
          </span>
          <Link
            href="/watch"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            View site
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*                           Overview section                         */
/* ------------------------------------------------------------------ */

function OverviewSection({
  totalChannels,
  featuredCount,
  committedCount,
  primaryChannel,
  primaryId,
  featuredIds,
  featuredUpdatedAt,
  broadcastCount,
  broadcastUpdatedAt,
  allChannels,
  isDirty,
  onGoFeatured,
  onGoBroadcast,
  onPreview,
  onRemoveFeatured,
  onSetPrimary,
  onSave,
  saving,
}: {
  totalChannels: number;
  featuredCount: number;
  committedCount: number;
  primaryChannel: ChannelWithMeta | null;
  primaryId: string | null;
  featuredIds: string[];
  featuredUpdatedAt?: number;
  broadcastCount: number;
  broadcastUpdatedAt?: number;
  allChannels: ChannelWithMeta[];
  isDirty: boolean;
  onGoFeatured: () => void;
  onGoBroadcast: () => void;
  onPreview: (ch: ChannelWithMeta) => void;
  onRemoveFeatured: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Hero row */}
      <div className="rounded-2xl border border-neon/25 bg-gradient-to-br from-neon/[0.06] via-card/40 to-yellow-500/[0.03] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-neon font-semibold">
              Live production
            </p>
            <h2 className="text-2xl font-bold mt-1">
              Everything looks{" "}
              <span className="text-neon">
                {isDirty ? "almost ready" : "good"}
              </span>
              .
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              {isDirty
                ? "You have unsaved changes on the featured list. Publish when you're ready — users see updates immediately."
                : "Your featured row and broadcast channels are in sync with MongoDB."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDirty && (
              <Button
                variant="neon"
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Publish changes
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onGoBroadcast}
              className="gap-1.5"
            >
              <RadioTower className="h-4 w-4" />
              Manage broadcast
            </Button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total channels"
          value={totalChannels.toLocaleString()}
          icon={<Radio className="h-5 w-5 text-neon" />}
          subtle="From iptv-org catalog + your additions"
        />
        <StatCard
          label="Featured (working)"
          value={featuredCount.toString()}
          icon={<Star className="h-5 w-5 text-yellow-400" />}
          subtle={isDirty ? "Unsaved changes" : "In sync"}
        />
        <StatCard
          label="Primary channel"
          value={primaryId ? "1" : "—"}
          icon={<Play className="h-5 w-5 text-yellow-400 fill-current" />}
          subtle={
            primaryChannel
              ? `${primaryChannel.name} plays first`
              : "None — random featured plays"
          }
        />
        <StatCard
          label="Broadcast custom"
          value={broadcastCount.toString()}
          icon={<RadioTower className="h-5 w-5 text-neon" />}
          subtle={
            broadcastUpdatedAt
              ? `Last saved ${new Date(broadcastUpdatedAt).toLocaleDateString()}`
              : "Not saved yet"
          }
        />
      </section>

      {/* Two-column: featured overview + broadcast summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <FeaturedOverviewPanel
            featured={featuredIds}
            primary={primaryId}
            allChannels={allChannels}
            onRemove={onRemoveFeatured}
            onSetPrimary={onSetPrimary}
            onPreview={onPreview}
          />
        </div>
        <BroadcastSummaryCard
          count={broadcastCount}
          updatedAt={broadcastUpdatedAt}
          onManage={onGoBroadcast}
        />
      </div>

      {/* Footer meta */}
      <section className="rounded-2xl border border-border/60 bg-card/30 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
        <MetaRow
          label="Featured last save"
          value={
            featuredUpdatedAt
              ? new Date(featuredUpdatedAt).toLocaleString()
              : "—"
          }
        />
        <MetaRow
          label="Committed in DB"
          value={`${committedCount} featured`}
        />
        <MetaRow
          label="Broadcast last save"
          value={
            broadcastUpdatedAt
              ? new Date(broadcastUpdatedAt).toLocaleString()
              : "—"
          }
        />
      </section>

      <div className="flex justify-end">
        <button
          onClick={onGoFeatured}
          className="inline-flex items-center gap-1.5 text-xs text-neon hover:text-neon/80 transition-colors font-semibold"
        >
          Go to featured curation
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function BroadcastSummaryCard({
  count,
  updatedAt,
  onManage,
}: {
  count: number;
  updatedAt?: number;
  onManage: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center">
          <RadioTower className="h-4 w-4 text-neon" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Broadcast channels</h3>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Visible to every user
          </p>
        </div>
      </div>

      <p className="text-3xl font-bold mt-2">{count.toLocaleString()}</p>
      <p className="text-[11px] text-muted-foreground">
        {count === 0
          ? "No custom channels yet."
          : `${count === 1 ? "channel" : "channels"} added.`}
      </p>

      <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
        Add regional streams, community feeds, or channels missing from the
        iptv-org catalog. They&apos;ll appear at the top of the grid for every
        visitor.
      </p>

      <div className="mt-auto pt-4">
        {updatedAt && (
          <p className="text-[10px] text-muted-foreground mb-2">
            Last saved {new Date(updatedAt).toLocaleString()}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onManage}
          className="w-full gap-1.5"
        >
          <RadioTower className="h-4 w-4" />
          Manage broadcast channels
        </Button>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-foreground mt-0.5 truncate">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                           Featured section                         */
/* ------------------------------------------------------------------ */

function FeaturedSection(props: {
  allChannels: ChannelWithMeta[];
  filteredChannels: ChannelWithMeta[];
  featuredSet: Set<string>;
  primary: string | null;
  previewChannel: ChannelWithMeta | null;
  search: string;
  setSearch: (v: string) => void;
  countryFilter: string;
  setCountryFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  onlyFeatured: boolean;
  setOnlyFeatured: (v: boolean) => void;
  countries: Country[];
  categories: Array<{ id: string; name: string }>;
  isLoading: boolean;
  loadingFeatured: boolean;
  error: boolean;
  setPreviewChannel: (ch: ChannelWithMeta | null) => void;
  toggleFeatured: (id: string) => void;
  togglePrimary: (id: string) => void;
  clearAll: () => void;
  revertChanges: () => void;
  saveToDatabase: () => void;
  isDirty: boolean;
  saving: boolean;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  committedCount: number;
}) {
  const {
    allChannels,
    filteredChannels,
    featuredSet,
    primary,
    previewChannel,
    search,
    setSearch,
    countryFilter,
    setCountryFilter,
    categoryFilter,
    setCategoryFilter,
    onlyFeatured,
    setOnlyFeatured,
    countries,
    categories,
    isLoading,
    loadingFeatured,
    error,
    setPreviewChannel,
    toggleFeatured,
    togglePrimary,
    clearAll,
    revertChanges,
    saveToDatabase,
    isDirty,
    saving,
    copied,
    onCopy,
    onDownload,
    committedCount,
  } = props;

  return (
    <div className="space-y-6">
      {/* Featured overview */}
      <FeaturedOverviewPanel
        featured={Array.from(featuredSet)}
        primary={primary}
        allChannels={allChannels}
        onRemove={(id) => toggleFeatured(id)}
        onSetPrimary={(id) => togglePrimary(id)}
        onPreview={(ch) => setPreviewChannel(ch)}
      />

      {/* Publish bar */}
      <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Save className="h-4 w-4 text-neon" />
              Publish featured list
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Save writes to{" "}
              <code className="text-foreground">featuredChannels</code> in
              MongoDB. Users on{" "}
              <Link href="/watch" className="text-neon hover:underline">
                /watch
              </Link>{" "}
              see the update immediately. Currently{" "}
              <span className="text-foreground font-semibold">
                {committedCount}
              </span>{" "}
              committed in database.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCopy}
              className="gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy JSON"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={revertChanges}
              disabled={!isDirty}
              className="gap-2"
            >
              Revert
            </Button>
            <Button
              variant="neon"
              size="sm"
              onClick={saveToDatabase}
              disabled={saving || !isDirty}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : isDirty ? "Save to database" : "Saved"}
            </Button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID (e.g. AlJazeeraEnglish.qa)…"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:border-neon text-sm transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-neon"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-neon"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={onlyFeatured}
                onChange={(e) => setOnlyFeatured(e.target.checked)}
                className="accent-[hsl(var(--neon))]"
              />
              <Filter className="h-3.5 w-3.5" />
              Show only featured
            </label>
            <span className="text-xs text-muted-foreground">
              {filteredChannels.length.toLocaleString()} shown
            </span>
          </div>
          <button
            onClick={clearAll}
            className="text-xs text-destructive hover:text-destructive/80 transition-colors inline-flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Clear all featured
          </button>
        </div>
      </section>

      {/* Channel list */}
      <section className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {(isLoading && allChannels.length === 0) || loadingFeatured ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 text-neon animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading channels…</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-destructive">
              Failed to load channels. Check your network and refresh.
            </p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No channels match your filters.
          </div>
        ) : (
          <div className="divide-y divide-border/60 max-h-[70vh] overflow-y-auto">
            {filteredChannels.map((ch) => {
              const isFeatured = featuredSet.has(ch.id);
              const isPrimary = primary === ch.id;
              const isPreviewing = previewChannel?.id === ch.id;
              return (
                <div
                  key={ch.id}
                  className={`flex items-center gap-3 p-3 sm:p-4 hover:bg-accent/30 transition-colors ${
                    isPrimary
                      ? "bg-yellow-500/[0.05]"
                      : isFeatured
                        ? "bg-neon/[0.03]"
                        : ""
                  } ${isPreviewing ? "ring-1 ring-neon/40" : ""}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-black/40 border border-border/60 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {ch.logo ? (
                      <Image
                        src={ch.logo}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                        unoptimized
                      />
                    ) : (
                      <Radio className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{ch.name}</p>
                      {isPrimary && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                          ★ Primary
                        </span>
                      )}
                      {isFeatured && !isPrimary && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-neon/15 text-neon border border-neon/30">
                          <Star className="h-3 w-3 fill-current" />
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      <code>{ch.id}</code>
                      {ch.countryInfo && (
                        <>
                          {" · "}
                          {ch.countryInfo.flag} {ch.countryInfo.name}
                        </>
                      )}
                      {ch.categories.length > 0 && (
                        <>
                          {" · "}
                          {ch.categories.slice(0, 3).join(", ")}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setPreviewChannel(ch)}
                      className={`p-2 rounded-lg transition-colors ${
                        isPreviewing
                          ? "bg-neon/15 text-neon"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                      title={isPreviewing ? "Now previewing" : "Preview here"}
                    >
                      <Play
                        className={`h-4 w-4 ${isPreviewing ? "fill-current" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => togglePrimary(ch.id)}
                      className={`px-2 h-8 rounded-lg text-[10px] font-bold tracking-wide transition-colors border ${
                        isPrimary
                          ? "bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border-yellow-500/40"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground border-transparent"
                      }`}
                      title={
                        isPrimary
                          ? "Unset primary"
                          : "Set as primary — auto-plays first for users"
                      }
                    >
                      {isPrimary ? "★ 1ST" : "SET 1ST"}
                    </button>
                    <button
                      onClick={() => toggleFeatured(ch.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isFeatured
                          ? "bg-neon/15 hover:bg-neon/25 text-neon"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                      title={isFeatured ? "Remove from featured" : "Add to featured"}
                    >
                      <Star
                        className={`h-4 w-4 ${isFeatured ? "fill-current" : ""}`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                        Reusable sub-components                     */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  subtle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  subtle?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-background/60 border border-border/60 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {subtle && (
          <p className="text-[11px] text-muted-foreground mt-1">{subtle}</p>
        )}
      </div>
    </div>
  );
}

function FeaturedOverviewPanel({
  featured,
  primary,
  allChannels,
  onRemove,
  onSetPrimary,
  onPreview,
}: {
  featured: string[];
  primary: string | null;
  allChannels: ChannelWithMeta[];
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onPreview: (channel: ChannelWithMeta) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const rows = featured.map((id) => {
    const ch = allChannels.find((c) => c.id === id) || null;
    return { id, ch, isPrimary: id === primary };
  });

  const primaryRow = rows.find((r) => r.isPrimary);
  const missingCount = rows.filter((r) => !r.ch).length;

  return (
    <section className="rounded-2xl border border-neon/25 bg-gradient-to-br from-neon/[0.04] via-card/40 to-yellow-500/[0.03] overflow-hidden h-full">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center shrink-0">
          <Star className="h-4 w-4 text-neon fill-current" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm sm:text-base">
            Featured overview
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {featured.length === 0 ? (
              <>No channels featured yet. Pick some below.</>
            ) : (
              <>
                <span className="text-foreground font-semibold">
                  {featured.length}
                </span>{" "}
                featured
                {primaryRow?.ch && (
                  <>
                    {" · "}
                    <span className="text-yellow-400 font-semibold">
                      1 primary
                    </span>{" "}
                    ({primaryRow.ch.name})
                  </>
                )}
                {missingCount > 0 && (
                  <>
                    {" · "}
                    <span className="text-yellow-500/80">
                      {missingCount} not in catalog yet
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
          {collapsed ? "Show" : "Hide"}
        </span>
      </button>

      {!collapsed && featured.length > 0 && (
        <div className="border-t border-border/50 p-3 sm:p-4">
          {primaryRow && (
            <div className="mb-3 rounded-xl border border-yellow-500/40 bg-yellow-500/[0.06] p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-black/40 border border-yellow-500/30 overflow-hidden flex items-center justify-center relative shrink-0">
                {primaryRow.ch?.logo ? (
                  <Image
                    src={primaryRow.ch.logo}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                    Plays first
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    (auto-play priority for all users)
                  </span>
                </div>
                <p className="text-sm font-semibold truncate">
                  {primaryRow.ch?.name ?? primaryRow.id}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  <code>{primaryRow.id}</code>
                </p>
              </div>
              {primaryRow.ch && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPreview(primaryRow.ch!)}
                  className="gap-1 shrink-0"
                >
                  <Play className="h-3 w-3" />
                  Preview
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {rows.map(({ id, ch, isPrimary }) => (
              <div
                key={id}
                className={`group inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-full border text-[11px] max-w-full ${
                  isPrimary
                    ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-100"
                    : ch
                      ? "bg-neon/10 border-neon/30 text-foreground"
                      : "bg-muted/40 border-border/60 text-muted-foreground"
                }`}
                title={ch?.name || id}
              >
                {ch?.logo ? (
                  <span className="relative w-5 h-5 rounded-full overflow-hidden bg-black/30 shrink-0">
                    <Image
                      src={ch.logo}
                      alt=""
                      fill
                      sizes="20px"
                      className="object-contain"
                      unoptimized
                    />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center shrink-0">
                    <Radio className="h-2.5 w-2.5 text-muted-foreground" />
                  </span>
                )}
                <span className="truncate max-w-[140px]">
                  {ch?.name || id}
                </span>
                {isPrimary && (
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-yellow-500 text-black shrink-0">
                    1ST
                  </span>
                )}
                <div className="hidden sm:flex items-center gap-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ch && (
                    <button
                      onClick={() => onPreview(ch)}
                      className="p-1 rounded-full hover:bg-white/10"
                      title="Preview"
                    >
                      <Play className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onSetPrimary(id)}
                    className={`p-1 rounded-full hover:bg-white/10 ${
                      isPrimary ? "text-yellow-400" : ""
                    }`}
                    title={isPrimary ? "Unset primary" : "Make primary"}
                  >
                    <Play className="h-2.5 w-2.5 fill-current" />
                  </button>
                  <button
                    onClick={() => onRemove(id)}
                    className="p-1 rounded-full hover:bg-red-500/20 text-red-400"
                    title="Remove"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*                          Helpers                                   */
/* ------------------------------------------------------------------ */

function broadcastToChannel(
  c: BroadcastChannel,
  countries: Country[]
): ChannelWithMeta {
  const country = c.country
    ? countries.find((cc) => cc.code === c.country)
    : undefined;
  return {
    id: c.id,
    name: c.name,
    alt_names: [],
    network: null,
    owners: [],
    country: c.country || "INT",
    subdivision: null,
    city: null,
    broadcast_area: [],
    languages: [],
    categories: c.category ? [c.category] : [],
    is_nsfw: false,
    launched: null,
    closed: null,
    replaced_by: null,
    website: null,
    logo: c.logo,
    streams: [
      {
        channel: c.id,
        feed: null,
        title: c.name,
        url: c.url,
        quality: null,
        user_agent: null,
        referrer: null,
      },
    ],
    countryInfo: country,
    viewerCount: 0,
    isLive: true,
  };
}

function BroadcastMetaSync({ onSyncNeeded }: { onSyncNeeded: () => void }) {
  useEffect(() => {
    const t = setInterval(onSyncNeeded, 8000);
    return () => clearInterval(t);
  }, [onSyncNeeded]);
  return null;
}
