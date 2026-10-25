import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTaste, recommendForYou, timeOfDaySuggestions, dayPart } from "../lib/recommend";
import type { ChannelWithMeta } from "../lib/types";

const ch = (id: string, country: string, categories: string[], languages = ["ben"]) =>
  ({ id, name: id, country, categories, languages, logo: null }) as unknown as ChannelWithMeta;

const all = [
  ch("a.bd", "BD", ["news"]),
  ch("b.bd", "BD", ["news"]),
  ch("c.bd", "BD", ["sports"]),
  ch("d.us", "US", ["news"], ["eng"]),
  ch("e.us", "US", ["movies"], ["eng"]),
];

test("for you recommends unseen channels like the ones watched", () => {
  const taste = buildTaste(all, { "a.bd": 5 }, []);
  const picks = recommendForYou(all, taste, new Set(["a.bd"]));
  assert.equal(picks[0].id, "b.bd");
  assert.ok(!picks.some((c) => c.id === "a.bd"));
});

test("for you is empty without history", () => {
  assert.deepEqual(recommendForYou(all, buildTaste(all, {}, []), new Set()), []);
});

test("time of day picks news in the morning and movies at night", () => {
  assert.equal(dayPart(8), "morning");
  assert.equal(dayPart(23), "night");
  const morning = timeOfDaySuggestions(all, 8, { country: "BD" });
  assert.equal(morning[0].country, "BD");
  assert.ok(morning[0].categories.includes("news"));
  const night = timeOfDaySuggestions(all, 23);
  assert.equal(night[0].id, "e.us");
});
