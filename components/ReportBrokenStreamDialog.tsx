"use client";

import { useMemo, useState } from "react";
import { X, Github, Copy, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

// Configurable via env var — falls back to the app's own repo issues
const ISSUE_REPO =
  process.env.NEXT_PUBLIC_ISSUE_REPO || "iptv-org/iptv";

const REASONS = [
  { id: "wont_load", label: "Won't load / infinite spinner" },
  { id: "wrong", label: "Wrong channel / wrong content" },
  { id: "geo", label: "Geo-blocked (region locked)" },
  { id: "buffers", label: "Buffers or freezes a lot" },
  { id: "audio", label: "No audio / audio only" },
];

const REPORT_QUEUE_KEY = "alltvlive-report-queue";

interface QueuedReport {
  channelId: string;
  reason: string;
  at: number;
}

function queueReport(report: QueuedReport) {
  if (typeof window === "undefined") return;
  try {
    const existing: QueuedReport[] = JSON.parse(
      localStorage.getItem(REPORT_QUEUE_KEY) || "[]"
    );
    existing.push(report);
    localStorage.setItem(REPORT_QUEUE_KEY, JSON.stringify(existing.slice(-50)));
  } catch {
    // ignore
  }
}

export function ReportBrokenStreamDialog() {
  const reportOpen = useAppStore((s) => s.reportOpen);
  const closeReportDialog = useAppStore((s) => s.closeReportDialog);
  const channelId = useAppStore((s) => s.lastErrorChannelId);
  const allChannels = useAppStore((s) => s.allChannels);
  const [reason, setReason] = useState<string>(REASONS[0].id);

  const channel = useMemo(
    () => allChannels.find((c) => c.id === channelId) || null,
    [allChannels, channelId]
  );

  if (!reportOpen || !channel) return null;

  const reasonLabel = REASONS.find((r) => r.id === reason)?.label || reason;
  const streamsList = (channel.streams || [])
    .map((s, i) => `- ${i + 1}. ${s.url} ${s.quality ? `(${s.quality})` : ""}`)
    .join("\n");

  const title = `[ALLtvLive] Broken stream: ${channel.name} (${channel.id})`;
  const body = `**Channel:** ${channel.name}
**ID:** ${channel.id}
**Country:** ${channel.country}
**Reason:** ${reasonLabel}

**Known streams:**
${streamsList || "(none)"}

**Reported at:** ${new Date().toISOString()}
`;

  const issueUrl = `https://github.com/${ISSUE_REPO}/issues/new?title=${encodeURIComponent(
    title
  )}&body=${encodeURIComponent(body)}`;

  const submit = () => {
    queueReport({ channelId: channel.id, reason, at: Date.now() });
    toast.success("Report saved locally");
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${body}`);
      toast.success("Report copied to clipboard");
      submit();
    } catch {
      toast.error("Couldn't copy report");
    }
  };

  const openIssue = () => {
    submit();
    window.open(issueUrl, "_blank", "noopener,noreferrer");
    closeReportDialog();
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

          <p className="text-[11px] text-muted-foreground">
            Streams come from a public community project (iptv-org). Reports open a
            GitHub issue upstream so maintainers can review.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="neon" size="sm" onClick={openIssue} className="gap-1.5">
              <Github className="h-3.5 w-3.5" />
              Open GitHub issue
            </Button>
            <Button variant="outline" size="sm" onClick={copyReport} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              Copy report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
