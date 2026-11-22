# Production supply guide
Audit base: main 3f7462e, including coal/steel and prior essence/shield work.
Only old PR #7 remained open; no standalone open issues.

1. Server-side recipe guidance reuses the quest ingredient resolver in
   game/quest-targets.js. Production.options includes a target for supported
   recipes, even when the current player cannot craft yet. Recursion follows
   missing inputs, bank stock, resources, intermediate recipes and enemy drops.
   Amount checks are per action, not the whole batch.
2. Merchant-only ingredients now resolve to a real shop entrance when no
   gathering, crafting or drop source exists. Labels explicitly require checking
   live shop prices and stock. Banked supplies take precedence. No purchase,
   withdrawal, production or money mutation is performed by guidance.
3. The recipe panel offers Show next step / Stop tracking recipe. Tracking
   highlights the current target or gathering area on both maps and shows a HUD
   label. Selecting a quest replaces the recipe target and vice versa; login
   clears tracking. Profile updates refresh the target as supplies change.
   Existing map navigation still sends movement requests validated by the server.

Examples: steel dagger -> iron/coal -> smelt steel -> forge dagger;
herbal tonic with guam already carried -> water at the Golden Tankard.
This extends existing Watch and Westwood quest guidance to free-form crafting.
No new assets, migrations, automatic trading or new currency sources.

Validation: test/production-guide.test.js covers recursive steps, partial stacks,
two isolated players with different bank inventories, read-only evaluation,
merchant fallback, invalid recipe IDs, retained crafting gates and client target
selection. Run npm test and node --check public/client.js.
Browser visual verification and Render deployment are not claimed.
