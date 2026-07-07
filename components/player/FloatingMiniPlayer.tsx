"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronUp, Radio } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getPlaceholderLogo } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * When the main player scrolls out of view, show a compact floating card in
 * the corner so the user knows what's playing and can jump back. The actual
 * video element stays mounted in the main player (React keeps it alive) —
 * audio keeps playing while offscreen because we don't unmount it.
 */
export function FloatingMiniPlayer() {
  const currentChannel = useAppStore((s) => s.currentChannel);
  const closePlayer = useAppStore((s) => s.closePlayer);
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!currentChannel) {
      setVisible(false);
      return;
    }
    // Wait a frame for the main player to render
    const timer = setTimeout(() => {
      const el = document.getElementById("main-player");
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          setVisible(!entry.isIntersecting);
        },
        { threshold: 0, rootMargin: "0px 0px -80% 0px" }
      );
      observer.observe(el);
      observerRef.current = observer;
    }, 300);

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [currentChannel]);

  const scrollUp = () => {
    const el = document.getElementById("main-player");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!currentChannel) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-16 right-3 sm:bottom-4 sm:right-4 z-40 lg:bottom-4 pointer-events-auto"
        >
          <div
            className="flex items-center gap-2 bg-card border border-neon/30 rounded-xl shadow-[0_0_30px_rgba(0,255,157,0.2)] p-2 pr-3 max-w-[280px]"
            role="region"
            aria-label="Now playing"
          >
            <button
              onClick={scrollUp}
              className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex items-center justify-center shrink-0 relative group"
              aria-label={`Jump back to ${currentChannel.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentChannel.logo || getPlaceholderLogo(currentChannel.name)}
                alt=""
                className="w-full h-full object-contain p-1"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ChevronUp className="h-5 w-5 text-white" />
              </div>
            </button>
            <button
              onClick={scrollUp}
              className="flex-1 min-w-0 text-left"
              aria-label="Jump back to player"
            >
              <div className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                LIVE
              </div>
              <div className="text-xs font-semibold truncate">
                {currentChannel.name}
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closePlayer}
              className="h-7 w-7 shrink-0"
              aria-label="Close mini player"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
