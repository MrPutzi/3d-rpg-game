# Shields and recipe discovery
Audit 2026-11-22: main b4974b1 includes Construction and campfires; only legacy PR #7 is open, no standalone open issues. Existing shields had no production recipes and the recipe list had no search.

Three priorities:
1. Bronze shield: Smithing 5, two bronze bars, 70 XP; iron shield: Smithing 20, two iron bars, 100 XP. Both require Oakvale Forge and use existing inventory, equipment, prices and timed production. Mining in Southstone feeds smelting and defensive equipment or resale.
2. Shields for the Watch follows Arrows for the Watch: personally smith and deliver two iron shields to Guard for 40 gold once. Existing quest hydration preserves progress; recursive guidance finds ore, forge and giver. Equipped delivery items lose their bonuses through existing turn-in handling.
3. Recipe search matches all entered words against recipe name, skill, station, input and output display names. Label, result count and empty state are accessible; clearing restores the list. Search does not modify server availability, active batches or inventory.

Tests cover tier requirements, exact materials/XP, existing Defence 1 iron equipment rule, quest unlock, purchased-item bypass, wrong giver, equipped delivery, duplicate reward/completion, two smiths, movement cancellation and search. Initial new test incorrectly assumed iron required Defence 5; corrected to the existing catalogue's Defence 1 without altering game rules. Final results recorded in the PR. No migrations/assets. Browser visual and Render deployment checks not performed. Durable world-loot transactions remain separate work.
