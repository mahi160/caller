// Package web embeds the mobile app's static web (PWA) export so the server
// binary can serve it directly, same-origin with the API. Run the export
// before `go build` (see README) — `server/web/dist` is checked in with only
// a placeholder index.html until that's done.
package web

import "embed"

//go:embed all:dist
var Dist embed.FS
