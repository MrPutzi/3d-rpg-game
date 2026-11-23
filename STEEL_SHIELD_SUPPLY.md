# Steel shield supply

Audit: main 05e48ae includes timed agility from PR47, steel smelting/daggers from PR42 and bronze/iron shield recipes from PR40. Steel shields exist in the forge shop but had no crafting recipe. Only legacy PR7 remains open; no standalone open issues. This change does not modify its persistence/combat rewrite.

1. Smith steel shields at Oakvale Forge: Smithing 35, two steel bars, 120 XP, existing 1.8-second production action. Bars consume Southstone iron and coal through the existing smelting recipe. Existing Defence 5, offhand rules and shop prices remain authoritative. Four bars for the quest require four iron ore and eight coal.
2. A Stronger Watch unlocks after Steel for the Watch. Personally craft and deliver two shields to the Guard for a one-time 60 gold reward. Purchased shields alone cannot satisfy production credit. Delivery consumes shields and removes an equipped copy when none remain. Existing account hydration adds this quest for older characters; no schema migration or progress reset.
3. Crafting output UI warns about unmet equip levels and two-handed/shield conflicts, without preventing crafting for sale or delivery. This uses current profile skills/equipment and the authoritative item catalog; the server still validates equipping.

Tests: smithing/station/defence gates, exact production deadline, material use, sale, simultaneous independent smiths, movement cancellation, repeated ticks, quest unlock, personal craft credit, coal navigation, wrong NPC, consumed equipped delivery, duplicate claim and UI warnings. Run npm test and syntax checks; PostgreSQL integration is checked in CI. Browser visuals and Render deployment are not verified.

Next: extend incomplete farming growth and Slayer assignment systems after reviewing persistence and open work. This supply chain does not add a region or change existing item prices.
