"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISSED_KEY = "alltvlive-install-dismissed";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 4000;

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  // Other iOS browsers (Chrome, Firefox, in-app) can't add to the home screen the same way.
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram/.test(ua);
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    return !!at && Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * "Install the app" card. Android / desktop Chrome & Edge use the native
 * beforeinstallprompt; iOS Safari gets Share → Add to Home Screen steps.
 * Dismissing hides it for 30 days; it never shows inside the installed app.
 */
export function InstallPrompt() {
  const t = useT();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"native" | "ios" | null>(null);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      clearTimeout(timer);
      timer = setTimeout(() => setMode("native"), SHOW_DELAY_MS);
    };
    const installed = () => {
      setMode(null);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    if (isIosSafari()) timer = setTimeout(() => setMode("ios"), SHOW_DELAY_MS);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    if (choice?.outcome === "dismissed") dismiss();
    setMode(null);
    setDeferred(null);
  };

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          role="dialog"
          aria-label={t(mode === "ios" ? "install.iosTitle" : "install.title")}
          data-testid="install-prompt"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-40"
        >
          <div className="rounded-xl border border-neon/30 bg-card/95 backdrop-blur shadow-2xl p-3">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {t(mode === "ios" ? "install.iosTitle" : "install.title")}
                </div>
                {mode === "native" ? (
                  <div className="text-xs text-muted-foreground">{t("install.body")}</div>
                ) : (
                  <ol className="mt-1 space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <span className="font-mono text-neon">1</span>
                      <Share className="h-3.5 w-3.5 text-foreground" aria-hidden />
                      {t("install.iosStep1")}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="font-mono text-neon">2</span>
                      <SquarePlus className="h-3.5 w-3.5 text-foreground" aria-hidden />
                      {t("install.iosStep2")}
                    </li>
                  </ol>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 -mr-1 -mt-1"
                onClick={dismiss}
                aria-label={t("install.dismiss")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {mode === "native" && (
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={dismiss}>
                  {t("install.dismiss")}
                </Button>
                <Button variant="neon" size="sm" className="h-8 gap-1.5 text-xs" onClick={install}>
                  <Download className="h-3.5 w-3.5" />
                  {t("install.button")}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
