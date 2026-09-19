import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOcrSampleStale } from "./native-freshness.ts";

const NOW = Date.parse("2026-09-19T12:00:00.000Z");

describe("OCR sample staleness (UI only, deterministic with injectable now)", () => {
  it("is fresh right after the sample, with no newer save", () => {
    assert.equal(
      isOcrSampleStale({ observedAt: "2026-09-19T11:59:58.000Z", now: NOW }),
      false,
    );
  });

  it("falls back to stale past 15 minutes with no newer save", () => {
    assert.equal(
      isOcrSampleStale({ observedAt: "2026-09-19T11:45:00.000Z", now: NOW }),
      false,
    );
    assert.equal(
      isOcrSampleStale({ observedAt: "2026-09-19T11:45:01.000Z", now: NOW }),
      false,
    );
    assert.equal(
      isOcrSampleStale({ observedAt: "2026-09-19T11:44:59.000Z", now: NOW }),
      true,
    );
  });

  it("is stale once a save moves past the OCR sample plus tolerance, even if recent", () => {
    assert.equal(
      isOcrSampleStale({
        observedAt: "2026-09-19T11:58:00.000Z",
        savedAt: "2026-09-19T11:59:30.000Z",
        now: NOW,
      }),
      true,
    );
  });

  it("tolerates a save within the small tolerance window", () => {
    assert.equal(
      isOcrSampleStale({
        observedAt: "2026-09-19T11:59:30.000Z",
        savedAt: "2026-09-19T11:59:50.000Z",
        now: NOW,
      }),
      false,
    );
  });

  it("treats a missing or unparsable observedAt as stale", () => {
    assert.equal(isOcrSampleStale({ observedAt: undefined, now: NOW }), true);
    assert.equal(isOcrSampleStale({ observedAt: "not-a-date", now: NOW }), true);
  });

  it("is deterministic: same inputs, same now, always the same verdict", () => {
    const input = {
      observedAt: "2026-09-19T11:50:00.000Z",
      savedAt: "2026-09-19T11:50:05.000Z",
      now: NOW,
    };
    assert.equal(isOcrSampleStale(input), isOcrSampleStale(input));
  });
});
