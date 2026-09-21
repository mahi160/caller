package migrations

import "github.com/pocketbase/pocketbase/core"

// pings has no ListRule/CreateRule of its own: visibility is "only this
// Topic's Subscribers", which isn't expressible as a simple PocketBase
// filter across the subscriptions collection, so reads/writes go entirely
// through the custom /api/pings and /api/topics/{id}/ping routes (Go code
// bypasses REST API rules).
func init() {
	core.AppMigrations.Register(func(app core.App) error {
		usersCollection, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		topicsCollection, err := app.FindCollectionByNameOrId("topics")
		if err != nil {
			return err
		}

		pings := core.NewBaseCollection("pings")
		pings.Fields.Add(
			&core.RelationField{Name: "topic", CollectionId: topicsCollection.Id, Required: true, MaxSelect: 1, CascadeDelete: true},
			&core.RelationField{Name: "sentBy", CollectionId: usersCollection.Id, Required: true, MaxSelect: 1},
			&core.AutodateField{Name: "created", OnCreate: true},
		)
		pings.ListRule = nil
		pings.ViewRule = nil
		pings.CreateRule = nil
		pings.UpdateRule = nil
		pings.DeleteRule = nil

		return app.Save(pings)
	}, func(app core.App) error {
		if c, err := app.FindCollectionByNameOrId("pings"); err == nil {
			return app.Delete(c)
		}
		return nil
	})
}
