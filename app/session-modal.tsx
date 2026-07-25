"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export type CharacterType = "townsfolk" | "outsider" | "minion" | "demon";

export type SessionRecord = {
  id: number;
  playedAt: string;
  gameCount?: number;
};

export type PlayerRecord = {
  id: number;
  name: string;
};

export type CharacterRecord = {
  id: number;
  name: string;
  characterType: CharacterType;
  edition: string;
  imageUrl: string;
  isCustom: boolean | number;
};

type GameSummary = {
  sessionId?: number | null;
};

type LineupRow = {
  id: number;
  player: string;
  character: string;
  characterType: CharacterType | "";
  customCharacter: boolean;
  personalResult: "" | "win" | "loss";
};

type Props = {
  sessions: SessionRecord[];
  games: GameSummary[];
  players: PlayerRecord[];
  characters: CharacterRecord[];
  scripts: string[];
  onClose: () => void;
  onDataChange: () => Promise<void>;
  onMessage: (message: string) => void;
};

const emptyLineupRow = (): LineupRow => ({
  id: Date.now() + Math.random(),
  player: "",
  character: "",
  characterType: "",
  customCharacter: false,
  personalResult: "",
});

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${date}T12:00:00`)
  );

export default function SessionModal({
  sessions,
  games,
  players,
  characters,
  scripts,
  onClose,
  onDataChange,
  onMessage,
}: Props) {
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
  const [localPlayers, setLocalPlayers] = useState(players);
  const [lineup, setLineup] = useState<LineupRow[]>([emptyLineupRow()]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [scriptChoice, setScriptChoice] = useState("");
  const [newScript, setNewScript] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [draftKey, setDraftKey] = useState(0);

  useEffect(() => setLocalPlayers(players), [players]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const charactersByType = useMemo(() => {
    const grouped = new Map<CharacterType, CharacterRecord[]>();
    (["townsfolk", "outsider", "minion", "demon"] as CharacterType[]).forEach((type) =>
      grouped.set(type, [])
    );
    characters.forEach((character) => {
      grouped.get(character.characterType)?.push(character);
    });
    return grouped;
  }, [characters]);

  const matchingSession = sessions.find((session) => session.playedAt === selectedDate) ?? null;

  const startSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (matchingSession) {
      setActiveSession(matchingSession);
      setLineup([emptyLineupRow()]);
      return;
    }
    setSaving(true);
    onMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createSession",
          playedAt: form.get("playedAt"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start session");
      await onDataChange();
      setActiveSession(result.session);
      setLineup([emptyLineupRow()]);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Could not start this session.");
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
      setLocalPlayers((current) =>
        [...current.filter((player) => player.id !== result.player.id), result.player].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setLineup((current) => {
        const emptyIndex = current.findIndex((row) => !row.player);
        if (emptyIndex < 0) return [...current, { ...emptyLineupRow(), player: result.player.name }];
        return current.map((row, index) =>
          index === emptyIndex ? { ...row, player: result.player.name } : row
        );
      });
      setNewPlayerName("");
      await onDataChange();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Could not add player.");
    } finally {
      setSaving(false);
    }
  };

  const updateLineupRow = (id: number, patch: Partial<LineupRow>) => {
    setLineup((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const submitSessionGame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSession) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const finishAfterSave = submitter?.value === "finish";
    setSaving(true);
    onMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addGame",
          sessionId: activeSession.id,
          script: scriptChoice === "__custom__" ? newScript.trim() : scriptChoice,
          winner: form.get("winner") || null,
          storytellers: form.getAll("storytellers"),
          durationMinutes: Number(form.get("durationMinutes")) || null,
          notes: String(form.get("notes") ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          appearances: lineup
            .filter((row) => row.player || row.character)
            .map(({ player, character, characterType, personalResult }) => ({
              player,
              character,
              characterType,
              personalResult,
            })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save game");
      await onDataChange();
      if (finishAfterSave) {
        onMessage(`Game ${result.gameNumber} saved.`);
        onClose();
        return;
      }
      setLineup([emptyLineupRow()]);
      setScriptChoice("");
      setNewScript("");
      setDraftKey((current) => current + 1);
      onMessage(`Game ${result.gameNumber} saved. Ready for the next one.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Could not save this game.");
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (!activeSession || window.confirm("Discard this unsaved game draft?")) {
      onClose();
    }
  };

  const changeSession = () => {
    if (window.confirm("Discard this draft and choose another session?")) {
      setActiveSession(null);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && requestClose()}
    >
      <div className="modal session-modal" role="dialog" aria-modal="true" aria-labelledby="session-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{activeSession ? "Session in progress · unsaved draft" : "Game night"}</p>
            <h2 id="session-title">
              {activeSession
                ? `Game ${games.filter((game) => game.sessionId === activeSession.id).length + 1}`
                : "Start a session"}
            </h2>
            <p className="modal-intro">
              {activeSession
                ? "Add whatever you remember. Only the session date is fixed."
                : "Set the game-night date once, then add as many games as you play."}
            </p>
          </div>
          <button className="modal-close" onClick={requestClose} aria-label="Close">×</button>
        </div>

        {!activeSession ? (
          <form className="session-form" onSubmit={startSession}>
            <div className="modal-scroll">
              <div className="session-start-grid one-column">
                <label>
                  Date
                  <input
                    name="playedAt"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    required
                  />
                </label>
              </div>
              {sessions.length > 0 && (
                <div className="recent-sessions">
                  <div className="section-label"><span>Or continue a session</span><i /></div>
                  {sessions.slice(0, 6).map((session) => {
                    const gameCount = Number(
                      session.gameCount ??
                      games.filter((game) => game.sessionId === session.id).length
                    );
                    return (
                      <button type="button" key={session.id} onClick={() => setActiveSession(session)}>
                        <span>
                          <strong>{formatDate(session.playedAt)}</strong>
                          <small>A shared game-night record</small>
                        </span>
                        <em>{gameCount} game{gameCount === 1 ? "" : "s"} →</em>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-actions start-actions">
              <button type="button" onClick={onClose}>Cancel</button>
              <button className="save-button" disabled={saving}>
                {saving ? "Starting…" : matchingSession ? "Continue session" : "Start session"}
              </button>
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
                <label className="script-field">
                  Script <small>optional</small>
                  <select
                    aria-label="Script optional"
                    value={scriptChoice}
                    onChange={(event) => {
                      setScriptChoice(event.target.value);
                      if (event.target.value !== "__custom__") setNewScript("");
                    }}
                  >
                    <option value="">Not recorded</option>
                    {scripts.map((script) => <option key={script} value={script}>{script}</option>)}
                    <option value="__custom__">＋ Create new script…</option>
                  </select>
                  {scriptChoice === "__custom__" && (
                    <span className="custom-script-field">
                      <span className="custom-script-label">New script name <small>required</small></span>
                      <input
                        name="newScript"
                        aria-label="New script name"
                        placeholder="e.g. Midnight in Ravenswood"
                        value={newScript}
                        onChange={(event) => setNewScript(event.target.value)}
                        autoFocus
                        required
                      />
                    </span>
                  )}
                </label>
                <label>
                  Winner <small>optional</small>
                  <select name="winner" defaultValue="">
                    <option value="">Not recorded</option>
                    <option value="good">Good</option>
                    <option value="evil">Evil</option>
                  </select>
                </label>
                <label>
                  Duration <small>optional</small>
                  <input name="durationMinutes" type="number" min="1" placeholder="Minutes" />
                </label>
              </div>

              <fieldset className="storyteller-field">
                <legend>Storytellers <small>optional · choose any number</small></legend>
                <div className="storyteller-options">
                  {localPlayers.map((player) => (
                    <label key={player.id}>
                      <input type="checkbox" name="storytellers" value={player.name} />
                      <span>{player.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="lineup-section">
                <div className="section-label">
                  <span>Player lineup · everything optional</span><i />
                </div>
                <div className="lineup-head">
                  <span>Player</span><span>Category</span><span>Character</span><span>Personal result</span><span />
                </div>
                <div className="lineup-rows">
                  {lineup.map((row, index) => {
                    const availableCharacters = row.characterType
                      ? charactersByType.get(row.characterType) ?? []
                      : [];
                    const selectedCharacter = availableCharacters.find(
                      (character) => character.name === row.character
                    );
                    return (
                      <div className="lineup-row" key={row.id}>
                        <label>
                          <span className="sr-only">Player {index + 1}</span>
                          <select
                            aria-label={`Player ${index + 1}`}
                            value={row.player}
                            onChange={(event) =>
                              updateLineupRow(row.id, { player: event.target.value })
                            }
                          >
                            <option value="">Player unknown</option>
                            {localPlayers.map((player) => (
                              <option key={player.id} value={player.name}>{player.name}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className="sr-only">Character category for player {index + 1}</span>
                          <select
                            aria-label={`Character category for player ${index + 1}`}
                            value={row.characterType}
                            onChange={(event) =>
                              updateLineupRow(row.id, {
                                characterType: event.target.value as CharacterType | "",
                                character: "",
                                customCharacter: false,
                              })
                            }
                          >
                            <option value="">Category</option>
                            <option value="townsfolk">Townsfolk</option>
                            <option value="outsider">Outsider</option>
                            <option value="minion">Minion</option>
                            <option value="demon">Demon</option>
                          </select>
                        </label>
                        <label className="character-picker">
                          <span className="sr-only">Character for player {index + 1}</span>
                          {row.customCharacter ? (
                            <div className="custom-character-input">
                              <input
                                aria-label={`New character for player ${index + 1}`}
                                value={row.character}
                                onChange={(event) =>
                                  updateLineupRow(row.id, { character: event.target.value })
                                }
                                placeholder="New character name"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateLineupRow(row.id, {
                                    character: "",
                                    customCharacter: false,
                                  })
                                }
                              >
                                List
                              </button>
                            </div>
                          ) : (
                            <div className="character-select-wrap">
                              {selectedCharacter && (
                                <img src={selectedCharacter.imageUrl} alt="" loading="lazy" />
                              )}
                              <select
                                aria-label={`Character for player ${index + 1}`}
                                value={row.character}
                                disabled={!row.characterType}
                                onChange={(event) => {
                                  if (event.target.value === "__custom__") {
                                    updateLineupRow(row.id, {
                                      character: "",
                                      customCharacter: true,
                                    });
                                  } else {
                                    updateLineupRow(row.id, { character: event.target.value });
                                  }
                                }}
                              >
                                <option value="">
                                  {row.characterType ? "Character" : "Choose category first"}
                                </option>
                                {availableCharacters.map((character) => (
                                  <option key={character.id} value={character.name}>
                                    {character.name}{character.isCustom ? " · custom" : ""}
                                  </option>
                                ))}
                                <option value="__custom__">＋ Create new character…</option>
                              </select>
                            </div>
                          )}
                        </label>
                        <label>
                          <span className="sr-only">Personal result for player {index + 1}</span>
                          <select
                            aria-label={`Personal result for player ${index + 1}`}
                            value={row.personalResult}
                            onChange={(event) =>
                              updateLineupRow(row.id, {
                                personalResult: event.target.value as "" | "win" | "loss",
                              })
                            }
                          >
                            <option value="">Result automatic</option>
                            <option value="win">Counts as win</option>
                            <option value="loss">Counts as loss</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          className="remove-row"
                          onClick={() =>
                            setLineup((current) =>
                              current.filter((item) => item.id !== row.id)
                            )
                          }
                          disabled={lineup.length === 1}
                          aria-label={`Remove player row ${index + 1}`}
                        >
                          <span aria-hidden="true">×</span>
                          <span className="remove-label">Remove row</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="append-row"
                  onClick={() => setLineup((current) => [...current, emptyLineupRow()])}
                >
                  ＋ Add player row
                </button>
                <div className="roster-add">
                  <input
                    value={newPlayerName}
                    onChange={(event) => setNewPlayerName(event.target.value)}
                    placeholder="New player name"
                    aria-label="New player name"
                  />
                  <button
                    type="button"
                    onClick={addPlayer}
                    disabled={saving || !newPlayerName.trim()}
                  >
                    Add to roster
                  </button>
                </div>
              </div>

              <label className="notes-field">
                Memorable moments <small>optional · one moment per line</small>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="What will the group still be arguing about next week?"
                />
              </label>
            </div>
            <div className="modal-actions game-actions">
              <button
                className="save-button"
                name="saveIntent"
                value="continue"
                disabled={saving || (scriptChoice === "__custom__" && !newScript.trim())}
              >
                {saving ? "Saving…" : "Save & add another"}
              </button>
              <button
                className="finish-button"
                name="saveIntent"
                value="finish"
                disabled={saving || (scriptChoice === "__custom__" && !newScript.trim())}
              >
                Save & finish
              </button>
              <button type="button" onClick={changeSession}>Change session</button>
              <button type="button" onClick={requestClose}>Discard draft</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
