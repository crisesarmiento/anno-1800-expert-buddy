import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildings } from "./buildings.ts";
import {
  WIKI_ORIGIN,
  catalogLinks,
  wikiCatalog,
  wikiCatalogBuildings,
  wikiHref,
} from "./wiki-catalog.ts";

const ART = /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i;
const UBISOFT = /ubisoft|ubi\.com|static\.wikia|nocookie\.net|cdn\./i;
const IMG_FIELD = /"(src|image|icon|art|thumbnail|portrait|sprite)"\s*:/i;

describe("wiki catalog", () => {
  it("covers every in-app building with a Fandom link-out", () => {
    const byId = Object.fromEntries(wikiCatalogBuildings.map((row) => [row.id, row]));
    assert.equal(wikiCatalogBuildings.length, buildings.length);
    for (const building of buildings) {
      const row = byId[building.id];
      assert.ok(row, building.id);
      assert.equal(row.title, building.name);
      for (const link of catalogLinks(row)) {
        const href = wikiHref(link.page);
        assert.ok(href.startsWith(`${WIKI_ORIGIN}/wiki/`));
        assert.ok(!href.includes(" "));
      }
    }
  });

  it("is static text: no Ubisoft art, images, or hotlink CDNs", () => {
    const blob = JSON.stringify(wikiCatalog);
    assert.ok(!ART.test(blob));
    assert.ok(!UBISOFT.test(blob));
    assert.ok(!IMG_FIELD.test(blob));
    for (const entry of wikiCatalog) {
      assert.equal("image" in entry, false);
      assert.equal("icon" in entry, false);
      assert.equal("src" in entry, false);
    }
  });

  it("keeps the catalog page free of art tags and stamp imports", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const page = readFileSync(join(dir, "../../components/wiki-catalog.tsx"), "utf8");
    assert.doesNotMatch(page, /<img\b/i);
    assert.doesNotMatch(page, /stamps/);
    assert.doesNotMatch(page, /ubisoft/i);
    assert.doesNotMatch(page, /wikia\.nocookie/i);
  });
});
