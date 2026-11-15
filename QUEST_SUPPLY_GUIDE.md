# Quest supply guidance

Craft quest targets now inspect the character's inventory before choosing a location. Missing gathered ingredients point to the existing resource area with its skill requirement; missing processed ingredients follow existing recipes up to eight steps with cycle protection. When ingredients are present, the marker points to the required village building. Known enemy drops point to an existing enemy area and explicitly say the drop is chance-based.

Examples: Iron for the Watch guides iron mining → smelting → dagger forging → Guard. Boots for the Border guides leather drops → guild crafting → Captain Rusk. Meals for the Frontier guides shrimp fishing → tavern cooking → Mara. Existing map and journal rendering consumes these server-provided targets.

Banked missing ingredients are suggested before acquiring replacements. Banked finished deliveries are suggested only after the personal crafting goal is complete. A partial bank supply is still useful; after withdrawal, guidance is recomputed. This never mutates inventory, bank, progress, prices or rewards. Each player receives their own targets.

This is next-step guidance, not an optimal route planner or a full recipe browser: it uses catalogue order and falls back to the quest's station when no supported source location is found. Standalone non-building activity locations are not added in this change. Skill requirements are displayed, not bypassed.

Nearby-loot snapshots now include a server-computed `canTake` flag based on exact reach and reservation. HUD availability uses this flag instead of rounded display distance. The actual pickup always revalidates ownership, expiry, capacity and reach; availability does not promise inventory capacity or reserve an item against another player.

Validation: unit tests cover ore-to-Guard target transitions, banked supplies/deliveries, personal-crafting gates, isolated player state, chance-drop labels and exact loot boundaries (48 versus 48.4), custom reach rejection and reservation expiry. Existing full suite and live multiplayer tests run. Browser visuals and Render deployment are not verified. No migration/reset. Persistent, crash-safe ground transfers remain a separate follow-up.
