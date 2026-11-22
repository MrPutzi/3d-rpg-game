# Action continuity and inventory recipes
Based on main 45ef639 (production guide and steel already merged).
Only old PR #7 remained open; this increment does not replace its account system.

1. Persist nextAttack, nextGather and nextSkillAction in the existing profile.
   Restore bounded deadlines (4.2 seconds for the slowest weapon, 1.8 seconds
   for gathering/production) and preserve the existing eating delay. Old profiles
   default to zero. No migration or progress reset. Normal session handoff and
   saved-profile reload retain timers; this does not promise crash-atomic combat.
2. Send nextAttack with the private profile and show a server-clock-based combat
   countdown. Ready still requires a valid target, range and ammunition/runes.
   Disconnection shows unavailable. The server remains authoritative.
3. Inventory context menus open recipes using the selected item as an input.
   Editing the search returns to ordinary text search. Existing bone burial stays
   available. This connects loot/gathering to the production guide: Southstone
   coal/steel for the Watch, Westwood logs/leather and herbs for Thorin, or essence
   for the Elder's rune supplies. No crafting is sent just by opening the guide.

Tests: action-timers.test.js checks restored spell rejection up to the exact
deadline without rune loss, independent players, malformed/legacy profiles,
client readiness and ingredient matching. Existing socket integration now checks
that completed production deadlines reach the saved account profile.
No browser visual verification or Render deployment is claimed.
