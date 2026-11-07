# MiniScape MMO

Persistent, single-instance multiplayer RPG with a server-authoritative 600 ms tick.

## Local setup

Use Node.js 24 or newer. Run `npm ci`, then `npm run dev`, and open http://localhost:3000.
Create an account (3–20 ASCII letters/digits/underscores, case-insensitive; password 10–128 characters).
Local development stores accounts and characters in `data/miniscape.sqlite` using Node's built-in SQLite.
Keep that directory to retain progress. `npm run dev` loads an optional `.env` file.

## Production / existing Render service

Set `DATABASE_URL` to a PostgreSQL connection URL, Node version to 24, build command to `npm ci`,
and start command to `npm start`. Keep `/health` as the health check. HTTPS is required for production cookies.
`render.yaml` deliberately asks for an existing database URL: it does not provision a paid database.
Production refuses to start without PostgreSQL rather than silently saving to ephemeral disk.
Existing Render services must have their environment configured before deploying this update.
Tables are created automatically on startup. Back up the database with the provider's backup tools.
For an external database, configure TLS in the connection URL according to the provider's requirements.

## Features

- Passwords use salted scrypt hashes. Session cookies are HttpOnly, SameSite=Strict and Secure in production;
  only SHA-256 session-token hashes are stored. Sessions expire after seven days; login rotates sessions.
- Stable character IDs restore position, XP, health, combat style, inventory, equipment and pending loot.
  One connected socket per character; a second tab is rejected. A new login disconnects the previous session.
- Goblins pursue nearby players, attack on cooldown, retarget and return home when players leave their territory.
  Returning goblins cannot be damaged and heal on reaching home. Players respawn after five seconds without losing items.
- Server-validated sword/bow equipment, bread healing (+6 HP, two-second cooldown), and coin rewards.
  Equipment adds damage only to a matching combat style; unarmed attacks remain possible.
- Each goblin death awards five coins and one bread to the connected player with the most damage this encounter;
  stable character ID breaks ties. Disconnected players lose their claim. No award is issued twice.
- Inventory holds 28 non-coin items (equipped weapons still occupy a slot); coins do not occupy slots.
  Full bags send bread to a persistent 28-entry loot inbox. If both are full, bread converts to two extra coins.
- Character HP, target HP, equipment, server-confirmed style, inventory, XP, combat feedback and event log.
  Responsive layout supports pointer input on phones and desktop.
- Item requests carry bounded replay IDs; consumed loot IDs cannot be claimed twice, and food also has a cooldown.

## Durability and failure behavior

Input processing and ticks are serialized. Every successful command and every published tick commits all online
characters in one database transaction before acknowledgement/broadcast. Failed saves restore the in-memory snapshot;
the game pauses ticks until storage recovers. No default character replaces a failed load.
Disconnect requires no last-chance save: acknowledged state is already durable. NPCs/world encounters are ephemeral.
Restarting a process does not restore NPC combat, but it restores each character's committed progression.

Run **one Node process / one replica** against the database. This version does not implement distributed world ownership.
The conservative save-every-tick policy prioritizes correctness for this small world; measure database latency before
increasing player count or moving to queued writes. The tick loop does not pile up while a database operation is pending.
Authentication throttling uses the direct peer address; behind a reverse proxy it is conservative/shared. Configure
trusted proxy handling explicitly for your deployment before increasing traffic; do not blindly trust forwarded IPs.
Password recovery, email verification, trading, quests, world collision and cross-server persistence are not included.

## Files

- `server.js`: HTTP auth, cookies, Socket.IO, serialized durable game mutations, shutdown.
- `persistence/store.js`: PostgreSQL/SQLite schema, accounts, session hashing, transactional character saves.
- `game/world.js`: combat, NPC AI, XP, inventory, loot and redacted public snapshots.
- `public/`: Slovak responsive UI and Canvas client.
- `test/`: pure gameplay tests and live HTTP/Socket.IO persistence/failure tests.

## Validation

Run `npm test`. PostgreSQL integration runs when `TEST_DATABASE_URL` points at a dedicated test database.
The PostgreSQL test creates a uniquely named account and deletes it after success; never use production for testing.
CI supplies PostgreSQL and exercises the same tests. Browser smoke checks should cover registration, reload/reconnect,
two different players, rejected duplicate tabs, inventory actions, death overlay and phone-sized layout.
