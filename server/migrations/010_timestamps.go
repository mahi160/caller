package migrations

import "github.com/pocketbase/pocketbase/core"

// core.NewBaseCollection only auto-adds an "id" field (unlike the default
// auth collection, which gets created/updated from PocketBase's own system
// migration). Our custom base collections need them added explicitly, or
// filtering/sorting by created/updated silently has nothing to operate on.
func init() {
	core.AppMigrations.Register(func(app core.App) error {
		for _, name := range []string{"items", "pins", "calls", "declines"} {
			collection, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				return err
			}

			if collection.Fields.GetByName("created") == nil {
				collection.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
			}
			if collection.Fields.GetByName("updated") == nil {
				collection.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
			}

			if err := app.Save(collection); err != nil {
				return err
			}
		}
		return nil
	}, func(app core.App) error {
		// field rollback isn't safely automatable; restore from backup if needed.
		return nil
	})
}
