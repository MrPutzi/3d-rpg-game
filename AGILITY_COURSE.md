# Oakvale agility course

Update: checkpoints now require timed stationary obstacle training and expose server deadlines to the UI. See AGILITY_OBSTACLES.md for current timing and interruption behavior.

Audited main 582b1cb (PR #45), with only legacy PR #7 open and no standalone open issues. Existing Agility was a stationary 1.8-second production recipe. This increment replaces it, preserving earned XP.

1. **Authoritative laps** (`game/agility.js`, `server.js`, `game/progression.js`): start within 24 units of (530,760), then visit (650,760), (650,650), (530,650), and the start, in order within 20 units. Four checkpoints grant 40 XP once. Server positions drive progress; clients cannot submit checkpoint completion. A 600ms gate prevents same-tick advances. Combat, other production, building interaction, death, distance over 300 from start, or 120 seconds cancels without partial XP. Ordinary walking is allowed. The old `run_course` recipe is removed.
2. **Scout quest** (`game/progression.js`, `game/quest-targets.js`, Elder dialogue in `server.js`): after Welcome to Oakvale, complete three personal laps and return to the Elder for a one-time 20-coin reward. Quest progress and XP use the existing profile persistence; no migration or currency per repeat lap. Existing quest hydration adds the new quest to old characters.
3. **Playable navigation** (`public/client.js`, `public/index.html`): Skills provides Go to course, Start lap, Walk to next checkpoint and Cancel. The next server-confirmed point appears in the world and both maps; each leg needs a player command. Active course tracking temporarily takes precedence over pinned recipes/quests, which resume afterwards.

Validation: unit tests cover ordered/replayed checkpoints, missing position progress, reachable paths, start boundary, cancellation, player isolation, quest unlock/claim and map target selection. A live socket integration test walks the actual server path, earns XP/quest credit, and replaces the session to verify completed progress is saved while an unfinished lap is discarded. Full suite, syntax and diff checks are required before merge; PostgreSQL transaction integration runs in CI.

Limits: this is a beginner walking course, not obstacle animations, run-energy or a full OSRS Agility replica. Unfinished laps are session-only. Completed progress follows existing periodic/disconnect saves, not crash-atomic per-checkpoint transactions. No database migration, browser visual test or Render deployment is included.
