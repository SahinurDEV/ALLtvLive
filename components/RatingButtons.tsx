"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useRatings } from "@/hooks/useRatings";

interface Props {
  channelId: string;
  channelName: string;
  compact?: boolean;
}

function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

export function RatingButtons({ channelId, channelName, compact }: Props) {
  const { up, down, myVote, loading, vote, clear } = useRatings(channelId, channelName);

  const onUp = () => (myVote === "up" ? clear() : vote("up"));
  const onDown = () => (myVote === "down" ? clear() : vote("down"));

  const sizeClass = compact
    ? "text-[10px] sm:text-xs h-7 px-2"
    : "text-xs h-8 px-3";
  const iconClass = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={onUp}
        disabled={loading}
        aria-pressed={myVote === "up"}
        aria-label={myVote === "up" ? "Remove up-vote" : "Up-vote this channel"}
        className={`inline-flex items-center gap-1 rounded-full border transition-colors ${sizeClass} ${
          myVote === "up"
            ? "bg-neon/15 text-neon border-neon/40"
            : "bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground"
        }`}
      >
        <ThumbsUp className={`${iconClass} ${myVote === "up" ? "fill-current" : ""}`} />
        {formatCount(up)}
      </button>
      <button
        onClick={onDown}
        disabled={loading}
        aria-pressed={myVote === "down"}
        aria-label={myVote === "down" ? "Remove down-vote" : "Down-vote this channel"}
        className={`inline-flex items-center gap-1 rounded-full border transition-colors ${sizeClass} ${
          myVote === "down"
            ? "bg-red-500/15 text-red-400 border-red-500/40"
            : "bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground"
        }`}
      >
        <ThumbsDown className={`${iconClass} ${myVote === "down" ? "fill-current" : ""}`} />
        {formatCount(down)}
      </button>
    </div>
  );
}
