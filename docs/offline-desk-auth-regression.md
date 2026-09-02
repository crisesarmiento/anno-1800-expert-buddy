# Offline desk auth — regression checklist

Desk, restore, and chat stay local. Login is optional chrome when the radio is up.

Copy (NFC, exact): `radio apagada — usá la lista`

## Offline (must)

- [ ] Logged out + airplane mode + cold start: desk or empty welcome. Not `/login`, not a token spinner, not a blank auth gate.
- [ ] Logged in, token expired, airplane mode + cold start: same. Last mission from local store if present.
- [ ] No account ever: still the local desk / empty desk.
- [ ] Chat banner is exactly `radio apagada — usá la lista`. No “Iniciá sesión” / Sign in / Continue with Grok.
- [ ] First paint does not wait on `/api/auth/get-session` or token refresh.

## Online login still works (radio up)

- [ ] With `VITE_AUTH_ENABLED=true` and network on, account chrome can sign in (Better Auth / Grok popup or redirect). Desk is already visible before the session resolves.
- [ ] Sign-in then reload online: session chip / user still there. Desk did not bounce through `/login`.
- [ ] Sign out online: returns to the same desk as a guest, not a dead gate.
- [ ] Connector `redirectToLoginIfRequired` still navigates when online and `loginUrl` is set. Offline it no-ops.

## Do not

- Do not add `src/routes/login.tsx` just to “have a wall”.
- Do not wrap `HarborApp` in `SignedIn` / `RedirectToSignIn`.
- Do not call `redirectToLoginIfRequired` from desk or chat.
