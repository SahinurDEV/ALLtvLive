"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Lang = "en" | "bn";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা" },
];

const KEY = "alltvlive-lang";

const en = {
  "nav.home": "Home",
  "nav.countries": "Countries",
  "nav.categories": "Categories",
  "nav.languages": "Languages",
  "nav.favorites": "Favorites",
  "nav.browse": "Browse",
  "nav.random": "Random",
  "nav.settings": "Settings",
  "nav.myChannels": "My Channels",
  "nav.addCustom": "Add Custom Channel",
  "nav.browseCountries": "Browse Countries",
  "nav.browseCategories": "Browse Categories",
  "nav.browseLanguages": "Browse Languages",
  "nav.multiview": "Multi-view",
  "nav.guide": "TV Guide",
  "search.placeholder": "Search channels... (Ctrl+K)",
  "search.recent": "Recently watched",
  "search.trending": "Trending now",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.autoplay": "Autoplay",
  "settings.autoplayOn": "Auto-play on load",
  "settings.autoplayHint": "Automatically start a channel when the app opens",
  "settings.reliability": "Channel reliability",
  "settings.hideBroken": "Hide broken channels",
  "settings.hideBrokenHint": "Automatically skip channels that failed to play",
  "settings.view": "Channel view",
  "settings.theme": "Theme",
  "settings.data": "Your data",
  "player.unavailable": "This channel isn't available right now",
  "player.retry": "Retry",
  "player.trySource": "Try another source",
  "backup.export": "Export favorites, history & settings",
  "backup.import": "Import from a backup file",
  "backup.note": "No account needed: export on one device and import on another.",
  "backup.imported": "Backup imported. Reloading…",
  "backup.invalid": "That file isn't an ALLtvLive backup",
  "guide.now": "Now",
  "guide.next": "Next",
  "guide.none": "No TV guide available for this channel",
  "multi.title": "Multi-view",
  "multi.add": "Add channel",
  "multi.empty": "Pick up to 4 channels to watch side by side",
  "multi.remove": "Remove",
  "multi.layout": "Layout",
  "multi.muteHint": "Tap a tile to hear it; the others stay muted",
  "footer.dmca": "Copyright & Takedown",
  "zap.hint": "Live player. Swipe up or down, or use the arrow keys, to change channel",
  "zap.prev": "Previous",
  "zap.next": "Next",
  "zap.swipeTip": "Swipe up/down to change channel",
  "home.continue": "Continue Watching",
  "home.clearHistory": "Clear",
  "home.historyCleared": "Watch history cleared",
  "home.removeFromHistory": "Remove from history",
} as const;

export type MessageKey = keyof typeof en;

const bn: Record<MessageKey, string> = {
  "nav.home": "হোম",
  "nav.countries": "দেশ",
  "nav.categories": "ক্যাটাগরি",
  "nav.languages": "ভাষা",
  "nav.favorites": "প্রিয়",
  "nav.browse": "ব্রাউজ",
  "nav.random": "এলোমেলো",
  "nav.settings": "সেটিংস",
  "nav.myChannels": "আমার চ্যানেল",
  "nav.addCustom": "নিজের চ্যানেল যোগ করুন",
  "nav.browseCountries": "দেশ অনুযায়ী দেখুন",
  "nav.browseCategories": "ক্যাটাগরি অনুযায়ী দেখুন",
  "nav.browseLanguages": "ভাষা অনুযায়ী দেখুন",
  "nav.multiview": "মাল্টি-ভিউ",
  "nav.guide": "টিভি গাইড",
  "search.placeholder": "চ্যানেল খুঁজুন... (Ctrl+K)",
  "search.recent": "সম্প্রতি দেখা",
  "search.trending": "এখন জনপ্রিয়",
  "settings.title": "সেটিংস",
  "settings.language": "ভাষা",
  "settings.autoplay": "অটো-প্লে",
  "settings.autoplayOn": "খুললেই চালু হবে",
  "settings.autoplayHint": "অ্যাপ খুললে স্বয়ংক্রিয়ভাবে একটি চ্যানেল চালু হবে",
  "settings.reliability": "চ্যানেলের নির্ভরযোগ্যতা",
  "settings.hideBroken": "নষ্ট চ্যানেল লুকান",
  "settings.hideBrokenHint": "যেসব চ্যানেল চলেনি সেগুলো বাদ দিন",
  "settings.view": "চ্যানেল দেখার ধরন",
  "settings.theme": "থিম",
  "settings.data": "আপনার ডেটা",
  "player.unavailable": "এই চ্যানেলটি এখন পাওয়া যাচ্ছে না",
  "player.retry": "আবার চেষ্টা",
  "player.trySource": "অন্য সোর্স দেখুন",
  "backup.export": "প্রিয়, ইতিহাস ও সেটিংস এক্সপোর্ট",
  "backup.import": "ব্যাকআপ ফাইল থেকে ইমপোর্ট",
  "backup.note": "অ্যাকাউন্ট লাগবে না: এক ডিভাইসে এক্সপোর্ট করে অন্যটিতে ইমপোর্ট করুন।",
  "backup.imported": "ব্যাকআপ ইমপোর্ট হয়েছে। রিলোড হচ্ছে…",
  "backup.invalid": "এটি ALLtvLive ব্যাকআপ ফাইল নয়",
  "guide.now": "এখন",
  "guide.next": "পরবর্তী",
  "guide.none": "এই চ্যানেলের টিভি গাইড নেই",
  "multi.title": "মাল্টি-ভিউ",
  "multi.add": "চ্যানেল যোগ করুন",
  "multi.empty": "পাশাপাশি দেখতে সর্বোচ্চ ৪টি চ্যানেল বাছুন",
  "multi.remove": "সরান",
  "multi.layout": "লেআউট",
  "multi.muteHint": "শুনতে একটি টাইলে চাপুন; বাকিগুলো মিউট থাকবে",
  "footer.dmca": "কপিরাইট ও অপসারণ",
  "zap.hint": "লাইভ প্লেয়ার। চ্যানেল বদলাতে উপরে বা নিচে সোয়াইপ করুন অথবা অ্যারো কী চাপুন",
  "zap.prev": "আগের",
  "zap.next": "পরের",
  "zap.swipeTip": "চ্যানেল বদলাতে উপরে/নিচে সোয়াইপ করুন",
  "home.continue": "দেখা চালিয়ে যান",
  "home.clearHistory": "মুছুন",
  "home.historyCleared": "দেখার ইতিহাস মুছে ফেলা হয়েছে",
  "home.removeFromHistory": "ইতিহাস থেকে সরান",
};

const DICTS: Record<Lang, Record<MessageKey, string>> = { en, bn };

const listeners = new Set<() => void>();

function read(): Lang {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(KEY);
  return v === "bn" ? "bn" : "en";
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLang(): Lang {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as Lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return lang;
}

/** `const t = useT(); t("nav.home")` */
export function useT() {
  const lang = useLang();
  return useCallback((key: MessageKey) => DICTS[lang][key] ?? en[key], [lang]);
}
