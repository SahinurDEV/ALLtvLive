import { profileKey } from "./profiles";

export interface FavoriteGroup {
  id: string;
  name: string;
  channelIds: string[];
}

const BASE = "alltvlive-fav-groups";

export function loadGroups(): FavoriteGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(profileKey(BASE));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((g) => g && typeof g.id === "string" && typeof g.name === "string" && Array.isArray(g.channelIds))
      : [];
  } catch {
    return [];
  }
}

export function saveGroups(groups: FavoriteGroup[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(profileKey(BASE), JSON.stringify(groups));
  } catch {
    // ignore
  }
}

/** Move an item within a list; returns a new array. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}
