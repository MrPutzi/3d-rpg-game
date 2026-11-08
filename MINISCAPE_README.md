# MiniScape MMO

A minimal multiplayer, old-school skill-based RPG with an authoritative 600 ms game tick.

## Start locally

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

Visit http://localhost:3000 and open a second tab to test multiplayer.

## Deploy to Render

Create a **Web Service** from this GitHub repository (or use the included `render.yaml` Blueprint).
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
- Render sets `PORT` automatically.
- Socket.IO uses the same origin and HTTP server as the frontend.

## Game controls

Click the ground to move, click a red goblin to attack. Choose Attack, Strength or Ranging to train that skill. HP XP is earned from damage. NPCs respawn five seconds after death.

## Structure

- `server.js` — authoritative game loop, player sessions, XP, combat, NPCs and Socket.IO
- `public/index.html` — responsive old-school interface
- `public/client.js` — HTML5 Canvas rendering and input
- `render.yaml` — Render deployment

## Important alpha limitations

Progress is held in RAM and resets when a player disconnects or the service restarts. This is a **single-instance prototype**, not a scalable persistent MMO. There is no authentication, inventory, database, world collision, enemy AI, or anti-bot protection. The current level curve is deliberately simplified rather than RuneScape's actual XP formula. Render free services may sleep when idle.

## Growth path

Separate `server.js` into `config/`, `world/`, `combat/`, `skills/`, `network/` and `persistence/` modules. Add authenticated characters and PostgreSQL persistence before offering persistent progression; later add NPC AI, inventory/equipment, world regions, collision and tests.

## World expansion (alpha)

- A 2400 × 2400 pixel world with a camera that follows the player; the canvas fills most of the desktop viewport.
- Tiered monsters: Rats (level 1), Goblins (3), Wolves (8), Skeletons (15), Orcs (24).
- Gathering nodes: Trees (Woodcutting 1), Oak Trees (15), Copper Rocks (Mining 1), Iron Rocks (15), Shrimp Spots (Fishing 1), Trout Spots (20).
- Click nodes to auto-approach; the authoritative server checks range, skill level, cooldown and 28-slot inventory capacity before granting items and XP.
- Resources respawn after seven seconds; enemies respawn after six seconds.
- Equipment determines melee/ranged combat; Attack and Strength training is selected with the combat buttons when a sword is equipped.
- This is a skill-driven design inspired by RuneScape, **not** an exact recreation of its XP tables, combat formula, gathering success rates or assets.

### Known limitations

There is still no account database, item banking, gathering tools, pathfinding around obstacles, or permanent progress. World simulation runs in a single Node process. Avoid scaling to multiple Render instances before introducing shared authoritative state.
