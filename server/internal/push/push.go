// Package push sends notifications through Expo's push service, per ADR 0003.
// It abstracts FCM/APNs so the server only ever talks to Expo's HTTP API.
package push

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

const expoPushURL = "https://exp.host/--/api/v2/push/send"

type message struct {
	To    []string `json:"to"`
	Title string   `json:"title"`
	Body  string   `json:"body"`
	Data  any      `json:"data,omitempty"`
	Sound string   `json:"sound,omitempty"`
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

// Send fires a push notification to the given Expo push tokens. Empty/invalid
// tokens are the caller's responsibility to filter; this best-effort dispatch
// never blocks the request that triggered it (call it in a goroutine) and
// only logs failures.
func Send(tokens []string, title, body string, data any) {
	tokens = nonEmpty(tokens)
	if len(tokens) == 0 {
		return
	}

	msg := message{To: tokens, Title: title, Body: body, Data: data, Sound: "default"}
	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("push: failed to encode message: %v", err)
		return
	}

	req, err := http.NewRequest(http.MethodPost, expoPushURL, bytes.NewReader(payload))
	if err != nil {
		log.Printf("push: failed to build request: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("push: request to Expo failed: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		log.Printf("push: Expo push service returned status %d", resp.StatusCode)
		return
	}

	// Expo returns 200 even when individual tickets failed (e.g. invalid/expired
	// token); surface those so a stale token can be spotted in the logs.
	var parsed struct {
		Data []struct {
			Status  string `json:"status"`
			Message string `json:"message"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return
	}
	for _, ticket := range parsed.Data {
		if ticket.Status == "error" {
			log.Printf("push: Expo ticket error: %s", ticket.Message)
		}
	}
}

func nonEmpty(in []string) []string {
	out := make([]string, 0, len(in))
	for _, t := range in {
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}
