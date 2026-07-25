import { env } from "cloudflare:workers";
import officialRoles from "../../../data/official-roles.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CharacterType = "townsfolk" | "outsider" | "minion" | "demon";
type Winner = "good" | "evil";

type OfficialRole = {
  id: string;
  name: string;
  team: string;
  edition: string;
};

type NewAppearance = {
  player?: string;
  character?: string;
  characterType?: CharacterType | "";
  personalResult?: "win" | "loss" | "";
};

const CHARACTER_TYPES: CharacterType[] = ["townsfolk", "outsider", "minion", "demon"];
const LEDGER_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
};

const canonicalScript = (value?: string) => {
  const name = value?.trim().replace(/\s+/g, " ") ?? "";
  const key = name.toLowerCase();
  if (key === "sects and violets" || key === "sects & violets") return "Sects & Violets";
  if (key === "trouble brewing" || key === "troubled brewing") return "Troubled Brewing";
  return name;
};

const OFFICIAL_CHARACTERS = (officialRoles as OfficialRole[])
  .filter((role): role is OfficialRole & { team: CharacterType } =>
    CHARACTER_TYPES.includes(role.team as CharacterType)
  )
  .map((role) => {
    const alignment = role.team === "minion" || role.team === "demon" ? "e" : "g";
    return {
      sourceId: role.id,
      name: role.name,
      characterType: role.team,
      edition: role.edition,
      imageUrl: `https://release.botc.app/resources/characters/${role.edition}/${role.id}_${alignment}.webp`,
    };
  });

const PLAYER_SEED = [
  "Abhi",
  "Anastasia",
  "Andrew",
  "Cam",
  "Claire",
  "Jenny",
  "Lucy",
  "Michael",
  "Ryan",
  "Stephen",
];

const SEED_GAMES = [
  ["2026-07-16", 1, "Sects & Violets", "good", ["The demon was snake-charmed night 1.", "The Snake Charmer and double Clockmaker (with Philo Clock) narrowed down demon candidates to just 2 people."]],
  ["2026-07-16", 2, "Sects & Violets", "good", ["The demon was executed day 1, and the evil twin day 2.", "The good twin called the evil team day 1."]],
  ["2026-07-16", 3, "Sects & Violets", "good", ["The Barber switched the demon and the Pit Hag.", "The demon was executed in the final three with a good evil twin alive."]],
  ["2026-07-16", 4, "Sects & Violets", "evil", ["The only good player left was executed in the final three."]],
  ["2026-07-08", 1, "Opium Den", "good", ["Both the real and the fake Balloonist had info that kinda matched.", "Both twin Chef infos were wrong because of the No Dashii."]],
  ["2026-07-08", 2, "Sects & Violets", "good", ["Artist, Flower Girl, and Dreamer info narrowed the demon down to one person on day 2."]],
  ["2026-07-08", 3, "Opium Den", "good", ["The Poppy Grower stayed alive the whole game.", "The demon was a Fang Gu — it jumped and died to the Witch."]],
  ["2026-07-04", 6, "Troubled Brewing", "good", ["Ryan was the drunk, poisoned, red-herring Investigator who saw Andrew the Ravenkeeper and Jenny the Saint as the Scarlet Woman.", "Cam sunk a kill day one to convince town of his Monk bluff — town was further convinced when he hit the Soldier night 2 and seemed to have protected twice in a row."]],
  ["2026-07-01", 1, "Watch Your Mouth V1", "evil", ["Claire told a story about getting into a car accident at Bay to Breakers / Pride — and Michael got mez-turned by asking how it was possible to mix up two events that were months apart.", "Lucy got a sober Empath “2” and never once considered it could be real."]],
  ["2026-07-01", 2, "Watch Your Mouth V1", "good", ["Anastasia was executed because everyone was convinced she was the innocent leech-host Pacifist — when in fact she was the starting Legion.", "Stephen was mez/legion-turned by convincing Lucy there was no Pixel clamshell foldable."]],
  ["2026-07-01", 3, "A Leech of Distrust v2.1", "good", ["Jenny told Lucy she was the Marionette, but Lucy assumed Abhi was the Devil's Advocate because he was triple-claiming Exorcist with Ryan and Jenny."]],
  ["2026-07-01", 4, "A Leech of Distrust v2.1", "good", ["Ryan slayed Michael, the leech host, on day one."]],
  ["2026-07-01", 5, "A Leech of Distrust v2.1", "good", ["Michael cold-called that he was the leech host — based purely on vibes. He was right."]],
  ["2026-07-01", 6, "A Leech of Distrust v2.1", "good", ["Ryan told Abhi he was the Marionette, but Michael convinced Abhi he was being played. The leech host was executed and evil fell."]],
] as const;

const genericCharacterImage = (characterType: CharacterType) => {
  const alignment = characterType === "minion" || characterType === "demon" ? "e" : "g";
  return `https://release.botc.app/resources/characters/generic/${characterType}_${alignment}.webp`;
};

async function seedOfficialCharacters() {
  const officialCount = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM characters WHERE is_custom = 0"
  ).first<{ count: number }>();
  if (Number(officialCount?.count ?? 0) >= OFFICIAL_CHARACTERS.length) return;

  for (let index = 0; index < OFFICIAL_CHARACTERS.length; index += 50) {
    const chunk = OFFICIAL_CHARACTERS.slice(index, index + 50);
    await env.DB.batch(
      chunk.map((role) =>
        env.DB.prepare(
          `INSERT OR IGNORE INTO characters
            (source_id, name, character_type, edition, image_url, is_custom, created_at)
           VALUES (?, ?, ?, ?, ?, 0, ?)`
        ).bind(
          role.sourceId,
          role.name,
          role.characterType,
          role.edition,
          role.imageUrl,
          new Date().toISOString()
        )
      )
    );
  }
}

async function ensureDatabase() {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      played_at TEXT NOT NULL,
      storyteller TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      played_at TEXT NOT NULL,
      game_number INTEGER NOT NULL DEFAULT 1,
      script TEXT NOT NULL,
      winner TEXT NOT NULL CHECK (winner IN ('good','evil')),
      winning_alignment TEXT CHECK (winning_alignment IN ('good','evil')),
      storyteller TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER,
      notes TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS appearances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      player TEXT NOT NULL,
      character TEXT NOT NULL,
      character_type TEXT NOT NULL DEFAULT 'townsfolk',
      role_type TEXT,
      alignment TEXT NOT NULL CHECK (alignment IN ('good','evil')),
      personal_win INTEGER,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS game_storytellers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      storyteller TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT UNIQUE,
      name TEXT NOT NULL,
      character_type TEXT NOT NULL,
      edition TEXT NOT NULL DEFAULT 'custom',
      image_url TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`),
  ]);

  const gameColumns = await db.prepare("PRAGMA table_info(games)").all<{ name: string }>();
  if (!gameColumns.results.some((column) => column.name === "session_id")) {
    await db.prepare("ALTER TABLE games ADD COLUMN session_id INTEGER").run();
  }
  if (!gameColumns.results.some((column) => column.name === "winning_alignment")) {
    await db.prepare("ALTER TABLE games ADD COLUMN winning_alignment TEXT").run();
  }

  const appearanceColumns = await db.prepare("PRAGMA table_info(appearances)").all<{ name: string }>();
  if (!appearanceColumns.results.some((column) => column.name === "character_type")) {
    await db.prepare("ALTER TABLE appearances ADD COLUMN character_type TEXT NOT NULL DEFAULT 'townsfolk'").run();
  }
  if (!appearanceColumns.results.some((column) => column.name === "role_type")) {
    await db.prepare("ALTER TABLE appearances ADD COLUMN role_type TEXT").run();
  }
  if (!appearanceColumns.results.some((column) => column.name === "personal_win")) {
    await db.prepare("ALTER TABLE appearances ADD COLUMN personal_win INTEGER").run();
  }

  await db.batch([
    db.prepare(
      `UPDATE games SET script = 'Sects & Violets'
       WHERE lower(trim(script)) IN ('sects and violets', 'sects & violets')`
    ),
    db.prepare(
      `UPDATE games SET script = 'Troubled Brewing'
       WHERE lower(trim(script)) IN ('trouble brewing', 'troubled brewing')`
    ),
    db.prepare(
      `INSERT OR IGNORE INTO scripts (name, created_at)
       SELECT DISTINCT trim(script), datetime('now') FROM games WHERE trim(script) <> ''`
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS games_played_at_idx ON games (played_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS games_session_id_idx ON games (session_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS appearances_game_id_idx ON appearances (game_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS game_storytellers_game_id_idx ON game_storytellers (game_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS characters_type_idx ON characters (character_type, name)"),
  ]);

  const count = await db.prepare("SELECT COUNT(*) AS count FROM games").first<{ count: number }>();
  if (Number(count?.count ?? 0) === 0) {
    await db.batch(
      SEED_GAMES.map(([date, game, script, winner, notes]) =>
        db.prepare(
          `INSERT INTO games
            (played_at, game_number, script, winner, winning_alignment, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(date, game, script, winner, winner, JSON.stringify(notes), new Date().toISOString())
      )
    );
  }

  await db.prepare(
    `INSERT INTO game_storytellers (game_id, storyteller)
     SELECT id, storyteller FROM games
     WHERE TRIM(storyteller) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM game_storytellers WHERE game_storytellers.game_id = games.id
       )`
  ).run();

  const sessionCount = await db.prepare("SELECT COUNT(*) AS count FROM sessions").first<{ count: number }>();
  if (Number(sessionCount?.count ?? 0) === 0) {
    await db.prepare(
      "INSERT INTO sessions (played_at, storyteller, created_at) SELECT DISTINCT played_at, '', ? FROM games ORDER BY played_at"
    ).bind(new Date().toISOString()).run();
  }
  await db.prepare(
    `UPDATE games
     SET session_id = (
       SELECT MIN(canonical.id) FROM sessions AS canonical
       WHERE canonical.played_at = games.played_at
     )
     WHERE EXISTS (
       SELECT 1 FROM sessions AS duplicate
       WHERE duplicate.played_at = games.played_at
     )`
  ).run();
  await db.prepare(
    "DELETE FROM sessions WHERE id NOT IN (SELECT MIN(id) FROM sessions GROUP BY played_at)"
  ).run();
  await db.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS sessions_played_at_unique_idx ON sessions (played_at)"
  ).run();
  await db.prepare(
    "UPDATE games SET session_id = (SELECT sessions.id FROM sessions WHERE sessions.played_at = games.played_at LIMIT 1) WHERE session_id IS NULL"
  ).run();

  const playerCount = await db.prepare("SELECT COUNT(*) AS count FROM players").first<{ count: number }>();
  if (Number(playerCount?.count ?? 0) === 0) {
    await db.batch(
      PLAYER_SEED.map((name) =>
        db.prepare("INSERT OR IGNORE INTO players (name, created_at) VALUES (?, ?)").bind(name, new Date().toISOString())
      )
    );
  }

  await seedOfficialCharacters();
}

export async function GET() {
  try {
    await ensureDatabase();
    const [gamesResult, storytellersResult, appearancesResult, sessionsResult, playersResult, charactersResult, scriptsResult] =
      await Promise.all([
        env.DB.prepare(
          `SELECT id, session_id AS sessionId, played_at AS playedAt, game_number AS gameNumber,
             script, winning_alignment AS winner, duration_minutes AS durationMinutes, notes
           FROM games
           ORDER BY played_at DESC, game_number DESC, id DESC`
        ).all(),
        env.DB.prepare(
          "SELECT game_id AS gameId, storyteller FROM game_storytellers ORDER BY id"
        ).all<{ gameId: number; storyteller: string }>(),
        env.DB.prepare(
          `SELECT id, game_id AS gameId, player, character, role_type AS characterType,
             CASE personal_win WHEN 1 THEN 'win' WHEN 0 THEN 'loss' ELSE NULL END AS personalResult,
             CASE
               WHEN role_type IN ('minion', 'demon') THEN 'evil'
               WHEN role_type IN ('townsfolk', 'outsider') THEN 'good'
               ELSE NULL
             END AS alignment
           FROM appearances
           ORDER BY id`
        ).all(),
        env.DB.prepare(
          `SELECT id, played_at AS playedAt, created_at AS createdAt,
             (SELECT COUNT(*) FROM games WHERE games.session_id = sessions.id) AS gameCount
           FROM sessions
           ORDER BY played_at DESC, id DESC`
        ).all(),
        env.DB.prepare("SELECT id, name FROM players ORDER BY name COLLATE NOCASE").all(),
        env.DB.prepare(
          `SELECT id, name, character_type AS characterType, edition, image_url AS imageUrl,
             is_custom AS isCustom
           FROM characters
           ORDER BY character_type, name COLLATE NOCASE`
          ).all(),
        env.DB.prepare("SELECT name FROM scripts ORDER BY name COLLATE NOCASE").all<{ name: string }>(),
      ]);

    const storytellersByGame = new Map<number, string[]>();
    storytellersResult.results.forEach((row) => {
      storytellersByGame.set(row.gameId, [...(storytellersByGame.get(row.gameId) ?? []), row.storyteller]);
    });

    return Response.json(
      {
        games: gamesResult.results.map((game) => {
          const storytellers = storytellersByGame.get(Number(game.id)) ?? [];
          return {
            ...game,
            storytellers,
            storyteller: storytellers.join(", "),
            notes: JSON.parse(String(game.notes || "[]")),
          };
        }),
        appearances: appearancesResult.results,
        sessions: sessionsResult.results,
        players: playersResult.results,
        characters: charactersResult.results,
        scripts: scriptsResult.results.map((script) => script.name),
      },
      { headers: LEDGER_RESPONSE_HEADERS }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load the ledger." },
      { status: 500, headers: LEDGER_RESPONSE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = (await request.json()) as {
        action?: "createSession" | "createPlayer" | "createCharacter" | "setPersonalResult" | "addGame";
        sessionId?: number;
        gameId?: number;
      playedAt?: string;
      playerName?: string;
      characterName?: string;
        characterType?: CharacterType;
        personalResult?: "win" | "loss" | null;
      script?: string;
      winner?: Winner | null;
      storytellers?: string[];
      durationMinutes?: number | null;
      notes?: string[];
      appearances?: NewAppearance[];
    };

    if (body.action === "setPersonalResult") {
      const playerName = body.playerName?.trim();
      if (!body.gameId || !playerName || !["win", "loss", null].includes(body.personalResult ?? null)) {
        return Response.json({ error: "Choose a game, player, and valid personal result." }, { status: 400 });
      }
      const personalWin = body.personalResult === "win" ? 1 : body.personalResult === "loss" ? 0 : null;
      const updated = await env.DB.prepare(
        `UPDATE appearances SET personal_win = ?
         WHERE game_id = ? AND player = ? COLLATE NOCASE`
      ).bind(personalWin, body.gameId, playerName).run();
      return Response.json({ ok: true, changes: updated.meta.changes });
    }

    if (body.action === "createSession") {
      if (!body.playedAt) {
        return Response.json({ error: "Choose a date for the session." }, { status: 400 });
      }
      await env.DB.prepare(
        `INSERT OR IGNORE INTO sessions (played_at, storyteller, created_at)
         VALUES (?, '', ?)`
      ).bind(body.playedAt, new Date().toISOString()).run();
      const session = await env.DB.prepare(
        "SELECT id, played_at AS playedAt FROM sessions WHERE played_at = ? LIMIT 1"
      ).bind(body.playedAt).first();
      return Response.json({ session }, { status: 200 });
    }

    if (body.action === "createPlayer") {
      const name = body.playerName?.trim();
      if (!name) return Response.json({ error: "Enter a player name." }, { status: 400 });
      await env.DB.prepare(
        "INSERT OR IGNORE INTO players (name, created_at) VALUES (?, ?)"
      ).bind(name, new Date().toISOString()).run();
      const player = await env.DB.prepare(
        "SELECT id, name FROM players WHERE name = ? COLLATE NOCASE"
      ).bind(name).first();
      return Response.json({ player }, { status: 201 });
    }

    if (body.action === "createCharacter") {
      const name = body.characterName?.trim();
      if (!name || !body.characterType || !CHARACTER_TYPES.includes(body.characterType)) {
        return Response.json({ error: "Enter a name and category for the custom character." }, { status: 400 });
      }
      const existing = await env.DB.prepare(
        "SELECT id, name, character_type AS characterType, edition, image_url AS imageUrl, is_custom AS isCustom FROM characters WHERE name = ? COLLATE NOCASE AND character_type = ?"
      ).bind(name, body.characterType).first();
      if (existing) return Response.json({ character: existing }, { status: 200 });

      const character = await env.DB.prepare(
        `INSERT INTO characters
          (source_id, name, character_type, edition, image_url, is_custom, created_at)
         VALUES (NULL, ?, ?, 'custom', ?, 1, ?)
         RETURNING id, name, character_type AS characterType, edition, image_url AS imageUrl, is_custom AS isCustom`
      ).bind(
        name,
        body.characterType,
        genericCharacterImage(body.characterType),
        new Date().toISOString()
      ).first();
      return Response.json({ character }, { status: 201 });
    }

    if (!body.sessionId) {
      return Response.json({ error: "Choose or start a session first." }, { status: 400 });
    }
    const session = await env.DB.prepare(
      "SELECT id, played_at AS playedAt FROM sessions WHERE id = ?"
    ).bind(body.sessionId).first<{ id: number; playedAt: string }>();
    if (!session) return Response.json({ error: "That session no longer exists." }, { status: 404 });

    const next = await env.DB.prepare(
      "SELECT COALESCE(MAX(game_number), 0) + 1 AS gameNumber FROM games WHERE session_id = ?"
    ).bind(session.id).first<{ gameNumber: number }>();

    const storytellers = Array.from(
      new Set((body.storytellers ?? []).map((name) => name.trim()).filter(Boolean))
    );
    const winner = body.winner && ["good", "evil"].includes(body.winner) ? body.winner : null;
    const script = canonicalScript(body.script);
    if (script) {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO scripts (name, created_at) VALUES (?, ?)"
      ).bind(script, new Date().toISOString()).run();
    }
    const created = await env.DB.prepare(
      `INSERT INTO games
        (session_id, played_at, game_number, script, winner, winning_alignment, storyteller, duration_minutes, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`
    )
      .bind(
        session.id,
        session.playedAt,
        Number(next?.gameNumber ?? 1),
        script,
        winner ?? "good",
        winner,
        storytellers.join(", "),
        body.durationMinutes || null,
        JSON.stringify((body.notes ?? []).filter(Boolean)),
        new Date().toISOString()
      )
      .first<{ id: number }>();

    const rows = (body.appearances ?? [])
      .map((row) => ({
        player: row.player?.trim() ?? "",
        character: row.character?.trim() ?? "",
        characterType: CHARACTER_TYPES.includes(row.characterType as CharacterType)
          ? row.characterType as CharacterType
          : null,
        personalWin: row.personalResult === "win" ? 1 : row.personalResult === "loss" ? 0 : null,
      }))
      .filter((row) => row.player || row.character);

    if (created?.id && storytellers.length) {
      await env.DB.batch(
        storytellers.map((storyteller) =>
          env.DB.prepare(
            "INSERT INTO game_storytellers (game_id, storyteller) VALUES (?, ?)"
          ).bind(created.id, storyteller)
        )
      );
    }

    for (const row of rows) {
      if (row.character && row.characterType) {
        const existing = await env.DB.prepare(
          "SELECT id FROM characters WHERE name = ? COLLATE NOCASE AND character_type = ?"
        ).bind(row.character, row.characterType).first();
        if (!existing) {
          await env.DB.prepare(
            `INSERT INTO characters
              (source_id, name, character_type, edition, image_url, is_custom, created_at)
             VALUES (NULL, ?, ?, 'custom', ?, 1, ?)`
          ).bind(
            row.character,
            row.characterType,
            genericCharacterImage(row.characterType),
            new Date().toISOString()
          ).run();
        }
      }
    }

    if (created?.id && rows.length) {
      await env.DB.batch(
        rows.map((row) => {
          const legacyType = row.characterType ?? "townsfolk";
          const alignment = legacyType === "minion" || legacyType === "demon" ? "evil" : "good";
          return env.DB.prepare(
            `INSERT INTO appearances
              (game_id, player, character, character_type, role_type, alignment, personal_win)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(created.id, row.player, row.character, legacyType, row.characterType, alignment, row.personalWin);
        })
      );
    }

    return Response.json({ ok: true, gameNumber: next?.gameNumber ?? 1 }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save this game." },
      { status: 500 }
    );
  }
}
