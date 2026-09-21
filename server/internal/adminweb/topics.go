package adminweb

import (
	"net/http"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

const topicsCollectionName = "topics"

func listTopicsHandler(e *core.RequestEvent) error {
	records, err := e.App.FindAllRecords(topicsCollectionName)
	if err != nil {
		return e.InternalServerError("failed to load topics", err)
	}

	rows := make([]topicRow, 0, len(records))
	for _, r := range records {
		rows = append(rows, topicRow{
			Id:         r.Id,
			Name:       r.GetString("name"),
			SenderRule: r.GetString("senderRule"),
		})
	}

	return e.HTML(http.StatusOK, renderTopics(adminLang(e.Request), rows))
}

func createTopicHandler(e *core.RequestEvent) error {
	name := strings.TrimSpace(e.Request.FormValue("name"))
	senderRule := e.Request.FormValue("senderRule")
	if name == "" || (senderRule != "requesterOnly" && senderRule != "anyone") {
		return e.BadRequestError("name and a valid senderRule are required", nil)
	}

	collection, err := e.App.FindCollectionByNameOrId(topicsCollectionName)
	if err != nil {
		return e.InternalServerError("topics collection missing", err)
	}

	record := core.NewRecord(collection)
	record.Set("name", name)
	record.Set("senderRule", senderRule)
	if err := e.App.Save(record); err != nil {
		return e.BadRequestError("could not create topic (name may already be taken)", err)
	}

	return e.Redirect(http.StatusFound, "/admin/topics")
}

func updateTopicHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	name := strings.TrimSpace(e.Request.FormValue("name"))
	senderRule := e.Request.FormValue("senderRule")
	if name == "" || (senderRule != "requesterOnly" && senderRule != "anyone") {
		return e.BadRequestError("name and a valid senderRule are required", nil)
	}

	record, err := e.App.FindRecordById(topicsCollectionName, id)
	if err != nil {
		return e.NotFoundError("topic not found", err)
	}

	record.Set("name", name)
	record.Set("senderRule", senderRule)
	if err := e.App.Save(record); err != nil {
		return e.BadRequestError("could not update topic", err)
	}

	return e.Redirect(http.StatusFound, "/admin/topics")
}

func deleteTopicHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	record, err := e.App.FindRecordById(topicsCollectionName, id)
	if err != nil {
		return e.NotFoundError("topic not found", err)
	}

	// CascadeDelete on subscriptions.topic removes orphaned Subscriptions too
	if err := e.App.Delete(record); err != nil {
		return e.InternalServerError("could not delete topic", err)
	}

	return e.Redirect(http.StatusFound, "/admin/topics")
}
