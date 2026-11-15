# Iron for the Watch

Adds the next Smithing tier after bronze without changing existing recipes or drop rates.

1. Mine iron in Southstone Quarry (Mining 15 and a pickaxe), or collect existing iron drops from mountain golems/orcs.
2. At Oakvale Forge, Smithing 15 converts one ore to one iron bar (65 XP), then one bar to an iron dagger (60 XP). Each uses the existing 1.8-second production action; smelting is deterministic.
3. Equip the existing dagger (Attack 1), sell through the existing merchant system, or deliver two personally forged daggers to the Guard for Iron for the Watch (45 coins). This quest unlocks after Points for the Patrol. Bought daggers alone do not advance the objective.

The recipe UI now shows the catalogue's attack/strength bonuses, attack interval and two-handed flag alongside defence and wielding requirements. Smithing and wielding levels are distinct.

No new region, currency, database migration or reset is introduced. New quest entries use existing profile hydration, and bars use normal inventory/bank persistence. Ordinary production checkpoint semantics remain unchanged; this does not add crash-atomic production or persistent ground drops.

## Validation

`npm test`: includes iron ore-to-dagger/equip/resale, level and station gates, quest unlock and delivery, duplicate claim protection, two isolated concurrent production states, repeated ticks, movement cancellation, missing inputs, full-bag conversion, and executable recipe UI formatting tests. Existing socket integration and persistence tests also run. PostgreSQL integration requires TEST_DATABASE_URL and runs separately in CI.

Browser visuals and Render deployment are not verified. Follow-up priority: durable world-drop transfers and persistence across restart, designed atomically with player inventory.
