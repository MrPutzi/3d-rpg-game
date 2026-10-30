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
