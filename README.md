
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

### Shared merchant resale
- Merchants now offer positive stock supplied by players, including crafted
  meals, materials and loot outside their usual catalogue. These entries are
  labelled Player supplied and disappear when exhausted. They never regenerate.
- Every nearby player visiting the same shop receives new stock and prices after
  a successful trade and the regular restock tick. Gold remains private in each
  player's own profile. Purchase checks always use current server stock.
- Quotes cover every item, so the Sell tab shows the actual next-unit price even
  before a merchant has bought that item. Batch prices remain dynamic per unit.
- Existing single-process/in-memory shop stock and character autosave semantics
  remain unchanged: shop stock resets at restart, and this is not a durable
  player-to-player trading system. No database migration is introduced.
- Regression tests cover resale, exhausted stock, two buyers contending for the
  last item, insufficient money/full bags, quote accuracy and no resale restock.
