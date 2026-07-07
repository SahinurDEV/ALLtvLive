"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Save, Trophy, Newspaper, Rocket, Globe2 } from "lucide-react";
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

export function CustomChannelDialog() {
  const open = useAppStore((s) => s.customDialogOpen);
  const editingId = useAppStore((s) => s.editingCustomId);
  const close = useAppStore((s) => s.closeCustomDialog);
  const customChannels = useAppStore((s) => s.customChannels);
  const addCustomChannel = useAppStore((s) => s.addCustomChannel);
  const updateCustomChannel = useAppStore((s) => s.updateCustomChannel);

  const editing = editingId
    ? customChannels.find((c) => c.id === editingId)
    : null;

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setUrl(editing?.url ?? "");
      setLogo(editing?.logo ?? "");
      setCategory(editing?.category ?? "");
    }
  }, [open, editing]);

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
    } else {
      addCustomChannel({
        name: trimmedName,
        url: trimmedUrl,
        logo: logo.trim() || null,
        category: category.trim() || null,
      });
      toast.success("Channel added");
    }
    close();
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
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-channel-title"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 id="custom-channel-title" className="font-bold text-base flex items-center gap-2">
                  {editing ? (
                    <>
                      <Save className="h-4 w-4 text-neon" />
                      Edit Custom Channel
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 text-neon" />
                      Add Custom Channel
                    </>
                  )}
                </h2>
                <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={submit} className="p-4 space-y-3">
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
                            <span className="block font-medium truncate">{p.name}</span>
                            <span className="block text-[9px] text-muted-foreground truncate">{p.hint}</span>
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
                    Supports HLS (.m3u8), MP4, or direct video URLs. Some CORS-blocked streams may not play in browsers.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Logo URL (optional)
                  </label>
                  <Input
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Category (optional)
                  </label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="News, Sports, Music..."
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="neon" className="flex-1 gap-1">
                    {editing ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {editing ? "Save" : "Add"}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
