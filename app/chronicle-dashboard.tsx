"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Game = {
  id: number;
  sessionId?: number | null;
  playedAt: string;
  gameNumber: number;
  script: string;
  winner: "good" | "evil";
  storyteller: string;
  durationMinutes: number | null;
  notes: string[];
};

type Appearance = {
  id: number;
  gameId: number;
  player: string;
  character: string;
  characterType?: "townsfolk" | "outsider" | "minion" | "demon";
  alignment: "good" | "evil";
};

type Session = {
  id: number;
  playedAt: string;
  storyteller: string;
  gameCount?: number;
};

type Player = {
  id: number;
  name: string;
};

type LineupRow = {
  id: number;
  player: string;
  character: string;
  characterType: "townsfolk" | "outsider" | "minion" | "demon";
};

const FALLBACK_GAMES: Game[] = [
  { id: 1, playedAt: "2026-07-16", gameNumber: 4, script: "Sects & Violets", winner: "evil", storyteller: "", durationMinutes: null, notes: ["The only good player left was executed in the final three."] },
  { id: 2, playedAt: "2026-07-16", gameNumber: 3, script: "Sects & Violets", winner: "good", storyteller: "", durationMinutes: null, notes: ["The Barber switched the demon and the Pit Hag.", "The demon was executed in the final three with a good evil twin alive."] },
  { id: 3, playedAt: "2026-07-16", gameNumber: 2, script: "Sects & Violets", winner: "good", storyteller: "", durationMinutes: null, notes: ["The demon was executed day 1, and the evil twin day 2."] },
  { id: 4, playedAt: "2026-07-16", gameNumber: 1, script: "Sects & Violets", winner: "good", storyteller: "", durationMinutes: null, notes: ["The demon was snake-charmed night 1."] },
  { id: 5, playedAt: "2026-07-08", gameNumber: 3, script: "Opium Den", winner: "good", storyteller: "", durationMinutes: null, notes: ["The Poppy Grower stayed alive the whole game.", "The demon was a Fang Gu — it jumped and died to the Witch."] },
  { id: 6, playedAt: "2026-07-08", gameNumber: 2, script: "Sects & Violets", winner: "good", storyteller: "", durationMinutes: null, notes: ["Artist, Flower Girl, and Dreamer info narrowed the demon down to one person on day 2."] },
  { id: 7, playedAt: "2026-07-08", gameNumber: 1, script: "Opium Den", winner: "good", storyteller: "", durationMinutes: null, notes: ["Both twin Chef infos were wrong because of the No Dashii."] },
  { id: 8, playedAt: "2026-07-04", gameNumber: 6, script: "Trouble Brewing", winner: "good", storyteller: "", durationMinutes: null, notes: ["Ryan was the drunk, poisoned, red-herring Investigator who saw Andrew the Ravenkeeper and Jenny the Saint as the Scarlet Woman."] },
  { id: 9, playedAt: "2026-07-01", gameNumber: 6, script: "A Leech of Distrust v2.1", winner: "good", storyteller: "", durationMinutes: null, notes: ["Ryan told Abhi he was the Marionette, but Michael convinced Abhi he was being played."] },
  { id: 10, playedAt: "2026-07-01", gameNumber: 5, script: "A Leech of Distrust v2.1", winner: "good", storyteller: "", durationMinutes: null, notes: ["Michael cold-called that he was the leech host — based purely on vibes. He was right."] },
  { id: 11, playedAt: "2026-07-01", gameNumber: 4, script: "A Leech of Distrust v2.1", winner: "good", storyteller: "", durationMinutes: null, notes: ["Ryan slayed Michael, the leech host, on day one."] },
  { id: 12, playedAt: "2026-07-01", gameNumber: 3, script: "A Leech of Distrust v2.1", winner: "good", storyteller: "", durationMinutes: null, notes: ["Jenny told Lucy she was the Marionette."] },
  { id: 13, playedAt: "2026-07-01", gameNumber: 2, script: "Watch Your Mouth V1", winner: "good", storyteller: "", durationMinutes: null, notes: ["Anastasia was executed as the supposed innocent leech-host Pacifist — she was the starting Legion."] },
  { id: 14, playedAt: "2026-07-01", gameNumber: 1, script: "Watch Your Mouth V1", winner: "evil", storyteller: "", durationMinutes: null, notes: ["Michael got mez-turned by questioning Claire's story."] },
];

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${date}T12:00:00`)
  );

const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`)
  );

export default function ChronicleDashboard() {
  const [games, setGames] = useState<Game[]>(FALLBACK_GAMES);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [view, setView] = useState<"overview" | "players" | "characters" | "games">("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [lineup, setLineup] = useState<LineupRow[]>([
    { id: 1, player: "", character: "", characterType: "townsfolk" },
  ]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [draftKey, setDraftKey] = useState(0);
  const [search, setSearch] = useState("");
  const [scriptFilter, setScriptFilter] = useState("All scripts");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    } catch {
      setMessage("Showing the imported ledger while the shared archive connects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

  const stats = useMemo(() => {
    const good = games.filter((game) => game.winner === "good").length;
    const scripts = Array.from(new Set(games.map((game) => game.script)));
    const dates = Array.from(new Set(games.map((game) => game.playedAt)));
    const scriptRows = scripts
      .map((script) => {
        const matches = games.filter((game) => game.script === script);
        const wins = matches.filter((game) => game.winner === "good").length;
        return { script, games: matches.length, wins, rate: Math.round((wins / matches.length) * 100) };
      })
      .sort((a, b) => b.games - a.games || b.rate - a.rate);

    const playerMap = new Map<string, { games: number; wins: number; good: number; evil: number }>();
    appearances.forEach((appearance) => {
      const game = games.find((item) => item.id === appearance.gameId);
      const current = playerMap.get(appearance.player) ?? { games: 0, wins: 0, good: 0, evil: 0 };
      current.games += 1;
      current.good += appearance.alignment === "good" ? 1 : 0;
      current.evil += appearance.alignment === "evil" ? 1 : 0;
      current.wins += game?.winner === appearance.alignment ? 1 : 0;
      playerMap.set(appearance.player, current);
    });

    const characterMap = new Map<string, { games: number; wins: number; alignment: string; type: string }>();
    appearances.forEach((appearance) => {
      const game = games.find((item) => item.id === appearance.gameId);
      const current = characterMap.get(appearance.character) ?? {
        games: 0,
        wins: 0,
        alignment: appearance.alignment,
        type: appearance.characterType ?? appearance.alignment,
      };
      current.games += 1;
      current.wins += game?.winner === appearance.alignment ? 1 : 0;
      characterMap.set(appearance.character, current);
    });

    return {
      good,
      evil: games.length - good,
      goodRate: games.length ? Math.round((good / games.length) * 100) : 0,
      scripts,
      dates,
      scriptRows,
      players: [...playerMap].map(([name, data]) => ({ name, ...data })).sort((a, b) => b.games - a.games),
      characters: [...characterMap].map(([name, data]) => ({ name, ...data })).sort((a, b) => b.games - a.games),
    };
  }, [games, appearances]);

  const filteredGames = games.filter((game) => {
    const matchesScript = scriptFilter === "All scripts" || game.script === scriptFilter;
    const haystack = `${game.script} ${game.notes.join(" ")} ${game.storyteller}`.toLowerCase();
    return matchesScript && haystack.includes(search.toLowerCase());
  });

  const openSessionModal = () => {
    setActiveSession(null);
    setModalOpen(true);
  };

  const startSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createSession",
          playedAt: form.get("playedAt"),
          storyteller: form.get("storyteller"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start session");
      await loadGames();
      setActiveSession(result.session);
      setLineup([{ id: Date.now(), player: "", character: "", characterType: "townsfolk" }]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start this session.");
    } finally {
      setSaving(false);
    }
  };

  const addPlayer = async () => {
    const name = newPlayerName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createPlayer", playerName: name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add player");
      setPlayers((current) =>
        [...current.filter((player) => player.id !== result.player.id), result.player].sort((a, b) => a.name.localeCompare(b.name))
      );
      setLineup((current) => {
        const emptyIndex = current.findIndex((row) => !row.player);
        if (emptyIndex < 0) return [...current, { id: Date.now(), player: result.player.name, character: "", characterType: "townsfolk" }];
        return current.map((row, index) => index === emptyIndex ? { ...row, player: result.player.name } : row);
      });
      setNewPlayerName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add player.");
    } finally {
      setSaving(false);
    }
  };

  const updateLineupRow = (id: number, patch: Partial<LineupRow>) => {
    setLineup((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  const submitSessionGame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSession) return;
    const partialRows = lineup.filter((row) => row.player || row.character);
    const completeRows = partialRows.filter((row) => row.player && row.character);
    if (!completeRows.length) {
      setMessage("Add at least one player and character to the lineup.");
      return;
    }
    if (completeRows.length !== partialRows.length) {
      setMessage("Finish or remove the incomplete lineup row.");
      return;
    }

    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addGame",
          sessionId: activeSession.id,
          script: form.get("script"),
          winner: form.get("winner"),
          durationMinutes: Number(form.get("durationMinutes")) || null,
          notes: String(form.get("notes") ?? "").split("\n").map((line) => line.trim()).filter(Boolean),
          appearances: completeRows,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save game");
      await loadGames();
      setLineup([{ id: Date.now(), player: "", character: "", characterType: "townsfolk" }]);
      setDraftKey((current) => current + 1);
      setMessage(`Game ${result.gameNumber} saved. Ready for the next one.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this game.");
    } finally {
      setSaving(false);
    }
  };

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
      </aside>

      <div className="content-shell">

      {message && <div className="toast" role="status">{message}<button onClick={() => setMessage("")}>×</button></div>}

      <section className="view-heading">
        <div>
          <p className="eyebrow">{view === "overview" ? "Collective record" : `Archive / ${view}`}</p>
          <h1>{view === "overview" ? "Group overview" : view === "players" ? "Players" : view === "characters" ? "Characters" : "Games"}</h1>
          <p className="subtitle">
            {view === "overview" && "Wins, scripts, trends, and recent games—all in one place."}
            {view === "players" && "Performance across alignments and appearances, calculated from logged lineups."}
            {view === "characters" && "See which characters appear most often—and which side they help carry home."}
            {view === "games" && `${games.length} games, preserved from newest to oldest.`}
          </p>
        </div>
        {(view === "overview" || view === "games") && <button className="primary-action" onClick={openSessionModal}><span>＋</span> Start session</button>}
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
                  return <span key={date} style={{ height: `${20 + count * 8}px` }} title={`${shortDate(date)}: ${count} games`}><i>{index + 1}</i></span>;
                })}
              </div>
            </article>
            <article className="metric-card alignment-card">
              <span className="metric-kicker">The balance</span>
              <div className="alignment-row"><span className="sun">✦</span><b>{stats.good}</b><p>Good victories</p></div>
              <div className="alignment-row evil"><span>●</span><b>{stats.evil}</b><p>Evil victories</p></div>
              <div className="balance-bar"><span style={{ width: `${stats.goodRate}%` }} /></div>
            </article>
            <article className="metric-card">
              <span className="metric-kicker">Scripts played</span>
              <strong>{String(stats.scripts.length).padStart(2, "0")}</strong>
              <p>from classics to custom chaos</p>
              <div className="script-tags">{stats.scripts.slice(0, 3).map((script) => <span key={script}>{script}</span>)}</div>
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
                  <span className="rate-cell"><div><i style={{ width: `${row.rate}%` }} /></div><b>{row.rate}%</b></span>
                </div>
              ))}
            </article>

            <article className="panel recent-panel">
              <div className="panel-head">
                <div><p className="eyebrow">Fresh ink</p><h2>Recent games</h2></div>
              </div>
              {games.slice(0, 4).map((game) => (
                <button className="recent-game" key={game.id} onClick={() => { setView("games"); setSearch(game.script); }}>
                  <span className={`verdict-dot ${game.winner}`}>{game.winner === "good" ? "✦" : "●"}</span>
                  <span><b>{game.script}</b><small>{shortDate(game.playedAt)} · Game {game.gameNumber}</small></span>
                  <em>{game.winner}</em>
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
                  <strong>{Math.round((player.wins / player.games) * 100)}%</strong>
                  <small>win rate</small>
                  <div className="alignment-split"><span>{player.good} good</span><span>{player.evil} evil</span></div>
                </article>
              ))}
            </div>
          ) : <EmptyState type="players" onAdd={openSessionModal} />}
        </section>
      )}

      {view === "characters" && (
        <section className="data-view">
          {stats.characters.length ? (
            <div className="character-list">
              {stats.characters.map((character, index) => (
                <article key={character.name}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div className={`role-seal ${character.alignment}`}>{character.alignment === "good" ? "✦" : "●"}</div>
                  <div><h2>{character.name}</h2><p>{character.type}</p></div>
                  <strong>{character.games}<small>plays</small></strong>
                  <strong>{Math.round((character.wins / character.games) * 100)}%<small>win rate</small></strong>
                </article>
              ))}
            </div>
          ) : <EmptyState type="characters" onAdd={openSessionModal} />}
        </section>
      )}

      {view === "games" && (
        <section className="games-view">
          <div className="filters">
            <label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the archive…" /></label>
            <label>Script<select value={scriptFilter} onChange={(event) => setScriptFilter(event.target.value)}>
              <option>All scripts</option>{stats.scripts.map((script) => <option key={script}>{script}</option>)}
            </select></label>
            <span>{filteredGames.length} result{filteredGames.length === 1 ? "" : "s"}</span>
          </div>
          <div className="game-ledger">
            {filteredGames.map((game) => (
              <article className="game-entry" key={game.id}>
                <div className="date-block"><strong>{new Date(`${game.playedAt}T12:00:00`).getDate()}</strong><span>{shortDate(game.playedAt).split(" ")[0]}</span><small>{game.playedAt.slice(0, 4)}</small></div>
                <div className="game-copy">
                  <div><span className={`verdict-pill ${game.winner}`}>{game.winner === "good" ? "✦ Good prevailed" : "● Evil prevailed"}</span><small>Game {game.gameNumber}</small></div>
                  <h2>{game.script}</h2>
                  <ul>{game.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
                  {(game.storyteller || game.durationMinutes) && <p className="game-meta">{game.storyteller && `Told by ${game.storyteller}`}{game.storyteller && game.durationMinutes ? " · " : ""}{game.durationMinutes && `${game.durationMinutes} min`}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <div className="modal session-modal" role="dialog" aria-modal="true" aria-labelledby="session-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{activeSession ? "Session in progress" : "Game night"}</p>
                <h2 id="session-title">{activeSession ? `Game ${games.filter((game) => game.sessionId === activeSession.id).length + 1}` : "Start a session"}</h2>
                <p className="modal-intro">
                  {activeSession
                    ? "Add this game’s result and full lineup. The session date stays fixed."
                    : "Set the game-night date once, then add as many games as you play."}
                </p>
              </div>
              <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close">×</button>
            </div>

            {!activeSession ? (
              <form className="session-form" onSubmit={startSession}>
                <div className="modal-scroll">
                  <div className="session-start-grid">
                    <label>Date<input name="playedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
                    <label>Storyteller<input name="storyteller" placeholder="Optional" /></label>
                  </div>
                  {sessions.length > 0 && (
                    <div className="recent-sessions">
                      <div className="section-label"><span>Or continue a session</span><i /></div>
                      {sessions.slice(0, 4).map((session) => (
                        <button type="button" key={session.id} onClick={() => setActiveSession(session)}>
                          <span><strong>{formatDate(session.playedAt)}</strong><small>{session.storyteller || "No storyteller listed"}</small></span>
                          <em>{Number(session.gameCount ?? games.filter((game) => game.sessionId === session.id).length)} games →</em>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button className="save-button" disabled={saving}>{saving ? "Starting…" : "Start session"}</button>
                </div>
              </form>
            ) : (
              <form key={draftKey} className="session-form" onSubmit={submitSessionGame}>
                <div className="modal-scroll">
                  <div className="session-lock">
                    <span>Session date</span>
                    <strong>{formatDate(activeSession.playedAt)}</strong>
                    <small>Locked for every game in this session</small>
                  </div>

                  <div className="game-fields">
                    <label>Script<input name="script" placeholder="e.g. Sects & Violets" required /></label>
                    <label>Winner<select name="winner" defaultValue="good"><option value="good">Good</option><option value="evil">Evil</option></select></label>
                    <label>Duration<input name="durationMinutes" type="number" min="1" placeholder="Minutes" /></label>
                  </div>

                  <div className="lineup-section">
                    <div className="section-label"><span>Player lineup</span><i /></div>
                    <div className="lineup-head"><span>Player</span><span>Character</span><span>Type</span><span /></div>
                    <div className="lineup-rows">
                      {lineup.map((row, index) => (
                        <div className="lineup-row" key={row.id}>
                          <label>
                            <span className="sr-only">Player {index + 1}</span>
                            <select aria-label={`Player ${index + 1}`} value={row.player} onChange={(event) => updateLineupRow(row.id, { player: event.target.value })}>
                              <option value="">Select player</option>
                              {players.map((player) => <option key={player.id} value={player.name}>{player.name}</option>)}
                            </select>
                          </label>
                          <label>
                            <span className="sr-only">Character for player {index + 1}</span>
                            <input aria-label={`Character for player ${index + 1}`} value={row.character} onChange={(event) => updateLineupRow(row.id, { character: event.target.value })} placeholder="Character" />
                          </label>
                          <label>
                            <span className="sr-only">Character type for player {index + 1}</span>
                            <select aria-label={`Character type for player ${index + 1}`} value={row.characterType} onChange={(event) => updateLineupRow(row.id, { characterType: event.target.value as LineupRow["characterType"] })}>
                              <option value="townsfolk">Townsfolk</option>
                              <option value="outsider">Outsider</option>
                              <option value="minion">Minion</option>
                              <option value="demon">Demon</option>
                            </select>
                          </label>
                          <button type="button" className="remove-row" onClick={() => setLineup((current) => current.filter((item) => item.id !== row.id))} disabled={lineup.length === 1} aria-label={`Remove player row ${index + 1}`}>×</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="append-row" onClick={() => setLineup((current) => [...current, { id: Date.now(), player: "", character: "", characterType: "townsfolk" }])}>＋ Add player row</button>
                    <div className="roster-add">
                      <input value={newPlayerName} onChange={(event) => setNewPlayerName(event.target.value)} placeholder="New player name" aria-label="New player name" />
                      <button type="button" onClick={addPlayer} disabled={saving || !newPlayerName.trim()}>Add to roster</button>
                    </div>
                  </div>

                  <label className="notes-field">Memorable moments <small>One moment per line</small><textarea name="notes" rows={3} placeholder="What will the group still be arguing about next week?" /></label>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setActiveSession(null)}>Change session</button>
                  <button type="button" onClick={() => setModalOpen(false)}>Finish later</button>
                  <button className="save-button" disabled={saving}>{saving ? "Saving…" : "Save game & add another"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {loading && <div className="loading-line" />}
      </div>
    </main>
  );
}

function EmptyState({ type, onAdd }: { type: "players" | "characters"; onAdd: () => void }) {
  return (
    <div className="empty-state">
      <span>{type === "players" ? "◌" : "✦"}</span>
      <p className="eyebrow">The imported chronicle has no lineups</p>
      <h2>{type === "players" ? "Player stats begin with the next game." : "Character records begin with the next game."}</h2>
      <p>The original tracker saved outcomes and stories, but not complete roles. Log a lineup once and this page will calculate itself.</p>
      <button className="primary-action" onClick={onAdd}>＋ Start a session</button>
    </div>
  );
}
