package pingsapi

import (
	"net/http"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"

	"caller/server/internal/push"
)

const (
	pingsCollectionName         = "pings"
	topicsCollectionName        = "topics"
	usersCollectionName         = "users"
	subscriptionsCollectionName = "subscriptions"
	activeWindow                = 5 * time.Minute
)

type pingView struct {
	Id      string `json:"id"`
	Topic   string `json:"topic"`
	SentBy  string `json:"sentBy"`
	Created string `json:"created"`
}

// Register mounts the ping send/list routes onto se.Router. Visibility is
// "only this Topic's Subscribers", which the pings collection's own
// (deliberately nil) API rules can't express, so both routes enforce it in
// Go instead of relying on generic PocketBase REST endpoints.
func Register(se *core.ServeEvent) {
	g := se.Router.Group("")
	g.BindFunc(func(e *core.RequestEvent) error {
		if e.Auth == nil {
			return e.UnauthorizedError("authentication required", nil)
		}
		return e.Next()
	})

	g.POST("/api/topics/{id}/ping", sendPingHandler)
	g.GET("/api/pings/active", listActivePingsHandler)
}

func sendPingHandler(e *core.RequestEvent) error {
	topicId := e.Request.PathValue("id")

	topic, err := e.App.FindRecordById(topicsCollectionName, topicId)
	if err != nil {
		return e.NotFoundError("topic not found", err)
	}

	if topic.GetString("senderRule") == "requesterOnly" && !e.Auth.GetBool("canRequest") {
		return e.ForbiddenError("only Requesters can send a ping for this topic", nil)
	}

	pingsCollection, err := e.App.FindCollectionByNameOrId(pingsCollectionName)
	if err != nil {
		return e.InternalServerError("pings collection missing", err)
	}

	ping := core.NewRecord(pingsCollection)
	ping.Set("topic", topicId)
	ping.Set("sentBy", e.Auth.Id)
	if err := e.App.Save(ping); err != nil {
		return e.InternalServerError("failed to send ping", err)
	}

	go dispatchPingPush(e.App, topicId, topic.GetString("name"))

	return e.JSON(http.StatusOK, toPingView(ping))
}

func dispatchPingPush(app core.App, topicId, topicName string) {
	subs, err := app.FindRecordsByFilter(subscriptionsCollectionName, "topic = {:topic}", "", 0, 0, dbx.Params{"topic": topicId})
	if err != nil {
		return
	}

	var tokens []string
	for _, s := range subs {
		user, err := app.FindRecordById(usersCollectionName, s.GetString("user"))
		if err != nil {
			continue
		}
		tokens = append(tokens, user.GetString("expoPushToken"))
	}

	push.Send(tokens, topicName, topicName, map[string]string{"topic": topicId})
}

func listActivePingsHandler(e *core.RequestEvent) error {
	subs, err := e.App.FindRecordsByFilter(subscriptionsCollectionName, "user = {:user}", "", 0, 0, dbx.Params{"user": e.Auth.Id})
	if err != nil {
		return e.InternalServerError("failed to load subscriptions", err)
	}

	topicIds := make([]string, 0, len(subs))
	for _, s := range subs {
		topicIds = append(topicIds, s.GetString("topic"))
	}
	if len(topicIds) == 0 {
		return e.JSON(http.StatusOK, []pingView{})
	}

	cutoff := types.NowDateTime().Add(-activeWindow)

	var views []pingView
	for _, topicId := range topicIds {
		pings, err := e.App.FindRecordsByFilter(
			pingsCollectionName,
			"topic = {:topic} && created >= {:cutoff}",
			"-created",
			0, 0,
			dbx.Params{"topic": topicId, "cutoff": cutoff.String()},
		)
		if err != nil {
			continue
		}
		for _, p := range pings {
			views = append(views, toPingView(p))
		}
	}

	return e.JSON(http.StatusOK, views)
}

func toPingView(p *core.Record) pingView {
	return pingView{Id: p.Id, Topic: p.GetString("topic"), SentBy: p.GetString("sentBy"), Created: p.GetString("created")}
}
