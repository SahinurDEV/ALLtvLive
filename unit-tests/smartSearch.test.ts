import { test } from "node:test";
import assert from "node:assert/strict";
import { searchVariants, transliterateBangla } from "../lib/search/smartSearch";

test("Bangla words map to catalog terms", () => {
  assert.ok(searchVariants("খবর").includes("news"));
  assert.ok(searchVariants("বাংলাদেশ খেলা").includes("bangladesh sports"));
});

test("Bangla script is transliterated", () => {
  assert.equal(transliterateBangla("একুশে"), "ekushe");
  assert.equal(transliterateBangla("সময়"), "somoy");
});
