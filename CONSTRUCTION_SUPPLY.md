# Construction supply loop
Audit 2026-11-22, main 2888ba5: campfires and selective loot already merged; only legacy PR #7 open, no standalone open issues. Construction consumed purchased planks for XP without an output, and no plank recipe existed.

Three priorities:
1. Saw two logs into one plank at the Oakvale guild (Construction 1, 10 XP), linking Westwood gathering to construction.
2. Existing Build a stool now produces one non-stackable wooden stool from two planks (55 XP). Base item value 24, sell through existing stock-aware merchant transactions. No new currency source without consuming resources.
3. Seats for Westwood unlocks after Thorin's tonic quest: personally build and deliver two stools, receive 20 gold once. Dialogue and recipe UI explain the chain; existing recursive quest navigation guides logs, guild and return to Thorin.

Validation: npm test passed, 149 passed, 0 failed, 1 PostgreSQL test skipped locally. Tests cover exact costs/XP, merchant resale, prerequisites, purchased-item bypass rejection, recursive guidance, wrong giver, duplicate rewards, two builders, movement, duplicate completion and missing materials. Syntax and diff checks passed. PostgreSQL must pass in CI. No visual browser or Render deployment verification.

Existing profile hydration adds the new quest without resetting progress. No database migration or external assets. Furniture is an inventory/trade/delivery item, not placed housing. Durable ground-loot transactions remain a separate priority.
