import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChannelWithMeta, CustomChannel } from "./types";

const FAV_KEY = "alltvlive-favorites";
const CUSTOM_KEY = "alltvlive-custom";
const BROKEN_KEY = "alltvlive-broken";

interface State {
  channels: ChannelWithMeta[];
  setChannels: (c: ChannelWithMeta[]) => void;

  favorites: string[];
  toggleFavorite: (id: string) => Promise<void>;

  brokenIds: string[];
  markBroken: (id: string) => Promise<void>;
  unmarkBroken: (id: string) => Promise<void>;

  customChannels: CustomChannel[];
  addCustom: (data: Omit<CustomChannel, "id" | "addedAt">) => Promise<CustomChannel>;
  removeCustom: (id: string) => Promise<void>;

  hydrate: () => Promise<void>;
  hydrated: boolean;
}

async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function saveJSON<T>(key: string, value: T) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const useStore = create<State>((set, get) => ({
  channels: [],
  setChannels: (channels) => set({ channels }),

  favorites: [],
  toggleFavorite: async (id) => {
    const list = get().favorites;
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    await saveJSON(FAV_KEY, next);
    set({ favorites: next });
  },

  brokenIds: [],
  markBroken: async (id) => {
    if (get().brokenIds.includes(id)) return;
    const next = [...get().brokenIds, id];
    await saveJSON(BROKEN_KEY, next);
    set({ brokenIds: next });
  },
  unmarkBroken: async (id) => {
    const next = get().brokenIds.filter((x) => x !== id);
    await saveJSON(BROKEN_KEY, next);
    set({ brokenIds: next });
  },

  customChannels: [],
  addCustom: async (data) => {
    const channel: CustomChannel = {
      id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: data.name.trim(),
      url: data.url.trim(),
      logo: data.logo?.trim() || null,
      category: data.category?.trim() || null,
      addedAt: Date.now(),
    };
    const next = [channel, ...get().customChannels];
    await saveJSON(CUSTOM_KEY, next);
    set({ customChannels: next });
    return channel;
  },
  removeCustom: async (id) => {
    const next = get().customChannels.filter((c) => c.id !== id);
    await saveJSON(CUSTOM_KEY, next);
    set({ customChannels: next });
  },

  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const [favorites, brokenIds, customChannels] = await Promise.all([
      loadJSON<string[]>(FAV_KEY, []),
      loadJSON<string[]>(BROKEN_KEY, []),
      loadJSON<CustomChannel[]>(CUSTOM_KEY, []),
    ]);
    set({ favorites, brokenIds, customChannels, hydrated: true });
  },
}));

export function customToChannelWithMeta(c: CustomChannel): ChannelWithMeta {
  return {
    id: c.id,
    name: c.name,
    alt_names: [],
    network: null,
    owners: [],
    country: "INT",
    languages: [],
    categories: c.category ? [c.category] : [],
    is_nsfw: false,
    logo: c.logo,
    streams: [
      {
        channel: c.id,
        feed: null,
        title: c.name,
        url: c.url,
        quality: null,
        user_agent: null,
        referrer: null,
      },
    ],
  };
}
