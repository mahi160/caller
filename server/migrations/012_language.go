package migrations

import "github.com/pocketbase/pocketbase/core"

func init() {
	core.AppMigrations.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		if users.Fields.GetByName("language") == nil {
			users.Fields.Add(&core.SelectField{
				Name: "language", Values: []string{"en", "bn"}, Required: true, MaxSelect: 1,
			})
		}

		// self-update already allowed via the existing UpdateRule (id = @request.auth.id)
		return app.Save(users)
	}, func(app core.App) error {
		// field rollback isn't safely automatable; restore from backup if needed.
		return nil
	})
}
