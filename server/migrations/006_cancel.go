package migrations

import "github.com/pocketbase/pocketbase/core"

func init() {
	core.AppMigrations.Register(func(app core.App) error {
		calls, err := app.FindCollectionByNameOrId("calls")
		if err != nil {
			return err
		}

		if status, ok := calls.Fields.GetByName("status").(*core.SelectField); ok {
			status.Values = []string{"pending", "accepted", "cancelled"}
		}
		calls.Fields.Add(&core.DateField{Name: "cancelledAt"})

		return app.Save(calls)
	}, func(app core.App) error {
		// field/rule rollback isn't safely automatable; restore from backup if needed.
		return nil
	})
}
