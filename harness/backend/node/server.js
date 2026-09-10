'use strict';
// server.js — Serverul Express al Libra Maker.
// Inlocuieste harness/backend/internal/web/server.go.
// Stack: Node.js 20 + Express 4 + Nunjucks + express-session + bcryptjs.

const path    = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const nunjucks = require('nunjucks');

const { STATUS, TOOLS, toolByID, Store } = require('./store');

// ---------- app + store ----------

const app   = express();
const store = new Store();

// ---------- template engine ----------

const TEMPLATES_DIR = path.join(__dirname, '../../frontend/templates-njk');

nunjucks.configure(TEMPLATES_DIR, {
  autoescape: true,
  express:    app,
  watch:      process.env.NODE_ENV !== 'production', // hot-reload in dev
});

// ---------- middleware ----------

// Fisiere statice la /static/ (CSS, JS, HTMX)
app.use('/static', express.static(path.join(__dirname, '../../frontend/static')));

// Parsare formular (POST) si JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Sesiuni
app.use(session({
  secret:            process.env.SESSION_SECRET || 'libra-maker-dev-secret-2025',
  resave:            false,
  saveUninitialized: false,
  cookie:            { httpOnly: true, sameSite: 'lax' },
}));

// ---------- ajutoare ----------

/** Redirect HTMX-aware: prin header HX-Redirect sau redirect clasic. */
function hxRedirect(req, res, url) {
  if (req.headers['hx-request']) {
    res.set('HX-Redirect', url);
    return res.status(204).send();
  }
  return res.redirect(303, url);
}

/** Middleware de autentificare: necesita sesiune valida. */
function auth(handler) {
  return (req, res, next) => {
    const user = req.session.userID ? store.getUser(req.session.userID) : null;
    if (!user) {
      if (req.headers['hx-request']) {
        res.set('HX-Redirect', '/login');
        return res.status(204).send();
      }
      return res.redirect('/login');
    }
    req.user = user;
    return handler(req, res, next);
  };
}

// ---------- rute publice ----------

// Radacina: redirecteaza la acasa daca e autentificat, altfel la login
app.get('/', (req, res) => {
  const user = req.session.userID ? store.getUser(req.session.userID) : null;
  if (user) return res.redirect('/acasa');
  return res.redirect('/login');
});

// GET /login
app.get('/login', (req, res) => {
  const user = req.session.userID ? store.getUser(req.session.userID) : null;
  if (user) return res.redirect('/acasa');
  return res.render('pages/login.html', { title: 'Autentificare' });
});

// POST /auth/login — autentificare cu email + parola (bcrypt)
app.post('/auth/login', async (req, res) => {
  const email    = (req.body.email    || '').trim();
  const password = (req.body.password || '');

  const user  = store.findUserByEmail(email);
  const valid = user && await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return res.render('pages/login.html', {
      title: 'Autentificare',
      error: 'Email sau parolă incorectă. Încearcă din nou.',
      emailValue: email,
    });
  }

  req.session.userID = user.id;
  return req.session.save(() => res.redirect('/acasa'));
});

// GET /inregistrare
app.get('/inregistrare', (req, res) => {
  const user = req.session.userID ? store.getUser(req.session.userID) : null;
  if (user) return res.redirect('/acasa');
  return res.render('pages/register.html', { title: 'Creează cont' });
});

// POST /auth/register — creeaza un cont nou si autentifica automat
app.post('/auth/register', async (req, res) => {
  const name       = (req.body.name       || '').trim();
  const department = (req.body.department || '').trim();
  const email      = (req.body.email      || '').trim();
  const password   = (req.body.password   || '');
  const password2  = (req.body.password2  || '');

  const fields = { nameValue: name, departmentValue: department, emailValue: email };
  const fail = (error) => res.render('pages/register.html', { title: 'Creează cont', error, ...fields });

  if ([...name].length < 3) {
    return fail('Introdu numele tău complet.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Introdu o adresă de email validă.');
  }
  if (store.findUserByEmail(email)) {
    return fail('Există deja un cont cu acest email. Încearcă să te autentifici.');
  }
  if (password.length < 8) {
    return fail('Parola trebuie să aibă cel puțin 8 caractere.');
  }
  if (password !== password2) {
    return fail('Parolele introduse nu coincid.');
  }

  const user = store.createUser({ email, name, department, password });
  req.session.userID = user.id;
  return req.session.save(() => res.redirect('/acasa'));
});

// POST /logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------- rute autentificate ----------

// GET /acasa
app.get('/acasa', auth((req, res) => {
  const projects = store.projects(req.user.id).slice(0, 5);
  return res.render('pages/home.html', {
    title:       'Acasă',
    nav:         'acasa',
    sidebarFoot: 'promo',
    user:        req.user,
    stats:       store.stats(req.user.id),
    projects,
  });
}));

// GET /proiectele-mele
app.get('/proiectele-mele', auth((req, res) => {
  return res.render('pages/projects.html', {
    title:       'Proiectele mele',
    nav:         'proiectele-mele',
    sidebarFoot: 'promo',
    user:        req.user,
    projects:    store.projects(req.user.id),
  });
}));

// GET /proiecte/cauta — fragment HTMX pentru bara de cautare
app.get('/proiecte/cauta', auth((req, res) => {
  const found = store.search(req.user.id, req.query.q || '');
  return res.render('partials/project-list.html', { projects: found });
}));

// GET /ajutor
app.get('/ajutor', auth((req, res) => {
  return res.render('pages/help.html', {
    title:       'Ajutor',
    nav:         'ajutor',
    sidebarFoot: 'restricted',
    user:        req.user,
  });
}));

// GET /proiect-nou — redirecteaza direct la detalii (fara pagina de selectie instrument)
app.get('/proiect-nou', auth((req, res) => {
  return res.redirect('/proiect-nou/detalii');
}));

// GET /proiect-nou/detalii — ecranul Agent Builder
app.get('/proiect-nou/detalii', auth((req, res) => {
  const skillID = req.query.skill || '';
  let tool      = toolByID(skillID);
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

// POST /proiect-nou/detalii — valideaza si creeaza/actualizeaza proiectul
app.post('/proiect-nou/detalii', auth((req, res) => {
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
    const existing = store.getProject(existingID);
    if (existing && existing.userID === req.user.id) {
      store.update(existing.id, skillID, name, description);
      return hxRedirect(req, res, `/proiect/${existing.id}`);
    }
  }

  const p = store.create(req.user.id, skillID, name, description);
  return hxRedirect(req, res, `/proiect/${p.id}`);
}));

// GET /proiect/:id/detalii — editare proiect existent
app.get('/proiect/:id/detalii', auth((req, res) => {
  const p = store.getProject(req.params.id);
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

// GET /proiect/:id — vizualizare proiect (generare / rezultat / handoff)
app.get('/proiect/:id', auth((req, res) => {
  const p = store.getProject(req.params.id);
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

// GET /proiect/:id/status — sondaj HTMX (204 cat ruleaza, HX-Redirect cand e gata)
app.get('/proiect/:id/status', auth((req, res) => {
  const p = store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send();

  if (p.status === STATUS.QUEUED || p.status === STATUS.RUNNING) {
    return res.status(204).send();
  }
  return hxRedirect(req, res, `/proiect/${p.id}`);
}));

// POST /proiect/:id/handoff — preda proiectul echipei Dev
app.post('/proiect/:id/handoff', auth((req, res) => {
  const p = store.getProject(req.params.id);
  if (!p || p.userID !== req.user.id) return res.status(404).send();

  store.handOff(p.id);
  return hxRedirect(req, res, `/proiect/${p.id}/predat`);
}));

// GET /proiect/:id/predat — confirmare handoff
app.get('/proiect/:id/predat', auth((req, res) => {
  const p = store.getProject(req.params.id);
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

// ---------- pornire server ----------

const PORT = parseInt(process.env.PORT || '8080', 10);
app.listen(PORT, () => {
  console.log(`Libra Maker (Node.js) pornit pe http://localhost:${PORT}`);
  console.log(`Utilizator demo: ana.popescu@libra.ro / libra2025`);
});
