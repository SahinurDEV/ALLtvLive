import { test } from "node:test";
import assert from "node:assert/strict";
import { SITEMAP_CHUNK, SITEMAP_FILES, sitemapSlice } from "../lib/server/sitemapChunks";

test("sitemap files cover every channel without overlap", () => {
  const ids = Array.from({ length: 10_312 }, (_, i) => `c${i}`);
  const parts = Array.from({ length: SITEMAP_FILES }, (_, f) => sitemapSlice(ids, f));
  assert.equal(parts.flat().length, ids.length);
  assert.equal(new Set(parts.flat()).size, ids.length);
  assert.ok(parts.every((p) => p.length <= SITEMAP_CHUNK));
});
