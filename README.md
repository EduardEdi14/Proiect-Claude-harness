# Libra Maker

Generator de pagini interne pentru intranet. Un coleg din business descrie pagina de care are nevoie, iar echipa de dezvoltare primește o ciornă completă, revizuibilă.

**Stack:** Node.js 20, Express, Nunjucks, PostgreSQL 16, rulat prin Docker Compose. Generarea folosește Claude prin Microsoft Foundry. Configurarea se face local, din `.env.example`.

---

## Despre proiect

Libra Maker este o platformă internă care permite colegilor din business — HR, marketing, administrativ — să genereze pagini web pentru intranet fără cunoștințe tehnice. Utilizatorul descrie în câteva propoziții ce pagină vrea, alege un template potrivit situației, iar sistemul generează automat o ciornă HTML completă. Ciorna nu ajunge niciodată direct în producție: trece obligatoriu printr-un pas de revizuire și aprobare din partea echipei de Development.

### Ce poate face

- **Generează pagini web din text simplu** — utilizatorul scrie o descriere în română, fără cod și fără instrumente tehnice.
- **22 de template-uri specializate** acoperă situațiile recurente din viața internă a companiei: campanii, anunțuri, onboarding, ghiduri pas cu pas, regulamente, tabele de date, grafice, prezentări, sondaje, formulare de cerere, feedback, recomandare candidați și altele.
- **Două tipuri de bază** disponibile oricând:
  - *Pagină de informare* — titlu, text, imagini, liste de puncte (HTML + CSS, fără JavaScript custom).
  - *Formular de colectare* — câmpuri cu validare și confirmare la trimitere.
- **Respectă identitatea vizuală Libra** — paleta de culori, tipografia și tokenurile de design sunt aplicate automat în fiecare pagină generată.
- **Caută în proiectele proprii** după nume sau descriere, cu suport pentru diacritice.
- **Urmărește statusul** fiecărui proiect — Ciornă / Predat la Dev / Finalizat — cu timp mediu de generare afișat.
- **Permite reluarea și editarea** unei ciorne înainte de predare.
- **Predare explicită (handoff)** — utilizatorul apasă „Trimite la echipa Dev" când e mulțumit; fiecare predare primește un număr de cerere generat automat.
- **Izolare completă per sesiune** — fiecare generare rulează într-un container Docker separat, cu acces exclusiv la `api.anthropic.com`; containerul nu vede nimic altceva din sistem.

### Ce nu poate face

- **Nu publică automat** — pagina generată trece obligatoriu prin echipa de Development înainte de a fi pusă live pe intranet.
- **Nu generează aplicații interactive complexe** — fără logică de server, fără autentificare proprie, fără baze de date în pagina generată.
- **Nu accesează internetul în timpul generării** — nicio bibliotecă externă, niciun CDN, niciun font descărcat din rețea. Tot ce apare în pagină este generat local sau vine din stylesheet-ul de bază Libra.
- **Nu procesează date sensibile** — formularul generat colectează câmpuri de bază; nu e proiectat pentru date medicale, financiare sau PII critice.
- **Nu răspunde la întrebări în timpul generării** — rularea este headless, fără interacțiune. Dacă ceva e neclar, Claude notează decizia luată automat în fișierul `NOTE.md`.
- **Nu trimite notificări automate** — handoff-ul creează un ticket intern, dar nu trimite email sau mesaj pe un canal intern (funcționalitate planificată).
- **Nu oferă previzualizare în timp real** — utilizatorul vede o confirmare textuală după generare, nu un preview live al paginii.
- **Nu suportă colaborare pe același proiect** — fiecare utilizator vede și editează doar proiectele proprii.
- **Maximum 8 câmpuri** pentru formulare; graficele sunt SVG scris manual, fără biblioteci externe de charting.

---

## Ce poate face aplicația

### Pentru utilizatorul de business

- **Generează pagini web** din câteva propoziții de descriere — fără cod, fără instrumente tehnice.
- **Două tipuri de bază** disponibile direct din interfață:
  - **Pagină de informare** — titlu, text, imagini, liste de puncte (HTML + CSS, fără JavaScript custom).
  - **Formular de colectare** — câmpuri de completat, validare și confirmare la trimitere (max. 8 câmpuri, fără date sensibile).
- **22 de template-uri specializate** acoperă situațiile recurente: campanii interne, anunțuri, onboarding, ghiduri pas cu pas, regulamente, tabele de date, grafice, prezentări, sondaje, formulare de cerere, feedback și altele — structura e deja decisă, utilizatorul descrie doar conținutul.
- **Căutare în proiectele proprii** — după nume sau descriere, cu suport pentru diacritice.
- **Urmărire status** — Ciornă / Predat la Dev / Finalizat — cu timp mediu de generare afișat.
- **Posibilitate de reluare** — o ciornă poate fi editată și regenerată înainte de predare.
- **Handoff explicit** — rezultatul nu se publică singur; utilizatorul apasă „Trimite la echipa Dev" când e mulțumit.

### Ce generează Claude Code

Fiecare sesiune produce fișiere statice în workspace-ul propriu:

| Fișier | Conținut |
|---|---|
| `index.html` | Pagina completă, în română, cu diacritice corecte |
| `style.css` | Stiluri specifice, bazate pe tokenul de design Libra |
| `NOTE.md` | Deciziile luate automat de Claude, pentru echipa Dev |

Paginile generate respectă identitatea vizuală Libra (paleta de culori, tipografia Plus Jakarta Sans) și includ un footer care indică faptul că pagina este o ciornă, nepublicată.

### Pentru echipa de Development

- Fiecare sesiune predată primește un **număr de cerere** (ticket ID) generat automat.
- **Fișa de handoff** afișează: instrument folosit, versiunea skill-ului, workspace path, durata generării, timestamp-uri.
- Codul generat ajunge la Dev înaintea oricărei publicări — nicio pagină nu intră direct în producție.

---

## Ce nu poate face aplicația

### Limitări de generare

- **Nu generează aplicații interactive complexe** — fără logică de server, fără autentificare, fără baze de date în pagina generată.
- **Nu accesează internetul în timpul generării** — nicio bibliotecă externă, niciun CDN, niciun font descărcat. Tot ce apare în pagină este generat local sau vine din `libra-base.css`.
- **Nu instalează pachete npm** și nu rulează comenzi shell — uneltele permise sunt doar `Read`, `Write`, `Edit`.
- **Nu poate răspunde la întrebări în timpul generării** — rularea este headless (fără interacțiune). Dacă ceva e neclar, Claude notează decizia luată în `NOTE.md`.
- **Nu poate procesa date sensibile** — formularul generat colectează câmpuri de bază; nu e proiectat pentru date medicale, financiare sau PII critice.
- **Maximum 8 câmpuri** pentru formulare.
- **Graficele sunt SVG scris manual** — nu se folosesc biblioteci de charting externe; complexitatea vizualizărilor e limitată la ce poate fi codificat direct în SVG.

### Limitări de flux

- **Nu publică automat** — pagina generată trece obligatoriu prin echipa de Development înainte de a fi pusă live.
- **Nu trimite notificări** în varianta curentă — handoff-ul creează un ticket intern, dar nu trimite email sau mesaj Slack (de implementat).
- **Maxim 5 proiecte recente** afișate pe pagina Acasă (restul sunt accesibile în „Proiectele mele").
- **Un singur utilizator per browser** — sesiunile sunt izolate prin cookie HttpOnly; nu există funcționalitate de echipă sau colaborare pe același proiect.
- **Nu există previzualizare în timp real** a paginii generate — utilizatorul vede o confirmare textuală, nu un iframe cu rezultatul.

### Limitări de infrastructură (starea curentă)

- **Autentificarea SSO** este simulată — butonul „Continuă cu contul companiei" autentifică direct cu utilizatorul demo. Integrarea reală cu SSO-ul intern al companiei e marcată `TODO(backend)`.
- **Stocarea e în memorie** — datele se pierd la repornirea serverului. Conectarea la Postgres e marcată `TODO(backend)`.
- **Generarea e simulată** — containerul Docker cu Claude Code nu e pornit efectiv; `store.build()` simulează o întârziere de ~2,5 s. Coada reală de containere e marcată `TODO(backend)`.
- **Handoff-ul nu creează commit/PR** — apelul `HandOff()` schimbă statusul în baza de date, dar nu trimite codul nicăieri. Logica de creare PR sau notificare e marcată `TODO(backend)`.

---

## Arhitectură

```
Browser (intranet)
      │
      ▼
Server web  ──  Node.js + Express + Nunjucks   (portul 3000, producție)
      │      sau  Go + html/template + HTMX     (portul 8080, prototip Go)
      │
      ▼
Store (Postgres în producție, memorie în dev)
      │
      ▼
Docker Engine  ──  container izolat per sesiune
      └─ Claude Code CLI  (claude -p, headless)
      └─ Skill-uri din docker/claude-runner/skills/
      └─ Volum montat: workspaces/{user_id}/{session_id}
      │
      ▼
Anthropic API  ──  claude-opus / claude-sonnet
      │
      ▼
Rezultat (index.html + style.css + NOTE.md)  →  handoff echipa Dev
```

Containerul vede **doar** workspace-ul sesiunii curente. Rețeaua e restricționată: acces exclusiv către `api.anthropic.com`.

---

## Catalog de template-uri

### Template-uri după tip de output

| Template | Ce produce |
|---|---|
| `dashboard` | Tablou de bord: 3–5 tile-uri indicatori, 2–4 grafice, un tabel detaliu |
| `chart` | Un grafic bine realizat + fraza explicativă + datele ca tabel |
| `report` | Raport printabil: sumar, narativă, grafice mici, acțiuni, anexă |
| `data-table` | Tabel căutabil și sortabil, cu totaluri, badge-uri de status, export CSV |
| `info-page` | Pagină de informare internă: secțiuni, liste, contacte |
| `form-page` | Formular cu validare și confirmare (front-end only) |
| `slides` | 6–12 slide-uri HTML, navigare cu tastele săgeată |

### Template-uri situaționale (specializări)

| Template | Situație |
|---|---|
| `campaign` | Campanie internă cu perioadă, deadline, locații, responsabil |
| `onboarding` | Primele zile ca timeline, responsabilități, checklist acces |
| `announcement` | Ce se schimbă, dată intrare în vigoare, înainte/după, FAQ |
| `event` | Pagină eveniment: când, unde, program orar, detalii practice |
| `team` | Prezentare echipă: misiune, membri cu roluri, proiecte curente |
| `faq` | Întrebări grupate pe teme ca `<details>`, contact la final |
| `schedule` | Tabel cu intervale orare, legendă, printabil |
| `benefits` | Ghid beneficii: ce / cine / cum se accesează — per beneficiu |
| `regulations` | Regulament cu clauze numerotate, eligibilitate, termene |
| `guide` | Pași numerotați cu outcome, troubleshooting, ajutor |
| `request` | Formular de cerere: ce se solicită, justificare, termen |
| `survey` | Sondaj intern pe o scală unitară + un câmp liber |
| `feedback` | Feedback pe criterii fixe + ce a lipsit + identitate opțională |
| `course-signup` | Înscriere la cursuri cu nivel, interval preferat, a doua opțiune |
| `referral` | Recomandare candidat: poziție, CV, relație, argument, consimțământ |

---

## Rulare locală

### Varianta Node.js (server principal)

```bash
cd harness/backend/node
cp .env.example .env       # setează DATABASE_URL și SESSION_SECRET
npm install
npm start                  # http://localhost:3000
```

Fără Postgres, serverul pornește cu store-ul în memorie (datele se pierd la restart).

### Varianta Go (prototip HTMX)

```bash
cd harness
go run ./backend/cmd/server          # http://localhost:8080
go run ./backend/cmd/server -dev     # recompilează șabloanele la fiecare cerere
```

### Prin Docker (fără Go instalat local)

```bash
docker run --rm -p 8080:8080 -v "<cale>/harness:/app" -w /app golang:1.23-alpine \
  go run ./backend/cmd/server -addr :8080
```

---

## Structura proiectului

```
harness/
  backend/
    node/                        serverul Node.js + Express (producție)
    cmd/server/                  serverul Go (prototip HTMX)
    internal/sessions/store.go   modelul de domeniu și store în memorie
    internal/web/server.go       rutele și handlerele Go
  frontend/
    templates-njk/               șabloane Nunjucks (Node.js)
    templates/                   șabloane Go html/template
    static/css/app.css           tokenuri design Libra
    static/js/htmx.min.js        HTMX 2.0.4, servit local
  docker/claude-runner/
    skills/                      22 de template-uri SKILL.md + referințe comune
    skills/_common/              identitate Libra, CSS de bază, SVG charts, reguli input
  workspaces/                    {user_id}/{session_id} — outputul per sesiune
  mockup/                        designul final (șase ecrane)
  scripts/smoke.sh               test de flux end-to-end
```

---

## Ce urmează (backend)

Toate `TODO(backend)` din cod:

1. **SSO intern** — `handleSSO` / autentificarea cu contul de companie.
2. **Postgres** — înlocuirea store-ului din memorie cu repository real (`users` / `sessions`).
3. **Coadă de containere** — pornirea efectivă a Docker per sesiune, cu `claude -p --output-format json`.
4. **Handoff real** — creare commit/PR în repo-ul echipei Dev sau notificare pe canalul intern.
