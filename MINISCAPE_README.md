# MiniScape — Oakvale Frontier

A browser-based MMO RPG prototype with an authoritative Express + Socket.IO server and Canvas client. Its mechanics are **inspired by Old School RuneScape**, not a full recreation.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm test
npm start
```

Open `http://localhost:3000`. Open a second tab to see shared-world multiplayer.

## Controls

- **Left click world:** walk, attack an enemy, gather a resource, speak to a villager or enter a building.
- **Right click world:** context menu for enemies, NPCs, buildings, nodes, dropped items and empty ground.
- **Inventory:** 28 miniature icon slots; hover for item names; left click to equip/eat/examine, right click for all supported actions.
- **Mobile:** tap to act; long press for context actions.
- **Escape:** close the context menu or an open dialog.

## Game buildings

- **Forge:** browse and purchase tiered melee weapons and shields; sell inventory items.
- **Market:** buy bows, arrows, bolts, food and gathering tools; sell items.
- **Tavern:** buy food and recover health for 10 coins.
- **Bank:** deposit/withdraw inventory items (in-memory, **not persistent**).
- **Guild:** view quest progress and training guidance.
- Click any building to walk to its entrance. The server verifies that the player is near enough to open/use it.

## Weapons, combat and equipment

- Bronze, Iron, Steel, Mithril, Adamant and Rune melee tiers; Dagger, Scimitar, Longsword, Battleaxe and Two-handed sword categories.
- Bows, crossbow, arrows and bolts; ammunition is consumed for ranged attacks.
- Weapon-specific OSRS-inspired attack speeds (4/5/6/7 600ms ticks) and combat options.
- Melee styles: Accurate / Aggressive / Defensive / Controlled (when supported by weapon).
- Ranged styles: Accurate / Rapid / Longrange.
- Server-controlled level requirements, equipment restrictions, hit chance, max hit and XP distribution.
- Accurate, Aggressive and Defensive earn Attack, Strength or Defence XP respectively. Controlled splits XP. Rapid speeds up ranged attacks, Longrange splits Ranged/Defence XP.
- Auto-retaliate may be toggled on/off.

## World gameplay

- 2400×2400 world with follow camera, Oakvale town, tiered enemies, trees, ores and fishing spots.
- Woodcutting/Mining/Fishing require the correct gathering tool, skill level and inventory space.
- Pickup and drop ground items (temporary, expire after 3 minutes).
- Three-goblin quest and village introduction. Gold, weapon shops and 28-slot inventory.
- The game simulation and movement update every **100ms**, world state is broadcast every **200ms**. Combat cooldowns retain the classic **600ms OSRS tick** as a unit.

## Architecture

- `game/content.js`: item, tier, weapon, building, shop and world content definitions.
- `game/rules.js`: XP curves, inventory operations, combat formulas, equipment and pathfinding.
- `server.js`: authoritative world sessions, secure interactions, combat loop and Socket.IO.
- `public/index.html`: modern UI, modals, context menu and canvas.
- `public/client.js`: Canvas renderer, input and player interface.
- `test/game.test.js`: game-rule regression tests; run `npm test`.

## Render.com

Deploy as a **Web Service** with:
- Build: `npm install`
- Start: `npm start`
- Health check: `/health`
- Node.js 20+, same-origin Socket.IO.
- See `render.yaml` for a ready-to-use blueprint.

## Limitations and next steps

This is an alpha: account login is only a **guest character name**. XP, quests, inventory, bank items and gold remain **in server memory** and reset on disconnect or restart. A persistent MMO needs PostgreSQL, authenticated accounts, reliable reconnect sessions, shared state before multiple instances, server-side rate limits, and combat / network load testing. Combat formulas and content are intentionally simplified and may differ from actual OSRS values. No original RuneScape art or proprietary game content is copied.
