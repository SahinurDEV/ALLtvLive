"use client";

import type { ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { applyBackup, browserKV, collectBackup } from "@/lib/backup";

export function DataBackup() {
  const t = useT();

  const exportData = () => {
    // Every profile, the profile list and the shared lock.
    const backup = collectBackup(browserKV());
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
      applyBackup(browserKV(), JSON.parse(await file.text()));
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
