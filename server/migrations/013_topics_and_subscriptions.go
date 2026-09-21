package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// Topics back Pings (ADR 0004) — group-activity nudges, a separate concept
// from Calls. Subscriptions are per-User, per-Topic, opt-in (unsubscribed by
// default), independent of Pins (which are about Items).
func init() {
	core.AppMigrations.Register(func(app core.App) error {
		usersCollection, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		topics := core.NewBaseCollection("topics")
		topics.Fields.Add(
			&core.TextField{Name: "name", Required: true, Max: 128},
			&core.SelectField{Name: "senderRule", Values: []string{"requesterOnly", "anyone"}, Required: true, MaxSelect: 1},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		topics.AddIndex("idx_topics_name", true, "name", "")
		// readable by any authenticated user; managed only by our admin backend
		topics.ListRule = types.Pointer("@request.auth.id != ''")
		topics.ViewRule = types.Pointer("@request.auth.id != ''")
		topics.CreateRule = nil
		topics.UpdateRule = nil
		topics.DeleteRule = nil
		if err := app.Save(topics); err != nil {
			return err
		}

		subscriptions := core.NewBaseCollection("subscriptions")
		subscriptions.Fields.Add(
			&core.RelationField{Name: "user", CollectionId: usersCollection.Id, Required: true, MaxSelect: 1},
			&core.RelationField{Name: "topic", CollectionId: topics.Id, Required: true, MaxSelect: 1, CascadeDelete: true},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		subscriptions.AddIndex("idx_subscriptions_user_topic", true, "user, topic", "")
		// each user manages only their own subscriptions directly through the API
		subscriptions.ListRule = types.Pointer("user = @request.auth.id")
		subscriptions.ViewRule = subscriptions.ListRule
		subscriptions.CreateRule = types.Pointer("@request.auth.id != '' && user = @request.auth.id")
		subscriptions.UpdateRule = nil
		subscriptions.DeleteRule = types.Pointer("user = @request.auth.id")
		return app.Save(subscriptions)
	}, func(app core.App) error {
		if c, err := app.FindCollectionByNameOrId("subscriptions"); err == nil {
			if err := app.Delete(c); err != nil {
				return err
			}
		}
		if c, err := app.FindCollectionByNameOrId("topics"); err == nil {
			return app.Delete(c)
		}
		return nil
	})
}
