# Ping is a separate concept from Call, not an Item variant

Status: accepted

Group-activity announcements (prayer, table tennis, FIFA) are modeled as a new primitive, **Ping**, rather than shoehorned into the existing Item/Call catalog. A Call always has exactly one fulfiller (accept/decline/complete, single-winner semantics); a Ping has none of that — it's a broadcast nudge to a Topic's Subscribers that any number of people may respond to just by showing up, with no accept/complete step. Reusing Call would have meant inventing a fake "accept" for something nobody actually fulfills, and would have polluted Call's usage stats (time-to-accept, time-to-complete) with rows that don't mean the same thing. The cost is a second broadcast mechanism in the codebase instead of one, but the two are genuinely different shapes (1:1 fulfillment vs 1:many group nudge), so a future reader shouldn't be surprised to find them separate.
