"use client";

import { useCallback, useEffect, useState } from "react";

interface RatingState {
  up: number;
  down: number;
  myVote: "up" | "down" | null;
  loading: boolean;
}

const INITIAL: RatingState = { up: 0, down: 0, myVote: null, loading: false };

export function useRatings(channelId: string | null, channelName: string | null) {
  const [state, setState] = useState<RatingState>(INITIAL);

  useEffect(() => {
    if (!channelId) {
      setState(INITIAL);
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetch(`/api/ratings?channelId=${encodeURIComponent(channelId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setState({
          up: Number(data.up) || 0,
          down: Number(data.down) || 0,
          myVote: data.myVote ?? null,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const vote = useCallback(
    async (v: "up" | "down") => {
      if (!channelId || !channelName) return;
      const prev = state;
      const next: RatingState = {
        ...state,
        myVote: v,
        up: state.up + (v === "up" ? 1 : 0) - (state.myVote === "up" ? 1 : 0),
        down: state.down + (v === "down" ? 1 : 0) - (state.myVote === "down" ? 1 : 0),
      };
      setState(next);
      try {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channelId, channelName, vote: v }),
        });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setState({
          up: Number(data.up) || 0,
          down: Number(data.down) || 0,
          myVote: data.myVote ?? v,
          loading: false,
        });
      } catch {
        setState(prev);
      }
    },
    [channelId, channelName, state]
  );

  const clear = useCallback(async () => {
    if (!channelId || !state.myVote) return;
    const prev = state;
    setState({
      ...state,
      up: state.up - (state.myVote === "up" ? 1 : 0),
      down: state.down - (state.myVote === "down" ? 1 : 0),
      myVote: null,
    });
    try {
      const res = await fetch(
        `/api/ratings?channelId=${encodeURIComponent(channelId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("failed");
    } catch {
      setState(prev);
    }
  }, [channelId, state]);

  return { ...state, vote, clear };
}
