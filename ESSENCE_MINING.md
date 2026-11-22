# Essence mining and altar supply
Audit 2026-11-22, main 442696d: shield smithing/search and Construction already merged. Only legacy PR #7 open; no standalone open issues. Rune essence had shops/drops but no gathering source. Tin rocks incorrectly used the fishing renderer.

Three priorities:
1. Five essence rocks beside the existing altar, region [1250,1280,1460,1450], Mining 1, pickaxe, 10 XP. Reuse authoritative range/action delay and 7.5-second shared depletion. Extract gathering mutation into game/gathering.js for direct concurrency/resource tests. Existing shop supply remains.
2. Runes for Oakvale follows Goblin Menace: personally craft two mind-rune batches and deliver six runes to Elder for 15 gold once. Dialogue explains mining, air-rune training to Runecrafting 2 and Wind Strike use of spare runes. Existing recursive navigation discovers essence and altar; existing hydration adds the quest without resets.
3. Render mining nodes as rocks based on their skill, including tin; purple essence coloring and distinct node icon improve identification. No external assets.

Validation: npm test 156 passed, 0 failed, 1 PostgreSQL skip locally. New tests cover competing miners, exact respawn boundary, missing tool/full inventory without depletion, air-to-mind progression, quest prerequisites, bought-item bypass, wrong giver and repeated rewards. Syntax and diff checks passed. CI PostgreSQL required before merge. No browser visual or Render verification. No migrations. Resource nodes remain transient; durable loot/account transactions remain separate work.
