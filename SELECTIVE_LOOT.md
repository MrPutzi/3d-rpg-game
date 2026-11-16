# Selective nearby loot

Audit base: main 2c9969e (PR #36), following PR #35. Only old PR #7 remained open; no standalone issues. Existing ownership, partial pickup and sweep were retained. Inspection found that 20 non-fitting nearby drops could hide a fitting stack and exhaust the sweep's candidate limit.

Three priorities:
1. `game/loot.js`: filter non-fitting candidates before the 20-transfer limit. A full backpack with an existing feather stack can collect feathers behind 20 non-fitting bones. Capacity and ownership are rechecked at transfer time.
2. `game/loot.js`, `server.js`: session-local category selection (all, food, resources, ammunition, equipment). Validate the category server-side and apply it before limiting both the nearby list and sweep. Individual world pickups remain available regardless of this convenience filter. No item is discarded or sold by a filter. No save-schema change; reconnect defaults to all.
3. `public/client.js`, `public/index.html`: category selector, filtered empty state and actionable-first rows, then distance and stable ID. Move existing DOM rows only when their position changes. Disable row actions during trade/offline states. Available items cannot be hidden behind 20 reserved/non-fitting entries.

Gameplay links: select resources for Thorin's Westwood crafting chain, ammunition for the Guard's arrow supplies and ranged combat, equipment for merchant resale, or food for frontier combat. Existing regions/NPCs/drop tables and prices are unchanged.

Validation: full npm test: 142 tests, 141 passed, zero failed, one PostgreSQL test skipped locally without database. New unit tests cover the 20-drop boundary, category filtering before limits, malformed categories, ownership and competing collectors. Live two-client test changes one player's filter, verifies excluded bread is not collected, then restores collection without duplication. Server/client syntax and diff checks passed. CI separately validates PostgreSQL. No browser visual or Render verification.

Limitations: category preference is session-local, and ground loot remains memory-only. Durable loot needs coordinated account/world transactions; a separate snapshot would not provide crash-safe transfers.
