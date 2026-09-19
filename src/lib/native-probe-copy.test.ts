import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nativeCardState } from "./native-probe-copy.ts";
import type { LiveConnection } from "./live/types.ts";

const base: LiveConnection = { mode: "documents-save" };

describe("native OCR card state (pure, no game-state words)", () => {
  it("is never-tried with no nativeProbe and no native at all", () => {
    assert.equal(nativeCardState(base), "never-tried");
  });

  it("is unreachable when the probe failed and no valid observation ever arrived", () => {
    assert.equal(
      nativeCardState({
        ...base,
        nativeProbe: {
          provider: "ux-enhancer-ocr",
          state: "unreachable",
          lastProbeAt: "2026-09-19T00:00:00.000Z",
          reason: "connection_refused",
        },
      }),
      "unreachable",
    );
  });

  it("is unreachable on an invalid_response probe too", () => {
    assert.equal(
      nativeCardState({
        ...base,
        nativeProbe: {
          provider: "ux-enhancer-ocr",
          state: "invalid_response",
          lastProbeAt: "2026-09-19T00:00:00.000Z",
          reason: "bad_payload",
        },
      }),
      "unreachable",
    );
  });

  it("is historical when the probe now fails but a valid observation exists (preserve evidence)", () => {
    assert.equal(
      nativeCardState({
        ...base,
        native: {
          provider: "ux-enhancer-ocr",
          view: "production",
          observedAt: "2026-09-19T00:00:00.000Z",
        },
        nativeProbe: {
          provider: "ux-enhancer-ocr",
          state: "unreachable",
          lastProbeAt: "2026-09-19T00:05:00.000Z",
          lastSuccessAt: "2026-09-19T00:00:00.000Z",
          reason: "timeout",
        },
      }),
      "historical",
    );
  });

  it("guides to Producción/Finanzas when reachable but view is population", () => {
    assert.equal(
      nativeCardState({
        ...base,
        native: {
          provider: "ux-enhancer-ocr",
          view: "population",
          observedAt: "2026-09-19T00:00:00.000Z",
        },
        nativeProbe: {
          provider: "ux-enhancer-ocr",
          state: "reachable",
          lastProbeAt: "2026-09-19T00:00:00.000Z",
          lastSuccessAt: "2026-09-19T00:00:00.000Z",
        },
      }),
      "guidance-population",
    );
  });

  it("guides with an unrecognized-tab message when reachable but view is unknown", () => {
    assert.equal(
      nativeCardState({
        ...base,
        native: {
          provider: "ux-enhancer-ocr",
          view: "unknown",
          observedAt: "2026-09-19T00:00:00.000Z",
        },
        nativeProbe: {
          provider: "ux-enhancer-ocr",
          state: "reachable",
          lastProbeAt: "2026-09-19T00:00:00.000Z",
          lastSuccessAt: "2026-09-19T00:00:00.000Z",
        },
      }),
      "guidance-unknown",
    );
  });

  it("is ready when reachable and view is production or finance", () => {
    assert.equal(
      nativeCardState({
        ...base,
        native: {
          provider: "ux-enhancer-ocr",
          view: "production",
          observedAt: "2026-09-19T00:00:00.000Z",
        },
        nativeProbe: {
          provider: "ux-enhancer-ocr",
          state: "reachable",
          lastProbeAt: "2026-09-19T00:00:00.000Z",
          lastSuccessAt: "2026-09-19T00:00:00.000Z",
        },
      }),
      "ready",
    );
  });

  it("stays ready from legacy connection.native with no nativeProbe at all (backward compatible)", () => {
    assert.equal(
      nativeCardState({
        ...base,
        native: {
          provider: "ux-enhancer-ocr",
          view: "finance",
          observedAt: "2026-09-19T00:00:00.000Z",
        },
      }),
      "ready",
    );
  });
});
