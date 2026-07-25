import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playedAt: text("played_at").notNull(),
  storyteller: text("storyteller").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id"),
  playedAt: text("played_at").notNull(),
  gameNumber: integer("game_number").notNull().default(1),
  script: text("script").notNull(),
  winner: text("winner", { enum: ["good", "evil"] }).notNull(),
  winningAlignment: text("winning_alignment", { enum: ["good", "evil"] }),
  storyteller: text("storyteller").notNull().default(""),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
});

export const gameStorytellers = sqliteTable("game_storytellers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id").notNull(),
  storyteller: text("storyteller").notNull(),
});

export const appearances = sqliteTable("appearances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id").notNull(),
  player: text("player").notNull(),
  character: text("character").notNull(),
  characterType: text("character_type", {
    enum: ["townsfolk", "outsider", "minion", "demon"],
  }).notNull().default("townsfolk"),
  roleType: text("role_type", {
    enum: ["townsfolk", "outsider", "minion", "demon"],
  }),
  alignment: text("alignment", { enum: ["good", "evil"] }).notNull(),
});

export const characters = sqliteTable("characters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: text("source_id").unique(),
  name: text("name").notNull(),
  characterType: text("character_type", {
    enum: ["townsfolk", "outsider", "minion", "demon"],
  }).notNull(),
  edition: text("edition").notNull().default("custom"),
  imageUrl: text("image_url").notNull(),
  isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
