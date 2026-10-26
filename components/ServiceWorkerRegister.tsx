"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production so the site can be installed as an app.
 * The build id in the URL gives every deploy its own cache. A new worker never
 * reloads the page, so a stream keeps playing through an update.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(process.env.NEXT_PUBLIC_BUILD_ID || "1")}`, { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
