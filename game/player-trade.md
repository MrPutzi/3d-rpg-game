# Player-to-player trading

- Only registered, connected characters can trade. Guests and self-trades are rejected.
- Invitations require both players to be alive, within 160 world units, and outside combat, production and agility actions.
- An open trade pauses player-issued gameplay commands. The current UI supports gold and one item type per side; the server validator allows up to six distinct types for a future multi-row editor.
- Every offer change clears both confirmations. The server validates current inventory, gold, capacity and item identifiers again when both players confirm.
- The server checkpoints both profiles, then commits both inventory/gold changes and both trade revisions in one local snapshot or PostgreSQL transaction. Account rows are locked in stable UUID order.
- A disconnect before commit cancels the offer without moving items. A commit with an uncertain result disconnects both sessions; neither side automatically retries. Reconnect to load the authoritative profiles.
- Offers are in-memory and expire after two minutes. They are not escrowed and do not survive a server restart; no item or gold is removed until the atomic commit.
- This is a single-instance feature. Cross-server sessions, party trading, item binding and trade history are not implemented.
