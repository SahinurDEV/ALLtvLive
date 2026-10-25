"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { ChannelWithMeta } from "@/lib/types";
import { getPlaceholderLogo } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface Props {
  visible: boolean;
  prev: ChannelWithMeta;
  current: ChannelWithMeta;
  next: ChannelWithMeta;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

function Logo({ ch, size }: { ch: ChannelWithMeta; size: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ch.logo || getPlaceholderLogo(ch.name)}
      alt=""
      className={`${size} rounded bg-white/10 object-contain shrink-0`}
      loading="lazy"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = getPlaceholderLogo(ch.name);
      }}
    />
  );
}

/** Small overlay showing previous / current / next channel after a zap. */
export function MiniGuideStrip({ visible, prev, current, next, position, total, onPrev, onNext }: Props) {
  const t = useT();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="mini-guide"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="absolute inset-x-0 mx-auto top-9 z-20 w-[min(92%,30rem)] rounded-xl border border-white/10 bg-black/75 backdrop-blur-md text-white shadow-xl"
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 p-1.5">
            <button
              type="button"
              onClick={onPrev}
              className="flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left hover:bg-white/10"
              aria-label={`${t("zap.prev")}: ${prev.name}`}
            >
              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-white/60" />
              <Logo ch={prev} size="h-5 w-5" />
              <span className="truncate text-[11px] text-white/70">{prev.name}</span>
            </button>
            <div className="flex min-w-0 max-w-[9rem] flex-col items-center px-1">
              <span className="max-w-full truncate text-xs font-semibold text-neon">{current.name}</span>
              <span className="text-[10px] font-mono text-white/50">
                {position}/{total}
              </span>
            </div>
            <button
              type="button"
              onClick={onNext}
              className="flex min-w-0 items-center justify-end gap-1.5 rounded-lg px-1.5 py-1 text-right hover:bg-white/10"
              aria-label={`${t("zap.next")}: ${next.name}`}
            >
              <span className="truncate text-[11px] text-white/70">{next.name}</span>
              <Logo ch={next} size="h-5 w-5" />
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
            </button>
          </div>
          <p className="pb-1 text-center text-[9px] text-white/40 sm:hidden">{t("zap.swipeTip")}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
