# MiniScape — Oakvale Frontier

An expandable, server-authoritative browser MMO RPG **inspired by** Old School RuneScape, built with Express, Socket.IO and Canvas. It uses original content and code. It is **not** an official RuneScape product or a complete clone.

## Local setup

Requires Node.js 20+.

```bash
npm install
npm test
npm start
```

Open http://localhost:3000. The default local account store is `.data/players.json` (gitignored). To use PostgreSQL, set `DATABASE_URL` before running the server.

## Real user accounts

- Registration with unique character name (3–18 letters/numbers, underscore or dash) and password (10–128 characters).
- Passwords hashed with salted Node.js `scrypt`; session tokens are random and only hashed server-side.
- User can sign in, resume a 7-day session, and sign out.
- Server persists position, experience, skills, bank, inventory, equipment, quests, coins and Slayer progress every 20 seconds and on disconnect.
- The same account cannot remain active in two simultaneous Socket.IO sessions.
- Guest mode remains available for testing but never persists.
- For production durability configure PostgreSQL. Without `DATABASE_URL`, accounts use an ordinary local JSON file. **Render Free web service files are ephemeral**, so registrations and progress will be lost after service recreation/redeploy.

### Render.com PostgreSQL

1. Create a Render Postgres database in the **same region** as the web service (or use another trusted managed PostgreSQL provider).
2. Open the Render Web Service → Environment, set `DATABASE_URL` to the database's **Internal Database URL**.
3. Redeploy. The server creates `game_accounts` and `game_sessions` tables automatically at startup.
4. Verify `/health` and test account registration, sign-out, return login, and saved progress.
5. For a long-lived game use a **paid database or other durable managed PostgreSQL**. Render Free Postgres expires after 30 days. Do not rely on it for permanent player accounts.

The `render.yaml` blueprint keeps database provisioning manual to avoid silently creating or billing for an extra service.

## Map and world

- 3600 × 3600 connected world with eight named regions and a frontier outpost.
- Minimap and interactive full world map show player, settlements, enemies, resource nodes and training sites.
- Click or long press / right click world objects for context actions; players automatically pathfind to interactions.
- Mobile touch supports context long press.
- Server simulates movement every 100 ms, broadcasts state every 200 ms, and uses 600 ms attack-tick units.

## Combat and equipment

- 11-slot paper-doll equipment UI: head, cape, neck, weapon, body, shield, legs, gloves, boots, ring, ammunition.
- Six metal melee tiers, five weapon categories and several ranged weapons.
- Attack/Strength/Defence/Ranged XP styles, weapon speeds, level requirements, ammo consumption, and armour/attack bonuses.
- Toggle auto-retaliate; enemy AI roams randomly within bounded home territories, with controlled aggression and respawn.
- Every enemy kind has a weighted loot table including low-value and rare drops. Loot has a 15-second owner-only window, then becomes available to other players.

## Economy, quests and skill loops

- NPC shops have limited stock, bounded dynamic prices, a 45% resale rate (gold sink), and gradual restocking.
- Shops visibly show your current coins; bank, forge, tavern, general store, Adventurers Guild, Newhaven Outpost all have their own UI.
- Beginner quest chain: talk to Elder → Goblin Menace → Eastern Wilds Patrol; forest and fishing quests branch from Elder.
- 23 skills initialized with server-defined XP progress and levels. Functional starter recipes/activities exist for Cooking, Firemaking, Smithing, Crafting, Fletching, Magic (Wind Strike), Prayer, Agility, Thieving, Runecrafting, Herblore, Farming, Construction, Hunter and Slayer.
- Woodcutting, Mining and Fishing continue via world nodes; training sites are marked on world and minimap.
- These are **starter mechanics**, not complete copies of OSRS skill content, item recipes, timers, animations or progression.

## Modular structure

- `game/content.js` — buildings, enemies, resource nodes, 11-slot equipment items and shops.
- `game/progression.js` — skill list, recipes, quest definitions, region boundaries and drop tables.
- `game/rules.js` — OSRS-style XP thresholds, combat calculations, inventory operations and BFS pathfinding.
- `game/activities.js` — server-validated recipes, skill training and quest turn-in.
- `game/economy.js` — stock, price quotes, shop purchases, sales and restocking.
- `game/accounts.js` — user auth, hashed sessions, PostgreSQL/local persistence.
- `server.js` — game orchestration, WebSocket events, AI, movement and profile saving.
- `public/client.js` — Canvas world, map, minimap, equipment paper doll, UI interactions.
- `public/index.html` — responsive interface, modals, authentication forms.

## Known limitations and future development

This is still an **alpha**, not a production MMO. Local account storage and Render Free Postgres are not durable long-term options. Shared economy stocks, drops and monsters live in one process. Add DB-backed transactions/locks for player trading, multi-server replication, production-grade IP limits, automated load tests, robust item identifiers and operational backups before large-scale deployment. Quests, maps, skills and monsters should keep growing incrementally; do not claim exact OSRS mechanical parity.
