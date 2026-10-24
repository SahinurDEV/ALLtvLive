"use client";

import { useState, type ChangeEvent } from "react";
import { FileUp, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { parseM3U, type M3UEntry } from "@/lib/m3u";

const MAX_IMPORT = 500;

/**
 * Import your own M3U playlist (file, URL or pasted text) as custom channels.
 * Everything stays in this browser's local storage.
 */
export function M3UImportPanel({ onDone }: { onDone: () => void }) {
  const addCustomChannel = useAppStore((s) => s.addCustomChannel);
  const existing = useAppStore((s) => s.customChannels);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<M3UEntry[] | null>(null);

  const parse = (raw: string) => {
    const entries = parseM3U(raw);
    if (entries.length === 0) toast.error("No channels found. Is this an M3U playlist?");
    setPreview(entries);
  };

  const fromUrl = async () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error("Enter a playlist URL starting with http:// or https://");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error(String(res.status));
      parse(await res.text());
    } catch {
      toast.error("Couldn't download that playlist. The server may block browser access (CORS); try saving it and uploading the file.");
    } finally {
      setLoading(false);
    }
  };

  const fromFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    parse(await f.text());
    e.target.value = "";
  };

  const importAll = () => {
    if (!preview) return;
    const have = new Set(existing.map((c) => c.url));
    let added = 0;
    for (const p of preview.slice(0, MAX_IMPORT)) {
      if (have.has(p.url)) continue;
      addCustomChannel({ name: p.name, url: p.url, logo: p.logo, category: p.group });
      have.add(p.url);
      added += 1;
    }
    toast.success(`Imported ${added} channel${added === 1 ? "" : "s"}`);
    setPreview(null);
    setText("");
    setUrl("");
    onDone();
  };

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Add channels from your own M3U playlist. They are saved only in this browser.
        Only import playlists you have the right to watch.
      </p>

      <label className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border hover:border-neon/50 px-3 py-3 text-xs cursor-pointer transition-colors">
        <FileUp className="h-4 w-4 text-neon" />
        Upload .m3u / .m3u8 file
        <input type="file" accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain" className="sr-only" onChange={fromFile} />
      </label>

      <div className="flex flex-wrap gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/playlist.m3u"
          className="flex-1 min-w-0 basis-48"
        />
        <Button type="button" variant="outline" onClick={fromUrl} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          Load
        </Button>
      </div>

      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"#EXTM3U\n#EXTINF:-1 tvg-logo=\"…\" group-title=\"News\",My Channel\nhttps://…/index.m3u8"}
          rows={4}
          className="w-full rounded-lg bg-background border border-border px-3 py-2 text-xs font-mono focus:outline-none focus:border-neon"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => parse(text)} disabled={!text.trim()}>
          Read pasted playlist
        </Button>
      </div>

      {preview && preview.length > 0 && (
        <div className="rounded-lg border border-border/60 p-3 space-y-2">
          <p className="text-xs font-medium">
            Found {preview.length} channel{preview.length === 1 ? "" : "s"}
            {preview.length > MAX_IMPORT ? `, the first ${MAX_IMPORT} will be imported` : ""}
          </p>
          <ul className="max-h-40 overflow-y-auto text-[11px] text-muted-foreground space-y-1">
            {preview.slice(0, 50).map((p, i) => (
              <li key={i} className="truncate">
                {p.name}
                {p.group ? ` · ${p.group}` : ""}
              </li>
            ))}
          </ul>
          <Button type="button" variant="neon" className="w-full" onClick={importAll}>
            Import channels
          </Button>
        </div>
      )}
    </div>
  );
}
