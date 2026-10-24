"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ChevronLeft, ChevronRight, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ChannelWithMeta } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { formatViewerCount, getPlaceholderLogo } from "@/lib/utils";

interface HeroBannerProps {
  channels: ChannelWithMeta[];
}

export function HeroBanner({ channels }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const openPlayer = useAppStore((s) => s.openPlayer);

  const channel = channels[currentIndex];

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % channels.length);
  }, [channels.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(
      (prev) => (prev - 1 + channels.length) % channels.length
    );
  }, [channels.length]);

  // Auto-rotate
  useEffect(() => {
    if (channels.length <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide, channels.length]);

  if (!channel) return null;

  return (
    <div className="relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden mb-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={channel.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a2e] via-[#1a0a3e] to-[#0a1a2e]" />

          {/* Channel logo as faded background */}
          <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={channel.logo || getPlaceholderLogo(channel.name)}
              alt=""
              className="w-72 h-72 object-contain"
            />
          </div>

          {/* Content */}
          <div className="relative h-full flex flex-col justify-end p-6 md:p-10">
            <div className="flex items-center gap-2 mb-3">
              {channel.isLive && (
                <Badge
                  variant="destructive"
                  className="gap-1 font-bold"
                >
                  <Radio className="h-3 w-3 animate-pulse" />
                  LIVE NOW
                </Badge>
              )}
              {(channel.categories || []).slice(0, 2).map((cat) => (
                <Badge key={cat} variant="neon">
                  {cat}
                </Badge>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 max-w-xl">
              {channel.name}
            </h1>

            <div className="flex items-center gap-4 text-gray-300 text-sm mb-4">
              {channel.countryInfo && (
                <span className="flex items-center gap-1">
                  {channel.countryInfo.flag} {channel.countryInfo.name}
                </span>
              )}
              {channel.viewerCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {formatViewerCount(channel.viewerCount)} watching
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="neon"
                size="lg"
                onClick={() => openPlayer(channel)}
                className="gap-2"
              >
                <Play className="h-5 w-5" fill="black" />
                Watch Now
              </Button>
            </div>

            {/* Dots indicator */}
            <div className="flex items-center gap-1.5 mt-6">
              {channels.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentIndex
                      ? "w-6 bg-neon"
                      : "w-1.5 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 hidden md:flex"
        onClick={prevSlide}
        aria-label="Previous featured channel"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 hidden md:flex"
        onClick={nextSlide}
        aria-label="Next featured channel"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  );
}
