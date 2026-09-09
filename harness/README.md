# Libra Maker (Claude Code Harness)

Interfața web prin care un coleg din business descrie ce pagină vrea, iar rezultatul pleacă la
echipa de dezvoltare. Frontend: **HTMX + Go `html/template`**, fără build de JS/npm.

Designul implementat este `mockup/mockups-pentru-atelier-ui/project/Libra Maker - varianta finala.dc.html`
(șase ecrane: autentificare → acasă → instrument → detalii → rezultat → handoff).

## Rulare

Din directorul `harness/`:

```
go run ./backend/cmd/server          # http://localhost:8080
go run ./backend/cmd/server -dev     # recompileaza sabloanele la fiecare cerere
```

Fără Go instalat local, prin Docker:

```
docker run --rm -p 8080:8080 -v "<cale>/harness:/app" -w /app golang:1.23-alpine \
  go run ./backend/cmd/server -addr :8080
```

Test de flux (pornește serverul, parcurge toate ecranele, verifică textele cheie):

```
docker run --rm -v "<cale>/harness:/app" -w /app golang:1.23-alpine sh /app/scripts/smoke.sh
```

## Structura

```
harness/
  go.mod                       modul `libramaker` (fara dependinte externe)
  backend/
    cmd/server/main.go         punctul de intrare HTTP
    internal/
      web/render.go            compilarea sabloanelor (pagini + fragmente HTMX)
      web/server.go            rutele si handlerele celor sase ecrane
      sessions/store.go        model de domeniu + store in memorie (viitorul Postgres)
      config/ auth/ db/ runner/ queue/ handoff/   goale inca - vezi "Ce urmeaza"
  frontend/
    templates/
      layouts/base.html        documentul HTML, fonturi, htmx.min.js, app.css
      pages/                   login, home, projects, tools, details, generating, result, handoff, help
      partials/                sidebar, topbar, stepper, project-row, mark, form-error
    static/
      css/app.css              tokenii designului (culori, radius, umbre, tipografie)
      js/htmx.min.js           HTMX 2.0.4, servit local (fara CDN)
      js/app.js                singurul JS propriu: contorul de caractere
  docker/claude-runner/        imaginea per sesiune (Dockerfile + skill-uri) - de scris
  scripts/smoke.sh             testul de flux
  workspaces/                  workspaces/{user_id}/{session_id}
  mockup/                      bundle-ul de handoff din Claude Design
```

## Unde e folosit HTMX

| Interacțiune | Mecanism |
|---|---|
| Căutarea din bara de sus | `hx-get /proiecte/cauta`, înlocuiește doar lista de proiecte |
| Alegerea instrumentului | `hx-post /proiect-nou/instrument`, eroare inline dacă nu s-a ales nimic |
| Trimiterea detaliilor | `hx-post /proiect-nou/detalii`, erori inline, apoi `HX-Redirect` |
| Așteptarea generării | `hx-get /proiect/{id}/status` la 1,5 s; 204 cât timp rulează |
| Trimiterea la Dev | `hx-post /proiect/{id}/handoff` |

Fluxul funcționează și fără JavaScript: handlerele răspund cu `HX-Redirect` doar când cererea
vine de la HTMX, altfel cu un redirect 303 obișnuit.

## Decizii față de mockup

- **Două instrumente, nu patru.** Varianta finală a designului spune explicit „exact două
  skill-uri aprobate”; catalogul din `sessions.Tools` are `pagina-informare` și `formular`,
  nu cele patru din documentul inițial de implementare.
- **Paleta „Atelier” (verde/ocru, Fraunces) a fost înlocuită** cu identitatea Libra din design:
  roșu `#C2182F` / `#8E1226`, text `#1C1B21`, fundal `#F7F4F2`, tipografie Plus Jakarta Sans.
- **Ecranul de așteptare** (`pages/generating.html`) nu există în mockup — designul sare direct
  de la „Construiește pagina” la rezultat. Generarea fiind asincronă (~40 s), am compus un ecran
  de tranziție din elementele existente.
- **Pagina Ajutor** apare ca element de meniu în ecranul 02, fără ecran desenat; conține doar
  blocuri deja definite în design (limitele instrumentelor, regulile de handoff).
- Meniul lateral e unul singur, cu elementul activ marcat; mockup-ul arată liste ușor diferite
  pe ecranele 02 și 03/04.

## Ce urmează (backend)

Marcat cu `TODO(backend)` în cod:

- `web.handleSSO` — SSO-ul intern în locul autentificării simulate.
- `sessions.Store` — repository peste Postgres (tabelele `users` / `sessions` din document).
- `sessions.Store.build` — coada de containere + `claude -p --output-format json`.
- `sessions.Store.HandOff` — commit/PR în repo-ul echipei Dev sau notificare.
