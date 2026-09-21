package adminweb

import (
	"net/http"
	"os"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

func adminPassword() string {
	if p := os.Getenv("ADMIN_PASSWORD"); p != "" {
		return p
	}
	return "admin" // dev-only fallback; set ADMIN_PASSWORD in production
}

// Register mounts the admin htmx routes onto se.Router.
func Register(se *core.ServeEvent) {
	sessions := newSessionStore()
	g := se.Router.Group("/admin")
	g.BindFunc(func(e *core.RequestEvent) error {
		if lang := e.Request.URL.Query().Get("lang"); adminStrings[lang] != nil {
			e.SetCookie(&http.Cookie{
				Name:     adminLangCookie,
				Value:    lang,
				Path:     "/admin",
				HttpOnly: true,
				SameSite: http.SameSiteLaxMode,
				Expires:  time.Now().AddDate(1, 0, 0),
			})
			// redirect (dropping ?lang=) so this same page load reflects the
			// switch immediately, instead of one request later
			return e.Redirect(http.StatusFound, e.Request.URL.Path)
		}
		return e.Next()
	})

	g.GET("/login", func(e *core.RequestEvent) error {
		return e.HTML(http.StatusOK, renderLogin(adminLang(e.Request), ""))
	})

	g.POST("/login", func(e *core.RequestEvent) error {
		data := struct {
			Password string `form:"password"`
		}{}
		if err := e.BindBody(&data); err != nil {
			return e.HTML(http.StatusBadRequest, renderLogin(adminLang(e.Request), "Invalid form submission."))
		}
		if data.Password != adminPassword() {
			return e.HTML(http.StatusUnauthorized, renderLogin(adminLang(e.Request), "Wrong password."))
		}
		tok := sessions.create()
		e.SetCookie(&http.Cookie{
			Name:     sessionCookieName,
			Value:    tok,
			Path:     "/admin",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			Expires:  time.Now().Add(sessionTTL),
		})
		return e.Redirect(http.StatusFound, "/admin/users")
	})

	g.GET("/logout", func(e *core.RequestEvent) error {
		if c, err := e.Request.Cookie(sessionCookieName); err == nil {
			sessions.revoke(c.Value)
		}
		e.SetCookie(&http.Cookie{Name: sessionCookieName, Value: "", Path: "/admin", MaxAge: -1})
		return e.Redirect(http.StatusFound, "/admin/login")
	})

	protected := g.Group("")
	protected.BindFunc(func(e *core.RequestEvent) error {
		c, err := e.Request.Cookie(sessionCookieName)
		if err != nil || !sessions.valid(c.Value) {
			return e.Redirect(http.StatusFound, "/admin/login")
		}
		return e.Next()
	})

	protected.GET("/users", listUsersHandler)
	protected.GET("/users/new", newUserFormHandler)
	protected.POST("/users", createUserHandler)
	protected.POST("/users/{id}/reset-pin", resetPinHandler)

	protected.GET("/items", listItemsHandler)
	protected.POST("/items", createItemHandler)
	protected.POST("/items/{id}/rename", renameItemHandler)
	protected.POST("/items/{id}/delete", deleteItemHandler)

	protected.GET("/topics", listTopicsHandler)
	protected.POST("/topics", createTopicHandler)
	protected.POST("/topics/{id}/update", updateTopicHandler)
	protected.POST("/topics/{id}/delete", deleteTopicHandler)

	protected.GET("/usage", usageHandler)
}
