# Timed personal herb patches

Replaces the instant farm_guam production recipe. At (1010, 890), a living logged-in player who has stopped movement/combat/production can plant one guam seed. One personal patch grows for 60 seconds of server wall-clock time, including offline time. Harvest grants two leaves and 55 Farming XP once. No new gold source or database migration.

The private profile stores only kind and readyAt; actions ignore client timestamps and player IDs. Plant/harvest request immediate existing profile persistence. Missing legacy fields mean empty patches. Full bags retain the crop; players cannot harvest someone else's patch. This uses existing snapshot persistence, not a new crash-atomic transaction system: save failures retain existing error reporting and should be resolved before relying on offline progress.

Skills shows a countdown and plant/harvest/navigation buttons. Thorin's forest_supplies seeds feed herbal_supplies tonics at the tavern. Recipe/quest guidance prefers a planted crop or carried seed after checking banked leaves. Existing enemy leaf drops remain alternatives.

Validation: unit tests cover timing boundary, invalid state, busy/dead/remote players, full bags, independent players and duplicate actions. Live socket tests cover forged timestamps, session replacement, stored crop restoration and one-time harvest/XP. Browser visuals and Render deployment are not verified.

Next: staged herb varieties and Farming level unlocks; NPC-specific Thieving; active Prayer effects. Re-audit before implementation.
