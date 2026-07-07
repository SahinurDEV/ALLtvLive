import { create } from "zustand";
import type { ChannelWithMeta, CustomChannel, FilterState } from "./types";
import {
  loadHistory,
  recordWatch,
  clearHistory,
  getPopularChannelIds,
} from "./history/watchHistory";
import {
  getAllOfflineIds,
  clearHealthCache,
  setHealth,
} from "./player/streamHealthCheck";

export type ViewMode = "grid" | "list" | "compact";

export interface UserSettings {
  autoplay: boolean;
  viewMode: ViewMode;
  hideBrokenChannels: boolean;
}

const SETTINGS_KEY = "alltvlive-settings";
const CUSTOM_CHANNELS_KEY = "alltvlive-custom-channels";

function loadSettings(): UserSettings {
  if (typeof window === "undefined") {
    return { autoplay: true, viewMode: "grid", hideBrokenChannels: true };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { autoplay: true, viewMode: "grid", hideBrokenChannels: true };
    const parsed = JSON.parse(raw);
    return {
      autoplay: parsed?.autoplay ?? true,
      viewMode: (parsed?.viewMode as ViewMode) ?? "grid",
      hideBrokenChannels: parsed?.hideBrokenChannels ?? true,
    };
  } catch {
    return { autoplay: true, viewMode: "grid", hideBrokenChannels: true };
  }
}

function saveSettings(settings: UserSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function loadCustomChannels(): CustomChannel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CHANNELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomChannels(list: CustomChannel[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_CHANNELS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

interface AppState {
  // Player
  currentChannel: ChannelWithMeta | null;
  playerOpen: boolean;
  setCurrentChannel: (channel: ChannelWithMeta | null) => void;
  openPlayer: (channel: ChannelWithMeta) => void;
  closePlayer: () => void;

  // Favorites
  favorites: string[];
  _favoritesHydrated: boolean;
  hydrateFavorites: () => void;
  toggleFavorite: (channelId: string) => void;
  isFavorite: (channelId: string) => boolean;

  // Filters
  filters: FilterState;
  setSearch: (search: string) => void;
  setCountryFilter: (countries: string[]) => void;
  setCategoryFilter: (categories: string[]) => void;
  setLanguageFilter: (languages: string[]) => void;
  clearFilters: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Settings sheet
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // View
  activeView: "home" | "countries" | "categories" | "languages" | "favorites" | "custom";
  setActiveView: (
    view: "home" | "countries" | "categories" | "languages" | "favorites" | "custom"
  ) => void;

  // All channels (for navigation)
  allChannels: ChannelWithMeta[];
  setAllChannels: (channels: ChannelWithMeta[]) => void;

  // User country (detected via IP)
  userCountry: string | null;
  userCountryName: string | null;
  userCountryFlag: string | null;
  setUserCountry: (code: string, name: string, flag: string) => void;

  // Watch history / trending
  historyIds: string[];
  popularIds: string[];
  historyHydrated: boolean;
  hydrateHistory: () => void;
  logWatch: (channelId: string) => void;
  clearWatchHistory: () => void;

  // Settings
  settings: UserSettings;
  settingsHydrated: boolean;
  hydrateSettings: () => void;
  updateSettings: (patch: Partial<UserSettings>) => void;

  // Player error tracking
  lastErrorChannelId: string | null;
  reportOpen: boolean;
  openReportDialog: (channelId: string) => void;
  closeReportDialog: () => void;

  // Broken channels (playback failed)
  brokenChannelIds: string[];
  brokenHydrated: boolean;
  hydrateBrokenChannels: () => void;
  markChannelBroken: (channelId: string) => void;
  unmarkChannelBroken: (channelId: string) => void;
  clearAllBrokenChannels: () => void;

  // Custom user channels
  customChannels: CustomChannel[];
  customHydrated: boolean;
  hydrateCustomChannels: () => void;
  addCustomChannel: (data: Omit<CustomChannel, "id" | "addedAt">) => CustomChannel;
  updateCustomChannel: (id: string, patch: Partial<Omit<CustomChannel, "id" | "addedAt">>) => void;
  removeCustomChannel: (id: string) => void;

  // Custom channel dialog
  customDialogOpen: boolean;
  editingCustomId: string | null;
  openCustomDialog: (editingId?: string | null) => void;
  closeCustomDialog: () => void;
}

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("alltvlive-favorites");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("alltvlive-favorites", JSON.stringify(favorites));
}

export const useAppStore = create<AppState>((set, get) => ({
  // Player
  currentChannel: null,
  playerOpen: false,
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  openPlayer: (channel) => {
    set({ currentChannel: channel, playerOpen: true });
    // record in history
    get().logWatch(channel.id);
  },
  closePlayer: () => set({ playerOpen: false }),

  // Favorites (start empty, hydrate on client)
  favorites: [],
  _favoritesHydrated: false,
  hydrateFavorites: () => {
    if (get()._favoritesHydrated) return;
    set({ favorites: loadFavorites(), _favoritesHydrated: true });
  },
  toggleFavorite: (channelId) => {
    const { favorites } = get();
    const newFavorites = favorites.includes(channelId)
      ? favorites.filter((id) => id !== channelId)
      : [...favorites, channelId];
    saveFavorites(newFavorites);
    set({ favorites: newFavorites });
  },
  isFavorite: (channelId) => get().favorites.includes(channelId),

  // Filters
  filters: {
    search: "",
    countries: [],
    categories: [],
    languages: [],
  },
  setSearch: (search) =>
    set((state) => ({ filters: { ...state.filters, search } })),
  setCountryFilter: (countries) =>
    set((state) => ({ filters: { ...state.filters, countries } })),
  setCategoryFilter: (categories) =>
    set((state) => ({ filters: { ...state.filters, categories } })),
  setLanguageFilter: (languages) =>
    set((state) => ({ filters: { ...state.filters, languages } })),
  clearFilters: () =>
    set({
      filters: { search: "", countries: [], categories: [], languages: [] },
    }),

  // Sidebar
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Settings sheet
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // View
  activeView: "home",
  setActiveView: (view) => set({ activeView: view }),

  // All channels
  allChannels: [],
  setAllChannels: (channels) => set({ allChannels: channels }),

  // User country
  userCountry: null,
  userCountryName: null,
  userCountryFlag: null,
  setUserCountry: (code, name, flag) =>
    set({ userCountry: code, userCountryName: name, userCountryFlag: flag }),

  // Watch history
  historyIds: [],
  popularIds: [],
  historyHydrated: false,
  hydrateHistory: () => {
    if (get().historyHydrated) return;
    const historyIds = loadHistory().map((e) => e.channelId);
    const popularIds = getPopularChannelIds(12);
    set({ historyIds, popularIds, historyHydrated: true });
  },
  logWatch: (channelId) => {
    recordWatch(channelId);
    const historyIds = loadHistory().map((e) => e.channelId);
    const popularIds = getPopularChannelIds(12);
    set({ historyIds, popularIds });
  },
  clearWatchHistory: () => {
    clearHistory();
    set({ historyIds: [], popularIds: [] });
  },

  // Settings
  settings: { autoplay: true, viewMode: "grid", hideBrokenChannels: true },
  settingsHydrated: false,
  hydrateSettings: () => {
    if (get().settingsHydrated) return;
    set({ settings: loadSettings(), settingsHydrated: true });
  },
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings });
  },

  // Report dialog
  lastErrorChannelId: null,
  reportOpen: false,
  openReportDialog: (channelId) =>
    set({ reportOpen: true, lastErrorChannelId: channelId }),
  closeReportDialog: () => set({ reportOpen: false }),

  // Broken channels
  brokenChannelIds: [],
  brokenHydrated: false,
  hydrateBrokenChannels: () => {
    if (get().brokenHydrated) return;
    set({ brokenChannelIds: getAllOfflineIds(), brokenHydrated: true });
  },
  markChannelBroken: (channelId) => {
    setHealth(channelId, "offline");
    const current = get().brokenChannelIds;
    if (current.includes(channelId)) return;
    set({ brokenChannelIds: [...current, channelId] });
  },
  unmarkChannelBroken: (channelId) => {
    setHealth(channelId, "online");
    set({
      brokenChannelIds: get().brokenChannelIds.filter((id) => id !== channelId),
    });
  },
  clearAllBrokenChannels: () => {
    clearHealthCache();
    set({ brokenChannelIds: [] });
  },

  // Custom channels
  customChannels: [],
  customHydrated: false,
  hydrateCustomChannels: () => {
    if (get().customHydrated) return;
    set({ customChannels: loadCustomChannels(), customHydrated: true });
  },
  addCustomChannel: (data) => {
    const channel: CustomChannel = {
      id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: data.name.trim(),
      url: data.url.trim(),
      logo: data.logo?.trim() || null,
      category: data.category?.trim() || null,
      addedAt: Date.now(),
    };
    const next = [channel, ...get().customChannels];
    saveCustomChannels(next);
    set({ customChannels: next });
    return channel;
  },
  updateCustomChannel: (id, patch) => {
    const next = get().customChannels.map((c) =>
      c.id === id
        ? {
            ...c,
            ...("name" in patch ? { name: patch.name!.trim() } : {}),
            ...("url" in patch ? { url: patch.url!.trim() } : {}),
            ...("logo" in patch ? { logo: patch.logo?.trim() || null } : {}),
            ...("category" in patch ? { category: patch.category?.trim() || null } : {}),
          }
        : c
    );
    saveCustomChannels(next);
    set({ customChannels: next });
  },
  removeCustomChannel: (id) => {
    const next = get().customChannels.filter((c) => c.id !== id);
    saveCustomChannels(next);
    set({ customChannels: next });
  },

  // Custom channel dialog
  customDialogOpen: false,
  editingCustomId: null,
  openCustomDialog: (editingId = null) =>
    set({ customDialogOpen: true, editingCustomId: editingId }),
  closeCustomDialog: () =>
    set({ customDialogOpen: false, editingCustomId: null }),
}));
