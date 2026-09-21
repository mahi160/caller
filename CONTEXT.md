# Context

## Glossary

- **Requester** — user who places a call (e.g. tea, coffee, chanachur, custom).
- **Runner** — user who can accept and fulfill a call.
- **User** — an account, admin-created, with independent `can_request` / `can_run` flags. A single person may hold both roles.
- **Call** — a request placed by a Requester for an item (tea, coffee, chanachur, custom, etc). Mode is either **broadcast** (visible to all Runners, first to accept wins) or **direct** (sent to one named Runner only).
- **Refire** — re-send the notification for an existing pending Call (not a new Call). Available only while the Call is still pending. Client-side cooldown: 10s between refires, no cap on count.
- **Item** — an entry in the admin-managed catalog (e.g. Tea, Coffee, Chanachur), plus a special "Custom" item where the Requester types free text.
- **Pin** — a per-User preference marking an Item for quick access on their home screen. Does not affect other Users.
- **Admin** — operator of the custom admin app. Creates Users (profile, role flags, initial PIN), manages the Item catalog, resets forgotten PINs, views usage stats. Not itself a Requester or Runner.
- **Language** — per-User preference, English or Bangla, full UI bilingual toggle (not just labels/free-text).
- **Topic** — an admin-managed catalog entry for group activities (e.g. Prayer, Table Tennis, FIFA). Admin sets, per Topic, who is allowed to send a Ping for it: Requesters-only, or anyone (any User regardless of role flags).
- **Ping** — a broadcast nudge to a Topic's Subscribers announcing "this is happening now" (e.g. prayer, table tennis, FIFA). Distinct from a Call: no accept/decline/complete, nobody "fulfills" it, any number of Subscribers may just show up. Sending a Ping fires a push notification immediately and adds it to an active-pings list visible only to that Topic's Subscribers, auto-expiring 5 minutes after it was sent. The message is always just the Topic name — no free-text note.
- **Subscription** — a per-User, per-Topic opt-in (unsubscribed by default) controlling whether that User receives Pings for that Topic. Independent of Pin (which is about Items, not Topics).

## Call lifecycle

States: `pending` -> `accepted` -> `completed`, or `pending`/`accepted` -> `cancelled`.

- Only the Requester who placed the Call may cancel it.
- Cancelling while `pending` (no Runner has accepted yet) is silent — no notification sent.
- Cancelling while `accepted` notifies the accepting Runner (they were already committed).
- Runner marks an accepted Call `completed` once delivered.
- A direct Call that is declined/ignored does not auto-fallback to broadcast. It stays `pending`; the Requester sees who declined and must manually Refire, retarget, or cancel.

## Deferred

- **Errand / ledger** (buying support beyond a simple "buy" Call): Runner runs an errand for multiple people, tracks who owes what, marks settled. Structure not yet decided — revisit later. For now, buying is just a Call with a free-text note (e.g. "buy me a samosa"), no money tracking.

## Usage stats (admin)

Every Call retains full detail for reporting: who requested, who was notified, who accepted (and who declined first, if any), the Item, timestamps for each state transition (created/accepted/completed/cancelled) so time-to-accept and time-to-complete can be derived, and per-User rollups (calls made, calls fulfilled, decline count).
