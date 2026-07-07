"use client";

import { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelCard } from "@/components/ChannelCard";
import type { ChannelWithMeta } from "@/lib/types";

interface Props {
  channels: ChannelWithMeta[];
  title: string;
  icon?: React.ReactNode;
  emptyText?: string;
}

export function ChannelScrollRow({ channels, title, icon, emptyText }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  if (channels.length === 0) {
    if (!emptyText) return null;
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            {icon}
            {title}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="relative group/row">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <div className="hidden md:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("left")}
            className="h-8 w-8"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("right")}
            className="h-8 w-8"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {channels.map((channel, i) => (
          <div
            key={channel.id}
            className="shrink-0 w-[46%] sm:w-[32%] md:w-[24%] lg:w-[20%] xl:w-[16%] snap-start"
          >
            <ChannelCard channel={channel} index={i} />
          </div>
        ))}
      </div>
    </div>
  );
}
