import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { missions, chapters } from "./data/campaign.ts";
import { LOCALES, UI, uiFor } from "./i18n.ts";
import {
  JOURNAL_TITLE_LOCALE,
  campaignTitle,
  showJournalTitleGate,
  titlesMatchJournal,
} from "./journal-titles.ts";

const INVENTED = [
  "Dull as Ditch Water",
  "A Spark Rekindled",
  "A Tale of Two Brothers",
  "Having a Blast",
];

describe("journal title gate", () => {
  it("treats only Spanish as matching the campaign journal", () => {
    assert.equal(JOURNAL_TITLE_LOCALE, "es");
    assert.equal(titlesMatchJournal("es"), true);
    assert.equal(showJournalTitleGate("es"), false);
    for (const locale of ["en", "it", "de"] as const) {
      assert.equal(titlesMatchJournal(locale), false);
      assert.equal(showJournalTitleGate(locale), true);
    }
  });

  it("never invents locale titles — EN/IT/DE keep the Spanish campaign.ts string", () => {
    const spark = missions.find((m) => m.id === "ch1-spark");
    assert.ok(spark);
    assert.equal(spark.title, "Una chispa que vuelve");
    for (const locale of LOCALES) {
      assert.equal(campaignTitle(spark.title, locale), "Una chispa que vuelve");
    }
    for (const mission of missions) {
      assert.equal(campaignTitle(mission.title, "en"), mission.title);
      assert.equal(campaignTitle(mission.title, "it"), mission.title);
      assert.equal(campaignTitle(mission.title, "de"), mission.title);
    }
    for (const chapter of chapters) {
      assert.equal(campaignTitle(chapter.title, "en"), chapter.title);
    }
  });

  it("does not ship mixed or wiki-English mission titles in chrome i18n", () => {
    for (const locale of LOCALES) {
      const blob = JSON.stringify(UI[locale]);
      for (const title of INVENTED) {
        assert.equal(
          blob.includes(title),
          false,
          `${locale} i18n must not invent ${title}`,
        );
      }
    }
  });

  it("states the Spanish-title gate in EN/IT/DE chrome, and keeps chrome translated", () => {
    assert.equal(uiFor("en").language, "Language");
    assert.equal(uiFor("it").language, "Lingua");
    assert.equal(uiFor("de").language, "Sprache");
    assert.equal(uiFor("es").language, "Idioma");

    const en = uiFor("en").journalTitles.gate.toLowerCase();
    assert.match(en, /spanish/);
    assert.match(en, /español/);
    assert.match(uiFor("it").journalTitles.gate.toLowerCase(), /spagnol/);
    assert.match(uiFor("de").journalTitles.gate.toLowerCase(), /spanisch/);

    assert.match(uiFor("en").welcome.journalNote.toLowerCase(), /spanish/);
    assert.doesNotMatch(
      uiFor("en").welcome.journalNote,
      /stay as in your save/i,
    );
  });
});
