# Capacity-aware production batches

Production now preflights the first output before starting, so a full bag or overflowing output stack rejects immediately without starting a timer or awarding XP. Conversion recipes account for slots freed by consumed ingredients.

The new `qty: 'max'` request is resolved by the server to at most 28 actions. A read-only simulation checks ingredient quantities, intermediate inventory capacity, stack limits and Slayer credits. It neither reserves nor consumes resources. Existing numeric 1/5/28 batches retain their behavior of stopping when ingredients run out. Every timed completion still rechecks the live state, so movement, cancellation or changed supplies cannot grant free results.

Profile snapshots include ephemeral production availability per recipe. The UI displays Make max (N) and a server-provided reason when unavailable, including station, level, ingredients, current activity and output capacity. Counts reflect the latest profile and are revalidated when clicked. No planning state is stored in saved profiles.

This assists shrimp/rabbit cooking for Mara/Rusk, leather Crafting and bronze/iron Smithing for Guard quests. Existing XP, rewards, merchant prices and 1.8-second action timing stay intact. No new recipe, database migration or progress reset.

Tests cover read-only planning, full-bag conversion, limited output slots, stack overflow, free-activity cap, Slayer credits, independent player states and changed inputs. A live two-client test sends max requests, verifies no immediate reward, cancels one client and checks the other's first timed result. Previous overflow tests now assert immediate rejection rather than delayed failure.

Browser visual layout and Render deployment are not verified. Existing checkpoint persistence is unchanged; this is not crash-atomic production. Durable ground-drop transfers remain a separate priority.
