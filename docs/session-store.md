# Last-session store

Local restore for the session desk. No network, no login, no token refresh.

Storage is a durable client KV (`localStorage` under `hb-session:`). That is the IndexedDB-equivalent used here: same process-kill / airplane / cold-start survival, and a **synchronous** read so last mission + checks paint in well under 200ms.

## Schema (`version: 1`)

One JSON document per session key:

```
{
  version: 1
  sessionKey: string          // usually "last"
  updatedAt: number           // epoch ms
  mission: null | {
    id: string
    title: string
    body: string              // mission.objective snapshot
  }
  checks: { text: string, done: boolean }[]
  completed: string[]         // mission ids marked done
  stamps: string[]            // applied stamp / layout ids
  calm: "session" | "overwhelmed" | "broke"
  pulse: { coins, houses, looking }
}
```

Keys in the KV:

- `session:<sessionKey>` — snapshot JSON
- `meta:last` — sessionKey of the last-open session

Prefix: `hb-session:`.

## Eviction

Keep **last session at minimum** — and only that.

On every persist, write `session:<sessionKey>` + `meta:last`, then **delete every other `session:*` key**. Older desks are dropped. There is no TTL; the single last session stays until the player resets or the origin storage is cleared.

## Persist

Every zustand desk mutation schedules a persist, **debounced ≤ 300ms**. `pagehide` flushes the pending write so a kill still keeps the last mutation when the timer had not fired.

Desk mutations (add/toggle/reorder checks, apply/remove stamps, calm, pulse) go through `commitDeskMutation` in `src/lib/desk-offline.ts`. UI success is the local KV write (`persistNow`). Optional later-sync is fire-and-forget and must never revert the desk or toast a broken desk. Single-device conflict rule: last write wins (`updatedAt`).

## Boot

`SessionBoot` runs `hydrateHarborFromSessionStore()` in `useLayoutEffect` (before paint, before any network).

- Store has a mission → desk shows that mission and checks immediately.
- Store empty → empty desk (`data-empty-desk`), never a spinner waiting on the server, never `/login`.

Legacy zustand persist (`localStorage["harbor-buddy-es"]`) is imported once if the new store is empty.
