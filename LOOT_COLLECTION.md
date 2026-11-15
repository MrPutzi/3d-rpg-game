# Nearby loot collection

Combat loot reserved for a registered player now follows that account through a
reconnect or session replacement. Guest reservations remain tied to their socket.
The server keeps the owner account key in a WeakMap, never in public drop payloads.
The existing private window, public release and expiry deadlines remain unchanged.
This protects access to leather from wolves/bandits for the Newhaven crafting quest,
as well as other combat supplies used in production and merchant resale.

Take nearby collects up to 20 available drops within 48 world units, nearest first.
The server rechecks ownership, expiry, range and inventory space for each transfer.
Items that do not fit stay on the ground; later stackable items can still be picked
up. No walking occurs. The action stops movement/production, is rate limited to one
request per 600 ms and uses the same pending-trade guard as ordinary item actions.
The HUD shows a count of nearby available drops and disables the button when empty
or disconnected. Individual walk-to-pickup remains available for farther drops.

Tests cover account reconnect/guest isolation, hidden identity, full inventory,
reserved/expired/distant drops, request caps, repeat requests and two competing live
socket clients. This update does not persist ground items across server restarts or
make player drops crash-atomic; that requires a separate durable world transfer
transaction. No database migration or progress reset is performed.
