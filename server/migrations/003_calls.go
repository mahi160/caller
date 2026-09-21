package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	core.AppMigrations.Register(func(app core.App) error {
		usersCollection, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		itemsCollection, err := app.FindCollectionByNameOrId("items")
		if err != nil {
			return err
		}

		calls := core.NewBaseCollection("calls")
		calls.Fields.Add(
			&core.RelationField{Name: "requester", CollectionId: usersCollection.Id, Required: true, MaxSelect: 1},
			&core.RelationField{Name: "item", CollectionId: itemsCollection.Id, Required: true, MaxSelect: 1},
			&core.SelectField{Name: "status", Values: []string{"pending", "accepted"}, Required: true, MaxSelect: 1},
			&core.RelationField{Name: "acceptedBy", CollectionId: usersCollection.Id, MaxSelect: 1},
			&core.DateField{Name: "acceptedAt"},
		)

		// broad read access: any logged-in user can see the call list (small trusted
		// internal tool); writes go through our own atomic action routes instead of
		// generic record updates so the "first Runner wins" transition stays safe.
		calls.ListRule = types.Pointer("@request.auth.id != ''")
		calls.ViewRule = types.Pointer("@request.auth.id != ''")
		calls.CreateRule = types.Pointer("@request.auth.id != '' && requester = @request.auth.id")
		calls.UpdateRule = nil
		calls.DeleteRule = nil

		return app.Save(calls)
	}, func(app core.App) error {
		if c, err := app.FindCollectionByNameOrId("calls"); err == nil {
			return app.Delete(c)
		}
		return nil
	})
}
