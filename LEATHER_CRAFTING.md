# Leather equipment and patrol supplies

The guild in Oakvale now supports leather boots (Crafting 1, one leather, 50 XP),
chaps (Crafting 5, two leather, 90 XP) and body armour (Crafting 10, three leather,
140 XP). Wolves in the Eastern Wilds and bandits already drop leather. Each action
uses the existing timed server-authoritative production system: obtain leather,
craft, equip or sell through the durable merchant market. No new assets or items
are needed; existing equipment requirements, prices and bonuses remain unchanged.

After Provisions for Newhaven, Captain Rusk unlocks Boots for the Border: personally
craft two pairs at the guild, then deliver them for 20 coins. Buying the boots alone
cannot satisfy the crafting objective. Quest journal/map targets use the existing
station and NPC navigation. Delivered equipment loses its bonuses immediately.
Existing accounts receive the new quest during hydration; no database migration
or progress reset is needed.

Recipe rows display the output equipment slot, defence bonus and equip requirement,
separately from the recipe's Crafting requirement. This also helps players choose
between using their leather for progression, selling supplies or completing quests.

Validation: test/leather-crafting.test.js covers the resource loop, tier gates,
exact consumption/XP, quest prerequisite and one-time reward, equipment delivery,
independent players, interrupted batches, duplicate requests, remote production,
full inventory conversion and equipment requirement text. Existing persistence,
combat, quest, merchant crash and PostgreSQL CI tests remain enabled.
