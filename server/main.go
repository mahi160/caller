package main

import (
	"io/fs"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/hashicorp/mdns"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"

	"caller/server/internal/adminweb"
	"caller/server/internal/callsapi"
	"caller/server/internal/pingsapi"
	_ "caller/server/migrations"
	"caller/server/web"
)

func main() {
	app := pocketbase.NewWithConfig(pocketbase.Config{
		DefaultDataDir: dataDir(),
	})

	callsapi.RegisterHooks(app)

	app.OnBootstrap().BindFunc(func(e *core.BootstrapEvent) error {
		if err := e.Next(); err != nil {
			return err
		}
		return e.App.RunAppMigrations()
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.GET("/healthz", func(re *core.RequestEvent) error {
			return re.JSON(http.StatusOK, map[string]string{"status": "ok"})
		})
		adminweb.Register(se)
		callsapi.Register(se)
		pingsapi.Register(se)

		webFS, err := fs.Sub(web.Dist, "dist")
		if err != nil {
			return err
		}
		se.Router.GET("/{path...}", apis.Static(webFS, true))

		go advertiseMDNS()
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func dataDir() string {
	if d := os.Getenv("PB_DATA_DIR"); d != "" {
		return d
	}
	return "./pb_data"
}

// advertiseMDNS makes the server discoverable on the LAN as `_caller._tcp`,
// so the mobile app can find it without the user typing an IP. Best-effort:
// failures (e.g. multicast blocked) just mean the app falls back to manual
// entry.
func advertiseMDNS() {
	port := 8090
	if p := os.Getenv("MDNS_PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	host, err := os.Hostname()
	if err != nil {
		host = "caller"
	}
	svc, err := mdns.NewMDNSService(host, "_caller._tcp", "", "", port, nil, []string{"caller-server"})
	if err != nil {
		log.Printf("mdns: %v", err)
		return
	}
	if _, err := mdns.NewServer(&mdns.Config{Zone: svc}); err != nil {
		log.Printf("mdns: %v", err)
	}
}
