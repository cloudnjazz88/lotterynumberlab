/**
 * Post-deploy smoke check against production.
 * Confirms the live HTML embeds the same latestDraw / jackpot target we just published.
 * When data/pending-deploy.json is present, also asserts snapshotId matches the local
 * snapshot (and logs targetCommit). Clear-pending runs only after this script exits 0.
 * Missing upstream results are not checked here — this runs only after a successful deploy.
 */
import { readFileSync, existsSync } from "node:fs";

const root = new URL("..", import.meta.url);
const draws = JSON.parse(readFileSync(new URL("data/draws.json", root), "utf8"));
const jackpots = JSON.parse(readFileSync(new URL("data/jackpots.json", root), "utf8"));
const pendingPath = new URL("data/pending-deploy.json", root);

const ORIGIN = process.env.PRODUCTION_ORIGIN || "https://lotterynumberlab.com";
const games = [
  { id: "megamillions", path: "/mega-millions.html" },
  { id: "powerball", path: "/powerball.html" },
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function localSnapshotId() {
  const mm = draws.games?.megamillions?.latestDraw || "";
  const pb = draws.games?.powerball?.latestDraw || "";
  const jp = jackpots.updatedAt || "";
  return `mm:${mm}|pb:${pb}|jp:${jp}`;
}

function checkPendingMarker() {
  if (!existsSync(pendingPath)) {
    console.log("pending-deploy marker: absent (ok for ad-hoc verify)");
    return;
  }
  const pending = JSON.parse(readFileSync(pendingPath, "utf8"));
  const expected = localSnapshotId();
  assert(pending.snapshotId, "pending-deploy.json missing snapshotId");
  assert(
    pending.snapshotId === expected,
    `pending snapshotId mismatch: marker=${pending.snapshotId} local=${expected}`,
  );
  if (pending.targetCommit) {
    console.log(`pending targetCommit=${pending.targetCommit}`);
  } else {
    console.log("pending targetCommit: not yet recorded (snapshotId is authoritative)");
  }
  console.log(`PASS  pending marker snapshotId=${pending.snapshotId}`);
}

async function checkGame({ id, path }) {
  const url = ORIGIN + path;
  const res = await fetch(url, {
    headers: { "user-agent": "LotteryNumberLab-verify-production/1.0" },
  });
  assert(res.ok, `${url} returned ${res.status}`);
  const html = await res.text();
  const latest = draws.games?.[id]?.latestDraw;
  assert(latest, `local snapshot missing latestDraw for ${id}`);
  assert(
    html.includes(`data-latest-draw="${latest}"`) || html.includes(latest),
    `${id}: production HTML does not mention latestDraw ${latest}`,
  );

  const row = jackpots.games?.[id];
  if (!row?.nextDrawing) return;

  const untilAttr = `data-jackpot-until="${row.nextDrawing}"`;
  const unavailable = html.includes("jackpot-est--unavailable") || html.includes("Current estimate unavailable");
  const hasUntil = html.includes(untilAttr);
  // Either the fresh amount card for this target drawing is live, or the page
  // correctly shows unavailable (e.g. estimate expired between build and check).
  assert(
    hasUntil || unavailable,
    `${id}: production jackpot neither targets ${row.nextDrawing} nor shows unavailable`,
  );
  console.log(`PASS  ${id}  latest=${latest}  jackpotUntil=${hasUntil ? row.nextDrawing : "unavailable"}`);
}

checkPendingMarker();
for (const g of games) {
  await checkGame(g);
}
console.log(`verify-production: ok against ${ORIGIN}`);