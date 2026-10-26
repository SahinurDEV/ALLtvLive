"use client";

import { Component, Fragment, type ReactNode } from "react";
import { useT } from "@/lib/i18n";

function Fallback({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="aspect-video w-full rounded-xl border border-border/50 bg-black flex flex-col items-center justify-center gap-3 p-4 text-center" role="alert" data-testid="player-error-boundary">
      <p className="text-sm text-white">{t("err.player")}</p>
      <button type="button" onClick={onRetry} className="min-h-11 rounded-lg bg-neon text-black font-semibold text-sm px-4">
        {t("err.reloadPlayer")}
      </button>
    </div>
  );
}

/** Lets e2e tests simulate a player crash (sessionStorage flag, never set by the app). */
function CrashProbe() {
  if (typeof window !== "undefined" && sessionStorage.getItem("atl-test-crash-player") === "1") {
    throw new Error("test crash");
  }
  return null;
}

/** Keeps a player crash inside the player box; the channel list keeps working. */
export class PlayerErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; key: number }> {
  state = { failed: false, key: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("player crashed", error);
  }
  render() {
    if (this.state.failed) return <Fallback
          onRetry={() => {
            try {
              sessionStorage.removeItem("atl-test-crash-player");
            } catch {
              // ignore
            }
            this.setState((s) => ({ failed: false, key: s.key + 1 }));
          }}
        />;
    return (
      <Fragment key={this.state.key}>
        <CrashProbe />
        {this.props.children}
      </Fragment>
    );
  }
}
