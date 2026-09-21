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

		items := core.NewBaseCollection("items")
		items.Fields.Add(
			&core.TextField{Name: "name", Required: true, Max: 128},
			&core.BoolField{Name: "isCustom"},
		)
		items.AddIndex("idx_items_name", true, "name", "")
		// readable by any authenticated user; managed only by our admin backend
		items.ListRule = types.Pointer("@request.auth.id != ''")
		items.ViewRule = types.Pointer("@request.auth.id != ''")
		items.CreateRule = nil
		items.UpdateRule = nil
		items.DeleteRule = nil
		if err := app.Save(items); err != nil {
			return err
		}

		// seed the always-present "Custom" item (free-text call)
		custom := core.NewRecord(items)
		custom.Set("name", "Custom")
		custom.Set("isCustom", true)
		if err := app.Save(custom); err != nil {
			return err
		}

		pins := core.NewBaseCollection("pins")
		pins.Fields.Add(
			&core.RelationField{Name: "user", CollectionId: usersCollection.Id, Required: true, MaxSelect: 1},
			&core.RelationField{Name: "item", CollectionId: items.Id, Required: true, MaxSelect: 1},
		)
		pins.AddIndex("idx_pins_user_item", true, "user, item", "")
		// each user manages only their own pins directly through the API
		pins.ListRule = types.Pointer("user = @request.auth.id")
		pins.ViewRule = types.Pointer("user = @request.auth.id")
		pins.CreateRule = types.Pointer("@request.auth.id != '' && user = @request.auth.id")
		pins.UpdateRule = nil
		pins.DeleteRule = types.Pointer("user = @request.auth.id")
		return app.Save(pins)
	}, func(app core.App) error {
		if c, err := app.FindCollectionByNameOrId("pins"); err == nil {
			if err := app.Delete(c); err != nil {
				return err
			}
		}
		if c, err := app.FindCollectionByNameOrId("items"); err == nil {
			return app.Delete(c)
		}
		return nil
	})
}
