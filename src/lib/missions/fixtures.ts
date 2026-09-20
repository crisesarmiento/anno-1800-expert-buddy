import { LIVE_GAME, LIVE_SCHEMA, type LiveQuest, type LiveSnapshot } from "../live/types.ts";

const SAVED = "2026-09-20T12:00:00.000Z";
const LATER = "2026-09-20T12:10:00.000Z";
const EARLIER = "2026-09-20T11:00:00.000Z";

function snap(
  quests: LiveQuest[],
  extra: Partial<LiveSnapshot> = {},
): LiveSnapshot {
  return {
    schema: LIVE_SCHEMA,
    source: "file",
    updatedAt: extra.savedAt ?? SAVED,
    savedAt: SAVED,
    game: LIVE_GAME,
    quests,
    ...extra,
  };
}

const SPARK_GUID = 15000011;
const BULK_GUID = 15000022;

export const questFixtures = {
  acceptBefore: snap([]),
  acceptAfter: snap([
    {
      title: "Una chispa que vuelve",
      state: "active",
      instanceId: "q-spark-1",
      guid: SPARK_GUID,
      type: "story",
      objective: "Construí 1 mercado, 10 casas de granjeros y atraé 50 granjeros.",
      progress: { current: 0, required: 3 },
    },
  ]),

  advanceBefore: snap([
    {
      title: "Una chispa que vuelve",
      state: "active",
      instanceId: "q-spark-1",
      guid: SPARK_GUID,
      type: "story",
      progress: { current: 0, required: 3 },
    },
  ]),
  advanceAfter: snap([
    {
      title: "Una chispa que vuelve",
      state: "active",
      instanceId: "q-spark-1",
      guid: SPARK_GUID,
      type: "story",
      progress: { current: 1, required: 3 },
    },
  ]),

  deliverBefore: snap([
    {
      title: "Pedido al por mayor",
      state: "active",
      instanceId: "q-bulk-1",
      guid: BULK_GUID,
      type: "delivery",
      objectives: [
        {
          id: "timber",
          text: "Entregar tablones",
          goodId: "timber",
          goodName: "Tablones",
          current: 0,
          required: 20,
        },
      ],
    },
  ]),
  deliverAfter: snap(
    [
      {
        title: "Pedido al por mayor",
        state: "ready",
        instanceId: "q-bulk-1",
        guid: BULK_GUID,
        type: "delivery",
        objectives: [
          {
            id: "timber",
            text: "Entregar tablones",
            goodId: "timber",
            goodName: "Tablones",
            current: 20,
            required: 20,
          },
        ],
      },
    ],
    {
      telemetry: { goods: [{ id: "timber", name: "Tablones", amount: 48 }] },
    },
  ),

  completeBefore: snap([
    {
      title: "Una chispa que vuelve",
      state: "ready",
      instanceId: "q-spark-1",
      guid: SPARK_GUID,
      type: "story",
      progress: { current: 3, required: 3 },
    },
  ]),
  completeAfter: snap([
    {
      title: "Una chispa que vuelve",
      state: "done",
      instanceId: "q-spark-1",
      guid: SPARK_GUID,
      type: "story",
      progress: { current: 3, required: 3 },
    },
  ]),

  failBefore: snap([
    {
      title: "Pedido al por mayor",
      state: "active",
      instanceId: "q-bulk-1",
      guid: BULK_GUID,
      type: "delivery",
    },
  ]),
  failAfter: snap([
    {
      title: "Pedido al por mayor",
      state: "failed",
      instanceId: "q-bulk-1",
      guid: BULK_GUID,
      type: "delivery",
    },
  ]),

  expireBefore: snap([
    {
      title: "Pedido al por mayor",
      state: "active",
      instanceId: "q-bulk-1",
      guid: BULK_GUID,
      type: "timer",
      timer: { remainingMs: 90_000, observedAt: SAVED },
    },
  ]),
  expireAfter: snap([
    {
      title: "Pedido al por mayor",
      state: "expired",
      instanceId: "q-bulk-1",
      guid: BULK_GUID,
      type: "timer",
      timer: { remainingMs: 0, observedAt: LATER },
    },
  ]),

  /** Same GUID, two live instances. */
  repeatedGuid: snap([
    {
      title: "Pedido al por mayor",
      state: "active",
      instanceId: "q-bulk-1",
      guid: BULK_GUID,
      type: "delivery",
    },
    {
      title: "Pedido al por mayor",
      state: "active",
      instanceId: "q-bulk-2",
      guid: BULK_GUID,
      type: "delivery",
    },
  ]),

  unknownQuest: snap([
    {
      title: "Recado de un comerciante",
      state: "active",
      instanceId: "q-unk-9",
      guid: 15999999,
      type: "unknown",
    },
  ]),

  buildingNotComplete: snap(
    [],
    {
      telemetry: {
        buildings: [
          { id: "marketplace", name: "Marketplace" },
          { id: "farmer-house", name: "Farmer Residence" },
          { id: "lumberjack", name: "Lumberjack" },
        ],
      },
    },
  ),

  olderSave: snap(
    [
      {
        title: "Una chispa que vuelve",
        state: "active",
        instanceId: "q-spark-1",
        guid: SPARK_GUID,
        type: "story",
      },
    ],
    { savedAt: EARLIER, simTime: 1000, snapshotId: "snap-1" },
  ),
  newerSave: snap(
    [
      {
        title: "Una chispa que vuelve",
        state: "done",
        instanceId: "q-spark-1",
        guid: SPARK_GUID,
        type: "story",
      },
      {
        title: "Pedido al por mayor",
        state: "done",
        instanceId: "q-bulk-1",
        guid: BULK_GUID,
        type: "delivery",
      },
    ],
    { savedAt: LATER, simTime: 8000, snapshotId: "snap-8" },
  ),

  absenceNotComplete: snap([]),
};
