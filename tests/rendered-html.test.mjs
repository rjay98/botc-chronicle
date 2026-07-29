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
  assert.match(modal, /aria-label="Add storyteller"/);
  assert.match(modal, /gamesTold/);
  assert.match(modal, /storytellers:\s*selectedStorytellers/);
  assert.match(modal, /Choose category first/);
  assert.match(modal, /Create new character/);
  assert.match(modal, /Counts as win/);
  assert.match(modal, /Counts as loss/);
  assert.match(modal, /Create new script/);
  assert.match(modal, /Continue session/);
  assert.match(modal, /Save & finish/);
  assert.match(modal, /New script name/);
  assert.doesNotMatch(modal, /action:\s*"createSession"/);
  assert.match(modal, /playedAt:\s*activeSession\.playedAt/);
  assert.match(api, /personal_win/);
  assert.match(api, /setPersonalResult/);
  assert.match(api, /canonicalScript/);
  assert.match(api, /sessions_played_at_unique_idx/);
  assert.match(api, /INSERT OR IGNORE INTO sessions/);
  assert.match(api, /DELETE FROM sessions WHERE NOT EXISTS/);
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
  const [migration, resultMigration, scriptMigration, nameCorrection] = await Promise.all([
    read("drizzle/0002_hard_bulldozer.sql"),
    read("drizzle/0003_grey_warbound.sql"),
    read("drizzle/0004_curved_longshot.sql"),
    read("drizzle/0005_true_moon.sql"),
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
  assert.match(nameCorrection, /Trouble Brewing/);
  assert.match(nameCorrection, /Bad Moon Rising/);
  assert.match(nameCorrection, /Blood Moon Rising/i);
  assert.doesNotMatch(nameCorrection, /DROP TABLE/i);
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
  assert.match(dashboard, /Best recent form/);
  assert.match(dashboard, /Class Traitor/);
  assert.match(dashboard, /lifetime distinctions unlock at 6/i);
  assert.match(dashboard, /initial-entry/);
  assert.doesNotMatch(css, /\.page-ready/);
  assert.match(dashboard, /expandedGames/);
  assert.match(dashboard, /Who was what/);
  assert.match(dashboard, /View lineup/);
  assert.match(dashboard, /Edit game/);
  assert.match(dashboard, /editingAppearances/);
  assert.match(dashboard, /appearancesByGame/);
  assert.match(css, /\.game-lineup/);
  assert.match(css, /\.game-seat/);
  assert.match(css, /\.game-summary-bottom/);
  assert.match(modal, /export default function SessionModal/);
  assert.match(modal, /editingGame \? "updateGame" : "addGame"/);
  assert.match(modal, /Save changes/);
  assert.match(api, /body\.action === "updateGame"/);
  assert.match(api, /DELETE FROM appearances WHERE game_id/);
});

test("supports roster corrections and script-scoped character choices", async () => {
  const [dashboard, modal, api, css] = await Promise.all([
    read("app/chronicle-dashboard.tsx"),
    read("app/session-modal.tsx"),
    read("app/api/games/route.ts"),
    read("app/globals.css"),
  ]);

  assert.match(dashboard, /Edit player name/);
  assert.match(dashboard, /action:\s*"renamePlayer"/);
  assert.match(api, /body\.action === "renamePlayer"/);
  assert.match(api, /UPDATE appearances SET player/);
  assert.match(api, /UPDATE game_storytellers SET storyteller/);
  assert.match(modal, /SCRIPT_EDITIONS/);
  assert.match(modal, /character\.edition !== selectedEdition/);
  assert.match(modal, /roles only/);
  assert.match(css, /\.filters \{[^}]*align-items:\s*flex-end/s);
  assert.match(css, /\.filter-count \{[^}]*align-self:\s*end/s);
});

test("keeps cached documents compatible across releases", async () => {
  const [worker, packageJson, preserveScript] = await Promise.all([
    read("worker/index.ts"),
    read("package.json"),
    read("scripts/preserve-build-assets.mjs"),
  ]);

  assert.match(worker, /Clear-Site-Data/);
  assert.match(worker, /DOCUMENT_CACHE_HEADERS/);
  assert.match(worker, /CDN-Cache-Control/);
  assert.match(worker, /LEGACY_ASSET_ALIASES/);
  assert.match(worker, /ledger-current\.css/);
  assert.match(worker, /X-Ledger-Asset-Recovery/);
  assert.match(packageJson, /"postbuild":\s*"node scripts\/preserve-build-assets\.mjs"/);
  assert.match(preserveScript, /dist.*client.*assets/s);
  assert.match(preserveScript, /public.*assets/s);
  assert.match(preserveScript, /ledger-dashboard\.js/);
});
