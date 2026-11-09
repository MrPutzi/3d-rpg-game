# Merchant resale: required safety work before merge

PR #23 introduces shared player-supplied stock. The current independent account
checkpoints cannot conserve items across a process crash. Do not merge this PR
until the regression passes for real persistence operations.

## 1. Atomic durable merchant commits (highest priority)
Modules: game/accounts.js, game/economy.js, new game/merchant-transactions.js.
Persist the actor profile and affected merchant stock in one transaction. For
PostgreSQL, use a transaction and locked/versioned merchant row; for local mode,
commit both in one atomic snapshot, publishing in-memory state only after success.
Use additive storage changes; retain old profiles and seed absent stock once.
All autosaves must share version checks so stale snapshots cannot overwrite trades.
Tests: failure before commit leaves both unchanged, crash after commit restores
both, stale autosave is rejected, and persisted item/currency totals are conserved.
This is prerequisite for reselling cooked food from Newhaven/Oakvale quests and
ore/loot from existing regions without duplicating them.

## 2. Serialize gameplay against pending merchant transactions
Modules: server.js, game/serial.js, game/merchant-transactions.js.
Serialize per-account mutations and merchant stock updates, not only database
writes. Revalidate location, stock and inventory at execution. Define disconnect,
session takeover, death and production behavior while a commit is pending; no
stale profile rollback may erase newer gameplay. Reject duplicate request IDs.
Tests: two buyers/last item, sell plus bank deposit, production completion during
save, disconnect/reconnect, duplicate packets, database rejection and retry.
Depends on step 1; enables safe shared merchant resale as an MMO economy feature.

## 3. Show durable transaction state and reconcile after reconnect
Modules: public/client.js, public/index.html, server.js.
Display pending/saved/failed trade feedback, keep the last confirmed gold count,
and disable repeat submissions while pending. Refresh stock and private profile
from committed state after reconnect. Do not announce success before commit.
Tests: delayed/failed responses, duplicate clicks, lost acknowledgement followed
by reconnect, mobile layout and two clients receiving only committed stock.
Depends on steps 1–2; applies to every existing shop and player-supplied item.

## Reproduction
Run `node --test test/merchant-crash.test.js`. It uses a temporary local database
and the real account/economy modules in a child process: save the original seller
and buyer, sell one roast rabbit, buy it, checkpoint only the buyer, then SIGKILL.
After process death the durable inventories contain two rabbits instead of one.
The test asserts conservation and must fail until the architecture is repaired.
No production database or user progress is touched. This test covers local-file
storage; equivalent PostgreSQL fault-injection coverage is still required.

## Implemented foundation: isolated trade planning
`game/merchant-plan.js` now builds candidate profile and stock snapshots without
mutating the caller or global economy. `createEconomy(initialStock)` provides an
isolated simulation instance. Invalid stock, quantities, IDs and unsafe integer
totals fail closed; failed plans expose no commit payload. Five new tests cover
isolation, rejection, sequential last-stock revalidation and overflow.

This is NOT yet connected to socket handlers. The caller must load/lock fresh
profile and stock, call planTrade, commit both atomically, then publish the result.
Two concurrent plans against one old snapshot can both succeed: the persistence
layer MUST serialize/version-check them. Existing server code still has the crash
bug and the failing regression stays enabled. No durable-store or UI completion
is claimed. Next implement step 1 storage commits, then steps 2 and 3 above.

### Atomic snapshot storage foundation

`game/atomic-snapshot.js` now commits an entire JSON snapshot with a synced temporary file, atomic rename, and directory sync. Updates are serialized with a revision check; failed transformations or pre-rename I/O failures leave the previous snapshot intact. An uncertain post-rename failure requires reopening the store. Six tests cover joint profile/gold/stock recovery, stale concurrent writers, aborted transformations, failed rename/retry, and real SIGKILL immediately before/after rename.

This is a single-owner local storage primitive, **not wired into accountStore or server handlers**. Do not open the account database with both writers. No existing data is migrated. Process-crash tests are not a power-loss or PostgreSQL durability certification. Production still needs all account/session/autosave writes routed through one transaction adapter, PostgreSQL transactions, gameplay serialization during pending commits and committed-result UI acknowledgements. The existing failing merchant-crash regression remains enabled and blocks merge.


### Account-store integration (local mode)

Local `accountStore` now routes registrations, sessions, saves and new `trade(accountId, expectedTradeRevision, request)` calls through the same atomic snapshot writer. The existing accounts/sessions file shape and unknown fields are retained; storageRevision and account tradeRevision are additive. Trade uses checkpointed profiles, commits merchant stock together with the profile, and rejects pre-trade autosaves. Four integration tests cover restart, stale saves, two buyers/one item concurrent with logout, legacy preservation, and SIGKILL after completed resale.

The previous statement that snapshots are not connected to accountStore is superseded for local mode. Live buy/sell socket handlers still use the old in-memory path. Do not switch them yet: checkpoint current gameplay and hold its mutation lock, propagate tradeRevision on every subsequent save, restore durable merchant stock/restocking, implement PostgreSQL transactions and committed-result UI first. PostgreSQL trade explicitly throws unsupported. Do not run two accountStore owners against one local file. The original crash regression remains failing and merge remains blocked.
