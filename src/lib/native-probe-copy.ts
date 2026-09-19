import type { LiveConnection } from "./live/types.ts";

/**
 * Pure decision of which OCR banner the UI should show, derived from connection.nativeProbe
 * (technical probe facts) and connection.native (last valid observation, never cleared on
 * disconnect). Keeps the branching testable without React. See docs/native-telemetry.md for the
 * exact copy rules (never "no está instalado", never a "starting" state, no wrong_view label).
 */
export type NativeCardState =
  | "never-tried"
  | "unreachable"
  | "historical"
  | "guidance-population"
  | "guidance-unknown"
  | "ready";

export function nativeCardState(connection: LiveConnection | undefined): NativeCardState {
  const probe = connection?.nativeProbe;
  const native = connection?.native;
  if (!probe && !native) return "never-tried";
  if (
    probe?.state === "reachable" &&
    (probe.result === "no_observation" || probe.result === "no_window")
  )
    return "guidance-unknown";
  if (probe && probe.state !== "reachable") {
    return native ? "historical" : "unreachable";
  }
  if (native?.view === "population") return "guidance-population";
  if (native?.view === "unknown") return "guidance-unknown";
  if (!native) return "guidance-unknown";
  return "ready";
}
