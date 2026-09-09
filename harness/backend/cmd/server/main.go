// Comanda server porneste interfata web Libra Maker (Go html/template + HTMX).
//
// Rulare din directorul `harness/`:
//
//	go run ./backend/cmd/server            # http://localhost:8080
//	go run ./backend/cmd/server -dev       # recompileaza sabloanele la fiecare cerere
package main

import (
	"errors"
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"libramaker/backend/internal/sessions"
	"libramaker/backend/internal/web"
)

func main() {
	addr := flag.String("addr", ":8080", "adresa pe care asculta serverul")
	templates := flag.String("templates", "frontend/templates", "directorul cu sabloane")
	static := flag.String("static", "frontend/static", "directorul cu fisiere statice")
	dev := flag.Bool("dev", false, "recompileaza sabloanele la fiecare cerere")
	flag.Parse()

	for _, dir := range []string{*templates, *static} {
		if _, err := os.Stat(dir); err != nil {
			log.Fatalf("nu gasesc directorul %q: %v\n(ruleaza comanda din directorul harness/)", dir, err)
		}
	}

	store := sessions.NewStore()

	srv, err := web.NewServer(store, web.Config{
		TemplatesDir: *templates,
		StaticDir:    *static,
		Dev:          *dev,
	})
	if err != nil {
		log.Fatalf("nu pot porni serverul: %v", err)
	}

	httpSrv := &http.Server{
		Addr:              *addr,
		Handler:           logRequests(srv),
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("Libra Maker asculta pe http://localhost%s", *addr)
	if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server oprit: %v", err)
	}
}

// logRequests scrie o linie per cerere, util cat timp lucram local.
func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s (%s)", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}
