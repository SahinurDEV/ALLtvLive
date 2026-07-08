"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Save,
  Trophy,
  Newspaper,
  Rocket,
  Globe2,
  Radio,
  Edit3,
  Trash2,
  Play,
  ListVideo,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface Preset {
  name: string;
  url: string;
  logo: string;
  category: string;
  icon: React.ReactNode;
  hint: string;
}

const PRESETS: Preset[] = [
  {
    name: "FIFA World",
    url: "https://www.youtube.com/@FIFA/live",
    logo: "https://digitalhub.fifa.com/transform/f95c8d33-45e0-464a-b31f-fda3f9a55e2c/FIFA-Plus-Logo",
    category: "Sports",
    icon: <Trophy className="h-4 w-4" />,
    hint: "FIFA official YouTube live",
  },
  {
    name: "Al Jazeera English",
    url: "https://live-hls-web-aje.getaj.net/AJE/index.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Aljazeera_eng.png",
    category: "News",
    icon: <Newspaper className="h-4 w-4" />,
    hint: "24/7 English news",
  },
  {
    name: "DW English",
    url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/eb/Deutsche_Welle_symbol_2012.svg",
    category: "News",
    icon: <Globe2 className="h-4 w-4" />,
    hint: "Deutsche Welle English",
  },
  {
    name: "NASA TV Public",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
    category: "Science",
    icon: <Rocket className="h-4 w-4" />,
    hint: "NASA public channel",
  },
];

type Tab = "list" | "form";

export function CustomChannelDialog() {
  const open = useAppStore((s) => s.customDialogOpen);
  const editingId = useAppStore((s) => s.editingCustomId);
  const close = useAppStore((s) => s.closeCustomDialog);
  const customChannels = useAppStore((s) => s.customChannels);
  const addCustomChannel = useAppStore((s) => s.addCustomChannel);
  const updateCustomChannel = useAppStore((s) => s.updateCustomChannel);
  const removeCustomChannel = useAppStore((s) => s.removeCustomChannel);
  const openPlayer = useAppStore((s) => s.openPlayer);
  const allChannels = useAppStore((s) => s.allChannels);

  const editing = editingId
    ? customChannels.find((c) => c.id === editingId)
    : null;

  const [tab, setTab] = useState<Tab>("list");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [category, setCategory] = useState("");

  // Reset tab + fields when dialog opens
  useEffect(() => {
    if (!open) return;
    if (editing) {
      // Editing a specific channel → jump into form
      setTab("form");
      setName(editing.name ?? "");
      setUrl(editing.url ?? "");
      setLogo(editing.logo ?? "");
      setCategory(editing.category ?? "");
    } else {
      setTab(customChannels.length === 0 ? "form" : "list");
      setName("");
      setUrl("");
      setLogo("");
      setCategory("");
    }
  }, [open, editing, customChannels.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) {
      toast.error("Name and stream URL are required");
      return;
    }
    try {
      new URL(trimmedUrl);
    } catch {
      toast.error("Stream URL doesn't look valid");
      return;
    }
    if (editing) {
      updateCustomChannel(editing.id, {
        name: trimmedName,
        url: trimmedUrl,
        logo: logo.trim() || null,
        category: category.trim() || null,
      });
      toast.success("Channel updated");
      setTab("list");
    } else {
      addCustomChannel({
        name: trimmedName,
        url: trimmedUrl,
        logo: logo.trim() || null,
        category: category.trim() || null,
      });
      toast.success("Channel added");
      setName("");
      setUrl("");
      setLogo("");
      setCategory("");
      setTab("list");
    }
  };

  const handlePlay = (id: string) => {
    const ch = allChannels.find((c) => c.id === id);
    if (ch) {
      openPlayer(ch);
      close();
    } else {
      toast.error("Channel isn't ready yet — try again in a moment.");
    }
  };

  const handleEdit = (id: string) => {
    const c = customChannels.find((x) => x.id === id);
    if (!c) return;
    setName(c.name);
    setUrl(c.url);
    setLogo(c.logo ?? "");
    setCategory(c.category ?? "");
    setTab("form");
  };

  const handleDelete = (id: string) => {
    removeCustomChannel(id);
    toast.success("Custom channel removed");
  };

  const listCount = customChannels.length;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-channels-title"
          >
            <div className="bg-card border border-neon/20 rounded-2xl shadow-[0_10px_60px_rgba(0,255,157,0.15)] overflow-hidden flex flex-col max-h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60 bg-gradient-to-br from-neon/5 to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center shrink-0">
                    <Radio className="h-4 w-4 text-neon" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="my-channels-title"
                      className="font-bold text-sm sm:text-base leading-tight"
                    >
                      My Channels
                    </h2>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {listCount === 0
                        ? "Add your own IPTV streams to watch alongside built-ins."
                        : `${listCount} saved · HLS · MP4 · YouTube live`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={close}
                  aria-label="Close"
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 p-2 border-b border-border/60 bg-background/40">
                <TabButton
                  active={tab === "list"}
                  onClick={() => {
                    if (editing) {
                      // Cancel edit
                      setName("");
                      setUrl("");
                      setLogo("");
                      setCategory("");
                    }
                    setTab("list");
                  }}
                  icon={<ListVideo className="h-3.5 w-3.5" />}
                  label={`My Channels${listCount > 0 ? ` · ${listCount}` : ""}`}
                />
                <TabButton
                  active={tab === "form"}
                  onClick={() => setTab("form")}
                  icon={<Plus className="h-3.5 w-3.5" />}
                  label={editing ? "Edit channel" : "Add new"}
                />
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {tab === "list" ? (
                  listCount === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center px-6 py-10">
                      <div className="w-14 h-14 rounded-2xl bg-neon/10 border border-neon/30 flex items-center justify-center mb-3">
                        <Sparkles className="h-6 w-6 text-neon" />
                      </div>
                      <h3 className="font-bold text-base mb-1">
                        You haven&apos;t added any channels yet
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm mb-4">
                        Paste any HLS, MP4 or YouTube live URL and it appears alongside
                        the built-in catalog — private, per-browser.
                      </p>
                      <Button
                        variant="neon"
                        onClick={() => setTab("form")}
                        className="gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Add your first channel
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 sm:p-4 space-y-2">
                      {customChannels.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 bg-card/40 hover:bg-accent/30 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-black/40 border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
                            {c.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={c.logo}
                                alt=""
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <Radio className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {c.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {c.category ? `${c.category} · ` : ""}
                              {c.url}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePlay(c.id)}
                              aria-label={`Play ${c.name}`}
                              className="h-8 w-8 text-neon hover:bg-neon/10"
                            >
                              <Play className="h-3.5 w-3.5" fill="currentColor" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(c.id)}
                              aria-label={`Edit ${c.name}`}
                              className="h-8 w-8"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(c.id)}
                              aria-label={`Delete ${c.name}`}
                              className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setTab("form")}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-neon hover:border-neon/40 hover:bg-neon/5 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Add another channel
                      </button>
                    </div>
                  )
                ) : (
                  <form
                    onSubmit={submit}
                    className="p-3 sm:p-4 space-y-3"
                    aria-label={editing ? "Edit custom channel" : "Add custom channel"}
                  >
                    {!editing && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Popular presets
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {PRESETS.map((p) => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => {
                                setName(p.name);
                                setUrl(p.url);
                                setLogo(p.logo);
                                setCategory(p.category);
                              }}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/50 text-left text-xs hover:border-neon/50 hover:bg-neon/5 transition-colors"
                            >
                              <span className="text-neon shrink-0">{p.icon}</span>
                              <span className="flex-1 min-w-0">
                                <span className="block font-medium truncate">
                                  {p.name}
                                </span>
                                <span className="block text-[9px] text-muted-foreground truncate">
                                  {p.hint}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1.5">
                          Tap to prefill, or fill in your own below.
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Channel name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My favorite channel"
                        autoFocus
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Stream URL <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/stream.m3u8"
                        type="url"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        HLS (.m3u8), MP4 or direct video URLs. Some CORS-blocked
                        streams may not play in browsers.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Logo URL
                        </label>
                        <Input
                          value={logo}
                          onChange={(e) => setLogo(e.target.value)}
                          placeholder="https://…/logo.png"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Category
                        </label>
                        <Input
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="News, Sports…"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => {
                          if (listCount > 0) {
                            setTab("list");
                          } else {
                            close();
                          }
                        }}
                      >
                        {listCount > 0 ? "Back" : "Cancel"}
                      </Button>
                      <Button type="submit" variant="neon" className="flex-1 gap-1">
                        {editing ? (
                          <Save className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {editing ? "Save" : "Add channel"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function TabButton({
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
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-colors ${
        active
          ? "bg-neon/10 text-neon border border-neon/30"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
