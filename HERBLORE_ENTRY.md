# Herblore entry loop
Audit baseline: main 14d7bb4 (PR30); the sole existing Herblore recipe required level 3, while characters start at level 1 and no other Herblore XP source existed.

1. Brew herbal tonic at level 1 in the Oakvale tavern: one guam leaf + one water vial -> one tonic, 25 XP, existing 1.8s production timing. Heals 4 with the shared food cooldown. Base value 10, below the combined ingredient base value 14; crafting creates no gold. Eight tonics reach level 3 (200 XP), unlocking the unchanged healing potion recipe.
2. Tonics for Westwood follows Thorin's Forest Supplies. Grow awarded seeds at the farm east of Oakvale; water vials are sold in the tavern or rewarded by First Catch. Personally brew two tonics and deliver them to Thorin for a one-time 10 coins. Bought tonics alone cannot satisfy personal crafting. Existing character hydration adds this quest according to its prerequisite; no migration or progress reset.
3. Quest journal shows carried/required delivery counts and explicitly says items are consumed. This also helps existing food, arrowtip and equipment supply quests.

Tests: level-1-to-3 progression, ingredient consumption, healing cooldown, merchant resale, quest prerequisite/personal crafting/wrong giver/repeated claims, two independent producers, movement cancellation, repeated tick, and delivery text updating after consumption. Full existing suite also includes live multiplayer and persistence tests.
No browser visual validation or Render deployment claimed. Ground loot durability remains separate unfinished work.
