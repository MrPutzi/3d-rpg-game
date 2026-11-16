# Shared campfire cooking

Audit base: ed61128 (PR #37), following PR #36. Only old PR #7 was open and no standalone open issues were returned. Firemaking previously consumed logs for XP without producing a usable fire.

Three priorities:
1. `game/campfires.js`, `game/activities.js`, `server.js`: successful timed Light logs creates a 60-second fire at the authoritative player position. One active fire per connection; a new fire replaces that player's old one. Fires are shared within 80 units, automatically expire, and snapshots contain no owner/account identifier. Existing log cost and Firemaking XP are unchanged.
2. `game/progression.js`, `game/production.js`, `game/activities.js`: shrimp, rabbit and trout recipes accept the tavern or a nearby active fire. Brewing remains tavern-only. Recheck heat on every production tick; expiry or movement cancels unfinished work without consuming its ingredients. Existing recipe IDs retain quest credit for Mara and Rusk; fishing/hunting -> cooking -> food or resale works in the field. Production timing uses the same supplied clock for start/completion.
3. `public/client.js`, `game/quest-targets.js`: draw original canvas fire markers and remaining lifetime; click/context-menu navigation opens existing training controls. Recipe hints explain radius/lifetime, tavern navigation remains available, and quest targets prefer a nearby fire when ingredients are ready. Server refreshes production availability on entering/leaving heat range or fire expiry.

Validation: final full npm test: 146 tests, 145 passed, zero failed, one PostgreSQL skip locally without a database. Initial run caught an extra login profile caused by undefined proximity state; initializing it to false fixed the regression without changing tests. New deterministic tests cover delayed creation, radius/exact expiry, two simultaneous cooks, recipe quest credit, repeated completion, expiry/movement cancellation, one-fire replacement, cleanup and tavern/brewing separation. Syntax and diff checks pass. CI separately runs PostgreSQL integration.

No database migration or protected assets. Fires are intentionally temporary and not restored after restart; progress uses existing saves. No browser visual or Render verification. Durable ground loot remains separate work requiring coordinated account/world transactions.
