# Batch banking

Oakvale Bank now offers two explicit operations:

- **Deposit inventory** stores every backpack item, including worn equipment. Existing equipment reconciliation removes bonuses for deposited gear.
- **Deposit except equipped** keeps one copy of each worn non-stackable item and the entire equipped ammunition stack. Spare copies, ore, leather, food and other supplies are deposited.

Both operations are server-authoritative and require the player to be logged in, have the bank open and remain within its existing interaction range. Existing pending/failed trade guards apply. A cloned destination is checked before either inventory changes: insufficient slots or stack overflow moves nothing. Repeating a completed request cannot duplicate items. The UI explains the distinction and disables the buttons for an empty inventory, pending trade or disconnected socket.

This reduces banking clicks between Southstone mining/Smithing, leather Crafting and Guard/Rusk delivery quests. It adds no currency or rewards. Quest items can be banked normally and must be withdrawn for delivery.

## Verification and limits

`npm test` covers batch rollback, overflow, malformed modes, equipped ammunition, spare equipment, repeat requests and isolated player banks. A live server test connects two clients, rejects remote banking, walks both to Oakvale Bank, submits simultaneous different deposit modes and verifies gear reconciliation and repeat-request safety.

No database migration/reset is required. Inventory and bank continue using existing profile persistence. All-or-nothing describes the in-memory transfer; no new crash-durability or cross-process guarantees are claimed. Browser visual layout and Render deployment were not verified. Durable ground drops remain a separate follow-up requiring an atomic inventory/world persistence design.
