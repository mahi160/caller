package adminweb

import (
	"net/http"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

const itemsCollectionName = "items"

func listItemsHandler(e *core.RequestEvent) error {
	records, err := e.App.FindAllRecords(itemsCollectionName)
	if err != nil {
		return e.InternalServerError("failed to load items", err)
	}

	rows := make([]itemRow, 0, len(records))
	for _, r := range records {
		rows = append(rows, itemRow{
			Id:       r.Id,
			Name:     r.GetString("name"),
			IsCustom: r.GetBool("isCustom"),
		})
	}

	return e.HTML(http.StatusOK, renderItems(adminLang(e.Request), rows))
}

func createItemHandler(e *core.RequestEvent) error {
	name := strings.TrimSpace(e.Request.FormValue("name"))
	if name == "" {
		return e.BadRequestError("name is required", nil)
	}

	collection, err := e.App.FindCollectionByNameOrId(itemsCollectionName)
	if err != nil {
		return e.InternalServerError("items collection missing", err)
	}

	record := core.NewRecord(collection)
	record.Set("name", name)
	if err := e.App.Save(record); err != nil {
		return e.BadRequestError("could not create item (name may already be taken)", err)
	}

	return e.Redirect(http.StatusFound, "/admin/items")
}

func renameItemHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	name := strings.TrimSpace(e.Request.FormValue("name"))
	if name == "" {
		return e.BadRequestError("name is required", nil)
	}

	record, err := e.App.FindRecordById(itemsCollectionName, id)
	if err != nil {
		return e.NotFoundError("item not found", err)
	}

	record.Set("name", name)
	if err := e.App.Save(record); err != nil {
		return e.BadRequestError("could not rename item", err)
	}

	return e.Redirect(http.StatusFound, "/admin/items")
}

func deleteItemHandler(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	record, err := e.App.FindRecordById(itemsCollectionName, id)
	if err != nil {
		return e.NotFoundError("item not found", err)
	}

	if record.GetBool("isCustom") {
		return e.ForbiddenError("the Custom item cannot be removed", nil)
	}

	if err := e.App.Delete(record); err != nil {
		return e.InternalServerError("could not delete item", err)
	}

	return e.Redirect(http.StatusFound, "/admin/items")
}
