
### Patrol smithing loop
- Mine copper and tin at Southstone Quarry, smelt a bronze bar at Oakvale Forge,
  then smith it into 15 bronze arrowtips (Smithing level 1, 40 XP, 1.8 seconds).
  Combine tips with shafts from logs and feathers from the market/goblin drops
  using the existing Fletching recipe. Tips can also be sold through existing shops.
- Completing Goblin Menace unlocks **Points for the Patrol**. The Oakvale Guard
  requires two completed arrowtip actions plus delivery of 30 tips; he consumes
  them and rewards 25 coins and 30 feathers once. Bought tips alone do not fulfil
  the crafting objective. Quest map guidance points to the forge, then the Guard.
- Building-based recipes offer **Go to [station]**. This uses normal server pathing
  and opens the station on arrival; movement cancels unfinished production.
- Existing accounts acquire the new quest during hydration without resetting
  progress. Existing autosave/checkpoint semantics remain unchanged. No migration.
- Validation: timed ore → bar → tips → arrows, quest prerequisite/delivery/replay,
  two independent smiths, interrupted movement, remote station rejection and
  stack-overflow rollback are covered by `test/smithing.test.js`.

### Hunter provisions
- The existing rabbit hunt southwest of Newhaven now supplies a complete food
  loop: roast one raw rabbit at the Oakvale tavern (Cooking level 1, 35 XP,
  1.8 seconds) for one roast rabbit. It heals up to 6 HP and uses the shared
  food/attack cooldown. Existing merchants buy it using normal stock pricing;
  it is not added to their regenerating purchase stock.
- After Eastern Wilds Patrol, Captain Rusk offers Provisions for Newhaven:
  cook three rabbits and deliver three meals for a one-time 30-coin reward.
  Journal/map guidance and account hydration use the existing quest system.
- Food recipes show healing per item and the attack delay before production.
- No migrations, new persistence semantics or deployment changes. Tests cover
  hunting/cooking/eating/selling, unlock/delivery/replay, concurrent players,
  interrupted/remote production and full-backpack conversion.
