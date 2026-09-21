package adminweb

import (
	"net/http"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

const callsCollectionName = "calls"

// duration returns a short human-readable delta between two PocketBase
// timestamp strings, or "" if either side is missing (step hasn't happened yet).
func duration(fromStr, toStr string) string {
	if fromStr == "" || toStr == "" {
		return ""
	}
	const layout = "2006-01-02 15:04:05.000Z"
	fromT, err1 := time.Parse(layout, fromStr)
	toT, err2 := time.Parse(layout, toStr)
	if err1 != nil || err2 != nil {
		return ""
	}
	d := toT.Sub(fromT)
	if d < 0 {
		return ""
	}
	return d.Round(time.Second).String()
}

type usageRow struct {
	Requester    string
	Item         string
	Status       string
	AcceptedBy   string
	DeclinedBy   string
	Created      string
	AcceptedAt   string
	CompletedAt  string
	CancelledAt  string
	TimeToAccept string
	TimeToRun    string
}

type userTotals struct {
	Name      string
	Made      int
	Fulfilled int
	Declined  int
}

func usageHandler(e *core.RequestEvent) error {
	from := strings.TrimSpace(e.Request.URL.Query().Get("from"))
	to := strings.TrimSpace(e.Request.URL.Query().Get("to"))

	filter := ""
	params := dbx.Params{}
	if from != "" {
		filter += "created >= {:from}"
		params["from"] = from + " 00:00:00"
	}
	if to != "" {
		if filter != "" {
			filter += " && "
		}
		filter += "created <= {:to}"
		params["to"] = to + " 23:59:59"
	}

	calls, err := e.App.FindRecordsByFilter(callsCollectionName, filter, "-created", 0, 0, params)
	if err != nil {
		return e.InternalServerError("failed to load calls", err)
	}

	users, err := e.App.FindAllRecords(usersCollectionName)
	if err != nil {
		return e.InternalServerError("failed to load users", err)
	}
	userNames := map[string]string{}
	for _, u := range users {
		userNames[u.Id] = u.GetString("name")
	}

	items, err := e.App.FindAllRecords(itemsCollectionName)
	if err != nil {
		return e.InternalServerError("failed to load items", err)
	}
	itemNames := map[string]string{}
	for _, i := range items {
		itemNames[i.Id] = i.GetString("name")
	}

	name := func(id string) string {
		if id == "" {
			return ""
		}
		if n, ok := userNames[id]; ok {
			return n
		}
		return id
	}

	rows := make([]usageRow, 0, len(calls))
	totals := map[string]*userTotals{}
	totalFor := func(id string) *userTotals {
		t, ok := totals[id]
		if !ok {
			t = &userTotals{Name: name(id)}
			totals[id] = t
		}
		return t
	}

	for _, c := range calls {
		rows = append(rows, usageRow{
			Requester:    name(c.GetString("requester")),
			Item:         itemNames[c.GetString("item")],
			Status:       c.GetString("status"),
			AcceptedBy:   name(c.GetString("acceptedBy")),
			DeclinedBy:   name(c.GetString("declinedBy")),
			Created:      c.GetString("created"),
			AcceptedAt:   c.GetString("acceptedAt"),
			CompletedAt:  c.GetString("completedAt"),
			CancelledAt:  c.GetString("cancelledAt"),
			TimeToAccept: duration(c.GetString("created"), c.GetString("acceptedAt")),
			TimeToRun:    duration(c.GetString("acceptedAt"), c.GetString("completedAt")),
		})

		if requester := c.GetString("requester"); requester != "" {
			totalFor(requester).Made++
		}
		if c.GetString("status") == "completed" {
			if runner := c.GetString("acceptedBy"); runner != "" {
				totalFor(runner).Fulfilled++
			}
		}
	}

	declineFilter := ""
	declineParams := dbx.Params{}
	if from != "" {
		declineFilter += "created >= {:from}"
		declineParams["from"] = from + " 00:00:00"
	}
	if to != "" {
		if declineFilter != "" {
			declineFilter += " && "
		}
		declineFilter += "created <= {:to}"
		declineParams["to"] = to + " 23:59:59"
	}
	declines, err := e.App.FindRecordsByFilter("declines", declineFilter, "", 0, 0, declineParams)
	if err == nil {
		for _, d := range declines {
			if runner := d.GetString("runner"); runner != "" {
				totalFor(runner).Declined++
			}
		}
	}

	totalRows := make([]userTotals, 0, len(totals))
	for _, t := range totals {
		totalRows = append(totalRows, *t)
	}

	return e.HTML(http.StatusOK, renderUsage(adminLang(e.Request), rows, totalRows, from, to))
}
