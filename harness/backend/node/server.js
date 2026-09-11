'use strict';
// server.js — Serverul Express al Libra Maker.
// Stack: Node.js 20 + Express 4 + Nunjucks + express-session + bcryptjs.
//
// Store: Store din store.js (PostgreSQL). DATABASE_URL trebuie sa fie setat
// in .env inainte de pornire; serverul iese daca baza de date nu e accesibila.

const path    = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const nunjucks = require('nunjucks');

const { STATUS, TOOLS, toolByID, Store } = require('./store');
const { MemoryStore }                     = require('./store-memory');
const agent                               = require('./agent');

// ---------- app ----------

const app = express();

// ---------- template engine ----------

const TEMPLATES_DIR = path.join(__dirname, '../../frontend/templates-njk');

nunjucks.configure(TEMPLATES_DIR, {
  autoescape: true,
  express:    app,
  watch:      process.env.NODE_ENV !== 'production',
});

// ---------- middleware ----------

app.use('/static', express.static(path.join(__dirname, '../../frontend/static')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
  secret:            process.env.SESSION_SECRET || 'libra-maker-dev-secret-2025',
  resave:            false,
  saveUninitialized: false,
  cookie:            { httpOnly: true, sameSite: 'lax' },
}));

// ---------- helpers ----------

function hxRedirect(req, res, url) {
  if (req.headers['hx-request']) {
    res.set('HX-Redirect', url);
    return res.status(204).send();
  }
  return res.redirect(303, url);
}

/**
 * Auth middleware — await-safe pentru Store async (PostgreSQL).
 */
function auth(handler) {
  return async (req, res, next) => {
    try {
      const user = req.session.userID ? await store.getUser(req.session.userID) : null;
      if (!user) {
        if (req.headers['hx-request']) {
          res.set('HX-Redirect', '/login');
          return res.status(204).send();
        }
        return res.redirect('/login');
      }
      req.user = user;
      return handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

// ---------- routes: public ----------

app.get('/', async (req, res, next) => {
  try {
    const user = req.session.userID ? await store.getUser(req.session.userID) : null;
    return user ? res.redirect('/acasa') : res.redirect('/login');
  } catch (err) { next(err); }
});

app.get('/login', async (req, res, next) => {
  try {
    const user = req.session.userID ? await store.getUser(req.session.userID) : null;
    if (user) return res.redirect('/acasa');
    return res.render('pages/login.html', { title: 'Autentificare' });
  } catch (err) { next(err); }
});

app.post('/auth/login', async (req, res, next) => {
  try {
    const email    = (req.body.email    || '').trim();
    const password = (req.body.password || '');

    const user  = await store.findUserByEmail(email);
    const valid = user && await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.render('pages/login.html', {
        title:      'Autentificare',
        error:      'Email sau parolă incorectă. Încearcă din nou.',
        emailValue: email,
      });
    }

    req.session.userID = user.id;
    return req.session.save(() => res.redirect('/acasa'));
  } catch (err) { next(err); }
});

app.get('/inregistrare', async (req, res, next) => {
  try {
    const user = req.session.userID ? await store.getUser(req.session.userID) : null;
    if (user) return res.redirect('/acasa');
    return res.render('pages/register.html', { title: 'Creează cont' });
  } catch (err) { next(err); }
});

app.post('/auth/register', async (req, res, next) => {
  try {
    const name       = (req.body.name       || '').trim();
    const department = (req.body.department || '').trim();
    const email      = (req.body.email      || '').trim();
    const password   = (req.body.password   || '');
    const password2  = (req.body.password2  || '');

    const fields = { nameValue: name, departmentValue: department, emailValue: email };
    const fail = (error) => res.render('pages/register.html', { title: 'Creează cont', error, ...fields });

    if ([...name].length < 3)            return fail('Introdu numele tău complet.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Introdu o adresă de email validă.');
    if (await store.findUserByEmail(email)) return fail('Există deja un cont cu acest email. Încearcă să te autentifici.');
    if (password.length < 8)             return fail('Parola trebuie să aibă cel puțin 8 caractere.');
    if (password !== password2)          return fail('Parolele introduse nu coincid.');

    const user = await store.createUser({ email, name, department, password });
    req.session.userID = user.id;
    return req.session.save(() => res.redirect('/acasa'));
  } catch (err) { next(err); }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------- routes: authenticated ----------

app.get('/acasa', auth(async (req, res) => {
  const [projects, stats] = await Promise.all([
    store.projects(req.user.id),
    store.stats(req.user.id),
  ]);
  return res.render('pages/home.html', {
    title:       'Acasă',
    nav:         'acasa',
    sidebarFoot: 'promo',
    user:        req.user,
    stats,
    projects:    projects.slice(0, 5),
  });
}));

app.get('/proiectele-mele', auth(async (req, res) => {
  const projects = await store.projects(req.user.id);
  return res.render('pages/projects.html', {
    title:       'Proiectele mele',
    nav:         'proiectele-mele',
    sidebarFoot: 'promo',
    user:        req.user,
    projects,
  });
}));

// GET /proiecte/cauta — fragment HTMX pentru bara de cautare
app.get('/proiecte/cauta', auth(async (req, res) => {
  const found = await store.search(req.user.id, req.query.q || '');
  return res.render('partials/project-list.html', { projects: found });
}));

app.get('/ajutor', auth((req, res) => {
  return res.render('pages/help.html', {
    title:       'Ajutor',
    nav:         'ajutor',
    sidebarFoot: 'restricted',
    user:        req.user,
  });
}));

app.get('/proiect-nou', auth((req, res) => {
  return res.redirect('/proiect-nou/detalii');
}));

app.get('/proiect-nou/detalii', auth((req, res) => {
  const skillID     = req.query.skill || '';
  let tool          = toolByID(skillID);
  const skillPreset = !!tool;
  if (!tool && TOOLS.length > 0) tool = TOOLS[0];

  // ?tpl= vine din cardurile "Descopera" de pe pagina Acasa: descrierea
  // sablonului, cu care pre-completam prima replica din conversatie.
  const preset = typeof req.query.tpl === 'string' ? req.query.tpl.slice(0, 2000) : '';

  return res.render('pages/details.html', {
    title:       'Proiect nou',
    nav:         'proiect-nou',
    sidebarFoot: 'restricted',
    user:        req.user,
    tool,
    tools:       TOOLS,
    skillPreset,
    preset,
    projectID:   '',
    name:        '',
    description: '',
    error:       '',
    configurat:  agent.isConfigured(),
    agentNume:   agent.NUME,
    model:       agent.DEPLOYMENT,
  });
}));

// POST /proiect-nou/detalii — valideaza si creeaza/actualizeaza proiectul
app.post('/proiect-nou/detalii', auth(async (req, res) => {
  const skillID = (req.body.skill_id    || '').trim();
  const tool    = toolByID(skillID);
  if (!tool) return hxRedirect(req, res, '/proiect-nou');

  const name        = (req.body.name        || '').trim();
  const description = (req.body.description || '').trim();

  if ([...name].length < 3) {
    return res.render('partials/form-error.html', {
      error: 'Dă-i un nume proiectului — ajută echipa de dezvoltare să îl recunoască.',
    });
  }
  if ([...description].length < 20) {
    return res.render('partials/form-error.html', {
      error: 'Scrie câteva rânduri despre ce vrei să conțină pagina, ca să putem construi ceva folositor.',
    });
  }

  const existingID = (req.body.project_id || '').trim();
  if (existingID) {
    const existing = await store.getProject(existingID);
    if (existing && existing.userID === req.user.id) {
      await store.update(existing.id, skillID, name, description);
      return hxRedirect(req, res, `/proiect/${existing.id}`);
    }
  }

  const p = await store.create(req.user.id, skillID, name, description);
  return hxRedirect(req, res, `/proiect/${p.id}`);
}));

// GET /proiect/:id/detalii — editare proiect existent
app.get('/proiect/:id/detalii', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send('Proiect negăsit.');

  const tool = toolByID(p.skillID);
  if (!tool) return res.redirect('/proiect-nou');

  const initialHtml = agent.citestePagina(p.workspacePath) || '';

  return res.render('pages/details.html', {
    title:        p.name,
    nav:          'proiect-nou',
    sidebarFoot:  'restricted',
    user:         req.user,
    tool,
    tools:        TOOLS,
    skillPreset:  true,
    preset:       '',
    projectID:    p.id,
    name:         p.name,
    description:  p.description,
    error:        '',
    configurat:   agent.isConfigured(),
    agentNume:    agent.NUME,
    model:        agent.DEPLOYMENT,
    initialHtml,
  });
}));

// GET /proiect/:id — vizualizare proiect (generare / rezultat / handoff)
app.get('/proiect/:id', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send('Proiect negăsit.');

  if (p.status === STATUS.QUEUED || p.status === STATUS.RUNNING) {
    return res.render('pages/generating.html', {
      title:       p.name,
      nav:         'proiect-nou',
      sidebarFoot: 'restricted',
      user:        req.user,
      project:     p,
    });
  }
  if (p.status === STATUS.HANDED_OFF || p.status === STATUS.DONE) {
    return res.redirect(`/proiect/${p.id}/predat`);
  }
  return res.render('pages/result.html', {
    title:   p.name,
    user:    req.user,
    project: p,
    // Proiectele venite de la asistent au pagina scrisa pe disc: o aratam pe ea.
    // Cele generate de runner inca nu produc fisiere, deci raman cu macheta.
    arePagina: agent.citestePagina(p.workspacePath) !== null,
  });
}));

// GET /proiect/:id/status — sondaj HTMX (204 cat ruleaza, HX-Redirect cand e gata)
app.get('/proiect/:id/status', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send();

  if (p.status === STATUS.QUEUED || p.status === STATUS.RUNNING) {
    return res.status(204).send();
  }
  return hxRedirect(req, res, `/proiect/${p.id}`);
}));

// ---------- agentul de conversatie ----------

// Asistentul nu mai are ecran separat: traieste in "Construiesti pagina ta".
// Pastram adresa veche ca redirect, ca sa nu rupem linkurile deja trimise.
app.get('/asistent', auth((req, res) => res.redirect('/proiect-nou/detalii')));

// POST /asistent/mesaj — un pas de conversatie
app.post('/asistent/mesaj', auth(async (req, res, next) => {
  if (!agent.isConfigured()) {
    return res.status(503).json({ eroare: 'Asistentul nu e configurat pe acest server.' });
  }
  try {
    // Istoricul sta in sesiune: conversatia e efemera, nu are ce cauta in baza.
    const istoric = req.session.chat || [];
    const text    = (req.body.mesaj || '').trim().slice(0, 4000);
    if (!text) return res.status(400).json({ eroare: 'Mesaj gol.' });

    istoric.push({ role: 'user', content: text });
    const r = await agent.raspunde(istoric);
    istoric.push({ role: 'assistant', content: r.raspuns });

    // Pastram doar ultimele 30 de mesaje, ca sesiunea sa nu creasca la nesfarsit.
    req.session.chat = istoric.slice(-30);
    return res.json(r);
  } catch (err) { next(err); }
}));

// POST /asistent/construieste — genereaza pagina si creeaza proiectul
app.post('/asistent/construieste', auth(async (req, res, next) => {
  if (!agent.isConfigured()) {
    return res.status(503).json({ eroare: 'Asistentul nu e configurat pe acest server.' });
  }
  try {
    const nume      = (req.body.nume      || '').trim().slice(0, 120);
    const descriere = (req.body.descriere || '').trim().slice(0, 4000);
    const skill     = (req.body.skill     || '').trim();
    if (nume.length < 3 || descriere.length < 20) {
      return res.status(400).json({ eroare: 'Mai avem nevoie de un nume si de o descriere.' });
    }

    const inceput = Date.now();
    const r = await agent.construieste({ nume, descriere, skill });
    const durata = Math.max(1, Math.round((Date.now() - inceput) / 1000));

    // Pagina nu ramane doar in previzualizare: devine un proiect real, cu
    // fisierele scrise in workspace-ul sesiunii, exact ca la generarea din
    // container. De acolo poate fi reluata si trimisa echipei de dezvoltare.
    const p = await store.createBuilt(req.user.id, skill, nume, descriere, durata);
    agent.salveazaPagina(p.workspacePath, r.html, { nume, descriere, skill });
    agent.salveazaChat(p.workspacePath, [
      { role: 'user', text: descriere },
      { role: 'vera', text: 'Gata! Pagina ta e vizibilă în dreapta. Spune-mi dacă vrei să schimb ceva — culori, texte, structură.' },
    ]);

    return res.json({ ...r, proiectId: p.id, proiectURL: `/proiect/${p.id}` });
  } catch (err) { next(err); }
}));

// POST /asistent/modifica — aplica o modificare pe o pagina deja construita
app.post('/asistent/modifica', auth(async (req, res, next) => {
  if (!agent.isConfigured()) {
    return res.status(503).json({ eroare: 'Asistentul nu e configurat pe acest server.' });
  }
  try {
    const mesaj      = (req.body.mesaj       || '').trim().slice(0, 4000);
    const htmlCurent = (req.body.html_curent  || '').trim();
    const proiectId  = (req.body.proiect_id   || '').trim();

    if (!mesaj)      return res.status(400).json({ eroare: 'Mesaj gol.' });
    if (!htmlCurent) return res.status(400).json({ eroare: 'HTML curent lipseste.' });

    const r = await agent.modifica(mesaj, htmlCurent);

    // Actualizeaza fisierul in workspace-ul proiectului, daca ID-ul e cunoscut.
    if (proiectId) {
      try {
        const p = await store.getProject(proiectId);
        if (p && p.userID === req.user.id) {
          agent.salveazaPagina(p.workspacePath, r.html, {
            nume:      p.name,
            descriere: p.description,
            skill:     p.skillID,
          });
          const chat = agent.citesteChat(p.workspacePath);
          chat.push({ role: 'user', text: mesaj });
          chat.push({ role: 'vera', text: r.raspuns || 'Am aplicat modificările. Cum arată acum?' });
          agent.salveazaChat(p.workspacePath, chat);
        }
      } catch (_) { /* salvarea e best-effort; eroarea nu opreste raspunsul */ }
    }

    return res.json({
      ...r,
      proiectId:  proiectId || null,
      proiectURL: proiectId ? `/proiect/${proiectId}` : null,
    });
  } catch (err) { next(err); }
}));

// GET /proiect/:id/pagina — pagina construita, servita ca fisier.
//
// Se incarca in <iframe sandbox>, deci ruleaza izolata: fara acces la sesiune
// si fara sa poata naviga aplicatia. Antetele de mai jos o tin izolata si daca
// cineva o deschide direct.
app.get('/proiect/:id/pagina', auth(async (req, res, next) => {
  try {
    const p = await store.getProject(req.params.id);
    if (!p || p.userID !== req.user.id) return res.status(404).send('Proiect negăsit.');

    const html = agent.citestePagina(p.workspacePath);
    if (html === null) return res.status(404).send('Pagina nu a fost construită încă.');

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline'; form-action 'none'");
    res.set('X-Content-Type-Options', 'nosniff');
    return res.send(html);
  } catch (err) { next(err); }
}));

// POST /proiect/:id/sterge — sterge proiectul utilizatorului curent
app.post('/proiect/:id/sterge', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).json({ eroare: 'Proiect negăsit.' });
  await store.deleteProject(p.id);
  return res.json({ ok: true });
}));

// GET /proiect/:id/chat — istoricul conversatiei salvat pentru un proiect
app.get('/proiect/:id/chat', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).json([]);
  return res.json(agent.citesteChat(p.workspacePath));
}));

// POST /asistent/reset — porneste o discutie noua
app.post('/asistent/reset', auth((req, res) => {
  req.session.chat = [];
  return res.json({ ok: true });
}));

// POST /proiect/:id/handoff — preda proiectul echipei Dev
app.post('/proiect/:id/handoff', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send();

  await store.handOff(p.id);
  return hxRedirect(req, res, `/proiect/${p.id}/predat`);
}));

// GET /proiect/:id/predat — confirmare handoff
app.get('/proiect/:id/predat', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send();

  if (p.status !== STATUS.HANDED_OFF && p.status !== STATUS.DONE) {
    return res.redirect(`/proiect/${p.id}`);
  }
  return res.render('pages/handoff.html', {
    title:   'Trimis la Dev',
    user:    req.user,
    project: p,
  });
}));

// ---------- error handler ----------

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(500).send('Eroare internă de server. Verificați logurile.');
});

// ---------- startup ----------

let store;

async function start() {
  const PORT = parseInt(process.env.PORT || '8080', 10);

  if (process.env.DATABASE_URL) {
    try {
      store = new Store();
      await store.init();
      console.log('[store] PostgreSQL conectat, tabele verificate ✓');
    } catch (err) {
      console.warn(`[store] PostgreSQL indisponibil (${err.message}) — pornesc cu store in memorie (date demo).`);
      store = new MemoryStore();
      await store.init();
    }
  } else {
    console.log('[store] DATABASE_URL lipseste — store in memorie (date demo).');
    store = new MemoryStore();
    await store.init();
  }

  // Starea asistentului se spune o singura data, aici. In interfata colegul
  // vede doar ca nu e disponibil — numele variabilelor sunt treaba noastra.
  if (agent.isConfigured()) {
    console.log(`[asistent] ${agent.NUME} activa, model ${agent.DEPLOYMENT}`);
  } else {
    console.warn(`[asistent] inactiv - lipsesc din mediu: ${agent.lipsuri().join(', ')}.`);
    console.warn('[asistent] .env se citeste la pornirea containerului: dupa ce il editezi, reporneste.');
  }

  app.listen(PORT, () => {
    console.log(`Libra Maker (Node.js) pornit pe http://localhost:${PORT}`);
    if (store instanceof MemoryStore) {
      console.log('Utilizator demo: ana.popescu@libra.ro / libra2025');
    }
  });
}

start().catch(err => {
  console.error('Pornire esuata:', err.message);
  process.exit(1);
});
