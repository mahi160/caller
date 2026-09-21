package migrations

import "github.com/pocketbase/pocketbase/core"

func init() {
	core.AppMigrations.Register(func(app core.App) error {
		calls, err := app.FindCollectionByNameOrId("calls")
		if err != nil {
			return err
		}

		calls.Fields.Add(
			&core.BoolField{Name: "isBuy"},
			&core.TextField{Name: "note", Max: 500},
		)

		return app.Save(calls)
	}, func(app core.App) error {
		// field rollback isn't safely automatable; restore from backup if needed.
		return nil
	})
}
