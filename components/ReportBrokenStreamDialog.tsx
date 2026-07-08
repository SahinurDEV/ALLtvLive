"use client";

import { useMemo, useState } from "react";
import { X, Send, MessageSquareWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

const REASONS = [
  { id: "broken", label: "Stream won't load / infinite spinner" },
  { id: "wrong_content", label: "Wrong channel / wrong content" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "buffering", label: "Buffers or freezes a lot" },
  { id: "other", label: "Something else" },
];

const MAX_NOTE_LEN = 500;

export function ReportBrokenStreamDialog() {
  const reportOpen = useAppStore((s) => s.reportOpen);
  const closeReportDialog = useAppStore((s) => s.closeReportDialog);
  const channelId = useAppStore((s) => s.lastErrorChannelId);
  const allChannels = useAppStore((s) => s.allChannels);
  const [reason, setReason] = useState<string>(REASONS[0].id);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const channel = useMemo(
    () => allChannels.find((c) => c.id === channelId) || null,
    [allChannels, channelId]
  );

  if (!reportOpen || !channel) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          channelName: channel.name,
          reason,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 429) {
        toast.error("You've reported a lot recently. Try again in a minute.");
        return;
      }
      if (!res.ok || !data?.ok) {
        toast.error("Couldn't send report. Please try again.");
        return;
      }
      toast.success("Report sent — thanks for flagging this.");
      setNote("");
      setReason(REASONS[0].id);
      closeReportDialog();
    } catch {
      toast.error("Network error while sending report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={closeReportDialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/50 bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <MessageSquareWarning className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h2 id="report-title" className="text-base font-bold">Report broken stream</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{channel.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeReportDialog}
            className="h-8 w-8 -mr-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              What's wrong?
            </label>
            <div className="space-y-1">
              {REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm border transition-colors ${
                    reason === r.id
                      ? "border-neon/50 bg-neon/5"
                      : "border-border/50 hover:bg-secondary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="accent-neon"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="report-note"
              className="text-xs font-semibold text-muted-foreground mb-1.5 block"
            >
              Anything else? (optional)
            </label>
            <textarea
              id="report-note"
              value={note}
              maxLength={MAX_NOTE_LEN}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add details — quality issues, region, timing, etc."
              rows={3}
              className="w-full rounded-lg bg-background border border-border/60 focus:outline-none focus:border-neon px-3 py-2 text-sm resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">
              {note.length}/{MAX_NOTE_LEN}
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Your IP is stored with the report so we can track duplicate flags. Nothing
            else about you is collected.
          </p>

          <div className="flex flex-wrap gap-2 pt-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeReportDialog}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="neon"
              size="sm"
              onClick={submit}
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
