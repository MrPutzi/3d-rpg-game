# Steel supply
Audited main 1712490 (essence mining, shields and recipe search already complete).
Only open PR #7 is the older persistent-character rewrite; this increment does not change accounts or storage.

1. Coal mining: six shared Coal Rocks in southern Southstone Quarry, Mining 30,
   pickaxe, 50 XP. Existing server movement/range/action timer, 7.5-second depletion
   and inventory-capacity checks apply. Coal is non-stackable.
2. Steel production: Oakvale Forge, Smithing 30. One iron ore plus two coal
   produces one steel bar (90 XP); one bar produces the existing steel dagger
   (85 XP). Attack 5 is still required to wield it. Existing merchant resale,
   inventory persistence and bank handling apply; no new migration.
3. Watch quest and guidance: after Shields for the Watch, personally forge and
   deliver two steel daggers for 50 gold. Journal recursively guides players to
   iron/coal, banked supplies, forge and Guard. Guard dialogue and recipe hints
   explain requirements and the loop. Coal has a dark rock visual and icon.

Economy: coal catalogue value 20, steel bar 75; the existing steel dagger value
170 is unchanged. Raw resources are consumed, quest reward is one-time, and
merchant prices/stock remain authoritative. This is an initial balance, not a
claim of measured long-term economic stability.

Tests: test/steel.test.js covers level/tool/full-bag rejection, contested coal and
respawn boundary, material consumption, station and wielding gates, sale,
two concurrent smiths, movement cancellation, duplicate completion, ingredients
removed during production, quest prerequisite, bought-item bypass, navigation,
wrong giver, equipped-delivery cleanup and duplicate reward.
Browser visual verification and Render deployment were not performed.
Durable ground-loot transactions remain a separate future priority.
