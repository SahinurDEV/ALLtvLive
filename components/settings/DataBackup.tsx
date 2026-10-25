"use client";

import type { ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

// Everything ALLtvLive keeps in this browser. No account needed: move it to
// another device by exporting here and importing there.
const KEYS = [
  "alltvlive-favorites",
  "alltvlive-fav-groups",
  "alltvlive-history",
  "alltvlive-custom-channels",
  "alltvlive-settings",
  "alltvlive-lang",
] as const;

interface Backup {
  app: "alltvlive";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

export function DataBackup() {
  const t = useT();

  const exportData = () => {
    const data: Record<string, unknown> = {};
    for (const k of KEYS) {
      const raw = localStorage.getItem(k);
      if (raw == null) continue;
      try {
        data[k] = JSON.parse(raw);
      } catch {
        data[k] = raw;
      }
    }
    const backup: Backup = { app: "alltvlive", version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `alltvlive-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importData = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<Backup>;
      if (parsed.app !== "alltvlive" || !parsed.data || typeof parsed.data !== "object") {
        throw new Error("not a backup");
      }
      // Never let a backup switch off a PIN-locked kids mode on this device.
      const current = JSON.parse(localStorage.getItem("alltvlive-settings") || "{}");
      for (const k of KEYS) {
        if (!(k in parsed.data)) continue;
        let value = parsed.data[k];
        if (k === "alltvlive-settings" && current?.kidsMode && value && typeof value === "object") {
          value = { ...(value as object), kidsMode: true, kidsPin: current.kidsPin ?? null };
        }
        localStorage.setItem(k, typeof value === "string" ? value : JSON.stringify(value));
      }
      toast.success(t("backup.imported"));
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast.error(t("backup.invalid"));
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full justify-start gap-2" onClick={exportData}>
        <Download className="h-4 w-4" />
        {t("backup.export")}
      </Button>
      <label className="flex items-center gap-2 w-full rounded-md border border-input px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
        <Upload className="h-4 w-4" />
        {t("backup.import")}
        <input type="file" accept="application/json,.json" className="sr-only" onChange={importData} />
      </label>
      <p className="text-[11px] text-muted-foreground">{t("backup.note")}</p>
    </div>
  );
}
