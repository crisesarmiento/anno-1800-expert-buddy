/**
 * Offline session desk: local play never waits on accounts.
 *
 * Network auth may run in the background when online. It must not block
 * first paint, restore, or the radio-down chat.
 */

import { RADIO_DOWN_COPY } from "./radio-down.ts";

export { RADIO_DOWN_COPY };

export type DeskSurface = "desk" | "chat" | "account";

export type BootAuthInput = {
  online: boolean;
  /** Cached Better Auth / bearer session in local storage. */
  hasCachedSession: boolean;
  /** The visitor has ever created an account. */
  hasAccount: boolean;
  /** Token present but expired / refresh would be needed. */
  tokenExpired: boolean;
  /** Better Auth `useSession().isPending`. */
  sessionPending?: boolean;
};

export type BootAuthDecision = {
  showDesk: boolean;
  blockFirstPaint: boolean;
  redirectToLogin: boolean;
  allowBackgroundAuth: boolean;
  chatCta: "radio-down" | "sign-in" | "none";
};

/** Desk, restore, and degraded chat are always reachable from local state. */
export function decideBootAuth(input: BootAuthInput): BootAuthDecision {
  const radioDown = !input.online;
  return {
    showDesk: true,
    blockFirstPaint: false,
    redirectToLogin: false,
    allowBackgroundAuth: input.online,
    chatCta: radioDown ? "radio-down" : "none",
  };
}

export function shouldRedirectToLogin(input: {
  online: boolean;
  surface: DeskSurface;
}): boolean {
  if (!input.online) return false;
  return input.surface === "account";
}

export function bootAuthIsPending(input: {
  online: boolean;
  sessionPending: boolean;
}): boolean {
  if (!input.online) return false;
  return input.sessionPending;
}

export function chatCopyForCta(cta: BootAuthDecision["chatCta"]): string | null {
  if (cta === "radio-down") return RADIO_DOWN_COPY;
  return null;
}

export function isRadioDown(online: boolean): boolean {
  return !online;
}
