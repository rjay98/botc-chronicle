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
  storyteller: text("storyteller").notNull().default(""),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
});

export const appearances = sqliteTable("appearances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id").notNull(),
  player: text("player").notNull(),
  character: text("character").notNull(),
  characterType: text("character_type", {
    enum: ["townsfolk", "outsider", "minion", "demon"],
  }).notNull().default("townsfolk"),
  alignment: text("alignment", { enum: ["good", "evil"] }).notNull(),
});
