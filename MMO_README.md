# Realm of Ash — multiplayer RPG foundation

A deliberately small, playable browser MMO-style RPG prototype inspired by classic skill-based adventure games. The previous Horde Survivor game is preserved unchanged in branch `archive/horde-survivor-2026-10-30`.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 in two browser windows to test multiplayer. Deploy as a Render **Web Service** (not a Static Site), using the included `render.yaml` blueprint or `npm start` as the start command.

## Controls

- WASD / arrow keys or touch arrows: move one tile.
- Click a goblin within range: attack (Melee or Ranged).
- Click an adjacent tree or rock: gather resources.
- Chat input: send a world chat message.
- Combat styles: Melee trains Attack and Strength; Ranged trains Ranged. Damage received trains Defence. Combat trains Hitpoints. Trees train Woodcutting; rocks train Mining.

## Project structure

- `mmo-server.js`: authoritative world state, movement, combat, XP, enemies, gathering, WebSocket sessions.
- `public/mmo-client.js`: Canvas rendering, controls, HUD and network messages.
- `public/index.html`: game shell and responsive interface.
- `server.js`: production entrypoint.
- `render.yaml`: Render deployment blueprint.

## Current alpha limitations

This is an **MMO foundation**, not a finished production MMO. World state, XP, inventory and characters are **in memory** and reset when the server restarts or the player disconnects. A single process handles up to 60 simultaneous connections; this is a safety cap, **not** a tested capacity guarantee. There is no authentication, pathfinding, trading, quests, database, anti-cheat hardening, persistence or multi-server sharding yet.

## Next milestones

1. Introduce SQLite/PostgreSQL repositories and authenticated characters; persist XP and inventory.
2. Extract world simulation into domain modules (movement, combat, skills, entities, inventory).
3. Add server-side target selection, NPC AI, pathfinding, equipment and loot tables.
4. Implement world regions, instancing, spatial interest management and reliable reconnects.
5. Add automated gameplay/network tests and observability before scaling.
