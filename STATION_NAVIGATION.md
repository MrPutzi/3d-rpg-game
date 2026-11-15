# Activity navigation
Three ordered improvements on main d87995f:
1. Refresh the private profile after a walking path finishes without an intent. This clears stale Make max movement locks and recomputes station readiness; the server still validates every craft.
2. Share outdoor station coordinates between activity validation and quest targets. Patrol Provisions now guides a player with no raw rabbit to the hunt site, then to the tavern and finally Rusk. Bank supplies retain priority. No rewards, XP or prices change.
3. Add Go to controls for outdoor recipe stations (hunt, farm, altar, course). They use normal server pathfinding; movement cancels pending production. No teleport or automatic crafting.

Tests cover two live players, movement-to-ready profile refresh, delayed production and cancellation, independent quest progression and exact 120-unit station boundaries. No database migration. Browser visual inspection and Render deployment are not verified in this change.
