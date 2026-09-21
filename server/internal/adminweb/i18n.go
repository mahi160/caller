package adminweb

import "net/http"

const adminLangCookie = "caller_admin_lang"

var adminStrings = map[string]map[string]string{
	"en": {
		"users": "Users", "newUser": "+ New user", "items": "Items", "usage": "Usage", "logOut": "Log out",
		"username": "Username", "displayName": "Display name", "canRequest": "Can request", "canRun": "Can run",
		"resetPin": "Reset PIN", "create": "Create", "back": "← back", "newPin": "new PIN",
		"password": "Password", "logIn": "Log in", "name": "Name", "add": "Add", "rename": "Rename",
		"delete": "Delete", "builtIn": "(built-in)", "from": "From", "to": "To", "filter": "Filter",
		"perUserTotals": "Per-user totals", "user": "User", "made": "Made", "fulfilled": "Fulfilled",
		"declined": "Declined", "calls": "Calls", "status": "Status", "acceptedBy": "Accepted by",
		"declinedBy": "Declined by", "created": "Created", "accepted": "Accepted", "completed": "Completed",
		"cancelled": "Cancelled", "timeToAccept": "Time to accept", "timeToRun": "Time to run",
		"initialPin": "Initial PIN", "renameTo": "rename to",
		"topics": "Topics", "senderRule": "Who can send", "requesterOnly": "Requesters only", "anyone": "Anyone",
		"save": "Save", "update": "Update",
	},
	"bn": {
		"users": "ব্যবহারকারী", "newUser": "+ নতুন ব্যবহারকারী", "items": "আইটেম", "usage": "ব্যবহার", "logOut": "লগ আউট",
		"username": "ইউজারনেম", "displayName": "প্রদর্শনী নাম", "canRequest": "অনুরোধ করতে পারবে", "canRun": "পূরণ করতে পারবে",
		"resetPin": "পিন রিসেট করুন", "create": "তৈরি করুন", "back": "← ফিরে যান", "newPin": "নতুন পিন",
		"password": "পাসওয়ার্ড", "logIn": "লগ ইন", "name": "নাম", "add": "যোগ করুন", "rename": "নাম পরিবর্তন",
		"delete": "মুছুন", "builtIn": "(পূর্বনির্ধারিত)", "from": "থেকে", "to": "পর্যন্ত", "filter": "ফিল্টার",
		"perUserTotals": "প্রতি-ব্যবহারকারী মোট", "user": "ব্যবহারকারী", "made": "অনুরোধ করেছে", "fulfilled": "পূরণ করেছে",
		"declined": "প্রত্যাখ্যান করেছে", "calls": "কলগুলো", "status": "অবস্থা", "acceptedBy": "গ্রহণকারী",
		"declinedBy": "প্রত্যাখ্যানকারী", "created": "তৈরি হয়েছে", "accepted": "গৃহীত", "completed": "সম্পন্ন",
		"cancelled": "বাতিল", "timeToAccept": "গ্রহণে সময়", "timeToRun": "পূরণে সময়",
		"initialPin": "প্রাথমিক পিন", "renameTo": "নতুন নাম",
		"topics": "টপিক", "senderRule": "কে পাঠাতে পারবে", "requesterOnly": "শুধু অনুরোধকারী", "anyone": "যে কেউ",
		"save": "সংরক্ষণ", "update": "আপডেট",
	},
}

func adminLang(r *http.Request) string {
	if c, err := r.Cookie(adminLangCookie); err == nil && adminStrings[c.Value] != nil {
		return c.Value
	}
	return "en"
}

func adminT(lang string) map[string]string {
	return adminStrings[lang]
}
