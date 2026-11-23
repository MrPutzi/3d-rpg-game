# A Fresh Westwood Harvest

After Tonics for Westwood, Thorin offers a one-time Farming contract alongside the existing furniture task: personally harvest two guam crops and deliver four leaves. It rewards 20 coins and one seed. Existing crop yields, growth times, drop tables and shop prices are unchanged. Purchased/dropped leaves can satisfy delivery but never the personal harvest objective. Failed, premature and duplicate harvests grant no progress. Existing character hydration activates the new quest for characters who already completed its prerequisite; no schema migration or progress reset.

Guidance prioritizes a planted crop, carried seeds, banked seeds, then the existing rat seed drop. After the objective is complete it directs banked delivery leaves back into inventory, then routes to Thorin. Brewing guidance now recognizes banked seeds too. Personal patch labels in the world show empty, remaining server-time seconds or ready status; crop data stays in each player's private profile.

Tests cover prerequisite unlock, no retroactive credit, personal harvests, item delivery, wrong NPC, one-time reward, full bags, duplicate requests, two isolated players, bank/seed/return navigation and the label time boundary. The live socket farming test also checks persisted quest progress after session replacement. Browser rendering and Render deployment remain unverified.

Future priorities: NPC-targeted Thieving, active Prayer effects, and additional level-gated herbs. Re-audit main and open PRs first.
