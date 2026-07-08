"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Radio,
  Plus,
  Save,
  Loader2,
  Pencil,
  Trash2,
  Play,
  X,
  Link as LinkIcon,
  Search,
  AlertTriangle,
  RadioTower,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { BroadcastChannel, Country, Category } from "@/lib/types";

interface BroadcastResponse {
  channels: BroadcastChannel[];
  source?: "db" | "fallback";
  updatedAt?: number;
  error?: string;
}

interface Props {
  countries: Country[];
  categories: Category[];
  onPreview: (channel: BroadcastChannel) => void;
}

interface DraftFields {
  name: string;
  url: string;
  logo: string;
  category: string;
  country: string;
  description: string;
}

const EMPTY_DRAFT: DraftFields = {
  name: "",
  url: "",
  logo: "",
  category: "",
  country: "",
  description: "",
};

function newId(): string {
  return `bc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDraft(c: BroadcastChannel): DraftFields {
  return {
    name: c.name,
    url: c.url,
    logo: c.logo ?? "",
    category: c.category ?? "",
    country: c.country ?? "",
    description: c.description ?? "",
  };
}

function fromDraft(d: DraftFields, existing?: BroadcastChannel): BroadcastChannel {
  return {
    id: existing?.id ?? newId(),
    name: d.name.trim(),
    url: d.url.trim(),
    logo: d.logo.trim() || null,
    category: d.category.trim() || null,
    country: d.country.trim() ? d.country.trim().toUpperCase() : null,
    description: d.description.trim() || null,
    addedAt: existing?.addedAt ?? Date.now(),
  };
}

export function AdminBroadcastPanel({ countries, categories, onPreview }: Props) {
  const [committed, setCommitted] = useState<BroadcastChannel[]>([]);
  const [channels, setChannels] = useState<BroadcastChannel[]>([]);
  const [source, setSource] = useState<"db" | "fallback">("fallback");
  const [updatedAt, setUpdatedAt] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [formMode, setFormMode] = useState<"hidden" | "add" | "edit">("hidden");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/broadcast-channels", { cache: "no-store" });
      const data: BroadcastResponse = await res.json();
      setCommitted(data.channels || []);
      setChannels(data.channels || []);
      setSource(data.source === "db" ? "db" : "fallback");
      setUpdatedAt(data.updatedAt);
    } catch {
      toast.error("Couldn't load broadcast channels.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isDirty = useMemo(() => {
    if (committed.length !== channels.length) return true;
    return channels.some((c, i) => {
      const cc = committed[i];
      if (!cc) return true;
      return (
        c.id !== cc.id ||
        c.name !== cc.name ||
        c.url !== cc.url ||
        c.logo !== cc.logo ||
        c.category !== cc.category ||
        c.country !== cc.country ||
        c.description !== cc.description
      );
    });
  }, [committed, channels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.url.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q)
    );
  }, [channels, search]);

  const startAdd = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setFormMode("add");
  };

  const startEdit = (c: BroadcastChannel) => {
    setDraft(toDraft(c));
    setEditingId(c.id);
    setFormMode("edit");
  };

  const cancelForm = () => {
    setFormMode("hidden");
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const submitForm = () => {
    const name = draft.name.trim();
    const url = draft.url.trim();
    if (!name) {
      toast.error("Channel name is required.");
      return;
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      toast.error("Enter a valid stream URL starting with http:// or https://");
      return;
    }

    if (formMode === "edit" && editingId) {
      const existing = channels.find((c) => c.id === editingId);
      if (!existing) return;
      const updated = fromDraft(draft, existing);
      setChannels((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      toast.success("Channel updated (unsaved).");
    } else {
      const created = fromDraft(draft);
      setChannels((prev) => [created, ...prev]);
      toast.success("Channel added (unsaved).");
    }
    cancelForm();
  };

  const remove = (id: string) => {
    const target = channels.find((c) => c.id === id);
    if (!target) return;
    if (!confirm(`Remove "${target.name}" from broadcast channels?`)) return;
    setChannels((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) cancelForm();
  };

  const revert = () => {
    setChannels(committed);
    cancelForm();
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/broadcast-channels", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "save_failed");
      }
      toast.success(`Saved ${data.count} broadcast channels`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "save_failed";
      toast.error(
        msg === "database_unavailable"
          ? "Database is not reachable. Check MONGODB_URI."
          : "Failed to save. Check server logs."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-neon/[0.06] via-card/40 to-transparent p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center shrink-0">
              <Radio className="h-5 w-5 text-neon" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">
                Broadcast channels
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-lg leading-relaxed">
                Custom channels you add here appear for{" "}
                <span className="text-foreground font-medium">every user</span>{" "}
                on the site — perfect for regional streams, community feeds, or
                channels missing from the iptv-org catalog.
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                    source === "db"
                      ? "bg-neon/10 border-neon/30 text-neon"
                      : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  }`}
                >
                  {source === "db" ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-neon" />
                      Live from MongoDB
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3" />
                      Fallback (DB unavailable)
                    </>
                  )}
                </span>
                {updatedAt && (
                  <span className="text-muted-foreground">
                    Last saved {new Date(updatedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={revert}
              disabled={!isDirty || saving}
              className="gap-1.5"
            >
              Revert
            </Button>
            <Button
              variant="neon"
              size="sm"
              onClick={save}
              disabled={!isDirty || saving}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : isDirty ? "Publish changes" : "In sync"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <MiniStat
            label="Total broadcast"
            value={channels.length.toString()}
            icon={<Radio className="h-4 w-4 text-neon" />}
          />
          <MiniStat
            label="Saved in DB"
            value={committed.length.toString()}
            icon={<RadioTower className="h-4 w-4 text-muted-foreground" />}
          />
          <MiniStat
            label="With logos"
            value={channels.filter((c) => !!c.logo).length.toString()}
            icon={<Sparkles className="h-4 w-4 text-yellow-400" />}
          />
          <MiniStat
            label="Categorised"
            value={channels.filter((c) => !!c.category).length.toString()}
            icon={<LinkIcon className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {/* Form / add card */}
      {formMode === "hidden" ? (
        <button
          type="button"
          onClick={startAdd}
          className="w-full rounded-2xl border-2 border-dashed border-border/60 hover:border-neon/60 hover:bg-neon/[0.03] transition-colors p-5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add a new broadcast channel
        </button>
      ) : (
        <BroadcastForm
          mode={formMode}
          draft={draft}
          setDraft={setDraft}
          countries={countries}
          categories={categories}
          onCancel={cancelForm}
          onSubmit={submitForm}
        />
      )}

      {/* List */}
      <section className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border/60">
          <div>
            <h3 className="text-sm font-semibold">Current broadcast list</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              These appear at the top of every user&apos;s channel grid.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-neon transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="h-6 w-6 text-neon animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Loading broadcast channels…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-neon/10 border border-neon/30 flex items-center justify-center mb-3">
              <Radio className="h-6 w-6 text-neon" />
            </div>
            <p className="text-sm font-medium">
              {channels.length === 0
                ? "No broadcast channels yet"
                : "No channels match your filter"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {channels.length === 0
                ? "Add your first custom channel above — it'll appear for every visitor."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((c) => (
              <BroadcastRow
                key={c.id}
                channel={c}
                onEdit={() => startEdit(c)}
                onRemove={() => remove(c.id)}
                onPreview={() => onPreview(c)}
                editing={editingId === c.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BroadcastForm({
  mode,
  draft,
  setDraft,
  countries,
  categories,
  onCancel,
  onSubmit,
}: {
  mode: "add" | "edit";
  draft: DraftFields;
  setDraft: (d: DraftFields) => void;
  countries: Country[];
  categories: Category[];
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-2xl border border-neon/30 bg-neon/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <Pencil className="h-4 w-4 text-neon" />
          ) : (
            <Plus className="h-4 w-4 text-neon" />
          )}
          <h3 className="font-semibold text-sm">
            {mode === "edit" ? "Edit broadcast channel" : "New broadcast channel"}
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground p-1 rounded"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="Channel name *"
          hint="Shown on cards and in the player."
        >
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Community News HD"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-neon"
          />
        </Field>

        <Field label="Stream URL *" hint="HLS (.m3u8), DASH, or MP4 URL.">
          <input
            type="url"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="https://example.com/stream.m3u8"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono focus:outline-none focus:border-neon"
          />
        </Field>

        <Field label="Logo URL" hint="PNG/JPG/SVG — square preferred.">
          <input
            type="url"
            value={draft.logo}
            onChange={(e) => setDraft({ ...draft, logo: e.target.value })}
            placeholder="https://example.com/logo.png"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono focus:outline-none focus:border-neon"
          />
        </Field>

        <Field label="Category" hint="Used for filtering.">
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-neon"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Country" hint="Two-letter code shown as flag.">
          <select
            value={draft.country}
            onChange={(e) => setDraft({ ...draft, country: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-neon"
          >
            <option value="">— None —</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Short description"
          hint="Optional. Shown on the channel page."
        >
          <input
            type="text"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="e.g. 24/7 local news from Dhaka"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-neon"
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="neon" size="sm" onClick={onSubmit} className="gap-1.5">
          {mode === "edit" ? (
            <>
              <Check className="h-4 w-4" />
              Update channel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add channel
            </>
          )}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Changes stay local until you hit{" "}
        <span className="text-foreground font-medium">Publish changes</span> at
        the top. Nothing goes live until you save.
      </p>
    </section>
  );
}

function BroadcastRow({
  channel,
  editing,
  onEdit,
  onRemove,
  onPreview,
}: {
  channel: BroadcastChannel;
  editing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(channel.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 hover:bg-accent/20 transition-colors ${
        editing ? "bg-neon/[0.04] ring-1 ring-inset ring-neon/40" : ""
      }`}
    >
      <div className="w-12 h-12 rounded-lg bg-black/40 border border-border/60 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
        {channel.logo ? (
          <Image
            src={channel.logo}
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
          <p className="font-medium text-sm truncate">{channel.name}</p>
          {channel.country && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border/60">
              {channel.country}
            </span>
          )}
          {channel.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon/10 text-neon border border-neon/30">
              {channel.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <code className="text-[11px] text-muted-foreground font-mono truncate max-w-md">
            {channel.url}
          </code>
          <button
            onClick={copyUrl}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
            title="Copy URL"
          >
            {copiedUrl ? (
              <Check className="h-3 w-3 text-neon" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
        {channel.description && (
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            {channel.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onPreview}
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-neon transition-colors"
          title="Preview"
        >
          <Play className="h-4 w-4" />
        </button>
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onRemove}
          className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
          title="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
        {label}
      </span>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </label>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-background/40 border border-border/50 p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          {label}
        </p>
      </div>
      <p className="text-xl font-bold leading-none">{value}</p>
    </div>
  );
}
