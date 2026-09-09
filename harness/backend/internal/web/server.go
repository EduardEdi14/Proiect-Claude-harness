// Package web contine serverul HTTP care serveste paginile (Go html/template)
// si fragmentele HTMX ale aplicatiei Libra Maker.
package web

import (
	"net/http"
	"strings"

	"libramaker/backend/internal/sessions"
)

const sessionCookie = "lm_user"

// Config sunt optiunile serverului.
type Config struct {
	TemplatesDir string
	StaticDir    string
	Dev          bool // recompileaza sabloanele la fiecare cerere
}

// Server leaga store-ul de sabloane si expune rutele.
type Server struct {
	store *sessions.Store
	rend  *Renderer
	cfg   Config
	mux   *http.ServeMux
}

// NewServer construieste serverul si inregistreaza rutele.
func NewServer(store *sessions.Store, cfg Config) (*Server, error) {
	rend, err := NewRenderer(cfg.TemplatesDir, cfg.Dev)
	if err != nil {
		return nil, err
	}

	s := &Server{store: store, rend: rend, cfg: cfg, mux: http.NewServeMux()}
	s.routes()
	return s, nil
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) { s.mux.ServeHTTP(w, r) }

func (s *Server) routes() {
	fs := http.FileServer(http.Dir(s.cfg.StaticDir))
	s.mux.Handle("GET /static/", http.StripPrefix("/static/", fs))

	s.mux.HandleFunc("GET /{$}", s.handleRoot)
	s.mux.HandleFunc("GET /login", s.handleLogin)
	s.mux.HandleFunc("POST /auth/sso", s.handleSSO)
	s.mux.HandleFunc("POST /logout", s.handleLogout)

	s.mux.HandleFunc("GET /acasa", s.auth(s.handleHome))
	s.mux.HandleFunc("GET /proiectele-mele", s.auth(s.handleProjects))
	s.mux.HandleFunc("GET /proiecte/cauta", s.auth(s.handleSearch))
	s.mux.HandleFunc("GET /ajutor", s.auth(s.handleHelp))

	s.mux.HandleFunc("GET /proiect-nou", s.auth(s.handleTools))
	s.mux.HandleFunc("POST /proiect-nou/instrument", s.auth(s.handleToolPick))
	s.mux.HandleFunc("GET /proiect-nou/detalii", s.auth(s.handleDetails))
	s.mux.HandleFunc("POST /proiect-nou/detalii", s.auth(s.handleDetailsSubmit))

	s.mux.HandleFunc("GET /proiect/{id}", s.auth(s.handleProject))
	s.mux.HandleFunc("GET /proiect/{id}/detalii", s.auth(s.handleProjectEdit))
	s.mux.HandleFunc("GET /proiect/{id}/status", s.auth(s.handleProjectStatus))
	s.mux.HandleFunc("POST /proiect/{id}/handoff", s.auth(s.handleHandoff))
	s.mux.HandleFunc("GET /proiect/{id}/predat", s.auth(s.handleHandoffDone))
}

// ---------- date pentru sabloane ----------

// Page este partea comuna a datelor de pagina (titlu, utilizator, meniu).
type Page struct {
	Title       string
	Nav         string // "acasa" | "proiectele-mele" | "proiect-nou" | "ajutor"
	SidebarFoot string // "promo" | "restricted" | ""
	User        *sessions.User
}

type homeData struct {
	Page
	Stats    sessions.Stats
	Projects []*sessions.Project
}

type projectsData struct {
	Page
	Projects []*sessions.Project
}

type toolsData struct {
	Page
	Tools    []sessions.Tool
	Selected string
	Error    string
}

type detailsData struct {
	Page
	Tool        sessions.Tool
	ProjectID   string
	Name        string
	Description string
	Error       string
}

type projectData struct {
	Page
	Project *sessions.Project
}

// ---------- autentificare ----------

// auth cere o sesiune valida; altfel trimite la ecranul de autentificare.
func (s *Server) auth(next func(http.ResponseWriter, *http.Request, *sessions.User)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := s.currentUser(r)
		if !ok {
			if r.Header.Get("HX-Request") == "true" {
				w.Header().Set("HX-Redirect", "/login")
				w.WriteHeader(http.StatusNoContent)
				return
			}
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		next(w, r, u)
	}
}

func (s *Server) currentUser(r *http.Request) (*sessions.User, bool) {
	c, err := r.Cookie(sessionCookie)
	if err != nil || c.Value == "" {
		return nil, false
	}
	return s.store.User(c.Value)
}

func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.currentUser(r); ok {
		http.Redirect(w, r, "/acasa", http.StatusSeeOther)
		return
	}
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.currentUser(r); ok {
		http.Redirect(w, r, "/acasa", http.StatusSeeOther)
		return
	}
	s.rend.Page(w, http.StatusOK, "login", Page{Title: "Autentificare"})
}

// handleSSO simuleaza intrarea cu contul companiei.
//
// TODO(backend): de inlocuit cu SSO-ul intern (sectiunea 11 din documentul de implementare).
// Aici se valideaza raspunsul furnizorului si se creeaza/rezolva randul din tabela `users`.
func (s *Server) handleSSO(w http.ResponseWriter, r *http.Request) {
	u := s.store.DemoUser()
	if u == nil {
		http.Error(w, "Nu exista niciun utilizator configurat.", http.StatusInternalServerError)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    u.ID,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	http.Redirect(w, r, "/acasa", http.StatusSeeOther)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// ---------- ecranele ----------

func (s *Server) handleHome(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	projects := s.store.Projects(u.ID)
	if len(projects) > 5 {
		projects = projects[:5]
	}
	s.rend.Page(w, http.StatusOK, "home", homeData{
		Page:     Page{Title: "Acasă", Nav: "acasa", SidebarFoot: "promo", User: u},
		Stats:    s.store.Stats(u.ID),
		Projects: projects,
	})
}

func (s *Server) handleProjects(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	s.rend.Page(w, http.StatusOK, "projects", projectsData{
		Page:     Page{Title: "Proiectele mele", Nav: "proiectele-mele", SidebarFoot: "promo", User: u},
		Projects: s.store.Projects(u.ID),
	})
}

// handleSearch raspunde cautarii din bara de sus cu lista filtrata (fragment HTMX).
func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	found := s.store.Search(u.ID, r.URL.Query().Get("q"))
	s.rend.Fragment(w, http.StatusOK, "project-list", found)
}

func (s *Server) handleHelp(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	s.rend.Page(w, http.StatusOK, "help", Page{
		Title: "Ajutor", Nav: "ajutor", SidebarFoot: "restricted", User: u,
	})
}

func (s *Server) handleTools(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	s.rend.Page(w, http.StatusOK, "tools", toolsData{
		Page:     Page{Title: "Alege instrumentul", Nav: "proiect-nou", SidebarFoot: "restricted", User: u},
		Tools:    sessions.Tools,
		Selected: r.URL.Query().Get("skill"),
	})
}

// handleToolPick valideaza alegerea instrumentului. Fara selectie raspunde cu mesajul
// de eroare (fragment), altfel trimite browserul mai departe prin HX-Redirect.
func (s *Server) handleToolPick(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	if err := r.ParseForm(); err != nil {
		s.rend.Fragment(w, http.StatusOK, "form-error", "Nu am putut citi formularul. Încearcă din nou.")
		return
	}
	skill := r.PostFormValue("skill_id")
	if _, ok := sessions.ToolByID(skill); !ok {
		s.rend.Fragment(w, http.StatusOK, "form-error", "Alege unul dintre cele două instrumente ca să poți continua.")
		return
	}
	s.hxRedirect(w, r, "/proiect-nou/detalii?skill="+skill)
}

func (s *Server) handleDetails(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	tool, ok := sessions.ToolByID(r.URL.Query().Get("skill"))
	if !ok {
		http.Redirect(w, r, "/proiect-nou", http.StatusSeeOther)
		return
	}
	s.rend.Page(w, http.StatusOK, "details", detailsData{
		Page: Page{Title: "Detaliile proiectului", Nav: "proiect-nou", SidebarFoot: "restricted", User: u},
		Tool: tool,
	})
}

// handleProjectEdit reia o ciorna existenta ("Reia proiectul" / "Mai schimb ceva").
func (s *Server) handleProjectEdit(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	p, ok := s.projectOf(w, r, u)
	if !ok {
		return
	}
	tool, ok := sessions.ToolByID(p.SkillID)
	if !ok {
		http.Redirect(w, r, "/proiect-nou", http.StatusSeeOther)
		return
	}
	s.rend.Page(w, http.StatusOK, "details", detailsData{
		Page:        Page{Title: p.Name, Nav: "proiect-nou", SidebarFoot: "restricted", User: u},
		Tool:        tool,
		ProjectID:   p.ID,
		Name:        p.Name,
		Description: p.Description,
	})
}

// handleDetailsSubmit valideaza campurile si porneste (sau reia) sesiunea de generare.
func (s *Server) handleDetailsSubmit(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	if err := r.ParseForm(); err != nil {
		s.rend.Fragment(w, http.StatusOK, "form-error", "Nu am putut citi formularul. Încearcă din nou.")
		return
	}
	skill := r.PostFormValue("skill_id")
	if _, ok := sessions.ToolByID(skill); !ok {
		s.hxRedirect(w, r, "/proiect-nou")
		return
	}

	name := strings.TrimSpace(r.PostFormValue("name"))
	description := strings.TrimSpace(r.PostFormValue("description"))

	if len([]rune(name)) < 3 {
		s.rend.Fragment(w, http.StatusOK, "form-error", "Dă-i un nume proiectului — ajută echipa de dezvoltare să îl recunoască.")
		return
	}
	if len([]rune(description)) < 20 {
		s.rend.Fragment(w, http.StatusOK, "form-error", "Scrie câteva rânduri despre ce vrei să conțină pagina, ca să putem construi ceva folositor.")
		return
	}

	if id := r.PostFormValue("project_id"); id != "" {
		if p, ok := s.store.Project(id); ok && p.UserID == u.ID {
			s.store.Update(p.ID, skill, name, description)
			s.hxRedirect(w, r, "/proiect/"+p.ID)
			return
		}
	}

	p := s.store.Create(u.ID, skill, name, description)
	s.hxRedirect(w, r, "/proiect/"+p.ID)
}

// handleProject arata starea curenta a sesiunii: in lucru, rezultat sau handoff.
func (s *Server) handleProject(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	p, ok := s.projectOf(w, r, u)
	if !ok {
		return
	}

	switch p.Status {
	case sessions.StatusQueued, sessions.StatusRunning:
		s.rend.Page(w, http.StatusOK, "generating", projectData{
			Page:    Page{Title: p.Name, Nav: "proiect-nou", SidebarFoot: "restricted", User: u},
			Project: p,
		})
	case sessions.StatusHandedOff, sessions.StatusDone:
		http.Redirect(w, r, "/proiect/"+p.ID+"/predat", http.StatusSeeOther)
	default:
		s.rend.Page(w, http.StatusOK, "result", projectData{
			Page:    Page{Title: p.Name, User: u},
			Project: p,
		})
	}
}

// handleProjectStatus e tinta sondajului HTMX din ecranul de asteptare:
// raspunde gol cat timp sesiunea ruleaza si redirectioneaza cand e gata.
func (s *Server) handleProjectStatus(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	p, ok := s.projectOf(w, r, u)
	if !ok {
		return
	}
	if p.Status == sessions.StatusQueued || p.Status == sessions.StatusRunning {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	s.hxRedirect(w, r, "/proiect/"+p.ID)
}

func (s *Server) handleHandoff(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	p, ok := s.projectOf(w, r, u)
	if !ok {
		return
	}
	s.store.HandOff(p.ID)
	s.hxRedirect(w, r, "/proiect/"+p.ID+"/predat")
}

func (s *Server) handleHandoffDone(w http.ResponseWriter, r *http.Request, u *sessions.User) {
	p, ok := s.projectOf(w, r, u)
	if !ok {
		return
	}
	if p.Status != sessions.StatusHandedOff && p.Status != sessions.StatusDone {
		http.Redirect(w, r, "/proiect/"+p.ID, http.StatusSeeOther)
		return
	}
	s.rend.Page(w, http.StatusOK, "handoff", projectData{
		Page:    Page{Title: "Trimis la Dev", User: u},
		Project: p,
	})
}

// ---------- ajutoare ----------

// projectOf citeste proiectul din ruta si verifica sa fie al utilizatorului curent.
func (s *Server) projectOf(w http.ResponseWriter, r *http.Request, u *sessions.User) (*sessions.Project, bool) {
	p, ok := s.store.Project(r.PathValue("id"))
	if !ok || p.UserID != u.ID {
		http.NotFound(w, r)
		return nil, false
	}
	return p, true
}

// hxRedirect muta browserul mai departe: prin antetul HTMX daca cererea vine de la HTMX,
// altfel printr-un redirect obisnuit, ca fluxul sa functioneze si fara JavaScript.
func (s *Server) hxRedirect(w http.ResponseWriter, r *http.Request, url string) {
	if r.Header.Get("HX-Request") == "true" {
		w.Header().Set("HX-Redirect", url)
		w.WriteHeader(http.StatusNoContent)
		return
	}
	http.Redirect(w, r, url, http.StatusSeeOther)
}
