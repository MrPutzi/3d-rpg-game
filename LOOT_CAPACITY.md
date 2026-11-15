# Partial loot and discard recovery
Based on main ffc9f33 (PR31). Existing enemy ownership, nearby sweep and exact reach checks remain in use.

1. Pickup transfers only the quantity that fits (free slots for non-stackables, remaining stack capacity up to 999999 for stackables). The remainder keeps its identity, owner, privacy deadline and expiry. Synchronous requests cannot duplicate the remainder.
2. Nearby loot reports fitQty and enables Take nearby only for reachable, accessible drops with positive capacity. Rows show fits X/Y and disable pickup when no quantity fits. Distant rows remain clickable to walk to loot. Capacity is an estimate per row, not a reservation; every transfer recomputes it.
3. Voluntary drops receive the same 15-second ownership recovery window as enemy loot, including account reconnect identity. After the deadline they become public. Guest ownership follows the socket only. This protects accidental drops without introducing a new trading system.

Tests cover partial non-stack pickup with two contenders, stack cap/full bag, unchanged view state, exact protection expiry, reconnect ownership, plus two live clients seeing one private drop each and collecting only their own.
Ground items still live only in process memory. This change does not claim restart durability or crash-atomic transfers with saved accounts. No database migration, browser visual inspection or Render deployment.
