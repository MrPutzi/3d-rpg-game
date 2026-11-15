# Iron arrow supply

Audit base: main 2ced0ee (PR #33). Open PR #7 is an older character/combat rewrite; this change only extends existing catalogues and recipe details. No standalone open issues were returned.

1. Production: Smithing 15 converts one iron bar to 15 iron arrowtips at Oakvale Forge (55 XP). Fletching 15 combines 15 tips, shafts and feathers into 15 existing iron arrows (55 XP). This connects Southstone ore, Westwood logs and market/goblin feathers to ranged combat and existing resale pricing. Uses authoritative timed production, inventory limits and interruption checks.
2. Arrows for the Watch: after Iron for the Watch, personally fletch two batches and deliver 30 arrows to the Guard for 45 gold once. Purchased arrows alone cannot satisfy personal production. Existing journal/target resolution supplies navigation. No database migration; existing profile hydration supplies the new quest.
3. Recipe UI: ammunition displays its type and ranged strength, without the incorrect default defence requirement. Existing weapon detail display remains unchanged.

Validation: npm test: 128 passed, zero failed, one PostgreSQL test skipped locally without TEST_DATABASE_URL. New tests cover level/station gates, inputs/XP, two isolated producers, movement cancellation, repeated ticks, stack overflow, quest unlock/personal crafting/wrong NPC/repeated claim/equipped delivery and UI helper output. Syntax and diff checks passed. CI separately runs PostgreSQL integration. No visual browser or Render deployment verification.

Follow-up: assess durable ground-loot recovery before extending player-to-player item transfers. Account progress still uses the existing save/checkpoint behavior.
