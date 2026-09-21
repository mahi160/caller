package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// declines is a permanent, append-only log of decline events, separate from
// calls.declinedBy (which gets cleared on retarget). It backs both the
// Runner's "declined today" counter (ticket 11) and admin usage stats
// (ticket 13), neither of which should lose history when a call is retargeted.
func init() {
	core.AppMigrations.Register(func(app core.App) error {
		usersCollection, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		callsCollection, err := app.FindCollectionByNameOrId("calls")
		if err != nil {
			return err
		}

		declines := core.NewBaseCollection("declines")
		declines.Fields.Add(
			&core.RelationField{Name: "call", CollectionId: callsCollection.Id, Required: true, MaxSelect: 1},
			&core.RelationField{Name: "runner", CollectionId: usersCollection.Id, Required: true, MaxSelect: 1},
		)

		declines.ListRule = types.Pointer("runner = @request.auth.id")
		declines.ViewRule = declines.ListRule
		// only our decline action route writes here (in Go, bypassing API rules);
		// nobody can create/edit/delete this log through the public API.
		declines.CreateRule = nil
		declines.UpdateRule = nil
		declines.DeleteRule = nil

		return app.Save(declines)
	}, func(app core.App) error {
		if c, err := app.FindCollectionByNameOrId("declines"); err == nil {
			return app.Delete(c)
		}
		return nil
	})
}
