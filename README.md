# Midnight Ledger

A collective Blood on the Clocktower tracker rebuilt from the original game
chronicle. It keeps the existing game history and adds:

- group, script, player, and character statistics;
- session-based game entry with a fixed game-night date;
- appendable player lineups with character and character-type tracking;
- a shared D1-backed archive; and
- a responsive, Clocktower-inspired interface.

## Development

This project uses the Codex Sites vinext starter.

```bash
npm install
npm run dev
```

The `DB` D1 binding stores sessions, games, roster players, and character
appearances. Migrations are included in `drizzle/`.
