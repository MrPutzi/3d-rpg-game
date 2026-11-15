# Bank supply workflow
Audit baseline main 6dd1afc: bank supports fixed quantities and all-or-nothing All, but not a capacity-aware maximum or item search. Guild text incorrectly directs all quest rewards to Elder.

1. Max deposit/withdraw resolves the amount on the server using current source, destination slots and stack ceiling 999999. All retains its previous all-or-nothing behavior. Clone-then-commit transfer preserves both sides on rejection. Existing bank proximity and pending trade guards remain.
2. Search filters grouped backpack/bank rows by displayed item name, ignoring case and surrounding spaces. It changes only the view. It helps locate ores, herbs and quest deliveries before visiting the forge, tavern or NPC.
3. Guild overview uses the same quest catalogue and private journal as the quest tab: actual name, readiness and giver. Thorin, Mara, Guard and Rusk quests no longer point to Elder by generic text.

Validation covers partial non-stack max, stack cap, full bank, repeat rejection, player isolation, live simultaneous withdrawals/deposit, search normalization/clearing and guild giver/readiness.
No schema migration or price/reward changes. Browser visual validation and Render deployment are not claimed. Ground loot restart durability remains unfinished.
