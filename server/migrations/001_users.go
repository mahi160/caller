package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// This migration adapts PocketBase's default "users" auth collection (already
// created by its system migrations) to our username+PIN model instead of
// email+password, and adds the Requester/Runner role flags.
func init() {
	core.AppMigrations.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		// we authenticate with username + PIN, not email
		if email, ok := collection.Fields.GetByName("email").(*core.EmailField); ok {
			email.Required = false
		}
		if pin, ok := collection.Fields.GetByName("password").(*core.PasswordField); ok {
			pin.Min = 4
		}
		if name, ok := collection.Fields.GetByName("name").(*core.TextField); ok {
			name.Required = true // used as displayName
		}

		if collection.Fields.GetByName("username") == nil {
			collection.Fields.Add(&core.TextField{Name: "username", Required: true, Max: 64})
			collection.AddIndex("idx_users_username", true, "username", "")
		}
		if collection.Fields.GetByName("canRequest") == nil {
			collection.Fields.Add(&core.BoolField{Name: "canRequest"})
		}
		if collection.Fields.GetByName("canRun") == nil {
			collection.Fields.Add(&core.BoolField{Name: "canRun"})
		}

		collection.PasswordAuth.Enabled = true
		collection.PasswordAuth.IdentityFields = []string{"username"}
		collection.OAuth2.Enabled = false

		// records are managed by our own admin backend (superuser-level Go code),
		// not directly through the public API
		collection.ListRule = nil
		// self password/PIN change goes through the API (PocketBase requires the
		// old PIN for non-manage updates); everything else is admin-managed in Go.
		collection.ViewRule = types.Pointer("id = @request.auth.id")
		collection.CreateRule = nil
		collection.UpdateRule = types.Pointer("id = @request.auth.id")
		collection.DeleteRule = nil

		return app.Save(collection)
	}, func(app core.App) error {
		// reverting the default "users" collection tweaks isn't safely
		// automatable; restore from backup if this migration must be undone.
		return nil
	})
}
