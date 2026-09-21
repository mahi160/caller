# Single-binary architecture via PocketBase-as-library

Status: accepted

Update: deployment moved from a Docker image to running the binary directly via systemd (see README) — the "single Docker image" framing below is now just "single binary"; the underlying PocketBase-as-library rationale is unchanged.

PocketBase is extended as a Go library (not run as its standalone binary) so that custom routes — the htmx-based admin app (user CRUD, usage stats) and the push-notification dispatch hook — live in the same process and ship as one binary / one Docker image. PocketBase's own built-in admin dashboard is not exposed to the real admin; it's used only as the embedded framework underneath our custom routes. This keeps the "single Docker image, portable with data" requirement intact at the cost of writing the admin UI in Go+htmx instead of a separate-language service.
