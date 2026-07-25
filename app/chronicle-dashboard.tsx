"use client";

import { useEffect, useMemo, useState } from "react";
import SessionModal, {
  CharacterRecord,
  CharacterType,
  PlayerRecord,
  SessionRecord,
} from "./session-modal";

type Winner = "good" | "evil" | null;

type Game = {
  id: number;
  sessionId?: number | null;
  playedAt: string;
  gameNumber: number;
  script: string;
  winner: Winner;
  storytellers: string[];
  storyteller: string;
  durationMinutes: number | null;
  notes: string[];
};

type Appearance = {
  id: number;
  gameId: number;
  player: string;
  character: string;
  characterType?: CharacterType | null;
  alignment: "good" | "evil" | null;
};

const FALLBACK_GAMES: Game[] = [
  { id: 1, playedAt: "2026-07-16", gameNumber: 4, script: "Sects & Violets", winner: "evil", storytellers: [], storyteller: "", durationMinutes: null, notes: ["The only good player left was executed in the final three."] },
  { id: 2, playedAt: "2026-07-16", gameNumber: 3, script: "Sects & Violets", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["The Barber switched the demon and the Pit Hag.", "The demon was executed in the final three with a good evil twin alive."] },
  { id: 3, playedAt: "2026-07-16", gameNumber: 2, script: "Sects & Violets", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["The demon was executed day 1, and the evil twin day 2."] },
  { id: 4, playedAt: "2026-07-16", gameNumber: 1, script: "Sects & Violets", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["The demon was snake-charmed night 1."] },
  { id: 5, playedAt: "2026-07-08", gameNumber: 3, script: "Opium Den", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["The Poppy Grower stayed alive the whole game.", "The demon was a Fang Gu — it jumped and died to the Witch."] },
  { id: 6, playedAt: "2026-07-08", gameNumber: 2, script: "Sects & Violets", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["Artist, Flower Girl, and Dreamer info narrowed the demon down to one person on day 2."] },
  { id: 7, playedAt: "2026-07-08", gameNumber: 1, script: "Opium Den", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["Both twin Chef infos were wrong because of the No Dashii."] },
  { id: 8, playedAt: "2026-07-04", gameNumber: 6, script: "Trouble Brewing", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["Ryan was the drunk, poisoned, red-herring Investigator who saw Andrew the Ravenkeeper and Jenny the Saint as the Scarlet Woman."] },
  { id: 9, playedAt: "2026-07-01", gameNumber: 6, script: "A Leech of Distrust v2.1", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["Ryan told Abhi he was the Marionette, but Michael convinced Abhi he was being played."] },
  { id: 10, playedAt: "2026-07-01", gameNumber: 5, script: "A Leech of Distrust v2.1", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["Michael cold-called that he was the leech host — based purely on vibes. He was right."] },
  { id: 11, playedAt: "2026-07-01", gameNumber: 4, script: "A Leech of Distrust v2.1", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["Ryan slayed Michael, the leech host, on day one."] },
  { id: 12, playedAt: "2026-07-01", gameNumber: 3, script: "A Leech of Distrust v2.1", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["Jenny told Lucy she was the Marionette."] },
  { id: 13, playedAt: "2026-07-01", gameNumber: 2, script: "Watch Your Mouth V1", winner: "good", storytellers: [], storyteller: "", durationMinutes: null, notes: ["Anastasia was executed as the supposed innocent leech-host Pacifist — she was the starting Legion."] },
  { id: 14, playedAt: "2026-07-01", gameNumber: 1, script: "Watch Your Mouth V1", winner: "evil", storytellers: [], storyteller: "", durationMinutes: null, notes: ["Michael got mez-turned by questioning Claire's story."] },
];

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${date}T12:00:00`)
  );

const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`)
  );

const displayScript = (script: string) => script || "Untitled game";

export default function ChronicleDashboard() {
  const [games, setGames] = useState<Game[]>(FALLBACK_GAMES);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [view, setView] = useState<"overview" | "players" | "characters" | "games">("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scriptFilter, setScriptFilter] = useState("All scripts");
  const [characterFilter, setCharacterFilter] = useState<"all" | CharacterType>("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadGames = async () => {
    try {
      const response = await fetch("/api/games");
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json();
      setGames(data.games);
      setAppearances(data.appearances);
      setSessions(data.sessions ?? []);
      setPlayers(data.players ?? []);
      setCharacters(data.characters ?? []);
    } catch {
      setMessage("Showing the imported ledger while the shared archive connects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const stats = useMemo(() => {
    const good = games.filter((game) => game.winner === "good").length;
    const evil = games.filter((game) => game.winner === "evil").length;
    const decided = good + evil;
    const scripts = Array.from(new Set(games.map((game) => game.script).filter(Boolean)));
    const dates = Array.from(new Set(games.map((game) => game.playedAt)));
    const scriptRows = scripts
      .map((script) => {
        const matches = games.filter((game) => game.script === script);
        const resolved = matches.filter((game) => game.winner);
        const wins = resolved.filter((game) => game.winner === "good").length;
        return {
          script,
          games: matches.length,
          wins,
          rate: resolved.length ? Math.round((wins / resolved.length) * 100) : null,
        };
      })
      .sort((a, b) => b.games - a.games || (b.rate ?? -1) - (a.rate ?? -1));

    const gamesById = new Map(games.map((game) => [game.id, game]));
    const playerMap = new Map<string, { games: number; wins: number; decided: number; good: number; evil: number }>();
    appearances.forEach((appearance) => {
      if (!appearance.player) return;
      const game = gamesById.get(appearance.gameId);
      const current = playerMap.get(appearance.player) ?? {
        games: 0,
        wins: 0,
        decided: 0,
        good: 0,
        evil: 0,
      };
      current.games += 1;
      current.good += appearance.alignment === "good" ? 1 : 0;
      current.evil += appearance.alignment === "evil" ? 1 : 0;
      if (game?.winner && appearance.alignment) {
        current.decided += 1;
        current.wins += game.winner === appearance.alignment ? 1 : 0;
      }
      playerMap.set(appearance.player, current);
    });

    const characterMap = new Map<string, { games: number; wins: number; decided: number }>();
    appearances.forEach((appearance) => {
      if (!appearance.character) return;
      const game = gamesById.get(appearance.gameId);
      const current = characterMap.get(appearance.character) ?? { games: 0, wins: 0, decided: 0 };
      current.games += 1;
      if (game?.winner && appearance.alignment) {
        current.decided += 1;
        current.wins += game.winner === appearance.alignment ? 1 : 0;
      }
      characterMap.set(appearance.character, current);
    });

    return {
      good,
      evil,
      unknown: games.length - decided,
      goodRate: decided ? Math.round((good / decided) * 100) : 0,
      scripts,
      dates,
      scriptRows,
      players: [...playerMap]
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.games - a.games),
      characterMap,
    };
  }, [games, appearances]);

  const filteredGames = games.filter((game) => {
    const matchesScript = scriptFilter === "All scripts" || game.script === scriptFilter;
    const haystack = `${game.script} ${game.notes.join(" ")} ${game.storytellers.join(" ")}`.toLowerCase();
    return matchesScript && haystack.includes(search.toLowerCase());
  });

  const catalogCharacters = characters
    .filter((character) => characterFilter === "all" || character.characterType === characterFilter)
    .map((character) => ({
      ...character,
      ...(stats.characterMap.get(character.name) ?? { games: 0, wins: 0, decided: 0 }),
    }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));

  const openSessionModal = () => setModalOpen(true);

  return (
    <main className="app-shell">
      <aside className="side-rail">
        <button className="brand" onClick={() => setView("overview")} aria-label="Midnight Ledger home">
          <span className="brand-mark"><span>12</span></span>
          <span>
            <strong>Midnight Ledger</strong>
            <small>Group archive</small>
          </span>
        </button>
        <nav aria-label="Primary navigation">
          {(["overview", "players", "characters", "games"] as const).map((item) => (
            <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>
              {item}
            </button>
          ))}
        </nav>
        <button className="primary-action" onClick={openSessionModal}>
          <span>＋</span> Start session
        </button>
        <p className="rail-caption">The group’s shared record of beautiful misinformation.</p>
        <a
          className="ccc-mark"
          href="https://release.botc.app/resources/"
          target="_blank"
          rel="noreferrer"
          aria-label="Blood on the Clocktower Community Created Content"
        >
          <img
            src="https://release.botc.app/resources/community/ccc-sleeve.png"
            alt="Blood on the Clocktower Community Created Content"
          />
        </a>
      </aside>

      <div className="content-shell">
        {message && (
          <div className="toast" role="status">
            {message}<button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        <section className="view-heading">
          <div>
            <p className="eyebrow">{view === "overview" ? "Collective record" : `Archive / ${view}`}</p>
            <h1>
              {view === "overview"
                ? "Group overview"
                : view === "players"
                  ? "Players"
                  : view === "characters"
                    ? "Characters"
                    : "Games"}
            </h1>
            <p className="subtitle">
              {view === "overview" && "Wins, scripts, trends, and recent games—all in one place."}
              {view === "players" && "Performance across alignments and appearances, calculated from logged lineups."}
              {view === "characters" && `${characters.length} official and custom characters, ready to log.`}
              {view === "games" && `${games.length} games, preserved from newest to oldest.`}
            </p>
          </div>
          {(view === "overview" || view === "games") && (
            <button className="primary-action" onClick={openSessionModal}>
              <span>＋</span> Start session
            </button>
          )}
        </section>

        {view === "overview" && (
          <>
            <section className="metric-grid" aria-label="Summary statistics">
              <article className="metric-card hero-metric">
                <span className="metric-kicker">Total games</span>
                <strong>{String(games.length).padStart(2, "0")}</strong>
                <p>across {stats.dates.length} game nights</p>
                <div className="mini-timeline">
                  {stats.dates.slice().reverse().map((date, index) => {
                    const count = games.filter((game) => game.playedAt === date).length;
                    return (
                      <span
                        key={date}
                        style={{ height: `${20 + count * 8}px` }}
                        title={`${shortDate(date)}: ${count} games`}
                      >
                        <i>{index + 1}</i>
                      </span>
                    );
                  })}
                </div>
              </article>
              <article className="metric-card alignment-card">
                <span className="metric-kicker">The balance</span>
                <div className="alignment-row"><span className="sun">✦</span><b>{stats.good}</b><p>Good victories</p></div>
                <div className="alignment-row evil"><span>●</span><b>{stats.evil}</b><p>Evil victories</p></div>
                {stats.unknown > 0 && <div className="unknown-results">{stats.unknown} unrecorded</div>}
                <div className="balance-bar"><span style={{ width: `${stats.goodRate}%` }} /></div>
              </article>
              <article className="metric-card">
                <span className="metric-kicker">Scripts played</span>
                <strong>{String(stats.scripts.length).padStart(2, "0")}</strong>
                <p>from classics to custom chaos</p>
                <div className="script-tags">
                  {stats.scripts.slice(0, 3).map((script) => <span key={script}>{script}</span>)}
                </div>
              </article>
              <article className="metric-card quote-card">
                <span className="quote-mark">“</span>
                <blockquote>{games[0]?.notes[0] ?? "No tale has been entered yet."}</blockquote>
                <p>Latest chronicle · {games[0] ? shortDate(games[0].playedAt) : "—"}</p>
              </article>
            </section>

            <section className="split-section">
              <article className="panel script-performance">
                <div className="panel-head">
                  <div><p className="eyebrow">By the numbers</p><h2>Script performance</h2></div>
                  <button onClick={() => setView("games")}>View games →</button>
                </div>
                <div className="table-head"><span>Script</span><span>Played</span><span>Good wins</span><span>Rate</span></div>
                {stats.scriptRows.map((row, index) => (
                  <div className="script-row" key={row.script}>
                    <span><i>{String(index + 1).padStart(2, "0")}</i><b>{row.script}</b></span>
                    <span>{row.games}</span>
                    <span>{row.wins}</span>
                    <span className="rate-cell">
                      <div><i style={{ width: `${row.rate ?? 0}%` }} /></div>
                      <b>{row.rate === null ? "—" : `${row.rate}%`}</b>
                    </span>
                  </div>
                ))}
              </article>

              <article className="panel recent-panel">
                <div className="panel-head">
                  <div><p className="eyebrow">Fresh ink</p><h2>Recent games</h2></div>
                </div>
                {games.slice(0, 4).map((game) => (
                  <button
                    className="recent-game"
                    key={game.id}
                    onClick={() => {
                      setView("games");
                      setSearch(game.script);
                    }}
                  >
                    <span className={`verdict-dot ${game.winner ?? "unknown"}`}>
                      {game.winner === "good" ? "✦" : game.winner === "evil" ? "●" : "?"}
                    </span>
                    <span>
                      <b>{displayScript(game.script)}</b>
                      <small>{shortDate(game.playedAt)} · Game {game.gameNumber}</small>
                    </span>
                    <em>{game.winner ?? "unknown"}</em>
                  </button>
                ))}
              </article>
            </section>
          </>
        )}

        {view === "players" && (
          <section className="data-view">
            {stats.players.length ? (
              <div className="leader-grid">
                {stats.players.map((player, index) => (
                  <article className="leader-card" key={player.name}>
                    <span className="rank">#{String(index + 1).padStart(2, "0")}</span>
                    <div className="avatar">{player.name.slice(0, 2).toUpperCase()}</div>
                    <h2>{player.name}</h2>
                    <p>{player.games} appearance{player.games === 1 ? "" : "s"}</p>
                    <strong>{player.decided ? `${Math.round((player.wins / player.decided) * 100)}%` : "—"}</strong>
                    <small>win rate</small>
                    <div className="alignment-split"><span>{player.good} good</span><span>{player.evil} evil</span></div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState type="players" onAdd={openSessionModal} />
            )}
          </section>
        )}

        {view === "characters" && (
          <section className="data-view">
            <div className="character-filters" role="group" aria-label="Filter characters by category">
              {(["all", "townsfolk", "outsider", "minion", "demon"] as const).map((type) => (
                <button
                  key={type}
                  className={characterFilter === type ? "active" : ""}
                  onClick={() => setCharacterFilter(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="character-list">
              {catalogCharacters.map((character, index) => (
                <article key={character.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div className={`role-seal ${character.characterType}`}>
                    <img src={character.imageUrl} alt="" loading="lazy" />
                  </div>
                  <div>
                    <h2>{character.name}</h2>
                    <p>{character.characterType} · {character.isCustom ? "custom" : character.edition}</p>
                  </div>
                  <strong>{character.games}<small>plays</small></strong>
                  <strong>
                    {character.decided ? `${Math.round((character.wins / character.decided) * 100)}%` : "—"}
                    <small>win rate</small>
                  </strong>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === "games" && (
          <section className="games-view">
            <div className="filters">
              <label className="search-field">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search the archive…"
                />
              </label>
              <label>
                Script
                <select value={scriptFilter} onChange={(event) => setScriptFilter(event.target.value)}>
                  <option>All scripts</option>
                  {stats.scripts.map((script) => <option key={script}>{script}</option>)}
                </select>
              </label>
              <span>{filteredGames.length} result{filteredGames.length === 1 ? "" : "s"}</span>
            </div>
            <div className="game-ledger">
              {filteredGames.map((game) => (
                <article className="game-entry" key={game.id}>
                  <div className="date-block">
                    <strong>{new Date(`${game.playedAt}T12:00:00`).getDate()}</strong>
                    <span>{shortDate(game.playedAt).split(" ")[0]}</span>
                    <small>{game.playedAt.slice(0, 4)}</small>
                  </div>
                  <div className="game-copy">
                    <div>
                      <span className={`verdict-pill ${game.winner ?? "unknown"}`}>
                        {game.winner === "good"
                          ? "✦ Good prevailed"
                          : game.winner === "evil"
                            ? "● Evil prevailed"
                            : "Result unknown"}
                      </span>
                      <small>Game {game.gameNumber}</small>
                    </div>
                    <h2>{displayScript(game.script)}</h2>
                    {game.notes.length > 0 && (
                      <ul>{game.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
                    )}
                    {(game.storytellers.length > 0 || game.durationMinutes) && (
                      <p className="game-meta">
                        {game.storytellers.length > 0 && `Told by ${game.storytellers.join(" & ")}`}
                        {game.storytellers.length > 0 && game.durationMinutes ? " · " : ""}
                        {game.durationMinutes && `${game.durationMinutes} min`}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {modalOpen && (
          <SessionModal
            sessions={sessions}
            games={games}
            players={players}
            characters={characters}
            onClose={() => setModalOpen(false)}
            onDataChange={loadGames}
            onMessage={setMessage}
          />
        )}

        {loading && <div className="loading-line" />}
      </div>
    </main>
  );
}

function EmptyState({ type, onAdd }: { type: "players" | "characters"; onAdd: () => void }) {
  return (
    <div className="empty-state">
      <span>{type === "players" ? "◎" : "✦"}</span>
      <p className="eyebrow">The imported chronicle has no lineups</p>
      <h2>{type === "players" ? "Player stats begin with the next lineup." : "Character stats begin with the next lineup."}</h2>
      <p>The original tracker saved outcomes and stories, but not complete roles. Add whatever you remember and this page will calculate itself.</p>
      <button className="primary-action" onClick={onAdd}>Start a session</button>
    </div>
  );
}
