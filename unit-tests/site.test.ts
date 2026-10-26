import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SITE_URL, resolveSiteUrl, websiteJsonLd } from "../lib/site";

test("site URL falls back to the custom domain", () => {
  assert.equal(resolveSiteUrl(undefined), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl(""), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl("not a url"), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl("https://example.com/"), "https://example.com");
});

test("website JSON-LD has a search action", () => {
  const j = websiteJsonLd("https://x.test");
  assert.equal(j["@type"], "WebSite");
  assert.equal(j.potentialAction.target.urlTemplate, "https://x.test/watch?q={search_term_string}");
});
