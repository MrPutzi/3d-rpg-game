> Updated by SLAYER_TIERS.md: selectable level-gated targets now extend the original wolf contract.

# Assigned wolf contracts

Audit baseline: main 8c2c5ad (PR48); PR47 agility and PR48 steel shields are complete. Only legacy PR7 remains open, unchanged; no standalone open issues. Farming still uses a short recipe rather than persistent growth. Slayer previously only exchanged banked wolf kills through a recipe; it had no accepted task.

Three priorities:
1. `game/slayer.js`, `server.js`: accept a three-wolf contract while idle at the Oakvale guild, earn credit through the existing authoritative encounter settlement, return to claim 65 Slayer XP once. Shared combat uses existing contribution/distance/alive checks; spectators and repeated settlement receive no credit. No new loot or gold. Wolves remain linked to Rusk's existing patrol quest, leather drops and rabbit-provision region.
2. Persist and validate `slayerTask` with the existing account snapshot. Missing fields default to no task. Existing `slayerKills` credits and the old Claim Slayer training recipe remain intact. While a contract exists, wolf kills count only towards that task (capped at three), never also to legacy credits. Claim/accept request a save; ordinary progress uses existing periodic/disconnect saves. This is not crash-atomic combat persistence; a hard crash can lose progress since the last save. No schema migration or reset.
3. `public/index.html`, `public/client.js`: Skills panel and guild dialog show assigned progress, separate legacy credits, accept/claim actions and navigation to wolves or the guild. Unmet server requirements remain authoritative. This UI depends on task status from priorities 1–2 and uses existing world navigation.

Validation: unit tests for task gates, independent participants, spectator exclusion, repeated settlement/claim, caps, legacy preservation and restored-state validation. Live socket test verifies incomplete progress across session replacement, rejection of premature claims, a ready task's single XP claim, save acknowledgement and restored XP. UI text is unit tested; visual browser interaction and Render deployment are not verified. Run npm test and syntax checks; PostgreSQL integration must pass CI before merge.

Scope: first fixed wolf contract, no random assignments, points shop, cancellation fee or Slayer-specific equipment yet. Future work should add varied level-gated targets and persistent Farming growth after checking open work.
