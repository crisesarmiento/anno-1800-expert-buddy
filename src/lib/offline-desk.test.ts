import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  RADIO_DOWN_COPY,
  bootAuthIsPending,
  chatCopyForCta,
  decideBootAuth,
  shouldRedirectToLogin,
} from "./offline-desk.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function source(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const loggedOutOffline = {
  online: false,
  hasCachedSession: false,
  hasAccount: false,
  tokenExpired: false,
};

const expiredTokenOffline = {
  online: false,
  hasCachedSession: true,
  hasAccount: true,
  tokenExpired: true,
};

describe("decideBootAuth", () => {
  it("logged-out + offline cold start shows the desk, never login", () => {
    const d = decideBootAuth(loggedOutOffline);
    assert.equal(d.showDesk, true);
    assert.equal(d.blockFirstPaint, false);
    assert.equal(d.redirectToLogin, false);
    assert.equal(d.allowBackgroundAuth, false);
    assert.equal(d.chatCta, "radio-down");
    assert.equal(chatCopyForCta(d.chatCta), RADIO_DOWN_COPY);
  });

  it("logged-in + expired token + offline still shows the desk", () => {
    const d = decideBootAuth(expiredTokenOffline);
    assert.equal(d.showDesk, true);
    assert.equal(d.redirectToLogin, false);
    assert.equal(d.blockFirstPaint, false);
    assert.equal(d.chatCta, "radio-down");
  });

  it("no account at all still allows the last-mission desk", () => {
    const d = decideBootAuth({
      online: true,
      hasCachedSession: false,
      hasAccount: false,
      tokenExpired: false,
    });
    assert.equal(d.showDesk, true);
    assert.equal(d.redirectToLogin, false);
    assert.equal(d.blockFirstPaint, false);
    assert.equal(d.allowBackgroundAuth, true);
    assert.equal(d.chatCta, "none");
  });

  it("never offers a sign-in CTA", () => {
    for (const input of [loggedOutOffline, expiredTokenOffline]) {
      assert.notEqual(decideBootAuth(input).chatCta, "sign-in");
    }
  });
});

describe("shouldRedirectToLogin", () => {
  it("never redirects desk or chat, even online", () => {
    assert.equal(shouldRedirectToLogin({ online: true, surface: "desk" }), false);
    assert.equal(shouldRedirectToLogin({ online: true, surface: "chat" }), false);
  });

  it("never redirects any surface while offline", () => {
    assert.equal(shouldRedirectToLogin({ online: false, surface: "account" }), false);
    assert.equal(shouldRedirectToLogin({ online: false, surface: "desk" }), false);
  });

  it("allows account login only when the radio is up", () => {
    assert.equal(shouldRedirectToLogin({ online: true, surface: "account" }), true);
  });
});

describe("bootAuthIsPending", () => {
  it("does not block first paint offline even if session is spinning", () => {
    assert.equal(bootAuthIsPending({ online: false, sessionPending: true }), false);
  });

  it("lets online session resolve in the background", () => {
    assert.equal(bootAuthIsPending({ online: true, sessionPending: true }), true);
    assert.equal(bootAuthIsPending({ online: true, sessionPending: false }), false);
  });
});

describe("source invariants: no login wall on the desk", () => {
  it("home route and shell never gate on sign-in", () => {
    const index = source("src/routes/index.tsx");
    const root = source("src/routes/__root.tsx");
    const app = source("src/components/harbor-app.tsx");
    assert.doesNotMatch(index, /RedirectToSignIn|SignedIn|\/login/);
    assert.doesNotMatch(root, /RedirectToSignIn|SignedIn/);
    assert.doesNotMatch(app, /RedirectToSignIn|signIn\(|\/login/);
  });

  it("chat uses radio-down copy, not a sign-in CTA", () => {
    const chat = source("src/components/buddy-chat.tsx");
    assert.match(chat, /RADIO_DOWN_COPY/);
    assert.doesNotMatch(chat, /signIn\(|RedirectToSignIn|Iniciá sesi[oó]n|Sign in/);
  });

  it("connector login redirect no-ops while offline", () => {
    assert.match(
      source("src/lib/app-data/login.ts"),
      /navigator\.onLine === false/,
    );
  });

  it("RedirectToSignIn consults shouldRedirectToLogin", () => {
    const gates = source("src/lib/auth/gates.tsx");
    assert.match(gates, /shouldRedirectToLogin/);
    assert.match(source("src/lib/auth/use-current-user.ts"), /bootAuthIsPending/);
  });
});
