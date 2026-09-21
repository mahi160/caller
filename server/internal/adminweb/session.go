package adminweb

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

const sessionCookieName = "caller_admin_session"
const sessionTTL = 12 * time.Hour

type sessionStore struct {
	mu       sync.Mutex
	sessions map[string]time.Time
}

func newSessionStore() *sessionStore {
	return &sessionStore{sessions: map[string]time.Time{}}
}

func (s *sessionStore) create() string {
	tok := randomToken()
	s.mu.Lock()
	s.sessions[tok] = time.Now().Add(sessionTTL)
	s.mu.Unlock()
	return tok
}

func (s *sessionStore) valid(tok string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	exp, ok := s.sessions[tok]
	if !ok || time.Now().After(exp) {
		delete(s.sessions, tok)
		return false
	}
	return true
}

func (s *sessionStore) revoke(tok string) {
	s.mu.Lock()
	delete(s.sessions, tok)
	s.mu.Unlock()
}

func randomToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
