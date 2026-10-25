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
  "install.title": "Install ALLtvLive",
  "install.body": "Open live TV in one tap from your home screen",
  "install.button": "Install",
  "install.dismiss": "Not now",
  "install.iosTitle": "Add ALLtvLive to your Home Screen",
  "install.iosStep1": "Tap the Share button",
  "install.iosStep2": "Choose “Add to Home Screen”",
  "player.nextChannel": "Next channel",
  "player.skippingIn": "Skipping to {name} in {s}s",
  "player.cancel": "Cancel",
  "player.reportDead": "Report dead channel",
  "player.reported": "Reported, thanks",
  "player.reportFailed": "Couldn’t send report. Try again.",
  "player.reportRateLimited": "Too many reports. Try again in a minute.",
  "player.triedAll": "Tried all {n} sources",
  "player.autoSkip": "Auto-skip dead channels",
  "zap.hint": "Live player. Swipe up or down, or use the arrow keys, to change channel",
  "zap.prev": "Previous",
  "zap.next": "Next",
  "zap.swipeTip": "Swipe up/down to change channel",
  "home.continue": "Continue Watching",
  "home.clearHistory": "Clear",
  "home.historyCleared": "Watch history cleared",
  "home.removeFromHistory": "Remove from history",
  "mini.expand": "Back to full player",
  "mini.close": "Close mini player",
  "player.quality": "Quality",
  "player.qualityAuto": "Auto",
  "player.audio": "Audio language",
  "player.last": "Last",
  "player.noLast": "No previous channel yet",
  "player.noChannelNumber": "No channel number {n}",
  "player.numberHint": "Type a channel number",
  "fav.emptyTitle": "No Favorites Yet",
  "fav.emptyBody": "Tap the heart on any channel to add it to your favorites. They will appear here for quick access.",
  "fav.groups": "Favorite groups",
  "fav.all": "All",
  "fav.newGroup": "New group",
  "fav.addGroup": "Add group",
  "fav.arrange": "Arrange",
  "fav.done": "Done",
  "fav.deleteGroup": "Delete group",
  "fav.arrangeHint": "Drag the handle or use the arrows to reorder. Tap a group to add or remove a channel.",
  "fav.groupEmpty": "No channels in this group yet. Tap Arrange to add some.",
  "fav.title": "My Favorites",
  "fav.drag": "Drag to reorder",
  "fav.moveUp": "Move up",
  "fav.moveDown": "Move down",
  "home.forYou": "For You",
  "home.daypart.morning": "Good morning: start your day",
  "home.daypart.afternoon": "Afternoon picks",
  "home.daypart.evening": "Tonight: sports, movies and more",
  "home.daypart.night": "Late night: movies and music",
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
  "install.title": "ALLtvLive ইনস্টল করুন",
  "install.body": "হোম স্ক্রিন থেকে এক ট্যাপে লাইভ টিভি খুলুন",
  "install.button": "ইনস্টল",
  "install.dismiss": "এখন না",
  "install.iosTitle": "ALLtvLive হোম স্ক্রিনে যোগ করুন",
  "install.iosStep1": "শেয়ার বাটনে ট্যাপ করুন",
  "install.iosStep2": "“Add to Home Screen” বেছে নিন",
  "player.nextChannel": "পরের চ্যানেল",
  "player.skippingIn": "{s} সেকেন্ডে {name} চালু হচ্ছে",
  "player.cancel": "বাতিল",
  "player.reportDead": "চ্যানেলটি বন্ধ জানান",
  "player.reported": "জানানো হয়েছে, ধন্যবাদ",
  "player.reportFailed": "রিপোর্ট পাঠানো যায়নি। আবার চেষ্টা করুন।",
  "player.reportRateLimited": "অনেক রিপোর্ট হয়েছে। এক মিনিট পর চেষ্টা করুন।",
  "player.triedAll": "সব {n}টি সোর্স চেষ্টা করা হয়েছে",
  "player.autoSkip": "বন্ধ চ্যানেল নিজে থেকে বাদ দিন",
  "zap.hint": "লাইভ প্লেয়ার। চ্যানেল বদলাতে উপরে বা নিচে সোয়াইপ করুন অথবা অ্যারো কী চাপুন",
  "zap.prev": "আগের",
  "zap.next": "পরের",
  "zap.swipeTip": "চ্যানেল বদলাতে উপরে/নিচে সোয়াইপ করুন",
  "home.continue": "দেখা চালিয়ে যান",
  "home.clearHistory": "মুছুন",
  "home.historyCleared": "দেখার ইতিহাস মুছে ফেলা হয়েছে",
  "home.removeFromHistory": "ইতিহাস থেকে সরান",
  "mini.expand": "বড় প্লেয়ারে ফিরুন",
  "mini.close": "মিনি প্লেয়ার বন্ধ করুন",
  "player.quality": "কোয়ালিটি",
  "player.qualityAuto": "অটো",
  "player.audio": "অডিওর ভাষা",
  "player.last": "আগের",
  "player.noLast": "এখনো আগের কোনো চ্যানেল নেই",
  "player.noChannelNumber": "{n} নম্বরে কোনো চ্যানেল নেই",
  "player.numberHint": "চ্যানেল নম্বর টাইপ করুন",
  "fav.emptyTitle": "এখনো কোনো ফেভারিট নেই",
  "fav.emptyBody": "যেকোনো চ্যানেলের হার্ট আইকনে চাপ দিন। ফেভারিট চ্যানেলগুলো দ্রুত দেখার জন্য এখানে থাকবে।",
  "fav.groups": "ফেভারিট গ্রুপ",
  "fav.all": "সব",
  "fav.newGroup": "নতুন গ্রুপ",
  "fav.addGroup": "গ্রুপ যোগ করুন",
  "fav.arrange": "সাজান",
  "fav.done": "শেষ",
  "fav.deleteGroup": "গ্রুপ মুছুন",
  "fav.arrangeHint": "ক্রম বদলাতে হ্যান্ডেল টানুন বা তীর চাপুন। চ্যানেল যোগ বা বাদ দিতে গ্রুপে চাপ দিন।",
  "fav.groupEmpty": "এই গ্রুপে এখনো কোনো চ্যানেল নেই। যোগ করতে 'সাজান' চাপুন।",
  "fav.title": "আমার ফেভারিট",
  "fav.drag": "ক্রম বদলাতে টানুন",
  "fav.moveUp": "উপরে নিন",
  "fav.moveDown": "নিচে নিন",
  "home.forYou": "আপনার জন্য",
  "home.daypart.morning": "শুভ সকাল: দিন শুরু করুন",
  "home.daypart.afternoon": "দুপুরের বাছাই",
  "home.daypart.evening": "আজ সন্ধ্যায়: খেলা, সিনেমা আর আরও",
  "home.daypart.night": "গভীর রাত: সিনেমা আর গান",
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
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      let msg: string = DICTS[lang][key] ?? en[key];
      if (vars) for (const [k, v] of Object.entries(vars)) msg = msg.replace(`{${k}}`, String(v));
      return msg;
    },
    [lang]
  );
}
