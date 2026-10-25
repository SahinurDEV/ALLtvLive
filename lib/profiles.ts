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

export interface Profile {
  id: string;
  name: string;
  kids: boolean;
  emoji: string;
}

const PROFILES_KEY = "alltvlive-profiles";

export function loadProfiles(): Profile[] {
  const def: Profile = { id: DEFAULT_PROFILE_ID, name: "Me", kids: false, emoji: "🙂" };
  if (typeof window === "undefined") return [def];
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
    const list = Array.isArray(parsed) ? (parsed as Profile[]).filter((p) => p && typeof p.id === "string") : [];
    return list.some((p) => p.id === DEFAULT_PROFILE_ID) ? list : [def, ...list];
  } catch {
    return [def];
  }
}

export function saveProfiles(list: Profile[]) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** Create a profile. A Kids profile starts with kids mode switched on. */
export function createProfile(name: string, kids: boolean): Profile {
  const p: Profile = {
    id: `p${Date.now().toString(36)}`,
    name: name.trim().slice(0, 20) || (kids ? "Kids" : "Profile"),
    kids,
    emoji: kids ? "🧸" : "📺",
  };
  saveProfiles([...loadProfiles(), p]);
  if (kids) {
    try {
      localStorage.setItem(`alltvlive-settings@${p.id}`, JSON.stringify({ kidsMode: true, autoplay: true }));
    } catch {
      // ignore
    }
  }
  return p;
}

export function deleteProfile(id: string) {
  if (id === DEFAULT_PROFILE_ID) return;
  saveProfiles(loadProfiles().filter((p) => p.id !== id));
  try {
    for (const k of Object.keys(localStorage)) if (k.endsWith(`@${id}`)) localStorage.removeItem(k);
    if (getActiveProfileId() === id) localStorage.removeItem(ACTIVE_PROFILE_KEY);
  } catch {
    // ignore
  }
}

/** Switch profile and reload so every store re-reads its own data. */
export function switchProfile(id: string) {
  try {
    if (id === DEFAULT_PROFILE_ID) localStorage.removeItem(ACTIVE_PROFILE_KEY);
    else localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch {
    // ignore
  }
  window.location.reload();
}
