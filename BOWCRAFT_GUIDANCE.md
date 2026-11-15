# Bowcraft and local quest objectives

Audit base: main d270a9a (PR #34), following PR #33. Only the old PR #7 was open; no standalone open issues were returned. Existing bows were purchasable but had no production recipes. The new arrow quest lost its map objective when the player had ingredients for an anywhere recipe.

Priorities implemented:
1. `game/quest-targets.js`: an anywhere recipe now points to the player's server position with the recipe and level. This also handles intermediate shaft production for Arrows for the Watch. Ingredient sourcing and completed delivery still take precedence. No inventory/progress mutation.
2. `game/progression.js`, `server.js`: guild bow binding. Fletching 5: two logs + one leather -> shortbow, 50 XP. Fletching 20: two oak logs + two leather -> oak shortbow, 100 XP. Original simplified leather binding recipe; no borrowed assets. Thorin explains the loop after Tonics for Westwood, connecting the Forest Supplies chain, Westwood trees, wolf leather, Oakvale guild, ranged combat and merchant resale. Existing bows, prices and wielding levels are reused. Production remains server-authoritative, timed and interruptible. No migration or save-format change.
3. `public/client.js`: recipe weapon details show ammunition compatibility and identify ranged attack bonuses. Builds on the bow recipes and existing iron-arrow production.

Validation: npm test: 134 tests, 133 passed, zero failed, one PostgreSQL test skipped locally without a database. New tests cover requirements/station, actual consumption/XP, equip and sell, two-handed shield removal, ammo mismatch, Ranging requirements independent of crafting, two isolated players, cancellation, repeated completion, missing supplies at completion, local quest targets and UI helper output. Syntax checks for server/client and git diff --check pass. CI separately runs PostgreSQL integration.

Limitations: no visual browser test or Render deployment verification. Existing account checkpoint behavior and in-memory ground loot are unchanged. Durable loot recovery requires a separate account/world transaction design before implementation; avoid a naive independent loot snapshot that could duplicate items after a crash.
