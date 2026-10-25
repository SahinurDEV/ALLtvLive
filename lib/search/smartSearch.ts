import Fuse from "fuse.js";
import type { ChannelWithMeta } from "@/lib/types";
/**
 * Helpers that make channel search forgiving: Bangla words for common
 * categories and countries map to their English catalog values, and Bangla
 * script is transliterated to rough Latin so "আল জাজিরা" can find "Al Jazeera".
 * Fuse.js handles typos on top of this.
 */

const BN_WORDS: Record<string, string> = {
  খবর: "news",
  টিভি: "tv",
  চ্যানেল: "",
  সংবাদ: "news",
  নিউজ: "news",
  খেলা: "sports",
  স্পোর্টস: "sports",
  ক্রিকেট: "sports cricket",
  ফুটবল: "sports football",
  সিনেমা: "movies",
  মুভি: "movies",
  ছবি: "movies",
  গান: "music",
  মিউজিক: "music",
  সংগীত: "music",
  বাচ্চা: "kids",
  শিশু: "kids",
  কার্টুন: "kids animation",
  ধর্ম: "religious",
  ইসলামিক: "religious islamic",
  বিনোদন: "entertainment",
  রান্না: "cooking",
  শিক্ষা: "education",
  ব্যবসা: "business",
  ডকুমেন্টারি: "documentary",
  বাংলাদেশ: "bangladesh",
  ভারত: "india",
  ইন্ডিয়া: "india",
  পাকিস্তান: "pakistan",
  আমেরিকা: "united states",
  যুক্তরাজ্য: "united kingdom",
  সৌদি: "saudi arabia",
  বাংলা: "bengali",
  হিন্দি: "hindi",
  ইংরেজি: "english",
  আরবি: "arabic",
};

const VOWELS: Record<string, string> = {
  "অ": "o", "আ": "a", "ই": "i", "ঈ": "i", "উ": "u", "ঊ": "u", "ঋ": "ri",
  "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
};
const SIGNS: Record<string, string> = {
  "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri",
  "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou", "ং": "ng", "ঃ": "h", "ঁ": "n",
};
const CONS: Record<string, string> = {
  "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng", "চ": "ch", "ছ": "chh",
  "জ": "j", "ঝ": "jh", "ঞ": "n", "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh",
  "ণ": "n", "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n", "প": "p",
  "ফ": "f", "ব": "b", "ভ": "bh", "ম": "m", "য": "j", "র": "r", "ল": "l",
  "ৎ": "t",
  "শ": "sh", "ষ": "sh", "স": "s", "হ": "h", "\u09DC": "r", "\u09DD": "rh", "\u09DF": "y",
};
const DIGITS = "০১২৩৪৫৬৭৮৯";

export function hasBangla(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

/** Rough phonetic Bangla -> Latin (inherent vowel dropped at word end). */
export function transliterateBangla(text: string): string {
  let out = "";
  const chars = Array.from(
    text
      .normalize("NFC")
      .replace(/\u09A1\u09BC/g, "\u09DC")
      .replace(/\u09A2\u09BC/g, "\u09DD")
      .replace(/\u09AF\u09BC/g, "\u09DF")
  );
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];
    if (CONS[c]) {
      out += CONS[c];
      const nextIsSign = next && (SIGNS[next] !== undefined || next === "্");
      const nextIsLetter = next && /[\u0980-\u09FF]/.test(next);
      if (!nextIsSign && nextIsLetter) out += "o";
    } else if (SIGNS[c] !== undefined) {
      out += SIGNS[c];
    } else if (VOWELS[c]) {
      out += VOWELS[c];
    } else if (c === "্") {
      // virama: no vowel
    } else if (DIGITS.includes(c)) {
      out += String(DIGITS.indexOf(c));
    } else {
      out += c;
    }
  }
  return out;
}

/** Replace known Bangla words with English catalog terms. */
export function translateBanglaWords(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => BN_WORDS[w] ?? w)
    .join(" ");
}

/**
 * Returns the query variants to search with, original first. Duplicates and
 * empty strings are removed.
 */
export function searchVariants(query: string): string[] {
  const q = query.trim().replace(/\s+/g, " ");
  if (!q) return [];
  const variants = [q];
  if (hasBangla(q)) {
    const translated = translateBanglaWords(q);
    variants.push(translated);
    if (hasBangla(translated)) variants.push(transliterateBangla(translated));
  }
  return Array.from(new Set(variants.filter(Boolean)));
}


const fuseCache = new WeakMap<ChannelWithMeta[], Fuse<ChannelWithMeta>>();

function getFuse(channels: ChannelWithMeta[]): Fuse<ChannelWithMeta> {
  let f = fuseCache.get(channels);
  if (!f) {
    f = new Fuse(channels, {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "alt_names", weight: 0.2 },
        { name: "country", weight: 0.1 },
        { name: "countryInfo.name", weight: 0.1 },
        { name: "categories", weight: 0.15 },
        { name: "languages", weight: 0.05 },
      ],
      threshold: 0.38,
      ignoreLocation: true,
      includeScore: true,
    });
    fuseCache.set(channels, f);
  }
  return f;
}

/**
 * Typo-tolerant, Bangla-aware ranking. Every query variant is searched and
 * each channel keeps its best score.
 */
export function rankChannels(
  query: string,
  channels: ChannelWithMeta[],
  limit = 200
): ChannelWithMeta[] {
  if (channels.length === 0) return [];
  const fuse = getFuse(channels);
  const best = new Map<string, { item: ChannelWithMeta; score: number }>();
  for (const q of searchVariants(query)) {
    for (const r of fuse.search(q, { limit })) {
      const prev = best.get(r.item.id);
      const score = r.score ?? 1;
      if (!prev || score < prev.score) best.set(r.item.id, { item: r.item, score });
    }
  }
  return Array.from(best.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((r) => r.item);
}
