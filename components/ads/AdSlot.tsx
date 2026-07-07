"use client";

import { useEffect, useRef } from "react";

interface AdSlotProps {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  layout?: string;
  layoutKey?: string;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export function AdSlot({
  slot,
  format = "auto",
  layout,
  layoutKey,
  responsive = true,
  className = "",
  style,
  label = true,
}: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || pushedRef.current) return;
    if (typeof window === "undefined") return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // AdSense not loaded yet — ignore
    }
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className={`w-full ${className}`} aria-hidden="true">
      {label && (
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 text-center mb-1">
          Advertisement
        </div>
      )}
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={style ?? { display: "block" }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layout ? { "data-ad-layout": layout } : {})}
        {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
