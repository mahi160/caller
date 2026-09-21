package callsapi

import (
	"net/http"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"

	"caller/server/internal/push"
)

const callsCollectionName = "calls"

// RegisterHooks enforces invariants that a REST create/update request could
// otherwise bypass or get wrong.
func RegisterHooks(app core.App) {
	app.OnRecordCreateRequest(callsCollectionName).BindFunc(func(e *core.RecordRequestEvent) error {
		// a Call always starts pending regardless of what the client sends;
		// acceptance only ever happens through the guarded /accept action below.
		e.Record.Set("status", "pending")
		e.Record.Set("acceptedBy", "")
		e.Record.Set("acceptedAt", nil)
		e.Record.Set("declinedBy", "")

		// mode is derived from whether a target Runner was given, not client-supplied
		if e.Record.GetString("targetRunner") != "" {
			e.Record.Set("mode", "direct")
		} else {
			e.Record.Set("mode", "broadcast")
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(callsCollectionName).BindFunc(func(e *core.RecordEvent) error {
		record := e.Record
		go dispatchNewCallPush(e.App, record)
		return e.Next()
	})
}

func dispatchNewCallPush(app core.App, call *core.Record) {
	itemName := "an item"
	if item, err := app.FindRecordById("items", call.GetString("item")); err == nil {
		itemName = item.GetString("name")
	}

	var tokens []string
	if call.GetString("mode") == "direct" {
		if target, err := app.FindRecordById("users", call.GetString("targetRunner")); err == nil {
			tokens = []string{target.GetString("expoPushToken")}
		}
	} else {
		runners, err := app.FindRecordsByFilter("users", "canRun = true", "", 0, 0)
		if err == nil {
			for _, r := range runners {
				tokens = append(tokens, r.GetString("expoPushToken"))
			}
		}
	}

	push.Send(tokens, "New call", itemName+" requested", map[string]string{"callId": call.Id})
}

// Register mounts the custom call action routes onto se.Router.
func Register(se *core.ServeEvent) {
	g := se.Router.Group("/api/calls")
	g.BindFunc(func(e *core.RequestEvent) error {
		if e.Auth == nil {
			return e.UnauthorizedError("authentication required", nil)
		}
		return e.Next()
	})

	g.POST("/{id}/accept", acceptHandler)
	g.POST("/{id}/decline", declineHandler)
	g.POST("/{id}/retarget", retargetHandler)
	g.POST("/{id}/refire", refireHandler)
	g.POST("/{id}/cancel", cancelHandler)
	g.POST("/{id}/complete", completeHandler)
}

func acceptHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	runnerId := e.Auth.Id

	var conflict bool

	var forbidden bool

	err := e.App.RunInTransaction(func(txApp core.App) error {
		record, err := txApp.FindRecordById(callsCollectionName, id)
		if err != nil {
			return err
		}

		if record.GetString("mode") == "direct" && record.GetString("targetRunner") != runnerId {
			forbidden = true
			return nil
		}

		if record.GetString("status") != "pending" {
			conflict = true
			return nil
		}

		record.Set("status", "accepted")
		record.Set("acceptedBy", runnerId)
		record.Set("acceptedAt", types.NowDateTime())

		return txApp.Save(record)
	})

	if err != nil {
		return e.NotFoundError("call not found", err)
	}
	if forbidden {
		return e.ForbiddenError("this call isn't targeted at you", nil)
	}
	if conflict {
		return e.Error(http.StatusConflict, "this call has already been accepted", nil)
	}

	record, err := e.App.FindRecordById(callsCollectionName, id)
	if err != nil {
		return e.InternalServerError("failed to load accepted call", err)
	}
	return e.JSON(http.StatusOK, record)
}

func declineHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	runnerId := e.Auth.Id

	record, err := e.App.FindRecordById(callsCollectionName, id)
	if err != nil {
		return e.NotFoundError("call not found", err)
	}

	if record.GetString("mode") != "direct" || record.GetString("targetRunner") != runnerId {
		return e.ForbiddenError("this call isn't targeted at you", nil)
	}
	if record.GetString("status") != "pending" {
		return e.Error(http.StatusConflict, "this call is no longer pending", nil)
	}

	record.Set("declinedBy", runnerId)
	if err := e.App.Save(record); err != nil {
		return e.InternalServerError("failed to decline call", err)
	}

	if declinesCollection, err := e.App.FindCollectionByNameOrId("declines"); err == nil {
		log := core.NewRecord(declinesCollection)
		log.Set("call", record.Id)
		log.Set("runner", runnerId)
		_ = e.App.Save(log) // best-effort; a missed log entry shouldn't fail the decline itself
	}

	return e.JSON(http.StatusOK, record)
}

func completeHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	record, err := e.App.FindRecordById(callsCollectionName, id)
	if err != nil {
		return e.NotFoundError("call not found", err)
	}

	if record.GetString("acceptedBy") != e.Auth.Id {
		return e.ForbiddenError("only the accepting Runner can mark this call complete", nil)
	}
	if record.GetString("status") != "accepted" {
		return e.Error(http.StatusConflict, "this call hasn't been accepted (or is already closed)", nil)
	}

	record.Set("status", "completed")
	record.Set("completedAt", types.NowDateTime())
	if err := e.App.Save(record); err != nil {
		return e.InternalServerError("failed to complete call", err)
	}

	return e.JSON(http.StatusOK, record)
}

func cancelHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	record, err := e.App.FindRecordById(callsCollectionName, id)
	if err != nil {
		return e.NotFoundError("call not found", err)
	}

	if record.GetString("requester") != e.Auth.Id {
		return e.ForbiddenError("only the requester can cancel this call", nil)
	}

	status := record.GetString("status")
	if status != "pending" && status != "accepted" {
		return e.Error(http.StatusConflict, "this call can no longer be cancelled", nil)
	}

	// silent vs. notify is a delivery-channel concern (ticket 10's push wiring):
	// cancelling a pending call just removes it from Runners' filtered views;
	// cancelling an accepted call still reaches the accepting Runner because
	// they're already subscribed to this specific record via ViewRule.
	record.Set("status", "cancelled")
	record.Set("cancelledAt", types.NowDateTime())
	if err := e.App.Save(record); err != nil {
		return e.InternalServerError("failed to cancel call", err)
	}

	return e.JSON(http.StatusOK, record)
}

func refireHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	record, err := e.App.FindRecordById(callsCollectionName, id)
	if err != nil {
		return e.NotFoundError("call not found", err)
	}

	if record.GetString("requester") != e.Auth.Id {
		return e.ForbiddenError("only the requester can refire this call", nil)
	}
	if record.GetString("status") != "pending" {
		return e.Error(http.StatusConflict, "this call is no longer pending", nil)
	}

	// overwrites the same field (no new history entry) and triggers a realtime
	// update event to whoever is already subscribed/notified for this call.
	record.Set("refiredAt", types.NowDateTime())
	if err := e.App.Save(record); err != nil {
		return e.InternalServerError("failed to refire call", err)
	}

	return e.JSON(http.StatusOK, record)
}

func retargetHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	data := struct {
		TargetRunner string `json:"targetRunner"`
	}{}
	if err := e.BindBody(&data); err != nil || data.TargetRunner == "" {
		return e.BadRequestError("targetRunner is required", err)
	}

	record, err := e.App.FindRecordById(callsCollectionName, id)
	if err != nil {
		return e.NotFoundError("call not found", err)
	}

	if record.GetString("requester") != e.Auth.Id {
		return e.ForbiddenError("only the requester can retarget this call", nil)
	}
	if record.GetString("status") != "pending" {
		return e.Error(http.StatusConflict, "this call is no longer pending", nil)
	}

	record.Set("targetRunner", data.TargetRunner)
	record.Set("mode", "direct")
	record.Set("declinedBy", "")
	if err := e.App.Save(record); err != nil {
		return e.InternalServerError("failed to retarget call", err)
	}

	return e.JSON(http.StatusOK, record)
}
