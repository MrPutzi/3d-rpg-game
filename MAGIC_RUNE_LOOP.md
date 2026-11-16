# Magic rune loop

Audit: main b2dbcc9 (PR #35), following PR #34. The only open PR was the old #7; no standalone open issues were returned. Wind Strike already existed, but its rejected attempts cancelled production and mind runes were only available through shops/drops.

Three priorities:
1. `game/magic.js`, `server.js`: extract authoritative Wind Strike validation and costs. Dead/unavailable/out-of-range targets, cooldown and missing runes reject without mutation. Only a successful cast interrupts production. Preserve 210 range, 2400 ms cooldown, 0–4 damage, rune consumption and XP. Existing encounter attribution, retaliation and quest kill processing remain in the server.
2. `game/progression.js`: Runecrafting 2 at the existing altar converts one rune essence into three mind runes for 35 XP. Three air-rune actions train level 1 to 2. Essence from existing monsters or Oakvale market now feeds both runes, casting, combat quest progress (including Goblin Menace) or merchant resale. No new free resource source or migration.
3. `public/client.js`: context menu uses the server spell catalogue to display required/owned runes and disables the option when ingredients are missing. Server remains authoritative when UI state is stale. Does not promise that a target is in range or cooldown has expired.

Tests: full npm test: 139 tests, 138 passed, zero failed, one PostgreSQL test skipped locally without a database. Updated live two-client production test then passed separately, verifying a rejected cast preserves the running batch. New tests cover air-to-mind progression, cast consumption/XP, invalid attempts, competing casters on a dying target, spam/cooldown, zero damage, station/movement restrictions and UI costs. Server/client syntax and diff checks passed. CI separately runs PostgreSQL integration.

No browser visual test or Render deployment verification. Existing saves and checkpoint timing remain unchanged. Durable ground loot is still a separate transaction-design task; no independent loot snapshot was added.
