package web

import (
	"bytes"
	"fmt"
	"html/template"
	"net/http"
	"path/filepath"
	"sync"
)

// Renderer compileaza sabloanele Go din frontend/templates.
//
// Fiecare pagina primeste propriul set: layouts/*.html + partials/*.html + pages/<x>.html,
// pentru ca toate paginile definesc acelasi bloc "body". Fragmentele HTMX se randeaza
// din setul de partials.
type Renderer struct {
	dir    string
	reload bool

	mu    sync.RWMutex
	pages map[string]*template.Template
	frags *template.Template
}

// NewRenderer compileaza sabloanele din directorul dat.
// Cu reload=true, sabloanele sunt recompilate la fiecare cerere (util in dezvoltare).
func NewRenderer(dir string, reload bool) (*Renderer, error) {
	r := &Renderer{dir: dir, reload: reload}
	if err := r.parse(); err != nil {
		return nil, err
	}
	return r, nil
}

func (r *Renderer) parse() error {
	layouts, err := filepath.Glob(filepath.Join(r.dir, "layouts", "*.html"))
	if err != nil {
		return err
	}
	partials, err := filepath.Glob(filepath.Join(r.dir, "partials", "*.html"))
	if err != nil {
		return err
	}
	pages, err := filepath.Glob(filepath.Join(r.dir, "pages", "*.html"))
	if err != nil {
		return err
	}
	if len(layouts) == 0 || len(pages) == 0 {
		return fmt.Errorf("web: nu am gasit sabloane in %s", r.dir)
	}

	compiled := make(map[string]*template.Template, len(pages))
	for _, page := range pages {
		files := make([]string, 0, len(layouts)+len(partials)+1)
		files = append(files, layouts...)
		files = append(files, partials...)
		files = append(files, page)

		t, err := template.New(filepath.Base(page)).ParseFiles(files...)
		if err != nil {
			return fmt.Errorf("web: %s: %w", filepath.Base(page), err)
		}
		name := filepath.Base(page)
		compiled[name[:len(name)-len(filepath.Ext(name))]] = t
	}

	var frags *template.Template
	if len(partials) > 0 {
		frags, err = template.New("fragments").ParseFiles(partials...)
		if err != nil {
			return fmt.Errorf("web: fragmente: %w", err)
		}
	}

	r.mu.Lock()
	r.pages, r.frags = compiled, frags
	r.mu.Unlock()
	return nil
}

func (r *Renderer) refresh() error {
	if !r.reload {
		return nil
	}
	return r.parse()
}

// Page scrie o pagina completa (layout-ul "base" plus blocul "body" al paginii).
func (r *Renderer) Page(w http.ResponseWriter, status int, name string, data any) {
	if err := r.refresh(); err != nil {
		r.fail(w, err)
		return
	}

	r.mu.RLock()
	t, ok := r.pages[name]
	r.mu.RUnlock()
	if !ok {
		r.fail(w, fmt.Errorf("web: pagina %q nu exista", name))
		return
	}

	// Randam intai intr-un buffer, ca o eroare de sablon sa nu lase pagina pe jumatate.
	var buf bytes.Buffer
	if err := t.ExecuteTemplate(&buf, "base", data); err != nil {
		r.fail(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	_, _ = buf.WriteTo(w)
}

// Fragment scrie un singur bloc definit in partials - raspunsul tipic pentru HTMX.
func (r *Renderer) Fragment(w http.ResponseWriter, status int, name string, data any) {
	if err := r.refresh(); err != nil {
		r.fail(w, err)
		return
	}

	r.mu.RLock()
	frags := r.frags
	r.mu.RUnlock()
	if frags == nil {
		r.fail(w, fmt.Errorf("web: nu exista fragmente compilate"))
		return
	}

	var buf bytes.Buffer
	if err := frags.ExecuteTemplate(&buf, name, data); err != nil {
		r.fail(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	_, _ = buf.WriteTo(w)
}

func (r *Renderer) fail(w http.ResponseWriter, err error) {
	http.Error(w, "Eroare la randarea paginii: "+err.Error(), http.StatusInternalServerError)
}
