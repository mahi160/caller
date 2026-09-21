package adminweb

import (
	"bytes"
	"html/template"
)

const layout = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>caller admin</title>
<script src="https://unpkg.com/htmx.org@1.9.12"></script>
<style>
  :root {
    --bg: #FBF7F0; --card: #F1E9DA; --accent: #2F6D5B; --accent-text: #FFFFFF;
    --danger: #B5541E; --danger-bg: #F4DFCB; --border: #E7DECB; --text: #2B2620; --text-secondary: #8A8072;
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--bg); color: var(--text);
    max-width: 720px; margin: 2rem auto; padding: 0 1rem;
  }
  h1, h2 { color: var(--text); }
  a { color: var(--accent); text-decoration: none; font-weight: 600; }
  nav { font-size: 0.9em; margin-bottom: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; }
  .lang-switch { text-align: right; font-size: 0.85em; margin-bottom: 1rem; }
  .card {
    background: var(--card); border: 1px solid var(--border); border-radius: 20px;
    padding: 1.5rem; margin-bottom: 1.5rem;
  }
  .error { color: var(--danger); background: var(--danger-bg); border-radius: 8px; padding: 0.6rem 1rem; }
  table {
    width: 100%; border-collapse: collapse; background: #fff;
    border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 1rem;
  }
  th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.95em; }
  th { background: var(--card); }
  tr:last-child td { border-bottom: none; }
  label { display: block; margin-bottom: 0.75rem; font-size: 0.95em; }
  input[type=text], input[type=password], input[type=date] {
    border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.75rem;
    font-size: 1rem; margin-top: 0.25rem;
  }
  button {
    background: var(--accent); color: var(--accent-text); border: none; border-radius: 999px;
    padding: 0.55rem 1.2rem; font-weight: 600; font-size: 0.95em; cursor: pointer;
  }
  button:hover { opacity: 0.9; }
</style>
</head>
<body>
<p class="lang-switch">
  <a href="?lang=en">English</a> · <a href="?lang=bn">বাংলা</a>
</p>
{{.Body}}
</body>
</html>`

const loginBody = `
<div class="card">
<h1>caller admin</h1>
{{if .Data.Error}}<p class="error">{{.Data.Error}}</p>{{end}}
<form method="post" action="/admin/login">
  <label>{{.T.password}} <input type="password" name="password" required></label>
  <button type="submit">{{.T.logIn}}</button>
</form>
</div>`

const usersBody = `
<h1>{{.T.users}}</h1>
<nav><a href="/admin/users/new">{{.T.newUser}}</a> <a href="/admin/items">{{.T.items}}</a> <a href="/admin/topics">{{.T.topics}}</a> <a href="/admin/usage">{{.T.usage}}</a> <a href="/admin/logout">{{.T.logOut}}</a></nav>
<table>
<tr><th>{{.T.username}}</th><th>{{.T.displayName}}</th><th>{{.T.canRequest}}</th><th>{{.T.canRun}}</th><th></th></tr>
{{range .Data.Users}}
<tr>
  <td>{{.Username}}</td>
  <td>{{.DisplayName}}</td>
  <td>{{if .CanRequest}}yes{{else}}no{{end}}</td>
  <td>{{if .CanRun}}yes{{else}}no{{end}}</td>
  <td>
    <form method="post" action="/admin/users/{{.Id}}/reset-pin" style="display:inline-flex;gap:0.5rem;align-items:center">
      <input type="text" name="pin" placeholder="{{$.T.newPin}}" required minlength="4" style="width:6em">
      <button type="submit">{{$.T.resetPin}}</button>
    </form>
  </td>
</tr>
{{end}}
</table>`

const newUserBody = `
<div class="card">
<h1>{{.T.newUser}}</h1>
{{if .Data.Error}}<p class="error">{{.Data.Error}}</p>{{end}}
<form method="post" action="/admin/users">
  <label>{{.T.username}} <input type="text" name="username" required></label>
  <label>{{.T.displayName}} <input type="text" name="displayName" required></label>
  <label>{{.T.initialPin}} <input type="text" name="pin" required minlength="4"></label>
  <label><input type="checkbox" name="canRequest" value="true"> {{.T.canRequest}}</label>
  <label><input type="checkbox" name="canRun" value="true"> {{.T.canRun}}</label>
  <button type="submit">{{.T.create}}</button>
</form>
</div>
<p><a href="/admin/users">{{.T.back}}</a></p>`

const itemsBody = `
<h1>{{.T.items}}</h1>
<nav><a href="/admin/users">{{.T.back}}</a></nav>
<form method="post" action="/admin/items" style="margin-bottom:1rem;display:flex;gap:0.5rem">
  <input type="text" name="name" required>
  <button type="submit">{{.T.add}}</button>
</form>
<table>
<tr><th>{{.T.name}}</th><th></th></tr>
{{range .Data.Items}}
<tr>
  <td>{{.Name}}{{if .IsCustom}} {{$.T.builtIn}}{{end}}</td>
  <td>
    {{if not .IsCustom}}
    <form method="post" action="/admin/items/{{.Id}}/rename" style="display:inline-flex;gap:0.5rem;align-items:center">
      <input type="text" name="name" placeholder="{{$.T.renameTo}}" required style="width:8em">
      <button type="submit">{{$.T.rename}}</button>
    </form>
    <form method="post" action="/admin/items/{{.Id}}/delete" style="display:inline">
      <button type="submit">{{$.T.delete}}</button>
    </form>
    {{end}}
  </td>
</tr>
{{end}}
</table>`

const topicsBody = `
<h1>{{.T.topics}}</h1>
<nav><a href="/admin/users">{{.T.back}}</a></nav>
<form method="post" action="/admin/topics" style="margin-bottom:1rem;display:flex;gap:0.5rem">
  <input type="text" name="name" required>
  <select name="senderRule">
    <option value="requesterOnly">{{.T.requesterOnly}}</option>
    <option value="anyone">{{.T.anyone}}</option>
  </select>
  <button type="submit">{{.T.add}}</button>
</form>
<table>
<tr><th>{{.T.name}}</th><th>{{.T.senderRule}}</th><th></th></tr>
{{range .Data.Topics}}
<tr>
  <td>{{.Name}}</td>
  <td>{{if eq .SenderRule "anyone"}}{{$.T.anyone}}{{else}}{{$.T.requesterOnly}}{{end}}</td>
  <td>
    <form method="post" action="/admin/topics/{{.Id}}/update" style="display:inline-flex;gap:0.5rem;align-items:center">
      <input type="text" name="name" value="{{.Name}}" required style="width:8em">
      <select name="senderRule">
        <option value="requesterOnly" {{if eq .SenderRule "requesterOnly"}}selected{{end}}>{{$.T.requesterOnly}}</option>
        <option value="anyone" {{if eq .SenderRule "anyone"}}selected{{end}}>{{$.T.anyone}}</option>
      </select>
      <button type="submit">{{$.T.update}}</button>
    </form>
    <form method="post" action="/admin/topics/{{.Id}}/delete" style="display:inline">
      <button type="submit">{{$.T.delete}}</button>
    </form>
  </td>
</tr>
{{end}}
</table>`

const usageBody = `
<h1>{{.T.usage}}</h1>
<nav><a href="/admin/users">{{.T.back}}</a></nav>
<form method="get" action="/admin/usage" class="card" style="display:flex;gap:1rem;align-items:flex-end;margin-bottom:1.5rem">
  <label>{{.T.from}} <input type="date" name="from" value="{{.Data.From}}"></label>
  <label>{{.T.to}} <input type="date" name="to" value="{{.Data.To}}"></label>
  <button type="submit">{{.T.filter}}</button>
</form>

<h2>{{.T.perUserTotals}}</h2>
<table>
<tr><th>{{.T.user}}</th><th>{{.T.made}}</th><th>{{.T.fulfilled}}</th><th>{{.T.declined}}</th></tr>
{{range .Data.Totals}}
<tr><td>{{.Name}}</td><td>{{.Made}}</td><td>{{.Fulfilled}}</td><td>{{.Declined}}</td></tr>
{{end}}
</table>

<h2>{{.T.calls}}</h2>
<table>
<tr>
  <th>{{.T.user}}</th><th>{{.T.name}}</th><th>{{.T.status}}</th><th>{{.T.acceptedBy}}</th><th>{{.T.declinedBy}}</th>
  <th>{{.T.created}}</th><th>{{.T.accepted}}</th><th>{{.T.completed}}</th><th>{{.T.cancelled}}</th>
  <th>{{.T.timeToAccept}}</th><th>{{.T.timeToRun}}</th>
</tr>
{{range .Data.Rows}}
<tr>
  <td>{{.Requester}}</td><td>{{.Item}}</td><td>{{.Status}}</td><td>{{.AcceptedBy}}</td><td>{{.DeclinedBy}}</td>
  <td>{{.Created}}</td><td>{{.AcceptedAt}}</td><td>{{.CompletedAt}}</td><td>{{.CancelledAt}}</td>
  <td>{{.TimeToAccept}}</td><td>{{.TimeToRun}}</td>
</tr>
{{end}}
</table>`

var (
	layoutTpl  = template.Must(template.New("layout").Parse(layout))
	loginTpl   = template.Must(template.New("login").Parse(loginBody))
	usersTpl   = template.Must(template.New("users").Parse(usersBody))
	newUserTpl = template.Must(template.New("newUser").Parse(newUserBody))
	itemsTpl   = template.Must(template.New("items").Parse(itemsBody))
	topicsTpl  = template.Must(template.New("topics").Parse(topicsBody))
	usageTpl   = template.Must(template.New("usage").Parse(usageBody))
)

func render(lang string, body *template.Template, data any) string {
	var inner bytes.Buffer
	wrapped := map[string]any{"T": adminT(lang), "Data": data}
	if err := body.Execute(&inner, wrapped); err != nil {
		return "template error: " + err.Error()
	}
	var out bytes.Buffer
	_ = layoutTpl.Execute(&out, struct{ Body template.HTML }{template.HTML(inner.String())})
	return out.String()
}

func renderLogin(lang, errMsg string) string {
	return render(lang, loginTpl, struct{ Error string }{errMsg})
}

func renderNewUser(lang, errMsg string) string {
	return render(lang, newUserTpl, struct{ Error string }{errMsg})
}

type userRow struct {
	Id          string
	Username    string
	DisplayName string
	CanRequest  bool
	CanRun      bool
}

func renderUsers(lang string, users []userRow) string {
	return render(lang, usersTpl, struct{ Users []userRow }{users})
}

type itemRow struct {
	Id       string
	Name     string
	IsCustom bool
}

func renderItems(lang string, items []itemRow) string {
	return render(lang, itemsTpl, struct{ Items []itemRow }{items})
}

type topicRow struct {
	Id         string
	Name       string
	SenderRule string
}

func renderTopics(lang string, topics []topicRow) string {
	return render(lang, topicsTpl, struct{ Topics []topicRow }{topics})
}

func renderUsage(lang string, rows []usageRow, totals []userTotals, from, to string) string {
	return render(lang, usageTpl, struct {
		Rows   []usageRow
		Totals []userTotals
		From   string
		To     string
	}{rows, totals, from, to})
}
