import { env } from "cloudflare:workers";

type CharacterType = "townsfolk" | "outsider" | "minion" | "demon";

type NewAppearance = {
  player?: string;
  character?: string;
  characterType?: CharacterType;
};

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
  ["2026-07-04", 6, "Trouble Brewing", "good", ["Ryan was the drunk, poisoned, red-herring Investigator who saw Andrew the Ravenkeeper and Jenny the Saint as the Scarlet Woman.", "Cam sunk a kill day one to convince town of his Monk bluff — town was further convinced when he hit the Soldier night 2 and seemed to have protected twice in a row."]],
  ["2026-07-01", 1, "Watch Your Mouth V1", "evil", ["Claire told a story about getting into a car accident at Bay to Breakers / Pride — and Michael got mez-turned by asking how it was possible to mix up two events that were months apart.", "Lucy got a sober Empath “2” and never once considered it could be real."]],
  ["2026-07-01", 2, "Watch Your Mouth V1", "good", ["Anastasia was executed because everyone was convinced she was the innocent leech-host Pacifist — when in fact she was the starting Legion.", "Stephen was mez/legion-turned by convincing Lucy there was no Pixel clamshell foldable."]],
  ["2026-07-01", 3, "A Leech of Distrust v2.1", "good", ["Jenny told Lucy she was the Marionette, but Lucy assumed Abhi was the Devil's Advocate because he was triple-claiming Exorcist with Ryan and Jenny."]],
  ["2026-07-01", 4, "A Leech of Distrust v2.1", "good", ["Ryan slayed Michael, the leech host, on day one."]],
  ["2026-07-01", 5, "A Leech of Distrust v2.1", "good", ["Michael cold-called that he was the leech host — based purely on vibes. He was right."]],
  ["2026-07-01", 6, "A Leech of Distrust v2.1", "good", ["Ryan told Abhi he was the Marionette, but Michael convinced Abhi he was being played. The leech host was executed and evil fell."]],
] as const;

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
    db.prepare(`CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      played_at TEXT NOT NULL,
      game_number INTEGER NOT NULL DEFAULT 1,
      script TEXT NOT NULL,
      winner TEXT NOT NULL CHECK (winner IN ('good','evil')),
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
      alignment TEXT NOT NULL CHECK (alignment IN ('good','evil')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )`),
  ]);

  const gameColumns = await db.prepare("PRAGMA table_info(games)").all<{ name: string }>();
  if (!gameColumns.results.some((column) => column.name === "session_id")) {
    await db.prepare("ALTER TABLE games ADD COLUMN session_id INTEGER").run();
  }
  const appearanceColumns = await db.prepare("PRAGMA table_info(appearances)").all<{ name: string }>();
  if (!appearanceColumns.results.some((column) => column.name === "character_type")) {
    await db.prepare("ALTER TABLE appearances ADD COLUMN character_type TEXT NOT NULL DEFAULT 'townsfolk'").run();
  }

  await db.batch([
    db.prepare("CREATE INDEX IF NOT EXISTS games_played_at_idx ON games (played_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS games_session_id_idx ON games (session_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS appearances_game_id_idx ON appearances (game_id)"),
  ]);

  const count = await db.prepare("SELECT COUNT(*) AS count FROM games").first<{ count: number }>();
  if (Number(count?.count ?? 0) === 0) {
    await db.batch(
      SEED_GAMES.map(([date, game, script, winner, notes]) =>
        db.prepare(
          "INSERT INTO games (played_at, game_number, script, winner, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(date, game, script, winner, JSON.stringify(notes), new Date().toISOString())
      )
    );
  }

  const sessionCount = await db.prepare("SELECT COUNT(*) AS count FROM sessions").first<{ count: number }>();
  if (Number(sessionCount?.count ?? 0) === 0) {
    await db.prepare(
      "INSERT INTO sessions (played_at, storyteller, created_at) SELECT DISTINCT played_at, '', ? FROM games ORDER BY played_at"
    ).bind(new Date().toISOString()).run();
  }
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
}

export async function GET() {
  try {
    await ensureDatabase();
    const [gamesResult, appearancesResult, sessionsResult, playersResult] = await Promise.all([
      env.DB.prepare(
        "SELECT id, session_id AS sessionId, played_at AS playedAt, game_number AS gameNumber, script, winner, storyteller, duration_minutes AS durationMinutes, notes FROM games ORDER BY played_at DESC, game_number DESC, id DESC"
      ).all(),
      env.DB.prepare(
        "SELECT id, game_id AS gameId, player, character, character_type AS characterType, alignment FROM appearances ORDER BY id"
      ).all(),
      env.DB.prepare(
        "SELECT id, played_at AS playedAt, storyteller, created_at AS createdAt, (SELECT COUNT(*) FROM games WHERE games.session_id = sessions.id) AS gameCount FROM sessions ORDER BY played_at DESC, id DESC"
      ).all(),
      env.DB.prepare("SELECT id, name FROM players ORDER BY name COLLATE NOCASE").all(),
    ]);
    return Response.json({
      games: gamesResult.results.map((game) => ({
        ...game,
        notes: JSON.parse(String(game.notes || "[]")),
      })),
      appearances: appearancesResult.results,
      sessions: sessionsResult.results,
      players: playersResult.results,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load the ledger." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = (await request.json()) as {
      action?: "createSession" | "createPlayer" | "addGame";
      sessionId?: number;
      playedAt?: string;
      storyteller?: string;
      playerName?: string;
      script?: string;
      winner?: "good" | "evil";
      durationMinutes?: number | null;
      notes?: string[];
      appearances?: NewAppearance[];
    };

    if (body.action === "createSession") {
      if (!body.playedAt) {
        return Response.json({ error: "Choose a date for the session." }, { status: 400 });
      }
      const session = await env.DB.prepare(
        "INSERT INTO sessions (played_at, storyteller, created_at) VALUES (?, ?, ?) RETURNING id, played_at AS playedAt, storyteller"
      ).bind(body.playedAt, body.storyteller?.trim() ?? "", new Date().toISOString()).first();
      return Response.json({ session }, { status: 201 });
    }

    if (body.action === "createPlayer") {
      const name = body.playerName?.trim();
      if (!name) return Response.json({ error: "Enter a player name." }, { status: 400 });
      await env.DB.prepare("INSERT OR IGNORE INTO players (name, created_at) VALUES (?, ?)").bind(name, new Date().toISOString()).run();
      const player = await env.DB.prepare("SELECT id, name FROM players WHERE name = ? COLLATE NOCASE").bind(name).first();
      return Response.json({ player }, { status: 201 });
    }

    if (!body.sessionId || !body.script?.trim() || !["good", "evil"].includes(body.winner ?? "")) {
      return Response.json({ error: "Session, script, and winner are required." }, { status: 400 });
    }
    const session = await env.DB.prepare(
      "SELECT id, played_at AS playedAt, storyteller FROM sessions WHERE id = ?"
    ).bind(body.sessionId).first<{ id: number; playedAt: string; storyteller: string }>();
    if (!session) return Response.json({ error: "That session no longer exists." }, { status: 404 });

    const next = await env.DB.prepare(
      "SELECT COALESCE(MAX(game_number), 0) + 1 AS gameNumber FROM games WHERE session_id = ?"
    ).bind(session.id).first<{ gameNumber: number }>();

    const created = await env.DB.prepare(
      "INSERT INTO games (session_id, played_at, game_number, script, winner, storyteller, duration_minutes, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id"
    )
      .bind(
        session.id,
        session.playedAt,
        Number(next?.gameNumber ?? 1),
        body.script.trim(),
        body.winner,
        session.storyteller,
        body.durationMinutes || null,
        JSON.stringify((body.notes ?? []).filter(Boolean)),
        new Date().toISOString()
      )
      .first<{ id: number }>();

    const rows = (body.appearances ?? []).filter(
      (row) => row.player?.trim() && row.character?.trim() &&
        ["townsfolk", "outsider", "minion", "demon"].includes(row.characterType ?? "")
    );
    if (created?.id && rows.length) {
      await env.DB.batch(
        rows.map((row) => {
          const characterType = row.characterType!;
          const alignment = characterType === "minion" || characterType === "demon" ? "evil" : "good";
          return env.DB.prepare(
            "INSERT INTO appearances (game_id, player, character, character_type, alignment) VALUES (?, ?, ?, ?, ?)"
          ).bind(created.id, row.player!.trim(), row.character!.trim(), characterType, alignment);
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
