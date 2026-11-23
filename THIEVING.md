# NPC-targeted Thieving

Replaces the guaranteed village-wide pickpocket production recipe with manual attempts at Oakvale's existing guard (635, 385). Stand within 90 units, alive and logged in, with no movement, combat intent, production or agility lap. Right-click the guard or use Skills; Go to guard navigates without attempting automatically. Talking and the guard's supply quests remain available.

Server rolls success: 65% at level 1, +0.5 percentage points per level, capped at 90%. Success grants 4 coins and 25 XP with a 3-second cooldown. Failure grants neither, costs up to 1 HP without killing and imposes a 5-second retry delay. This is a pickpocket cooldown, not a general stun. It reduces the previous guaranteed 4 coins per 1.8 seconds; earnings can buy food or supplies in existing shops. No NPC stock or other player's wallet is affected.

The server ignores client outcomes/times and persists nextThieve with the existing profile snapshot. Restoration bounds malformed future deadlines to five seconds. Live session replacement retains cooldown, gold and XP. Existing save failures retain normal error reporting; this change does not introduce crash-atomic transactions. Old profiles default to no cooldown; no database migration.

Validation: deterministic success/failure/level tests, duplicate deadline boundary, invalid NPC/input, range, death, busy actions, independent players, and live socket tests for forged requests and restored cooldown. General production integration retains its batch/cancel/movement/max checks using seeded bones instead of the removed free recipe. Full suite: 212 tests, 211 passed and one local PostgreSQL skip. Syntax and diff checks passed. Browser visuals and Render deployment unverified.

Next: more level-gated NPC targets and a Thieving quest, active Prayer, and new herb varieties. Audit current main before extending.
