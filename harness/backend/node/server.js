'use strict';
// server.js — Serverul Express al Libra Maker.
<<<<<<< HEAD
// Stack: Node.js 20 + Express 4 + Nunjucks + express-session + bcryptjs.
//
// Store selection (automatic at startup):
//   DATABASE_URL set + reachable → PgStore  (PostgreSQL, persistent)
//   otherwise                    → Store    (in-memory, demo data)
=======
// Inlocuieste harness/backend/internal/web/server.go.
// Stack: Node.js 20 + Express 4 + Nunjucks + express-session + bcryptjs + PostgreSQL.
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a

const path    = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const nunjucks = require('nunjucks');

const { STATUS, TOOLS, toolByID, Store } = require('./store');
const { PgStore }                         = require('./store-pg');
const db                                  = require('./db');

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
 * Auth middleware — works with both the sync in-memory store and the
 * async PgStore, because `await syncValue` is safe in JS.
 */
function auth(handler) {
  return async (req, res, next) => {
<<<<<<< HEAD
    try {
      const user = req.session.userID ? await store.getUser(req.session.userID) : null;
      if (!user) {
        if (req.headers['hx-request']) {
          res.set('HX-Redirect', '/login');
          return res.status(204).send();
        }
        return res.redirect('/login');
=======
    const user = req.session.userID ? await store.getUser(req.session.userID) : null;
    if (!user) {
      if (req.headers['hx-request']) {
        res.set('HX-Redirect', '/login');
        return res.status(204).send();
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
      }
      req.user = user;
      return handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

// ---------- routes: public ----------

<<<<<<< HEAD
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
=======
// Radacina: redirecteaza la acasa daca e autentificat, altfel la login
app.get('/', async (req, res) => {
  const user = req.session.userID ? await store.getUser(req.session.userID) : null;
  if (user) return res.redirect('/acasa');
  return res.redirect('/login');
});

// GET /login
app.get('/login', async (req, res) => {
  const user = req.session.userID ? await store.getUser(req.session.userID) : null;
  if (user) return res.redirect('/acasa');
  return res.render('pages/login.html', { title: 'Autentificare' });
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
});

app.post('/auth/login', async (req, res, next) => {
  try {
    const email    = (req.body.email    || '').trim();
    const password = (req.body.password || '');

<<<<<<< HEAD
    const user  = await store.findUserByEmail(email);
    const valid = user && await bcrypt.compare(password, user.passwordHash);
=======
  const user  = await store.findUserByEmail(email);
  const valid = user && await bcrypt.compare(password, user.passwordHash);
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a

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

<<<<<<< HEAD
app.get('/inregistrare', async (req, res, next) => {
  try {
    const user = req.session.userID ? await store.getUser(req.session.userID) : null;
    if (user) return res.redirect('/acasa');
    return res.render('pages/register.html', { title: 'Creează cont' });
  } catch (err) { next(err); }
=======
// GET /inregistrare
app.get('/inregistrare', async (req, res) => {
  const user = req.session.userID ? await store.getUser(req.session.userID) : null;
  if (user) return res.redirect('/acasa');
  return res.render('pages/register.html', { title: 'Creează cont' });
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
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

<<<<<<< HEAD
    if ([...name].length < 3)            return fail('Introdu numele tău complet.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Introdu o adresă de email validă.');
    if (await store.findUserByEmail(email)) return fail('Există deja un cont cu acest email. Încearcă să te autentifici.');
    if (password.length < 8)             return fail('Parola trebuie să aibă cel puțin 8 caractere.');
    if (password !== password2)          return fail('Parolele introduse nu coincid.');

    const user = await store.createUser({ email, name, department, password });
    req.session.userID = user.id;
    return req.session.save(() => res.redirect('/acasa'));
  } catch (err) { next(err); }
=======
  if ([...name].length < 3) {
    return fail('Introdu numele tău complet.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Introdu o adresă de email validă.');
  }
  if (await store.findUserByEmail(email)) {
    return fail('Există deja un cont cu acest email. Încearcă să te autentifici.');
  }
  if (password.length < 8) {
    return fail('Parola trebuie să aibă cel puțin 8 caractere.');
  }
  if (password !== password2) {
    return fail('Parolele introduse nu coincid.');
  }

  const user = await store.createUser({ email, name, department, password });
  req.session.userID = user.id;
  return req.session.save(() => res.redirect('/acasa'));
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------- routes: authenticated ----------

<<<<<<< HEAD
app.get('/acasa', auth(async (req, res) => {
  const [projects, stats] = await Promise.all([
    store.projects(req.user.id),
    store.stats(req.user.id),
  ]);
=======
// GET /acasa
app.get('/acasa', auth(async (req, res) => {
  const projects = (await store.projects(req.user.id)).slice(0, 5);
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
  return res.render('pages/home.html', {
    title:       'Acasă',
    nav:         'acasa',
    sidebarFoot: 'promo',
    user:        req.user,
<<<<<<< HEAD
    stats,
    projects:    projects.slice(0, 5),
  });
}));

app.get('/proiectele-mele', auth(async (req, res) => {
  const projects = await store.projects(req.user.id);
=======
    stats:       await store.stats(req.user.id),
    projects,
  });
}));

// GET /proiectele-mele
app.get('/proiectele-mele', auth(async (req, res) => {
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
  return res.render('pages/projects.html', {
    title:       'Proiectele mele',
    nav:         'proiectele-mele',
    sidebarFoot: 'promo',
    user:        req.user,
<<<<<<< HEAD
    projects,
  });
}));

=======
    projects:    await store.projects(req.user.id),
  });
}));

// GET /proiecte/cauta — fragment HTMX pentru bara de cautare
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
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

  return res.render('pages/details.html', {
    title:       'Proiect nou',
    nav:         'proiect-nou',
    sidebarFoot: 'restricted',
    user:        req.user,
    tool,
    skillPreset,
    projectID:   '',
    name:        '',
    description: '',
    error:       '',
  });
}));

<<<<<<< HEAD
=======
// POST /proiect-nou/detalii — valideaza si creeaza/actualizeaza proiectul
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
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

<<<<<<< HEAD
=======
// GET /proiect/:id/detalii — editare proiect existent
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
app.get('/proiect/:id/detalii', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send('Proiect negăsit.');

  const tool = toolByID(p.skillID);
  if (!tool) return res.redirect('/proiect-nou');

  return res.render('pages/details.html', {
    title:       p.name,
    nav:         'proiect-nou',
    sidebarFoot: 'restricted',
    user:        req.user,
    tool,
    skillPreset: true,
    projectID:   p.id,
    name:        p.name,
    description: p.description,
    error:       '',
  });
}));

<<<<<<< HEAD
=======
// GET /proiect/:id — vizualizare proiect (generare / rezultat / handoff)
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
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
  });
}));

<<<<<<< HEAD
=======
// GET /proiect/:id/status — sondaj HTMX (204 cat ruleaza, HX-Redirect cand e gata)
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
app.get('/proiect/:id/status', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send();

  if (p.status === STATUS.QUEUED || p.status === STATUS.RUNNING) {
    return res.status(204).send();
  }
  return hxRedirect(req, res, `/proiect/${p.id}`);
}));

<<<<<<< HEAD
=======
// POST /proiect/:id/handoff — preda proiectul echipei Dev
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
app.post('/proiect/:id/handoff', auth(async (req, res) => {
  const p = await store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send();

  await store.handOff(p.id);
  return hxRedirect(req, res, `/proiect/${p.id}/predat`);
}));

<<<<<<< HEAD
=======
// GET /proiect/:id/predat — confirmare handoff
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
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

<<<<<<< HEAD
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(500).send('Eroare internă de server. Verificați logurile.');
});

// ---------- startup: pick store, then listen ----------

let store; // assigned below before any request can reach the routes

async function start() {
  const PORT = parseInt(process.env.PORT || '8080', 10);

  if (process.env.DATABASE_URL) {
    try {
      await db.ping();
      store = new PgStore();
      console.log('[store] PostgreSQL conectat ✓');
    } catch (err) {
      console.warn(`[store] PostgreSQL indisponibil (${err.message}) — folosesc store-ul în memorie.`);
      store = new Store();
    }
  } else {
    console.log('[store] DATABASE_URL lipseste — store în memorie (date demo).');
    store = new Store();
  }

  app.listen(PORT, () => {
    console.log(`Libra Maker (Node.js) pornit pe http://localhost:${PORT}`);
    if (store instanceof Store) {
      console.log('Utilizator demo: ana.popescu@libra.ro / libra2025');
    }
  });
}

start().catch(err => {
  console.error('Pornire esuata:', err);
  process.exit(1);
});
=======
const PORT = parseInt(process.env.PORT || '8080', 10);

store.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Libra Maker (Node.js) pornit pe http://localhost:${PORT}`);
      console.log(`Utilizator demo: ana.popescu@libra.ro / libra2025`);
    });
  })
  .catch(err => {
    console.error('Eroare la initializarea bazei de date:', err);
    process.exit(1);
  });
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a
