# Rabbit snare supply loop

Priorities implemented after main cc07312 (PR #44):
1. Crafting 1: weave one log into two single-use rabbit snares anywhere, 10 XP, 1.8 seconds. Snares occupy individual inventory slots and have base value 3 coins. This links timber gathering to hunting; no free tool grants or changes to saved progress.
2. Hunter 1: each rabbit takes six seconds at the existing hunting grounds southwest of Newhaven, consumes one snare and awards 45 XP. Inputs are consumed only when the server completes the action. Cancel/movement/range failure retains unfinished inputs; repeated ticks cannot duplicate catches. Max batches count actual snares. A full bag can replace a snare with a rabbit.
3. Recipe cards display action duration and explain snare consumption. Rusk describes preparation. Existing recursive recipe/quest map guidance now leads through logs → snares → hunting → cooking → Provisions for Newhaven delivery. Roast rabbits can also heal 6 HP or be sold.

Validation: unit coverage includes full bags, missing inputs during a batch, concurrent isolated players, cancellation, movement, region boundaries, long server stalls, repeated ticks and private bank guidance. Existing hunt/cook/eat/sell tests now supply snares and honor six-second hunts. Run `npm test` and syntax checks; PostgreSQL integration runs in CI.

Scope: these remain timed personal production actions, not persistent traps placed on the ground or a contested wildlife simulation. In-progress batches do not survive reconnect. Account save and crash durability are unchanged. No migration, browser visual verification or deployment is included.
