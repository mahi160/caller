package adminweb

import (
	"net/http"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

const usersCollectionName = "users"

func listUsersHandler(e *core.RequestEvent) error {
	records, err := e.App.FindAllRecords(usersCollectionName)
	if err != nil {
		return e.InternalServerError("failed to load users", err)
	}

	rows := make([]userRow, 0, len(records))
	for _, r := range records {
		rows = append(rows, userRow{
			Id:          r.Id,
			Username:    r.GetString("username"),
			DisplayName: r.GetString("name"),
			CanRequest:  r.GetBool("canRequest"),
			CanRun:      r.GetBool("canRun"),
		})
	}

	return e.HTML(http.StatusOK, renderUsers(adminLang(e.Request), rows))
}

func newUserFormHandler(e *core.RequestEvent) error {
	return e.HTML(http.StatusOK, renderNewUser(adminLang(e.Request), ""))
}

type createUserForm struct {
	Username    string `form:"username"`
	DisplayName string `form:"displayName"` // maps to the collection's "name" field
	Pin         string `form:"pin"`
	CanRequest  bool   `form:"canRequest"`
	CanRun      bool   `form:"canRun"`
}

func createUserHandler(e *core.RequestEvent) error {
	lang := adminLang(e.Request)

	data := createUserForm{}
	if err := e.BindBody(&data); err != nil {
		return e.HTML(http.StatusBadRequest, renderNewUser(lang, "Invalid form submission."))
	}

	data.Username = strings.TrimSpace(data.Username)
	data.DisplayName = strings.TrimSpace(data.DisplayName)

	if data.Username == "" || data.DisplayName == "" || len(data.Pin) < 4 {
		return e.HTML(http.StatusBadRequest, renderNewUser(lang, "Username, display name and a PIN of at least 4 characters are required."))
	}

	collection, err := e.App.FindCollectionByNameOrId(usersCollectionName)
	if err != nil {
		return e.InternalServerError("users collection missing", err)
	}

	record := core.NewRecord(collection)
	record.Set("username", data.Username)
	record.Set("name", data.DisplayName)
	record.Set("canRequest", data.CanRequest)
	record.Set("canRun", data.CanRun)
	record.Set("language", "en") // default; the user can switch it themselves once logged in
	record.SetPassword(data.Pin)

	if err := e.App.Save(record); err != nil {
		return e.HTML(http.StatusBadRequest, renderNewUser(lang, "Could not create user (username may already be taken)."))
	}

	return e.Redirect(http.StatusFound, "/admin/users")
}

func resetPinHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	pin := e.Request.FormValue("pin")

	if len(pin) < 4 {
		return e.BadRequestError("PIN must be at least 4 characters", nil)
	}

	record, err := e.App.FindRecordById(usersCollectionName, id)
	if err != nil {
		return e.NotFoundError("user not found", err)
	}

	record.SetPassword(pin)
	if err := e.App.Save(record); err != nil {
		return e.InternalServerError("failed to reset PIN", err)
	}

	return e.Redirect(http.StatusFound, "/admin/users")
}
