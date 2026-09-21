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

		calls, err := app.FindCollectionByNameOrId("calls")
		if err != nil {
			return err
		}

		calls.Fields.Add(
			&core.SelectField{Name: "mode", Values: []string{"broadcast", "direct"}, Required: true, MaxSelect: 1},
			&core.RelationField{Name: "targetRunner", CollectionId: usersCollection.Id, MaxSelect: 1},
			&core.RelationField{Name: "declinedBy", CollectionId: usersCollection.Id, MaxSelect: 1},
		)

		// broadcast calls stay visible to everyone; direct calls are visible only
		// to the requester and the targeted Runner (also enforced on realtime
		// subscriptions, since PocketBase applies ViewRule per broadcast record).
		calls.ListRule = types.Pointer("requester = @request.auth.id || mode = 'broadcast' || targetRunner = @request.auth.id")
		calls.ViewRule = calls.ListRule

		return app.Save(calls)
	}, func(app core.App) error {
		// field/rule rollback isn't safely automatable; restore from backup if needed.
		return nil
	})
}
