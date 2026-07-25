import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const read = (path) => readFile(new URL(path, root), "utf8");

test("ships the session-first optional game workflow", async () => {
  const [dashboard, modal, api] = await Promise.all([
    read("app/chronicle-dashboard.tsx"),
    read("app/session-modal.tsx"),
    read("app/api/games/route.ts"),
  ]);

  assert.match(dashboard, /<SessionModal/);
  assert.match(modal, /Only the session date is fixed/);
  assert.match(modal, /everything optional/i);
  assert.match(modal, /name="storytellers"/);
  assert.match(modal, /form\.getAll\("storytellers"\)/);
  assert.match(modal, /Choose category first/);
  assert.match(modal, /Create new character/);
  assert.match(modal, /Counts as win/);
  assert.match(modal, /Counts as loss/);
  assert.match(modal, /Create new script/);
  assert.match(modal, /Continue session/);
  assert.match(modal, /Save & finish/);
  assert.match(modal, /New script name/);
  assert.match(api, /personal_win/);
  assert.match(api, /setPersonalResult/);
  assert.match(api, /canonicalScript/);
  assert.match(api, /sessions_played_at_unique_idx/);
  assert.match(api, /INSERT OR IGNORE INTO sessions/);
  assert.doesNotMatch(modal, /name="script"[^>]*required/);
  assert.doesNotMatch(modal, /name="winner"[^>]*required/);
  assert.match(api, /CREATE TABLE IF NOT EXISTS game_storytellers/);
  assert.match(api, /winning_alignment/);
});

test("imports the official four-category catalog and artwork", async () => {
  const roles = JSON.parse(await read("data/official-roles.json"));
  const supported = roles.filter((role) =>
    ["townsfolk", "outsider", "minion", "demon"].includes(role.team)
  );

  assert.equal(supported.length, 138);
  assert.equal(new Set(supported.map((role) => role.id)).size, 138);
  assert.ok(supported.some((role) => role.edition === "carousel"));

  const [api, dashboard] = await Promise.all([
    read("app/api/games/route.ts"),
    read("app/chronicle-dashboard.tsx"),
  ]);
  assert.match(api, /release\.botc\.app\/resources\/characters/);
  assert.match(api, /genericCharacterImage/);
  assert.match(dashboard, /ccc-sleeve\.png/);
});

test("keeps the live migration additive and preserves unknown values", async () => {
  const [migration, resultMigration, scriptMigration] = await Promise.all([
    read("drizzle/0002_hard_bulldozer.sql"),
    read("drizzle/0003_grey_warbound.sql"),
    read("drizzle/0004_curved_longshot.sql"),
  ]);

  assert.match(migration, /CREATE TABLE `characters`/);
  assert.match(migration, /CREATE TABLE `game_storytellers`/);
  assert.match(migration, /ADD `role_type` text/);
  assert.match(migration, /ADD `winning_alignment` text/);
  assert.match(migration, /UPDATE `games` SET `winning_alignment` = `winner`/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/i);
  assert.match(resultMigration, /ADD `personal_win` integer/);
  assert.doesNotMatch(resultMigration, /DROP TABLE|DELETE FROM/i);
  assert.match(scriptMigration, /CREATE TABLE `scripts`/);
  assert.match(scriptMigration, /Sects & Violets/);
  assert.match(scriptMigration, /Troubled Brewing/);
  assert.doesNotMatch(scriptMigration, /DROP TABLE|DELETE FROM/i);
});

test("contains the mobile interaction and rendering safeguards", async () => {
  const [css, dashboard, modal, api] = await Promise.all([
    read("app/globals.css"),
    read("app/chronicle-dashboard.tsx"),
    read("app/session-modal.tsx"),
    read("app/api/games/route.ts"),
  ]);

  assert.match(css, /content-visibility:\s*auto/);
  assert.match(css, /backdrop-filter:\s*none/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /@keyframes open-ledger/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /loading-fade/);
  assert.match(dashboard, /loading="lazy"/);
  assert.match(dashboard, /className="page-turn open"/);
  assert.match(dashboard, /href=\{viewHref\(item\)\}/);
  assert.match(dashboard, /aria-current=\{view === item \? "page"/);
  assert.match(dashboard, /window\.history\.pushState/);
  assert.match(dashboard, /setIntroVisible\(false\)/);
  assert.match(css, /\.side-rail \{[^}]*z-index:\s*70/s);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(dashboard, /attempt === 0 \? 8000 : 12000/);
  assert.match(dashboard, /cache:\s*"no-store"/);
  assert.match(dashboard, /fresh=\$\{Date\.now\(\)\}-\$\{attempt\}/);
  assert.match(api, /Cache-Control.*no-store/);
  assert.match(api, /CDN-Cache-Control.*no-store/);
  assert.doesNotMatch(dashboard, /ledger-loader/);
  assert.match(dashboard, /appearance\.personalResult/);
  assert.match(dashboard, /Good alignment/);
  assert.match(dashboard, /Most on one role/);
  assert.match(modal, /export default function SessionModal/);
});
