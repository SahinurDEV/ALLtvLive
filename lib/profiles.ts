/**
 * Local profiles. Each profile keeps its own favorites, groups, hidden
 * channels, history and settings in localStorage; the default profile uses
 * the original keys so existing data stays where it is.
 */
export const ACTIVE_PROFILE_KEY = "alltvlive-active-profile";
export const DEFAULT_PROFILE_ID = "default";

export function getActiveProfileId(): string {
  if (typeof window === "undefined") return DEFAULT_PROFILE_ID;
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || DEFAULT_PROFILE_ID;
  } catch {
    return DEFAULT_PROFILE_ID;
  }
}

/** localStorage key for the active profile. */
export function profileKey(base: string): string {
  const id = getActiveProfileId();
  return id === DEFAULT_PROFILE_ID ? base : `${base}@${id}`;
}
