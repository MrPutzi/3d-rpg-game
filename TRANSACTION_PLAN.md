# Durable merchant resale

Implemented in PR #23: registered players can sell crafted food, resources and loot
into shared merchant stock and other players can buy those finite supplies. This
connects the existing Hunter/Cooking and patrol provisions loops with NPC shops.
Noncatalog supplies never regenerate. Catalog replenishment persists its deadline,
with at most one replenishment step after downtime.

## Live transaction boundary

`server.js` checkpoints current gameplay, calls `accountStore.trade`, then publishes
the committed inventory, gold and merchant stock. Local storage commits the account
and stock in one atomic snapshot; PostgreSQL locks and updates both in one transaction.
Every subsequent checkpoint carries the account's trade revision. Selling the last
equipped item clears that slot in the durable profile as well.

The account queue includes the complete trade, so disconnect and session takeover
wait for it. While pending, socket mutations and player simulation are paused;
production is cancelled before checkpointing. Players with an outstanding combat
contribution cannot trade until that encounter ends or their combat credit expires, avoiding concurrent kill rewards.
Merchant operations and replenishment share a server queue. An uncertain commit
never retries automatically or checkpoints old memory: the connection closes and
the player must reload to restore the authoritative persisted result.

Guests use a separate temporary merchant market. This prevents guest purchases from
consuming registered players' durable stock. Existing world drops and nonmerchant
progress still follow the game's ordinary checkpoint model; this change does not
make all world actions crash-atomic. Run one game server owner per local data file;
shared cross-server world/session coordination is not implemented.

## Client feedback

`public/client.js` keeps confirmed gold visible, disables submissions immediately
while a trade is pending, and renders only server-confirmed results. Failed requests
unlock the UI; uncertain outcomes explicitly require reloading. No trade packet is
replayed on reconnection.

## Verification

- `test/merchant-crash.test.js`: real server and socket clients, pending duplicate
  packets, simultaneous buyers for one resale item, session replacement, checkpoint,
  lost acknowledgement/reconnect, SIGKILL and persisted conservation on reopen.
- `test/merchant-plan.test.js`: immutable plans, invalid inputs, limits and durable
  removal of sold equipment.
- Account/snapshot tests: stale checkpoints, atomic rollback, pre/post-rename crashes.
- `test/postgres-trade.test.js`: real PostgreSQL in CI, competing buyers, stale saves,
  injected update failure/rollback, concurrent restock and reopen without reset.

Tests use disposable files or a random PostgreSQL schema. Production progress is
not edited. Database changes are additive; no destructive migration is required.
