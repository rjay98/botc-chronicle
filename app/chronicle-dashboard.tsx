"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  personalResult?: "win" | "loss" | null;
};

type PlayerSort = "appearances" | "win-rate" | "wins" | "roles" | "recent-form" | "name";
type PlayerFilter = "all" | "active" | "unplayed";
type PlayerScope = "all" | "good" | "evil" | CharacterType;
type CharacterSort = "usage" | "name" | "win-rate";
export type DashboardView = "overview" | "players" | "characters" | "games";
type LedgerPayload = {
  games: Game[];
  appearances?: Appearance[];
  sessions?: SessionRecord[];
  players?: PlayerRecord[];
  characters?: CharacterRecord[];
  scripts?: string[];
};

const viewHref = (view: DashboardView) =>
  view === "overview" ? "/" : `/?view=${view}`;

const viewFromLocation = (): DashboardView => {
  const requested = new URLSearchParams(window.location.search).get("view");
  return requested === "players" || requested === "characters" || requested === "games"
    ? requested
    : "overview";
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

const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`)
  );

const displayScript = (script: string) => script || "Untitled game";

type PlayerBadge = {
  id: string;
  label: string;
  icon: string;
  description: string;
  tone: "gold" | "good" | "evil" | "violet";
};

type PlayerForm = {
  summary: string;
  label: string;
  icon: string;
  wins: number;
  losses: number;
  score: number;
};

type PlayerInsight = {
  id: string;
  title: string;
  player: string;
  record: string;
  detail: string;
  icon: string;
  tone: "good" | "evil" | "gold" | "violet";
  score: number;
};

const CHARACTER_TYPE_LABELS: Record<CharacterType, string> = {
  townsfolk: "Townsfolk",
  outsider: "Outsider",
  minion: "Minion",
  demon: "Demon",
};

const appearanceResult = (
  appearance: Appearance,
  game?: Game
): "win" | "loss" | null => {
  if (appearance.personalResult) return appearance.personalResult;
  if (!game?.winner || !appearance.alignment) return null;
  return game.winner === appearance.alignment ? "win" : "loss";
};

const playerInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

export default function ChronicleDashboard({
  initialView = "overview",
}: {
  initialView?: DashboardView;
}) {
  const [games, setGames] = useState<Game[]>(FALLBACK_GAMES);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [scriptCatalog, setScriptCatalog] = useState<string[]>([]);
  const [view, setView] = useState<DashboardView>(initialView);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [scriptFilter, setScriptFilter] = useState("All scripts");
  const [characterFilter, setCharacterFilter] = useState<"all" | CharacterType>("all");
  const [characterSearch, setCharacterSearch] = useState("");
  const [characterSort, setCharacterSort] = useState<CharacterSort>("usage");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerSort, setPlayerSort] = useState<PlayerSort>("appearances");
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("all");
  const [playerScope, setPlayerScope] = useState<PlayerScope>("all");
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [playerNameDraft, setPlayerNameDraft] = useState("");
  const [savingPlayerName, setSavingPlayerName] = useState(false);
  const [expandedGames, setExpandedGames] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [message, setMessage] = useState("");

  const requestLedger = async (attempt: number) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      attempt === 0 ? 8000 : 12000
    );
    try {
      const response = await fetch(`/api/games?fresh=${Date.now()}-${attempt}`, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json() as LedgerPayload;
      if (!Array.isArray(data.games)) throw new Error("invalid ledger");
      return data;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const loadGames = async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const data = await requestLedger(attempt);
        setGames(data.games);
        setAppearances(data.appearances ?? []);
        setSessions(data.sessions ?? []);
        setPlayers(data.players ?? []);
        setCharacters(data.characters ?? []);
        setScriptCatalog(data.scripts ?? []);
        setLoading(false);
        return;
      } catch {
        if (attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 350));
        }
      }
    }

    setMessage("Showing the imported ledger while the shared archive connects.");
    setLoading(false);
  };

  const renamePlayer = async (
    event: FormEvent<HTMLFormElement>,
    player: PlayerRecord
  ) => {
    event.preventDefault();
    const nextName = playerNameDraft.trim().replace(/\s+/g, " ");
    if (!nextName || nextName === player.name) {
      setEditingPlayerId(null);
      setPlayerNameDraft("");
      return;
    }

    setSavingPlayerName(true);
    setMessage("");
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "renamePlayer",
          playerId: player.id,
          playerName: nextName,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not rename player.");

      setExpandedPlayer(nextName);
      setEditingPlayerId(null);
      setPlayerNameDraft("");
      await loadGames();
      setMessage(`${player.name} is now ${nextName}. Past lineups and storyteller credits were updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not rename player.");
    } finally {
      setSavingPlayerName(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    const introTimeout = window.setTimeout(() => setIntroVisible(false), 1100);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(introTimeout);
    };
  }, []);

  useEffect(() => {
    const syncView = () => setView(viewFromLocation());
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view, playerScope, playerFilter, characterFilter]);

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
    type PlayerAccumulator = {
      games: number;
      wins: number;
      decided: number;
      good: number;
      evil: number;
      roles: Map<string, { count: number; type: CharacterType | null }>;
      recent: Appearance[];
    };
    const emptyPlayerAccumulator = (): PlayerAccumulator => ({
      games: 0,
      wins: 0,
      decided: 0,
      good: 0,
      evil: 0,
      roles: new Map(),
      recent: [],
    });
    const playerMap = new Map<string, PlayerAccumulator>();
    players.forEach((player) => {
      playerMap.set(player.name, emptyPlayerAccumulator());
    });
    appearances.forEach((appearance) => {
      if (!appearance.player) return;
      const game = gamesById.get(appearance.gameId);
      const current = playerMap.get(appearance.player) ?? emptyPlayerAccumulator();
      current.games += 1;
      current.good += appearance.alignment === "good" ? 1 : 0;
      current.evil += appearance.alignment === "evil" ? 1 : 0;
      if (appearance.character) {
        const role = current.roles.get(appearance.character) ?? {
          count: 0,
          type: appearance.characterType ?? null,
        };
        role.count += 1;
        role.type = role.type ?? appearance.characterType ?? null;
        current.roles.set(appearance.character, role);
      }
      current.recent.push(appearance);
      if (appearance.personalResult) {
        current.decided += 1;
        current.wins += appearance.personalResult === "win" ? 1 : 0;
      } else if (game?.winner && appearance.alignment) {
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
      if (appearance.personalResult) {
        current.decided += 1;
        current.wins += appearance.personalResult === "win" ? 1 : 0;
      } else if (game?.winner && appearance.alignment) {
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
        .map(([name, data]) => ({
          name,
          ...data,
          roles: [...data.roles]
            .map(([role, roleData]) => ({ role, ...roleData }))
            .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role)),
          recent: data.recent
            .slice()
            .sort((a, b) => {
              const gameA = gamesById.get(a.gameId);
              const gameB = gamesById.get(b.gameId);
              return (gameB?.playedAt ?? "").localeCompare(gameA?.playedAt ?? "")
                || (gameB?.gameNumber ?? 0) - (gameA?.gameNumber ?? 0);
            }),
        }))
        .sort((a, b) => b.games - a.games),
      characterMap,
    };
  }, [games, appearances, players]);

  const overviewNights = useMemo(
    () =>
      stats.dates
        .slice()
        .reverse()
        .map((date) => ({
          date,
          games: games
            .filter((game) => game.playedAt === date)
            .slice()
            .sort((a, b) => a.gameNumber - b.gameNumber),
        })),
    [games, stats.dates]
  );

  const playerAnalytics = useMemo(() => {
    const gamesById = new Map(games.map((game) => [game.id, game]));
    const activeNightDates = new Set(stats.dates.slice(0, 3));
    const categoryMinimums: Record<CharacterType, number> = {
      townsfolk: 3,
      outsider: 2,
      minion: 2,
      demon: 2,
    };

    const analytics = stats.players.map((player) => {
      const lastTen = player.recent.slice(0, 10);
      const latestGame = gamesById.get(lastTen[0]?.gameId ?? -1);
      const isCurrent = Boolean(latestGame && activeNightDates.has(latestGame.playedAt));
      const resultFor = (appearance: Appearance) =>
        appearanceResult(appearance, gamesById.get(appearance.gameId));
      const makeRecord = (source: Appearance[]) => {
        let wins = 0;
        let losses = 0;
        source.forEach((appearance) => {
          const result = resultFor(appearance);
          wins += result === "win" ? 1 : 0;
          losses += result === "loss" ? 1 : 0;
        });
        return { wins, losses, decided: wins + losses };
      };

      const categoryRecords = Object.fromEntries(
        (Object.keys(CHARACTER_TYPE_LABELS) as CharacterType[]).map((type) => [
          type,
          makeRecord(lastTen.filter((appearance) => appearance.characterType === type)),
        ])
      ) as Record<CharacterType, { wins: number; losses: number; decided: number }>;

      const alignmentRecords = {
        good: makeRecord(lastTen.filter((appearance) => appearance.alignment === "good")),
        evil: makeRecord(lastTen.filter((appearance) => appearance.alignment === "evil")),
      };

      let currentStreak = 0;
      for (const appearance of lastTen) {
        if (resultFor(appearance) !== "win") break;
        currentStreak += 1;
      }

      const qualifiedCategory = (Object.keys(categoryRecords) as CharacterType[])
        .map((type) => ({ type, ...categoryRecords[type] }))
        .filter(({ type, wins, losses, decided }) =>
          isCurrent
          && decided >= categoryMinimums[type]
          && wins >= 2
          && wins > losses
        )
        .sort((a, b) =>
          (b.wins / b.decided) - (a.wins / a.decided)
          || b.wins - a.wins
          || b.decided - a.decided
        )[0];

      const overallRecent = makeRecord(lastTen);
      let form: PlayerForm;
      if (qualifiedCategory) {
        form = {
          label: "Last 10 appearances",
          summary: `${qualifiedCategory.wins}–${qualifiedCategory.losses} as ${CHARACTER_TYPE_LABELS[qualifiedCategory.type]}`,
          icon: qualifiedCategory.type === "demon" || qualifiedCategory.type === "minion" ? "◆" : "✦",
          wins: qualifiedCategory.wins,
          losses: qualifiedCategory.losses,
          score: (qualifiedCategory.wins / qualifiedCategory.decided) * 100 + qualifiedCategory.wins,
        };
      } else if (isCurrent && currentStreak >= 3) {
        form = {
          label: "Hot hand",
          summary: `${currentStreak} straight wins`,
          icon: "↗",
          wins: currentStreak,
          losses: 0,
          score: 100 + currentStreak,
        };
      } else if (overallRecent.decided) {
        form = {
          label: "Last 10 appearances",
          summary: `${overallRecent.wins}W–${overallRecent.losses}L overall`,
          icon: "◈",
          wins: overallRecent.wins,
          losses: overallRecent.losses,
          score: (overallRecent.wins / overallRecent.decided) * 100,
        };
      } else {
        form = {
          label: "Recent form",
          summary: player.games ? "Results not recorded" : "No lineup data yet",
          icon: "○",
          wins: 0,
          losses: 0,
          score: -1,
        };
      }

      const lifetimeCategoryRecords = Object.fromEntries(
        (Object.keys(CHARACTER_TYPE_LABELS) as CharacterType[]).map((type) => [
          type,
          makeRecord(player.recent.filter((appearance) => appearance.characterType === type)),
        ])
      ) as Record<CharacterType, { wins: number; losses: number; decided: number }>;
      const lifetimeGood = makeRecord(player.recent.filter((appearance) => appearance.alignment === "good"));
      const lifetimeEvil = makeRecord(player.recent.filter((appearance) => appearance.alignment === "evil"));
      const distinctCharacters = new Set(
        player.recent.map((appearance) => appearance.character).filter(Boolean)
      ).size;
      const winningScripts = new Set(
        player.recent
          .filter((appearance) => resultFor(appearance) === "win")
          .map((appearance) => gamesById.get(appearance.gameId)?.script)
          .filter(Boolean)
      ).size;
      const overrideWins = player.recent.filter((appearance) => {
        const game = gamesById.get(appearance.gameId);
        return appearance.personalResult === "win"
          && Boolean(game?.winner && appearance.alignment && game.winner !== appearance.alignment);
      }).length;
      const chronological = player.recent.slice().reverse();
      let run = 0;
      let longestStreak = 0;
      chronological.forEach((appearance) => {
        if (resultFor(appearance) === "win") {
          run += 1;
          longestStreak = Math.max(longestStreak, run);
        } else {
          run = 0;
        }
      });
      const storyGames = games.filter((game) =>
        game.storytellers.some((storyteller) => storyteller.toLowerCase() === player.name.toLowerCase())
      );

      const badgeCandidates: Array<PlayerBadge & { earned: boolean }> = [
        { id: "demon-lord", label: "Demon Lord", icon: "♛", tone: "evil", description: "Won at least 2 of 3+ games as the Demon.", earned: lifetimeCategoryRecords.demon.decided >= 3 && lifetimeCategoryRecords.demon.wins >= 2 && lifetimeCategoryRecords.demon.wins > lifetimeCategoryRecords.demon.losses },
        { id: "master-minion", label: "Master Minion", icon: "◆", tone: "evil", description: "Won at least 2 of 3+ games as a Minion.", earned: lifetimeCategoryRecords.minion.decided >= 3 && lifetimeCategoryRecords.minion.wins >= 2 && lifetimeCategoryRecords.minion.wins > lifetimeCategoryRecords.minion.losses },
        { id: "townsfolk-stalwart", label: "Townsfolk Stalwart", icon: "✦", tone: "good", description: "Won at least 3 of 5+ games as Townsfolk.", earned: lifetimeCategoryRecords.townsfolk.decided >= 5 && lifetimeCategoryRecords.townsfolk.wins >= 3 },
        { id: "outsider-savant", label: "Outsider Savant", icon: "◇", tone: "good", description: "Won at least 2 of 3+ games as an Outsider.", earned: lifetimeCategoryRecords.outsider.decided >= 3 && lifetimeCategoryRecords.outsider.wins >= 2 },
        { id: "champion-good", label: "Champion of Good", icon: "☼", tone: "gold", description: "Won at least 4 of 6+ games aligned with Good.", earned: lifetimeGood.decided >= 6 && lifetimeGood.wins >= 4 },
        { id: "agent-evil", label: "Agent of Evil", icon: "●", tone: "evil", description: "Won at least 3 of 5+ games aligned with Evil.", earned: lifetimeEvil.decided >= 5 && lifetimeEvil.wins >= 3 },
        { id: "double-agent", label: "Double Agent", icon: "⇄", tone: "violet", description: "Won at least twice with both Good and Evil.", earned: lifetimeGood.wins >= 2 && lifetimeEvil.wins >= 2 },
        { id: "four-faces", label: "Four Faces", icon: "◈", tone: "violet", description: "Played every character category.", earned: (Object.keys(lifetimeCategoryRecords) as CharacterType[]).every((type) => lifetimeCategoryRecords[type].decided > 0) },
        { id: "grimoire-scholar", label: "Grimoire Scholar", icon: "✣", tone: "gold", description: "Played at least 8 distinct characters.", earned: distinctCharacters >= 8 },
        { id: "scriptwalker", label: "Scriptwalker", icon: "⌁", tone: "gold", description: "Won games on at least 4 different scripts.", earned: winningScripts >= 4 },
        { id: "class-traitor", label: "Class Traitor", icon: "↯", tone: "violet", description: "Won at least twice through a personal-result override.", earned: overrideWins >= 2 },
        { id: "unbroken", label: "Unbroken", icon: "∞", tone: "gold", description: "Recorded a lifetime streak of at least 5 wins.", earned: longestStreak >= 5 },
        { id: "iron-veteran", label: "Iron Veteran", icon: "20", tone: "gold", description: "Logged at least 20 appearances.", earned: player.games >= 20 },
        { id: "elder-ravenswood", label: "Elder of Ravenswood", icon: "40", tone: "gold", description: "Logged at least 40 appearances.", earned: player.games >= 40 },
        { id: "master-storyteller", label: "Master Storyteller", icon: "✒", tone: "violet", description: "Told at least 10 logged games.", earned: storyGames.length >= 10 },
        { id: "co-conspirator", label: "Co-Conspirator", icon: "Ⅱ", tone: "violet", description: "Co-told at least 5 logged games.", earned: storyGames.filter((game) => game.storytellers.length > 1).length >= 5 },
      ];
      const badges = player.games >= 6
        ? badgeCandidates
          .filter(({ earned }) => earned)
          .map(({ id, label, icon, description, tone }) => ({ id, label, icon, description, tone }))
        : [];

      return {
        name: player.name,
        form,
        badges,
        categoryRecords,
        alignmentRecords,
        currentStreak: isCurrent ? currentStreak : 0,
        recentActive: isCurrent,
        recentOverrideWins: lastTen.filter((appearance) => {
          const game = gamesById.get(appearance.gameId);
          return appearance.personalResult === "win"
            && Boolean(game?.winner && appearance.alignment && game.winner !== appearance.alignment);
        }).length,
        recentCategoriesWon: (Object.keys(categoryRecords) as CharacterType[])
          .filter((type) => categoryRecords[type].wins > 0).length,
        badgeProgress: player.games < 6
          ? `${player.games}/6 appearances · lifetime distinctions unlock at 6`
          : "Keep building your record to unlock the next distinction",
      };
    });

    const insights: PlayerInsight[] = [];
    const addLeader = (
      id: string,
      title: string,
      icon: string,
      tone: PlayerInsight["tone"],
      select: (entry: (typeof analytics)[number]) => { wins: number; losses: number; decided: number },
      minimum: number
    ) => {
      const leader = analytics
        .map((entry) => ({ entry, record: select(entry) }))
        .filter(({ entry, record }) => entry.recentActive && record.decided >= minimum && record.wins > record.losses)
        .sort((a, b) =>
          (b.record.wins / b.record.decided) - (a.record.wins / a.record.decided)
          || b.record.wins - a.record.wins
          || b.record.decided - a.record.decided
        )[0];
      if (!leader) return;
      insights.push({
        id,
        title,
        player: leader.entry.name,
        record: `${leader.record.wins}–${leader.record.losses}`,
        detail: "last 10 appearances",
        icon,
        tone,
        score: (leader.record.wins / leader.record.decided) * 100 + leader.record.wins,
      });
    };

    addLeader("townsfolk-ace", "Townsfolk Ace", "✦", "good", (entry) => entry.categoryRecords.townsfolk, 3);
    addLeader("minion-menace", "Minion Menace", "◆", "evil", (entry) => entry.categoryRecords.minion, 2);
    addLeader("demon-ascendant", "Demon Ascendant", "♛", "evil", (entry) => entry.categoryRecords.demon, 2);
    addLeader("outsider-oracle", "Outsider Oracle", "◇", "good", (entry) => entry.categoryRecords.outsider, 2);
    addLeader("good-form", "Good Form", "☼", "gold", (entry) => entry.alignmentRecords.good, 4);
    addLeader("evil-form", "Evil Form", "●", "evil", (entry) => entry.alignmentRecords.evil, 3);

    const hotHand = analytics
      .filter((entry) => entry.currentStreak >= 3)
      .sort((a, b) => b.currentStreak - a.currentStreak)[0];
    if (hotHand) {
      insights.push({
        id: "hot-hand",
        title: "Hot Hand",
        player: hotHand.name,
        record: `${hotHand.currentStreak} straight`,
        detail: "active win streak",
        icon: "↗",
        tone: "gold",
        score: 110 + hotHand.currentStreak,
      });
    }
    const againstScript = analytics
      .filter((entry) => entry.recentActive && entry.recentOverrideWins > 0)
      .sort((a, b) => b.recentOverrideWins - a.recentOverrideWins)[0];
    if (againstScript) {
      insights.push({
        id: "against-script",
        title: "Against the Script",
        player: againstScript.name,
        record: `${againstScript.recentOverrideWins} override win${againstScript.recentOverrideWins === 1 ? "" : "s"}`,
        detail: "last 10 appearances",
        icon: "↯",
        tone: "violet",
        score: 105 + againstScript.recentOverrideWins,
      });
    }
    const widestRange = analytics
      .filter((entry) => entry.recentActive && entry.recentCategoriesWon >= 3)
      .sort((a, b) => b.recentCategoriesWon - a.recentCategoriesWon)[0];
    if (widestRange) {
      insights.push({
        id: "widest-range",
        title: "Widest Range",
        player: widestRange.name,
        record: `${widestRange.recentCategoriesWon} categories`,
        detail: "won across the grimoire",
        icon: "◈",
        tone: "violet",
        score: 100 + widestRange.recentCategoriesWon,
      });
    }

    return {
      byName: new Map(analytics.map((entry) => [entry.name, entry])),
      insights: insights
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
        .slice(0, 4),
    };
  }, [games, stats.dates, stats.players]);

  const characterByName = useMemo(
    () => new Map(characters.map((character) => [character.name.toLowerCase(), character])),
    [characters]
  );

  const appearancesByGame = useMemo(() => {
    const grouped = new Map<number, Appearance[]>();
    appearances.forEach((appearance) => {
      grouped.set(appearance.gameId, [
        ...(grouped.get(appearance.gameId) ?? []),
        appearance,
      ]);
    });
    return grouped;
  }, [appearances]);

  const visiblePlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    const gamesById = new Map(games.map((game) => [game.id, game]));
    return stats.players
      .map((player) => {
        if (playerScope === "all") return player;
        const scopedAppearances = player.recent.filter((appearance) =>
          playerScope === "good" || playerScope === "evil"
            ? appearance.alignment === playerScope
            : appearance.characterType === playerScope
        );
        const roleMap = new Map<string, { count: number; type: CharacterType | null }>();
        let wins = 0;
        let decided = 0;
        scopedAppearances.forEach((appearance) => {
          if (appearance.character) {
            const role = roleMap.get(appearance.character) ?? {
              count: 0,
              type: appearance.characterType ?? null,
            };
            role.count += 1;
            roleMap.set(appearance.character, role);
          }
          const game = gamesById.get(appearance.gameId);
          if (appearance.personalResult) {
            decided += 1;
            wins += appearance.personalResult === "win" ? 1 : 0;
          } else if (game?.winner && appearance.alignment) {
            decided += 1;
            wins += game.winner === appearance.alignment ? 1 : 0;
          }
        });
        return {
          ...player,
          games: scopedAppearances.length,
          wins,
          decided,
          good: scopedAppearances.filter((appearance) => appearance.alignment === "good").length,
          evil: scopedAppearances.filter((appearance) => appearance.alignment === "evil").length,
          recent: scopedAppearances,
          roles: [...roleMap]
            .map(([role, roleData]) => ({ role, ...roleData }))
            .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role)),
        };
      })
      .filter((player) => {
        if (playerScope !== "all" && player.games === 0) return false;
        if (playerFilter === "active" && player.games === 0) return false;
        if (playerFilter === "unplayed" && player.games > 0) return false;
        return !query
          || player.name.toLowerCase().includes(query)
          || player.roles.some(({ role }) => role.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (playerSort === "name") return a.name.localeCompare(b.name);
        if (playerSort === "win-rate") {
          const rateA = a.decided ? a.wins / a.decided : -1;
          const rateB = b.decided ? b.wins / b.decided : -1;
          return rateB - rateA || b.games - a.games || a.name.localeCompare(b.name);
        }
        if (playerSort === "wins") return b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name);
        if (playerSort === "roles") return b.roles.length - a.roles.length || b.games - a.games || a.name.localeCompare(b.name);
        if (playerSort === "recent-form") {
          return (playerAnalytics.byName.get(b.name)?.form.score ?? -1)
            - (playerAnalytics.byName.get(a.name)?.form.score ?? -1)
            || b.games - a.games
            || a.name.localeCompare(b.name);
        }
        return b.games - a.games || b.wins - a.wins || a.name.localeCompare(b.name);
      });
  }, [stats.players, games, playerAnalytics.byName, playerFilter, playerScope, playerSearch, playerSort]);

  const activePlayerCount = stats.players.filter((player) => player.games > 0).length;
  const lineupCount = appearances.filter((appearance) => appearance.player).length;

  const filteredGames = games.filter((game) => {
    const matchesScript = scriptFilter === "All scripts" || game.script === scriptFilter;
    const lineup = appearancesByGame.get(game.id) ?? [];
    const haystack = `${game.script} ${game.notes.join(" ")} ${game.storytellers.join(" ")} ${lineup
      .map((appearance) => `${appearance.player} ${appearance.character} ${appearance.characterType ?? ""}`)
      .join(" ")}`.toLowerCase();
    return matchesScript && haystack.includes(search.toLowerCase());
  });

  const catalogCharacters = characters
    .filter((character) => characterFilter === "all" || character.characterType === characterFilter)
    .filter((character) => character.name.toLowerCase().includes(characterSearch.trim().toLowerCase()))
    .map((character) => ({
      ...character,
      ...(stats.characterMap.get(character.name) ?? { games: 0, wins: 0, decided: 0 }),
    }))
    .sort((a, b) => {
      if (characterSort === "name") return a.name.localeCompare(b.name);
      if (characterSort === "win-rate") {
        const rateA = a.decided ? a.wins / a.decided : -1;
        const rateB = b.decided ? b.wins / b.decided : -1;
        return rateB - rateA || b.games - a.games || a.name.localeCompare(b.name);
      }
      return b.games - a.games || a.name.localeCompare(b.name);
    });

  const openSessionModal = () => {
    setEditingGameId(null);
    setModalOpen(true);
  };
  const openGameEditor = (gameId: number) => {
    setEditingGameId(gameId);
    setModalOpen(true);
  };
  const closeSessionModal = () => {
    setModalOpen(false);
    setEditingGameId(null);
  };
  const toggleGame = (gameId: number) => {
    setExpandedGames((current) => {
      const next = new Set(current);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };
  const navigateToView = (nextView: DashboardView) => {
    setView(nextView);
    window.history.pushState({ view: nextView }, "", viewHref(nextView));
  };

  return (
    <main className="app-shell">
      <aside className="side-rail">
        <a
          className="brand"
          href={viewHref("overview")}
          onClick={(event) => {
            event.preventDefault();
            navigateToView("overview");
          }}
          aria-label="Midnight Ledger home"
        >
          <span className="brand-mark"><span>12</span></span>
          <span>
            <strong>Midnight Ledger</strong>
            <small>Group archive</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          {(["overview", "players", "characters", "games"] as const).map((item) => (
            <a
              key={item}
              href={viewHref(item)}
              className={view === item ? "active" : ""}
              aria-current={view === item ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigateToView(item);
              }}
            >
              {item}
            </a>
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

      <div className={`content-shell${entered && introVisible ? " initial-entry" : ""}`}>
        {introVisible && (
          <div
            className="page-turn open"
            aria-hidden="true"
            onAnimationEnd={() => setIntroVisible(false)}
          >
            <span className="opening-seal">
              <span className="brand-mark"><span>12</span></span>
              <small>Opening the ledger</small>
            </span>
          </div>
        )}
        {message && (
          <div className="toast" role="status">
            {message}<button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        <section className={`view-heading${view === "overview" ? "" : " compact"}`}>
          <div>
            <p className="eyebrow">{view === "overview" ? "Collective record" : `Archive / ${view}`}</p>
            <h1>
              {view === "overview"
                ? "Overview"
                : view === "players"
                  ? "Players"
                  : view === "characters"
                    ? "Characters"
                    : "Games"}
            </h1>
            <p className="subtitle">
              {view === "overview" && "Collective wins, scripts, trends, and recent games."}
              {view === "players" && "Performance across alignments and appearances, calculated from logged lineups."}
              {view === "characters" && `${characters.length} official and custom characters, ready to log.`}
              {view === "games" && `${games.length} games, preserved from newest to oldest.`}
            </p>
          </div>
          {(view === "overview" || view === "games") && (
            <button className="primary-action header-action" onClick={openSessionModal} aria-label="Start session">
              <span aria-hidden="true">+</span><span className="action-label">Game</span>
            </button>
          )}
        </section>

        {view === "overview" && (
          <>
            <section className="metric-grid" aria-label="Summary statistics">
              <article className="metric-card ledger-summary-card">
                <div className="ledger-summary-copy">
                  <span className="metric-kicker">The chronicle</span>
                  <div className="ledger-total">
                    <strong>{String(games.length).padStart(2, "0")}</strong>
                    <span>games · {stats.dates.length} nights</span>
                  </div>
                  <div className="ledger-balance" aria-label={`${stats.good} Good wins and ${stats.evil} Evil wins`}>
                    <span className="good"><i />{stats.good} Good</span>
                    <span className="evil"><i />{stats.evil} Evil</span>
                    {stats.unknown > 0 && <span className="unknown"><i />{stats.unknown} unknown</span>}
                  </div>
                </div>
                <div className="night-outcomes" aria-label="Results by game night">
                  {overviewNights.map((night) => (
                    <div className="night-column" key={night.date}>
                      <div className="night-stack">
                        {night.games.map((game) => (
                          <span
                            key={game.id}
                            className={game.winner ?? "unknown"}
                            title={`${shortDate(night.date)}, game ${game.gameNumber}: ${game.winner ?? "result unknown"}`}
                          />
                        ))}
                      </div>
                      <small>{shortDate(night.date)}</small>
                    </div>
                  ))}
                </div>
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
                  <a
                    href={viewHref("games")}
                    onClick={(event) => {
                      event.preventDefault();
                      navigateToView("games");
                    }}
                  >
                    View games →
                  </a>
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
                      setExpandedGames((current) => new Set(current).add(game.id));
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
              <div className="player-analytics">
                <div className="player-summary" aria-label="Player statistics summary">
                  <div><strong>{stats.players.length}</strong><span>in the roster</span></div>
                  <div><strong>{activePlayerCount}</strong><span>with lineups</span></div>
                  <div><strong>{lineupCount}</strong><span>seats logged</span></div>
                </div>

                {playerAnalytics.insights.length > 0 && (
                  <section className="player-spotlights" aria-labelledby="player-spotlights-title">
                    <div className="spotlight-heading">
                      <p className="eyebrow">Last 10 appearances</p>
                      <h2 id="player-spotlights-title">Current form</h2>
                    </div>
                    <div className="spotlight-grid">
                      {playerAnalytics.insights.map((insight) => (
                        <article className={`spotlight-card ${insight.tone}`} key={insight.id}>
                          <span className="spotlight-icon" aria-hidden="true">{insight.icon}</span>
                          <span className="spotlight-copy">
                            <small>{insight.title}</small>
                            <strong>{insight.player}</strong>
                          </span>
                          <span className="spotlight-record">
                            <strong>{insight.record}</strong>
                            <small>{insight.detail}</small>
                          </span>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                <div className="player-controls">
                  <label className="player-search">
                    <span aria-hidden="true">⌕</span>
                    <input
                      value={playerSearch}
                      onChange={(event) => setPlayerSearch(event.target.value)}
                      placeholder="Find player or role"
                      aria-label="Search players and roles"
                    />
                  </label>
                  <label className="player-sort">
                    <span>Sort</span>
                    <select
                      value={playerSort}
                      onChange={(event) => setPlayerSort(event.target.value as PlayerSort)}
                    >
                      <option value="appearances">Most appearances</option>
                      <option value="win-rate">Highest win rate</option>
                      <option value="wins">Most wins</option>
                      <option value="recent-form">Best recent form</option>
                      <option value="roles">Most roles played</option>
                      <option value="name">Name A–Z</option>
                    </select>
                  </label>
                  <label className="player-sort player-scope">
                    <span>Scope</span>
                    <select
                      value={playerScope}
                      onChange={(event) => setPlayerScope(event.target.value as PlayerScope)}
                    >
                      <option value="all">Overall</option>
                      <option value="good">Good alignment</option>
                      <option value="evil">Evil alignment</option>
                      <option value="townsfolk">Townsfolk</option>
                      <option value="outsider">Outsider</option>
                      <option value="minion">Minion</option>
                      <option value="demon">Demon</option>
                    </select>
                  </label>
                  <div className="player-filter" role="group" aria-label="Filter player activity">
                    {(["all", "active", "unplayed"] as const).map((filter) => (
                      <button
                        key={filter}
                        className={playerFilter === filter ? "active" : ""}
                        onClick={() => setPlayerFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="player-board">
                  <div className="player-board-head" aria-hidden="true">
                    <span>Rank / player</span><span>Distinctions</span><span>Record</span><span>Win rate</span>
                  </div>
                  {visiblePlayers.map((player, index) => {
                    const isExpanded = expandedPlayer === player.name;
                    const rate = player.decided ? Math.round((player.wins / player.decided) * 100) : null;
                    const playerView = playerAnalytics.byName.get(player.name);
                    const playerRecord = players.find(
                      (entry) => entry.name.toLowerCase() === player.name.toLowerCase()
                    );
                    return (
                      <article className={`player-row${isExpanded ? " expanded" : ""}`} key={player.name}>
                        <button
                          className="player-row-main"
                          onClick={() => setExpandedPlayer(isExpanded ? null : player.name)}
                          aria-expanded={isExpanded}
                        >
                          <span className="player-rank">{String(index + 1).padStart(2, "0")}</span>
                          <span className="player-avatar">{playerInitials(player.name)}</span>
                          <span className="player-identity">
                            <strong>{player.name}</strong>
                            <small>
                              {player.games} appearance{player.games === 1 ? "" : "s"}
                              {playerScope === "all" && playerView
                                ? ` · ${playerView.form.summary}`
                                : playerScope !== "all" && player.decided
                                  ? ` · ${player.wins}W–${player.decided - player.wins}L in scope`
                                  : ""}
                            </small>
                          </span>
                          <span className="player-roles">
                            {playerView?.badges.slice(0, 3).map((badge) => (
                              <span
                                className={`badge-seal ${badge.tone}`}
                                key={badge.id}
                                title={`${badge.label}: ${badge.description}`}
                                aria-label={badge.label}
                              >
                                {badge.icon}
                              </span>
                            ))}
                            {playerView?.badges.length === 0 && (
                              <small className="distinction-progress">
                                {player.games < 6 ? `${player.games}/6 to unlock` : "Building a record"}
                              </small>
                            )}
                          </span>
                          <span className="player-record"><strong>{player.wins}W</strong><small>{player.decided - player.wins}L</small></span>
                          <span className="player-rate">
                            <strong>{rate === null ? "—" : `${rate}%`}</strong>
                            <i><span style={{ width: `${rate ?? 0}%` }} /></i>
                          </span>
                          <span className="player-chevron" aria-hidden="true">⌄</span>
                        </button>

                        {isExpanded && (
                          <div className="player-detail">
                            {playerRecord && (
                              <div className="player-name-editor">
                                {editingPlayerId === playerRecord.id ? (
                                  <form onSubmit={(event) => renamePlayer(event, playerRecord)}>
                                    <label>
                                      <span>Player name</span>
                                      <input
                                        value={playerNameDraft}
                                        onChange={(event) => setPlayerNameDraft(event.target.value)}
                                        autoFocus
                                        aria-label={`Edit ${player.name}'s name`}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPlayerId(null);
                                        setPlayerNameDraft("");
                                      }}
                                      disabled={savingPlayerName}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="save-player-name"
                                      disabled={savingPlayerName || !playerNameDraft.trim()}
                                    >
                                      {savingPlayerName ? "Saving…" : "Save name"}
                                    </button>
                                  </form>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPlayerId(playerRecord.id);
                                      setPlayerNameDraft(playerRecord.name);
                                    }}
                                  >
                                    Edit player name
                                  </button>
                                )}
                              </div>
                            )}
                            <div className="player-detail-top">
                              <section className="player-form-card">
                                <span className="detail-label">{playerView?.form.label ?? "Recent form"}</span>
                                <div>
                                  <span className="form-mark" aria-hidden="true">{playerView?.form.icon ?? "○"}</span>
                                  <span>
                                    <strong>{playerView?.form.summary ?? "No result data yet"}</strong>
                                    <small>Rolling form uses this player’s latest 10 appearances and expires after three inactive game nights.</small>
                                  </span>
                                </div>
                              </section>
                              <section className="player-badge-cabinet">
                                <span className="detail-label">Lifetime distinctions</span>
                                {playerView?.badges.length ? (
                                  <div>
                                    {playerView.badges.map((badge) => (
                                      <span className={`player-badge ${badge.tone}`} key={badge.id}>
                                        <i aria-hidden="true">{badge.icon}</i>
                                        <span><strong>{badge.label}</strong><small>{badge.description}</small></span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="badge-empty">
                                    <span aria-hidden="true">◇</span>
                                    {playerView?.badgeProgress ?? "Lifetime distinctions unlock after 6 appearances"}
                                  </p>
                                )}
                              </section>
                            </div>
                            <div className="player-detail-stat">
                              <span>Alignment history</span>
                              <strong><i className="good-dot" />{player.good} good</strong>
                              <strong><i className="evil-dot" />{player.evil} evil</strong>
                            </div>
                            <div className="player-role-history">
                              <span>Roles played</span>
                              <div>
                                {player.roles.length ? player.roles.map(({ role, count, type }) => {
                                  const character = characterByName.get(role.toLowerCase());
                                  return (
                                    <span className="role-chip" key={role}>
                                      <span className={`player-role-icon ${type ?? ""}`}>
                                        {character?.imageUrl
                                          ? <img src={character.imageUrl} alt="" loading="lazy" />
                                          : role.slice(0, 2).toUpperCase()}
                                      </span>
                                      <b>{role}</b>{count > 1 && <small>×{count}</small>}
                                    </span>
                                  );
                                }) : <small className="no-player-data">No character data recorded yet.</small>}
                              </div>
                            </div>
                            <div className="player-recent">
                              <span>Recent games</span>
                              <div>
                                {player.recent.length ? player.recent.slice(0, 3).map((appearance) => {
                                  const game = games.find((entry) => entry.id === appearance.gameId);
                                  return (
                                    <span key={appearance.id}>
                                      <b>{appearance.character || "Unknown role"}</b>
                                      <small>
                                        {game ? `${shortDate(game.playedAt)} · ${displayScript(game.script)}` : "Game details unavailable"}
                                        {appearance.personalResult ? ` · ${appearance.personalResult === "win" ? "counted as win" : "counted as loss"}` : ""}
                                      </small>
                                    </span>
                                  );
                                }) : <small className="no-player-data">No appearances logged yet.</small>}
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                  {visiblePlayers.length === 0 && (
                    <div className="player-no-results">No players match these filters.</div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState type="players" onAdd={openSessionModal} />
            )}
          </section>
        )}

        {view === "characters" && (
          <section className="data-view">
            <div className="character-toolbar">
              <label>
                <span aria-hidden="true">⌕</span>
                <input
                  value={characterSearch}
                  onChange={(event) => setCharacterSearch(event.target.value)}
                  placeholder="Find a character"
                  aria-label="Search characters"
                />
              </label>
              <select
                value={characterSort}
                onChange={(event) => setCharacterSort(event.target.value as CharacterSort)}
                aria-label="Sort characters"
              >
                <option value="usage">Most played</option>
                <option value="name">Name A–Z</option>
                <option value="win-rate">Win rate</option>
              </select>
            </div>
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
                  <div className={`role-seal ${character.characterType}`} data-fallback={character.name.slice(0, 2).toUpperCase()}>
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
              <span className="filter-count">
                <strong>{filteredGames.length}</strong>
                result{filteredGames.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="game-ledger">
              {filteredGames.map((game) => {
                const lineup = appearancesByGame.get(game.id) ?? [];
                const isExpanded = expandedGames.has(game.id);
                return (
                  <article className={`game-entry${isExpanded ? " expanded" : ""}`} key={game.id}>
                    <div className="date-block">
                      <strong>{new Date(`${game.playedAt}T12:00:00`).getDate()}</strong>
                      <span>{shortDate(game.playedAt).split(" ")[0]}</span>
                      <small>{game.playedAt.slice(0, 4)}</small>
                    </div>
                    <button
                      className="game-summary"
                      onClick={() => toggleGame(game.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`game-detail-${game.id}`}
                    >
                      <span className="game-summary-top">
                        <span className={`verdict-pill ${game.winner ?? "unknown"}`}>
                          {game.winner === "good"
                            ? "✦ Good prevailed"
                            : game.winner === "evil"
                              ? "● Evil prevailed"
                              : "Result unknown"}
                        </span>
                        <small>Game {game.gameNumber}</small>
                      </span>
                      <span className="game-title">{displayScript(game.script)}</span>
                      {game.notes[0] && <span className="game-note-preview">{game.notes[0]}</span>}
                      <span className="game-summary-bottom">
                        <span>
                          {lineup.length
                            ? `${lineup.length} seat${lineup.length === 1 ? "" : "s"} logged`
                            : "Lineup not recorded"}
                          {game.storytellers.length > 0 ? ` · Told by ${game.storytellers.join(" & ")}` : ""}
                        </span>
                        <strong>{isExpanded ? "Hide lineup" : "View lineup"} <i aria-hidden="true">⌄</i></strong>
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="game-detail" id={`game-detail-${game.id}`}>
                        <div className="game-detail-toolbar">
                          <span>Game {game.gameNumber} details</span>
                          <button
                            type="button"
                            className="edit-game-button"
                            onClick={() => openGameEditor(game.id)}
                          >
                            Edit game
                          </button>
                        </div>
                        {game.notes.length > 0 && (
                          <div className="game-story">
                            <span>Game notes</span>
                            <ul>{game.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
                          </div>
                        )}
                        <div className="game-lineup-section">
                          <div className="game-detail-heading">
                            <span>Who was what</span>
                            <small>{lineup.length ? `${lineup.length} recorded` : "No lineup yet"}</small>
                          </div>
                          {lineup.length ? (
                            <div className="game-lineup">
                              {lineup.map((appearance) => {
                                const character = characterByName.get(appearance.character.toLowerCase());
                                return (
                                  <div
                                    className={`game-seat ${appearance.characterType ?? "unknown"}`}
                                    key={appearance.id}
                                  >
                                    <span className="game-seat-icon">
                                      {character?.imageUrl
                                        ? <img src={character.imageUrl} alt="" loading="lazy" />
                                        : (appearance.character || "?").slice(0, 2).toUpperCase()}
                                    </span>
                                    <span className="game-seat-copy">
                                      <strong>{appearance.player || "Unknown player"}</strong>
                                      <small>
                                        {appearance.character || "Unknown role"}
                                        <em> · {appearance.characterType ?? "type unknown"}</em>
                                      </small>
                                    </span>
                                    {appearance.personalResult && (
                                      <span className="game-seat-meta">
                                        <small className={appearance.personalResult}>
                                          Counts as {appearance.personalResult}
                                        </small>
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="game-lineup-empty">
                              This game predates lineup tracking. Add remembered roles the next time you revisit it.
                            </p>
                          )}
                        </div>
                        <div className="game-detail-footer">
                          <p className="game-detail-meta">
                            {game.storytellers.length > 0
                              ? `Told by ${game.storytellers.join(" & ")}`
                              : "Storyteller not recorded"}
                            {game.durationMinutes ? ` · ${game.durationMinutes} min` : ""}
                          </p>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {modalOpen && (
          <SessionModal
            sessions={sessions}
            games={games}
            players={players}
            characters={characters}
            scripts={scriptCatalog}
            editingGame={games.find((game) => game.id === editingGameId) ?? null}
            editingAppearances={
              editingGameId ? appearancesByGame.get(editingGameId) ?? [] : []
            }
            onClose={closeSessionModal}
            onDataChange={loadGames}
            onMessage={setMessage}
          />
        )}

        {loading && (
          <div className="loading-line" role="status">
            <span className="sr-only">Loading the shared ledger</span>
          </div>
        )}
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
