# PocketBase as the backend

Status: accepted

We use PocketBase (Go binary, embedded SQLite, auto REST API, admin dashboard, realtime via SSE) as the backend, instead of a custom Node/Go service with a hand-rolled WebSocket server. This trades a fully tailored PIN-based auth and admin UI for a nearly-free backend and strong single-file portability — the tea/coffee-call scale of this app doesn't need the control a custom backend would offer, and we're treating this as an experiment. Realtime notification transport is therefore SSE, not raw WebSocket. Custom PIN auth and a tailored admin usage page will be built as thin layers on top of PocketBase's API/hooks rather than as first-class PocketBase features.
