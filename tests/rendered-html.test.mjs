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
  const migration = await read("drizzle/0002_hard_bulldozer.sql");

  assert.match(migration, /CREATE TABLE `characters`/);
  assert.match(migration, /CREATE TABLE `game_storytellers`/);
  assert.match(migration, /ADD `role_type` text/);
  assert.match(migration, /ADD `winning_alignment` text/);
  assert.match(migration, /UPDATE `games` SET `winning_alignment` = `winner`/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/i);
});

test("contains the mobile interaction and rendering safeguards", async () => {
  const [css, dashboard, modal] = await Promise.all([
    read("app/globals.css"),
    read("app/chronicle-dashboard.tsx"),
    read("app/session-modal.tsx"),
  ]);

  assert.match(css, /content-visibility:\s*auto/);
  assert.match(css, /backdrop-filter:\s*none/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(dashboard, /loading="lazy"/);
  assert.match(modal, /export default function SessionModal/);
});
