// Package sessions contine modelul de domeniu al aplicatiei (utilizatori, instrumente,
// proiecte/sesiuni) si un store in memorie folosit pana la conectarea Postgres-ului.
//
// Structura Project urmareaza 1:1 tabela `sessions` din documentul de implementare:
// id, user_id, skill_id, project_name, description, workspace_path, status, created_at,
// completed_at. Inlocuirea store-ului cu un repository peste Postgres nu schimba nimic
// din pachetul web.
package sessions

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

// Statusurile din coloana `status` (documentul de implementare, sectiunea 4),
// plus `draft` si `done` pentru cele doua stari afisate in mockup.
const (
	StatusQueued    = "queued"     // sesiune creata, asteapta un slot de container
	StatusRunning   = "running"    // containerul ruleaza `claude -p`
	StatusDraft     = "draft"      // generata, inca netrimisa la Dev ("Ciorna")
	StatusHandedOff = "handed_off" // predata echipei Dev ("Predat la Dev")
	StatusDone      = "done"       // revizuita si publicata de Dev ("Finalizat")
	StatusFailed    = "failed"
)

// User este utilizatorul de business autentificat prin SSO-ul intern.
type User struct {
	ID         string
	Email      string
	Name       string
	Username   string
	Department string
}

// FirstName da prenumele, pentru salutul de pe pagina Acasa.
func (u User) FirstName() string {
	if i := strings.IndexByte(u.Name, ' '); i > 0 {
		return u.Name[:i]
	}
	return u.Name
}

// Initials da initialele afisate in avatarul din bara de sus.
func (u User) Initials() string {
	out := ""
	for _, part := range strings.Fields(u.Name) {
		out += strings.ToUpper(string([]rune(part)[0]))
		if len(out) == 2 {
			break
		}
	}
	return out
}

// Tool este un skill aprobat. Mockup-ul fixeaza exact doua instrumente.
type Tool struct {
	ID        string
	Name      string
	ShortName string
	Desc      string
	Icon      string // "page" | "form" - forma desenata in CSS
	Version   string
	Tags      []string
}

// Tools este catalogul de skill-uri expus in interfata (sectiunea 7 din document,
// restrans la cele doua instrumente aprobate in varianta finala a designului).
var Tools = []Tool{
	{
		ID:        "pagina-informare",
		Name:      "Pagină de informare",
		ShortName: "Pagină",
		Desc:      "Titlu, text, imagine și listă de puncte. O singură pagină statică.",
		Icon:      "page",
		Version:   "v2",
		Tags:      []string{"HTML + CSS", "fără JS custom"},
	},
	{
		ID:        "formular",
		Name:      "Formular de colectare",
		ShortName: "Formular",
		Desc:      "Pagină cu câmpuri de completat și confirmare la trimitere.",
		Icon:      "form",
		Version:   "v1",
		Tags:      []string{"max. 8 câmpuri", "fără date sensibile"},
	},
}

// ToolByID cauta un skill in catalog.
func ToolByID(id string) (Tool, bool) {
	for _, t := range Tools {
		if t.ID == id {
			return t, true
		}
	}
	return Tool{}, false
}

// Project este o sesiune de lucru: un proiect al unui utilizator, generat intr-un container.
type Project struct {
	ID            string
	UserID        string
	SkillID       string
	Name          string
	Description   string
	WorkspacePath string
	Status        string
	TicketID      int
	DurationSec   int
	CreatedAt     time.Time
	UpdatedAt     time.Time
	CompletedAt   time.Time
	HandedAt      time.Time
}

// SkillName da numele afisat al instrumentului folosit.
func (p *Project) SkillName() string {
	if t, ok := ToolByID(p.SkillID); ok {
		return t.Name
	}
	return p.SkillID
}

// SkillLabel adauga versiunea skill-ului, asa cum apare in fisa de handoff.
func (p *Project) SkillLabel() string {
	if t, ok := ToolByID(p.SkillID); ok {
		return t.Name + " " + t.Version
	}
	return p.SkillID
}

// Meta este randul secundar din lista de proiecte: fie cat de recent a fost salvat,
// fie data la care a fost incheiat.
func (p *Project) Meta() string {
	switch p.Status {
	case StatusQueued, StatusRunning:
		return "în lucru"
	case StatusDraft:
		if d := time.Since(p.UpdatedAt); d < 24*time.Hour {
			return "salvat " + humanAgo(d)
		}
	}
	return shortDate(p.UpdatedAt)
}

// Summary este textul introductiv din previzualizare: prima fraza a descrierii.
func (p *Project) Summary() string {
	text := strings.TrimSpace(p.Description)
	if i := strings.IndexAny(text, ".!?"); i > 40 {
		text = text[:i+1]
	}
	runes := []rune(text)
	if len(runes) > 220 {
		text = strings.TrimSpace(string(runes[:220])) + "…"
	}
	return text
}

// FileName este numele fisierului aratat in rama de previzualizare.
func (p *Project) FileName() string {
	s := slug(p.Name)
	if s == "" {
		s = "pagina"
	}
	return s + ".html"
}

// Files enumera ce a primit echipa Dev.
func (p *Project) Files() string {
	return "index.html · style.css"
}

// ShortID este identificatorul prescurtat al sesiunii, ca in fisa de handoff.
func (p *Project) ShortID() string {
	clean := strings.ReplaceAll(p.ID, "-", "")
	if len(clean) < 8 {
		return p.ID
	}
	return clean[:4] + "…" + clean[len(clean)-3:]
}

// GeneratedAt si HandedOffAt sunt momentele afisate pe firul "Stadiul cererii".
func (p *Project) GeneratedAt() string { return stamp(p.CompletedAt) }
func (p *Project) HandedOffAt() string { return stamp(p.HandedAt) }

// Stats alimenteaza cele patru casete de pe pagina Acasa.
type Stats struct {
	Total        int
	Drafts       int
	HandedOff    int
	AvgTime      string
	RecentPhrase string
}

// Store tine utilizatorii si proiectele in memorie.
//
// TODO(backend): de inlocuit cu Postgres (tabelele users/sessions) si cu pornirea reala
// a containerelor prin Docker SDK; interfata publica a store-ului ramane aceeasi.
type Store struct {
	mu       sync.RWMutex
	users    map[string]*User
	projects map[string]*Project
	ticket   int

	// BuildDelay este cat "dureaza" generarea simulata pana la conectarea runner-ului.
	BuildDelay time.Duration
}

// NewStore creeaza store-ul cu utilizatorul demo si proiectele din mockup.
func NewStore() *Store {
	s := &Store{
		users:      map[string]*User{},
		projects:   map[string]*Project{},
		ticket:     2480,
		BuildDelay: 2500 * time.Millisecond,
	}

	u := &User{
		ID:         newID(),
		Email:      "ana.popescu@libra.ro",
		Name:       "Ana Popescu",
		Username:   "ana.popescu",
		Department: "Administrativ",
	}
	s.users[u.ID] = u

	now := time.Now()
	s.seed(&Project{
		UserID:      u.ID,
		SkillID:     "formular",
		Name:        "Green Week — înscrieri",
		Description: "O pagină pentru campania internă „Green Week”: o scurtă introducere despre programul de colectare selectivă, lista punctelor de reciclare din sediu și un formular de înscriere cu nume, departament, e-mail și ziua în care vrei să participi.",
		Status:      StatusHandedOff,
		DurationSec: 38,
		CreatedAt:   now.AddDate(0, 0, -5),
		CompletedAt: now.AddDate(0, 0, -5),
		HandedAt:    now.AddDate(0, 0, -5),
	})
	s.seed(&Project{
		UserID:      u.ID,
		SkillID:     "formular",
		Name:        "Chestionar cantină",
		Description: "Un formular scurt prin care colegii spun ce meniuri vor la cantină și în ce interval orar iau prânzul.",
		Status:      StatusDraft,
		DurationSec: 46,
		CreatedAt:   now.Add(-40 * time.Minute),
		UpdatedAt:   now.Add(-4 * time.Minute),
		CompletedAt: now.Add(-38 * time.Minute),
	})
	s.seed(&Project{
		UserID:      u.ID,
		SkillID:     "pagina-informare",
		Name:        "Ghid onboarding — echipa nouă",
		Description: "O pagină de informare pentru colegii nou veniți: primele zile, cine pe ce răspunde și lista de acces pe care trebuie să o ceară.",
		Status:      StatusDone,
		DurationSec: 42,
		CreatedAt:   now.AddDate(0, 0, -12),
		CompletedAt: now.AddDate(0, 0, -12),
		HandedAt:    now.AddDate(0, 0, -12),
	})

	return s
}

func (s *Store) seed(p *Project) {
	p.ID = newID()
	if p.UpdatedAt.IsZero() {
		p.UpdatedAt = p.CreatedAt
	}
	if p.Status == StatusHandedOff || p.Status == StatusDone {
		s.ticket++
		p.TicketID = s.ticket
	}
	p.WorkspacePath = workspacePath(p.UserID, p.ID)
	s.projects[p.ID] = p
}

// DemoUser da utilizatorul folosit de autentificarea SSO simulata.
func (s *Store) DemoUser() *User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, u := range s.users {
		return u
	}
	return nil
}

// User cauta un utilizator dupa id.
func (s *Store) User(id string) (*User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	return u, ok
}

// Projects da proiectele unui utilizator, cele mai recente primele.
func (s *Store) Projects(userID string) []*Project {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := []*Project{}
	for _, p := range s.projects {
		if p.UserID == userID {
			out = append(out, p)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	return out
}

// Search filtreaza proiectele dupa nume sau descriere (cautarea din bara de sus).
// Compararea ignora diacriticele, ca "cantina" sa gaseasca "Chestionar cantină".
func (s *Store) Search(userID, query string) []*Project {
	q := foldRO(query)
	all := s.Projects(userID)
	if q == "" {
		return all
	}
	out := []*Project{}
	for _, p := range all {
		if strings.Contains(foldRO(p.Name), q) || strings.Contains(foldRO(p.Description), q) {
			out = append(out, p)
		}
	}
	return out
}

// Project cauta un proiect dupa id.
func (s *Store) Project(id string) (*Project, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.projects[id]
	return p, ok
}

// Create deschide o sesiune noua si porneste generarea.
func (s *Store) Create(userID, skillID, name, description string) *Project {
	s.mu.Lock()
	p := &Project{
		ID:          newID(),
		UserID:      userID,
		SkillID:     skillID,
		Name:        name,
		Description: description,
		Status:      StatusQueued,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	p.WorkspacePath = workspacePath(userID, p.ID)
	s.projects[p.ID] = p
	s.mu.Unlock()

	go s.build(p.ID)
	return p
}

// Update rescrie datele unei ciorne si reia generarea ("Mai schimb ceva").
func (s *Store) Update(id, skillID, name, description string) {
	s.mu.Lock()
	p, ok := s.projects[id]
	if !ok {
		s.mu.Unlock()
		return
	}
	p.SkillID = skillID
	p.Name = name
	p.Description = description
	p.Status = StatusQueued
	p.UpdatedAt = time.Now()
	s.mu.Unlock()

	go s.build(id)
}

// build simuleaza rularea sesiunii in container.
//
// TODO(backend): de inlocuit cu coada de containere + `claude -p --output-format json`
// (sectiunile 5 si 6 din documentul de implementare). Tranzitiile de status raman aceleasi,
// asa ca interfata nu se schimba.
func (s *Store) build(id string) {
	time.Sleep(300 * time.Millisecond)
	s.setStatus(id, StatusRunning)

	s.mu.RLock()
	delay := s.BuildDelay
	s.mu.RUnlock()
	time.Sleep(delay)

	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.projects[id]
	if !ok {
		return
	}
	p.Status = StatusDraft
	p.CompletedAt = time.Now()
	p.UpdatedAt = p.CompletedAt
	p.DurationSec = int(delay.Seconds())
	if p.DurationSec < 1 {
		p.DurationSec = 42
	}
}

func (s *Store) setStatus(id, status string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if p, ok := s.projects[id]; ok {
		p.Status = status
		p.UpdatedAt = time.Now()
	}
}

// HandOff preda proiectul echipei de dezvoltare si ii aloca numar de cerere.
//
// TODO(backend): aici se creeaza commit-ul/PR-ul sau notificarea catre echipa Dev
// (sectiunea 9 din documentul de implementare).
func (s *Store) HandOff(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.projects[id]
	if !ok || p.Status == StatusHandedOff || p.Status == StatusDone {
		return
	}
	s.ticket++
	p.TicketID = s.ticket
	p.Status = StatusHandedOff
	p.HandedAt = time.Now()
	p.UpdatedAt = p.HandedAt
	if p.CompletedAt.IsZero() {
		p.CompletedAt = p.HandedAt
	}
}

// Stats calculeaza cele patru cifre de pe pagina Acasa.
func (s *Store) Stats(userID string) Stats {
	all := s.Projects(userID)

	st := Stats{Total: len(all)}
	totalSec, counted := 0, 0
	for _, p := range all {
		switch p.Status {
		case StatusDraft:
			st.Drafts++
		case StatusHandedOff, StatusDone:
			// Si proiectele finalizate au trecut prin echipa Dev.
			st.HandedOff++
		}
		if p.DurationSec > 0 {
			totalSec += p.DurationSec
			counted++
		}
	}
	if counted > 0 {
		st.AvgTime = fmt.Sprintf("%ds", totalSec/counted)
	} else {
		st.AvgTime = "—"
	}

	recent := 0
	cutoff := time.Now().AddDate(0, 0, -14)
	for _, p := range all {
		if p.CreatedAt.After(cutoff) {
			recent++
		}
	}
	switch recent {
	case 0:
		st.RecentPhrase = "Niciun proiect în ultimele două săptămâni."
	case 1:
		st.RecentPhrase = "Ai un proiect în ultimele două săptămâni."
	default:
		st.RecentPhrase = fmt.Sprintf("Ai %d proiecte în ultimele două săptămâni.", recent)
	}
	return st
}

// ---------- ajutoare ----------

func workspacePath(userID, sessionID string) string {
	return "workspaces/" + userID + "/" + sessionID
}

// newID genereaza un identificator in format UUID, ca in schema Postgres.
func newID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Store-ul nu are cum sa continue fara identificatori unici.
		panic("sessions: nu pot genera id: " + err.Error())
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	h := hex.EncodeToString(b)
	return h[0:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:]
}

var monthsRO = [...]string{"ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."}

func shortDate(t time.Time) string {
	if t.IsZero() {
		return "—"
	}
	return fmt.Sprintf("%d %s", t.Day(), monthsRO[int(t.Month())-1])
}

// stamp da "azi, 10:42" pentru ziua curenta si "4 sept., 10:42" in rest.
func stamp(t time.Time) string {
	if t.IsZero() {
		return "—"
	}
	now := time.Now()
	if t.Year() == now.Year() && t.YearDay() == now.YearDay() {
		return fmt.Sprintf("azi, %02d:%02d", t.Hour(), t.Minute())
	}
	return fmt.Sprintf("%s, %02d:%02d", shortDate(t), t.Hour(), t.Minute())
}

func humanAgo(d time.Duration) string {
	switch {
	case d < time.Minute:
		return "acum câteva secunde"
	case d < 2*time.Minute:
		return "acum un minut"
	case d < time.Hour:
		return fmt.Sprintf("acum %d min.", int(d.Minutes()))
	case d < 2*time.Hour:
		return "acum o oră"
	default:
		return fmt.Sprintf("acum %d ore", int(d.Hours()))
	}
}

var diacritics = strings.NewReplacer(
	"ă", "a", "â", "a", "î", "i", "ș", "s", "ş", "s", "ț", "t", "ţ", "t",
	"Ă", "a", "Â", "a", "Î", "i", "Ș", "s", "Ş", "s", "Ț", "t", "Ţ", "t",
)

// foldRO normalizeaza un text pentru cautare: litere mici, fara diacritice.
func foldRO(s string) string {
	return diacritics.Replace(strings.ToLower(strings.TrimSpace(s)))
}

// slug transforma numele proiectului in nume de fisier.
func slug(name string) string {
	s := diacritics.Replace(strings.ToLower(strings.TrimSpace(name)))
	var b strings.Builder
	lastDash := true
	for _, r := range s {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			lastDash = false
		default:
			if !lastDash {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	if len(out) > 30 {
		out = strings.Trim(out[:30], "-")
	}
	return out
}
