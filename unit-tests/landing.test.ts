import { test } from "node:test";
import assert from "node:assert/strict";
import { pickChannels, topKeys } from "../lib/server/landing";

const ch = (id: string, country: string, categories: string[]) => ({ id, name: id, country, categories, languages: [], logo: null, website: null });
const all = [ch("b", "BD", ["news"]), ch("a", "BD", ["sports"]), ch("c", "IN", ["news"]), ch("d", "BD", ["news"])];

test("picks a country's channels, sorted, without dead ones", () => {
  assert.deepEqual(pickChannels(all, "country", "bd", new Set(["d"])).map((c) => c.id), ["a", "b"]);
});

test("picks by category", () => {
  assert.deepEqual(pickChannels(all, "category", "news").map((c) => c.id), ["b", "c", "d"]);
});

test("top keys need a minimum count", () => {
  assert.deepEqual(topKeys(all, "country", 2), ["bd"]);
  assert.deepEqual(topKeys(all, "category", 3), ["news"]);
});
