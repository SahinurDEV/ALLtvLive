import { create } from "zustand";
import type { ChannelWithMeta, FilterState } from "./types";
import {
  loadHistory,
  recordWatch,
  clearHistory,
  getPopularChannelIds,
} from "./history/watchHistory";

export type ViewMode = "grid" | "list" | "compact";

export interface UserSettings {
  autoplay: boolean;
  viewMode: ViewMode;
}

const SETTINGS_KEY = "alltvlive-settings";

function loadSettings(): UserSettings {
  if (typeof window === "undefined") {
    return { autoplay: true, viewMode: "grid" };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { autoplay: true, viewMode: "grid" };
    const parsed = JSON.parse(raw);
    return {
      autoplay: parsed?.autoplay ?? true,
      viewMode: (parsed?.viewMode as ViewMode) ?? "grid",
    };
  } catch {
    return { autoplay: true, viewMode: "grid" };
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
  activeView: "home" | "countries" | "categories" | "languages" | "favorites";
  setActiveView: (
    view: "home" | "countries" | "categories" | "languages" | "favorites"
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
  settings: { autoplay: true, viewMode: "grid" },
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
}));
