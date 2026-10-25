"use client";

import { createPortal } from "react-dom";
import { X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

/** Share options for browsers without the native share sheet (mostly desktop). */
export function ShareSheet({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const t = useT();
  if (typeof document === "undefined") return null;
  const text = t("share.text", { name: title });
  const enc = encodeURIComponent;
  const targets = [
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${url}`)}`, color: "bg-[#25D366]" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, color: "bg-[#1877F2]" },
    { name: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, color: "bg-[#229ED9]" },
    { name: "X", href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`, color: "bg-black border border-white/20" },
  ];
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={onClose} role="dialog" aria-modal="true" aria-label={t("share.title")} data-testid="share-sheet">
      <div className="w-full max-w-sm rounded-xl bg-card border border-border/60 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{t("share.title")}</h2>
          <button type="button" onClick={onClose} aria-label={t("lock.cancel")} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {targets.map((s) => (
            <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" onClick={onClose} className={`${s.color} text-white text-xs font-semibold rounded-lg h-11 flex items-center justify-center`}>
              {s.name}
            </a>
          ))}
          <button
            type="button"
            className="bg-secondary text-xs font-semibold rounded-lg h-11 flex items-center justify-center gap-1"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast.success(t("share.copied"));
              } catch {
                toast.error(t("share.copyFailed"));
              }
              onClose();
            }}
          >
            <Link2 className="h-3.5 w-3.5" /> {t("share.copy")}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground break-all">{url}</p>
      </div>
    </div>,
    document.body
  );
}
