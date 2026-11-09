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

## Timed production and frontier meals

Training recipes now run as server-owned batches of 1–28 actions, each taking at least
1.8 seconds. Ingredients, outputs and XP change together only when an action finishes.
Repeated start requests cannot overlap jobs. Movement, another action, incoming damage,
leaving a station or explicit cancellation interrupts the batch; completed items remain.
There is no catch-up reward burst after a server stall. Inventory space, level, ingredients
and station access are checked again at completion. The Skills tab shows materials,
outputs, batch counts, progress and cancellation. Production jobs themselves are transient:
disconnecting never grants unfinished work; completed progression uses the existing account
save policy (20-second autosave and disconnect save, not crash-proof per-action persistence).

After Mara's First Catch quest, Meals for the Frontier asks for three shrimp cooked at
Oakvale's tavern. Return three cooked shrimp to Mara for a one-time 20-coin reward; delivered
meals are removed. Existing accounts whose First Catch is complete unlock this new task on
login without changing their previous quests. This links Moonwater fishing, Cooking, food
consumption and the frontier provisioning story. No database migration is required.

Next priorities: robust per-action persistence across shared economy mutations; fair
multiplayer kill credit; richer recipe tools and station animations. The old account/UI
rewrite PR #7 is not part of this change: phase 2 already supplied the current account system.

## Shared encounters and target feedback

Melee, ranged and magic kills now use the same death/reward path. Actual damage is recorded
server-side per enemy life; misses do not create claims. Nearby, living, connected players
who hit in the last 30 seconds qualify with at least 10% of the enemy's maximum HP damage.
The leading eligible contributor always qualifies, including when other participants have left.
The existing coin budget (at least 2, otherwise twice enemy level) is split proportionally
using deterministic integer rounding: more participants do not mint extra gold. Ties use
session ID order. Combat XP still comes only from each player's own damage.

Every qualifying participant receives matching quest kill credit (Goblin Menace / Eastern
Wilds Patrol) and wolf Slayer credit regardless of attack type. The highest eligible damage
contributor owns the single rolled drop set for 15 seconds; the normal public pickup/expiry
rules then apply. Disconnected/distant/dead/stale participants are excluded. Reconnecting
creates a new combat session and does not reclaim an old encounter. Each enemy settles once;
respawn clears the ledger. NPC ledgers never enter public world snapshots.

The Combat options panel shows the selected target's HP, your actual damage and current
credit eligibility. Reward messages explain your coin share and drop ownership. Selection is
server-confirmed for attacks, spells and auto-retaliation and clears when the target dies.
These changes extend existing account-save behavior; crash-proof shared-world persistence,
party membership and player trading remain future work. No schema migration is required.


### Food and combat pacing

Food (including the existing healing potion) now shares a server-authoritative
1.8-second consumption cooldown. A successful meal delays the next melee/ranged
attack or spell until at least that deadline, without shortening longer weapon
cooldowns. Only actual restored HP is reported; full-health, absent and invalid
items consume nothing. Eating interrupts production but preserves movement and
combat intent. The deadline is saved with existing account progress and restored
on reconnect (no migration required); existing autosave/disconnect durability
limits still apply.

The HUD Eat button uses the first food in backpack order and shows the cooldown.
Inventory/context-menu eating uses the same server rules. This connects Cooking,
Mara's food quest, tavern supplies and frontier combat without changing prices,
healing amounts or quest requirements. Multiplayer tests cover spammed eating,
spell delay, independent player timers and existing shared kill rewards.


### Nearby loot

A server-filtered panel lists up to 20 nearest drops within 160 world units,
including overlapping drops, quantities, distance, reservation and expiry.
Selecting one uses existing navigation; the server rechecks reachability,
ownership, expiry and inventory capacity when the player arrives. Transfer and
removal are synchronous so only one contender can win. Expired drops cannot be
picked up between cleanup ticks. Full bags preserve the entire drop; existing
stacks can accept stackable loot. No currency, drop probabilities or account
schema change. Ground loot remains ephemeral across server restarts.

### Bank quantities

Oakvale Bank now groups matching items visually and offers 1, 5, 10, 50 and All
for deposits and withdrawals. All means every owned unit of the selected item;
if the entire transfer cannot fit, neither inventory changes. Counts show actual
occupied slots (28 backpack / 200 bank); grouping does not change storage rules.
Transfers validate copied inventories before committing both arrays together,
avoiding rollback and duplicate-item risks. Server proximity and bank-opening
checks remain mandatory. Equipped items are reconciled after deposits.
Registered accounts retain existing autosave/disconnect persistence; guests are
temporary. This is in-memory transaction safety, not crash-safe database commits.
No migration or economy/quest balance changes are needed. Bulk banking supports
resource gathering, production batches and supplies for the existing frontier quests.
