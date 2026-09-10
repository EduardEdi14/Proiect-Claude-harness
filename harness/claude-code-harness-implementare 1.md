# Claude Code Harness — document de implementare

Platformă internă care permite unui coleg din business (non-tehnic) să genereze o pagină web simplă folosind Claude Code, printr-o interfață ghidată, cu predare (handoff) automată către echipa de Development pentru revizuire și publicare.

## 1. Obiectiv și context

- Utilizatori: colegi din business (ex. HR, marketing), fără cunoștințe tehnice.
- Exemplu de caz de utilizare: un coleg HR vrea o pagină pentru campania internă "green week" (program de colectare selectivă, puncte de reciclare, formular de înscriere).
- Fază de test: ~40 de utilizatori. Scalare ulterioară: 1000+.
- Cerință centrală: mediu sigur și izolat — userii nu au cunoștințe de protecția datelor, deci fiecare sesiune trebuie izolată de restul sistemului și de celelalte sesiuni.
- Rezultatul generat nu se publică automat — trece printr-un pas de handoff către echipa de Development.

## 2. Arhitectură generală

```
Utilizator business (browser, intranet)
        │
        ▼
Aplicație web ("wrapper") — Go + HTMX
        │  (autentificare, alegere skill, formular, status)
        ▼
Server Go (HTTP, pe un port) ─── Postgres (users, sessions)
        │
        ▼
Docker Engine (pe același host)
        │
        ▼
Container Docker izolat, per sesiune
   └─ Claude Code CLI (headless, `claude -p`)
   └─ Skill-uri predefinite (.claude/skills/)
        │
        ▼
Anthropic API (Claude) ── proiect dedicat, pentru cost tracking
        │
        ▼
Rezultat (cod generat) → handoff către echipa Dev (repo / PR / notificare)
```

Un singur server poate rula concurent mai multe containere (Docker Engine gestionează izolarea per container, nu per mașină). Limita reală e dată de resursele CPU/RAM ale serverului, nu de "un container = un calculator". Pentru volum mare, se pot adăuga servere suplimentare mai târziu, fără a schimba arhitectura logică.

## 3. Structura workspace-urilor

```
workspaces/
  {user_id}/
    {session_id}/        ← montat ca volum în containerul Docker al sesiunii
      (fișierele generate de Claude Code pentru acea sesiune)
```

`workspace_path`-ul stocat în Postgres e sursa de adevăr pentru backend — indică exact ce folder se montează în container la pornirea sesiunii.

## 4. Bază de date — Postgres

Acces direct din admin (pgAdmin/DBeaver) pentru monitorizare în faza de test.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    skill_id TEXT NOT NULL,          -- ex: 'pagina-simpla', 'formular', 'harta'
    project_name TEXT NOT NULL,
    description TEXT NOT NULL,       -- devine promptul trimis către Claude Code
    workspace_path TEXT NOT NULL,    -- workspaces/{user_id}/{session_id}
    status TEXT NOT NULL,            -- queued | running | completed | failed | handed_off
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);
```

`status` e mecanismul prin care backend-ul Go știe ce sesiuni sunt active, ce așteaptă în coadă și ce a fost deja predat echipei de Dev.

## 5. Backend — Go

- Server HTTP (`net/http`) pe un port, servește și paginile HTML (templates) și un API intern pentru HTMX (fragmente HTML returnate la fiecare acțiune).
- Responsabilități:
  - Autentificare (integrare cu SSO/contul de companie existent pe intranet).
  - CRUD minimal pe `sessions` în Postgres.
  - Pornire container Docker per sesiune, folosind Docker SDK pentru Go (`github.com/docker/docker/client`), cu volumul workspace-ului montat și rețea restricționată (doar către `api.anthropic.com`).
  - Coadă internă (channel/worker pool) când numărul de sesiuni active depășește limita configurată de containere concurente.
  - Citire rezultat din container (JSON returnat de `claude -p --output-format json`) și actualizare status în DB.
  - Declanșare pas de handoff (creare commit/PR sau notificare) către echipa de Development.
- Ales în locul Python pentru concurență ieftină (goroutines) la gestionarea multor sesiuni simultan, și pentru un binar static, ușor de rulat local, fără dependențe grele.

## 6. Docker — izolare per sesiune

- Un container per sesiune activă, pornit și oprit de backend-ul Go.
- Imagine custom, cu Node.js + Claude Code CLI instalat + skill-urile predefinite copiate în `.claude/skills/`.
- Utilizator non-root în container (Claude Code refuză pornirea ca root cu flag-uri fără prompt-uri de permisiune).
- Rețea restricționată: acces doar către `api.anthropic.com` (sau endpoint-ul din Anthropic API Platform).
- Volumul montat: doar folderul `workspaces/{user_id}/{session_id}` — containerul nu vede nimic altceva din sistemul de fișiere al hostului.
- Container distrus la finalul sesiunii — nu rămâne nimic persistent în afara workspace-ului.

```dockerfile
FROM node:20-slim
RUN npm install -g @anthropic-ai/claude-code
RUN useradd -m claudeuser
USER claudeuser
WORKDIR /home/claudeuser/workspace
COPY --chown=claudeuser:claudeuser skills/ /home/claudeuser/.claude/skills/
ENTRYPOINT ["claude"]
```

Rulare tipică din Go, apelând `claude -p` în modul non-interactiv:

```
claude -p "<descrierea din formular>" \
  --allowedTools "Read,Write,Edit" \
  --permission-mode acceptEdits \
  --output-format json
```

## 7. Skill-uri Claude Code

Fiecare skill e un fișier `SKILL.md` (plus fișiere suport, opțional) în `.claude/skills/`, care ghidează Claude Code pentru un tip specific de pagină. Userul din business nu vede niciodată cuvântul "skill" — vede un nume prietenos în interfață.

| Nume afișat în UI      | `skill_id`      | Ce generează                                  |
|-------------------------|------------------|-----------------------------------------------|
| Pagină simplă            | `pagina-simpla`  | Text, imagini, informații generale            |
| Formular                 | `formular`       | Pagină cu formular de colectare date          |
| Hartă & locații           | `harta`          | Pagină cu puncte pe hartă                     |
| Calendar                 | `calendar`       | Pagină cu programări/evenimente               |

Promptul trimis către `claude -p` include skill-ul ca prefix, ex: `/formular <descrierea userului>`.

## 8. Frontend — HTMX + Go templates (`html/template`)

Fără build separat de JS/npm — Go servește HTML direct, HTMX adaugă interactivitate (submit fără reload, actualizare parțială a paginii).

### Identitate vizuală ("Atelier")

- Concept: userul alege un instrument (skill) și construiește ceva — nu un dashboard SaaS generic.
- Culori: hârtie caldă `#F3F1E9` (fundal), verde-teal `#2F6F5E` (accent principal), ochre/muștar `#D9A441` (accent secundar), text `#2A2620`.
- Tipografie: Fraunces (serif, titluri) + Inter (sans, tot ce e interfață/text funcțional).
- Ton: propoziții calde, directe, fără jargon tehnic ("Ce construim azi?", nu "Selectați proiect").

### Fluxul de ecrane

1. **Login** — un singur buton, "Continuă cu contul companiei" (SSO intern), fără formular email/parolă.
2. **Acasă** — "Ce construim azi?" + buton mare "Start proiect nou" + listă scurtă a proiectelor recente cu status (finalizat / predat la dev).
3. **Alege instrumentul** — carduri cu icon + nume prietenos + o propoziție descriptivă, per skill din tabelul de mai sus. Selecție obligatorie — butonul "Continuă" arată o eroare clară dacă userul nu a ales nimic.
4. **Detalii proiect** — etichetă vizibilă cu instrumentul ales, câmp "Numele proiectului", câmp liber "Descrie ce vrei să conțină pagina" (textarea, devine descrierea din DB → promptul).
5. **Rezultat** — confirmare vizuală ("Pagina ta e pregătită"), previzualizare, mesaj de reasigurare ("echipa de dezvoltare va revizui înainte de publicare"), buton "Trimite la echipa Dev".

## 9. Handoff către echipa de Development

După generare, un pas separat (skill dedicat sau logică proprie în backend):
- creează un commit/pull request într-un repo Git cu codul generat, sau
- trimite o notificare (ex. canal intern) cu link către workspace-ul sesiunii, pentru revizuire manuală.

Codul generat nu ajunge niciodată direct în producție fără trecere prin echipa de Dev.

## 10. Găzduire, cost și scalare

- Rulare locală (server propriu / VM ieftin), nu servicii gestionate Azure (Container Apps/AKS) — reduce costul, dar elimină auto-scalarea automată; capacitatea și coada de așteptare trebuie gestionate manual în Go.
- 1000+ utilizatori înregistrați ≠ 1000 de containere simultane — dimensionarea se face după numărul de sesiuni active concurent (peak), nu după totalul de utilizatori.
- Când un singur server nu mai face față peak-ului, se adaugă servere suplimentare, distribuind cererile din Go (round-robin sau load balancer simplu) — arhitectura logică rămâne neschimbată.

## 11. De discutat / pași următori

- Confirmarea mecanismului de autentificare SSO disponibil pe intranet.
- Numărul exact de containere concurente permise per server (dimensionare pe baza RAM/CPU disponibil).
- Detalii concrete ale pasului de handoff (repo Git țintă, canal de notificare).
- Redactarea efectivă a fișierelor `SKILL.md` pentru fiecare instrument din tabelul de la secțiunea 7.
