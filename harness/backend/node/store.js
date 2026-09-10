'use strict';
// store.js — modele de date si store in-memorie pentru Libra Maker (Node.js).
// Echivalent cu harness/backend/internal/sessions/store.go.
// TODO(backend): inlocuieste cu Postgres (tabelele users/sessions din sectiunea 4 a documentului).

const crypto = require('crypto');
const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');

// ---------- constante de status ----------

const STATUS = {
  QUEUED:     'queued',
  RUNNING:    'running',
  DRAFT:      'draft',
  HANDED_OFF: 'handed_off',
  DONE:       'done',
  FAILED:     'failed',
};

// ---------- catalog de instrumente (skill-uri) ----------

const TOOLS = [
  {
    id:        'pagina-informare',
    name:      'Pagina de informare',
    shortName: 'Pagina',
    desc:      'Titlu, text, imagine si lista de puncte. O singura pagina statica.',
    icon:      'page',
    version:   'v2',
    tags:      ['HTML + CSS', 'fara JS custom'],
  },
  {
    id:        'formular',
    name:      'Formular de colectare',
    shortName: 'Formular',
    desc:      'Pagina cu campuri de completat si confirmare la trimitere.',
    icon:      'form',
    version:   'v1',
    tags:      ['max. 8 campuri', 'fara date sensibile'],
  },
];

function toolByID(id) {
  return TOOLS.find(t => t.id === id) || null;
}

// ---------- ajutoare pentru date ----------

const MONTHS_RO = ['ian.','feb.','mar.','apr.','mai','iun.','iul.','aug.','sept.','oct.','nov.','dec.'];

function shortDate(d) {
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS_RO[d.getMonth()]}`;
}

function stamp(d) {
  if (!d) return '—';
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  if (sameDay) return `azi, ${hh}:${mm}`;
  return `${shortDate(d)}, ${hh}:${mm}`;
}

function humanAgo(ms) {
  if (ms < 60000)    return 'acum cateva secunde';
  if (ms < 120000)   return 'acum un minut';
  if (ms < 3600000)  return `acum ${Math.floor(ms / 60000)} min.`;
  if (ms < 7200000)  return 'acum o ora';
  return `acum ${Math.floor(ms / 3600000)} ore`;
}

const DIACRITICS_MAP = {
  'aă':'a','aâ':'a','î':'i','sș':'s','sş':'s','tț':'t','tţ':'t',
  'Ă':'a','Â':'a','Î':'i','Ș':'s','Ş':'s','Ț':'t','Ţ':'t',
};
const DIACRITICS_RE = /[ăâîșşțţĂÂÎȘŞȚŢ]/g;

function foldRO(s) {
  return (s || '').toLowerCase().trim().replace(DIACRITICS_RE, c => DIACRITICS_MAP[c] || c);
}

function slugify(name) {
  let s = foldRO(name);
  let out = '';
  let lastDash = true;
  for (const c of s) {
    if (/[a-z0-9]/.test(c)) { out += c; lastDash = false; }
    else if (!lastDash) { out += '-'; lastDash = true; }
  }
  out = out.replace(/^-+|-+$/g, '');
  if (out.length > 30) out = out.slice(0, 30).replace(/-+$/, '');
  return out;
}

function newID() {
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function workspacePath(userID, sessionID) {
  return `workspaces/${userID}/${sessionID}`;
}

// ---------- clasa User ----------

class User {
  constructor({ id, email, name, username, department, passwordHash }) {
    this.id           = id;
    this.email        = email;
    this.name         = name;
    this.username     = username;
    this.department   = department;
    this.passwordHash = passwordHash;
  }

  firstName() {
    const i = this.name.indexOf(' ');
    return i > 0 ? this.name.slice(0, i) : this.name;
  }

  initials() {
    let out = '';
    for (const part of this.name.split(/\s+/)) {
      if (part) out += [...part][0].toUpperCase();
      if (out.length === 2) break;
    }
    return out;
  }
}

// ---------- clasa Project ----------

class Project {
  constructor({ id, userID, skillID, name, description, workspacePath, status,
                ticketID = 0, durationSec = 0,
                createdAt, updatedAt, completedAt = null, handedAt = null }) {
    this.id            = id;
    this.userID        = userID;
    this.skillID       = skillID;
    this.name          = name;
    this.description   = description;
    this.workspacePath = workspacePath;
    this.status        = status;
    this.ticketID      = ticketID;
    this.durationSec   = durationSec;
    this.createdAt     = createdAt  || new Date();
    this.updatedAt     = updatedAt  || new Date();
    this.completedAt   = completedAt;
    this.handedAt      = handedAt;
  }

  skillName()  { const t = toolByID(this.skillID); return t ? t.name : this.skillID; }
  skillLabel() { const t = toolByID(this.skillID); return t ? `${t.name} ${t.version}` : this.skillID; }

  meta() {
    if (this.status === STATUS.QUEUED || this.status === STATUS.RUNNING) return 'în lucru';
    if (this.status === STATUS.DRAFT) {
      const d = Date.now() - this.updatedAt.getTime();
      if (d < 86400000) return `salvat ${humanAgo(d)}`;
    }
    return shortDate(this.updatedAt);
  }

  summary() {
    let text = (this.description || '').trim();
    const i = text.search(/[.!?]/);
    if (i > 40) text = text.slice(0, i + 1);
    const runes = [...text];
    if (runes.length > 220) text = runes.slice(0, 220).join('').trimEnd() + '…';
    return text;
  }

  fileName() { return (slugify(this.name) || 'pagina') + '.html'; }
  files()    { return 'index.html · style.css'; }

  shortID() {
    const clean = this.id.replace(/-/g, '');
    if (clean.length < 8) return this.id;
    return clean.slice(0, 4) + '…' + clean.slice(-3);
  }

  generatedAt() { return stamp(this.completedAt); }
  handedOffAt() { return stamp(this.handedAt); }
}

// ---------- clasa Store ----------

class Store {
  constructor() {
    this._users    = new Map(); // id -> User
    this._projects = new Map(); // id -> Project
    this._ticket   = 2480;
    this.buildDelay = parseInt(process.env.BUILD_DELAY_MS || '2500', 10);
    this._initDemo();
  }

  _initDemo() {
    const u = new User({
      id:           newID(),
      email:        'ana.popescu@libra.ro',
      name:         'Ana Popescu',
      username:     'ana.popescu',
      department:   'Administrativ',
      passwordHash: bcrypt.hashSync('libra2025', 10),
    });
    this._users.set(u.id, u);

    const now = new Date();
    const ago = (ms) => new Date(now.getTime() - ms);

    this._seed({ userID: u.id, skillID: 'formular',
      name: 'Green Week — înscrieri',
      description: 'O pagină pentru campania internă „Green Week”: o scurtă introducere despre programul de colectare selectivă, lista punctelor de reciclare din sediu şi un formular de înscriere cu nume, departament, e-mail şi ziua în care vrei să participi.',
      status: STATUS.HANDED_OFF, durationSec: 38,
      createdAt: ago(5*86400000), updatedAt: ago(5*86400000), completedAt: ago(5*86400000), handedAt: ago(5*86400000) });

    this._seed({ userID: u.id, skillID: 'formular',
      name: 'Chestionar cantină',
      description: 'Un formular scurt prin care colegii spun ce meniuri vor la cantină şi în ce interval orar iau prânzul.',
      status: STATUS.DRAFT, durationSec: 46,
      createdAt: ago(40*60000), updatedAt: ago(4*60000), completedAt: ago(38*60000), handedAt: null });

    this._seed({ userID: u.id, skillID: 'pagina-informare',
      name: 'Ghid onboarding — echipa nouă',
      description: 'O pagină de informare pentru colegii nou veniți: primele zile, cine pe ce răspunde şi lista de acces pe care trebuie să o ceară.',
      status: STATUS.DONE, durationSec: 42,
      createdAt: ago(12*86400000), updatedAt: ago(12*86400000), completedAt: ago(12*86400000), handedAt: ago(12*86400000) });
  }

  _seed(data) {
    const id = newID();
    const p = new Project({
      id,
      workspacePath: workspacePath(data.userID, id),
      ...data,
    });
    if (p.status === STATUS.HANDED_OFF || p.status === STATUS.DONE) {
      this._ticket++;
      p.ticketID = this._ticket;
    }
    this._projects.set(id, p);
  }

  // ---------- acces utilizatori ----------

  demoUser() {
    return this._users.values().next().value || null;
  }

  getUser(id) {
    return this._users.get(id) || null;
  }

  findUserByEmail(email) {
    const e = (email || '').toLowerCase().trim();
    for (const u of this._users.values()) {
      if (u.email.toLowerCase() === e) return u;
    }
    return null;
  }

  /** Creeaza un cont nou. Presupune ca emailul a fost deja validat ca fiind liber. */
  createUser({ email, name, department, password }) {
    const u = new User({
      id:           newID(),
      email:        (email || '').trim(),
      name:         (name || '').trim(),
      username:     (email || '').split('@')[0].trim(),
      department:   (department || '').trim(),
      passwordHash: bcrypt.hashSync(password, 10),
    });
    this._users.set(u.id, u);
    return u;
  }

  // ---------- acces proiecte ----------

  projects(userID) {
    const out = [];
    for (const p of this._projects.values()) {
      if (p.userID === userID) out.push(p);
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  search(userID, query) {
    const q = foldRO(query);
    const all = this.projects(userID);
    if (!q) return all;
    return all.filter(p =>
      foldRO(p.name).includes(q) || foldRO(p.description).includes(q)
    );
  }

  getProject(id) {
    return this._projects.get(id) || null;
  }

  create(userID, skillID, name, description) {
    const id = newID();
    const p = new Project({
      id,
      userID,
      skillID,
      name,
      description,
      workspacePath: workspacePath(userID, id),
      status: STATUS.QUEUED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this._projects.set(id, p);
    this._build(id);
    return p;
  }

  update(id, skillID, name, description) {
    const p = this._projects.get(id);
    if (!p) return;
    p.skillID     = skillID;
    p.name        = name;
    p.description = description;
    p.status      = STATUS.QUEUED;
    p.updatedAt   = new Date();
    this._build(id);
  }

  handOff(id) {
    const p = this._projects.get(id);
    if (!p || p.status === STATUS.HANDED_OFF || p.status === STATUS.DONE) return;
    this._ticket++;
    p.ticketID  = this._ticket;
    p.status    = STATUS.HANDED_OFF;
    p.handedAt  = new Date();
    p.updatedAt = p.handedAt;
    if (!p.completedAt) p.completedAt = p.handedAt;
  }

  // ---------- generare (Python runner / simulare) ----------

  _build(id) {
    // Seteaza status "running" dupa 300ms
    setTimeout(() => {
      const p = this._projects.get(id);
      if (p && p.status === STATUS.QUEUED) p.status = STATUS.RUNNING;
    }, 300);

    const project = this._projects.get(id);
    if (!project) return;

    // Incearca Python runner; daca nu e disponibil, simuleaza
    const runnerPath = path.join(__dirname, '../python/runner.py');
    const wsPath     = path.join(__dirname, '../../..', project.workspacePath);

    const py = spawn('python3', [
      runnerPath,
      '--skill-id',    project.skillID,
      '--description', project.description,
      '--workspace',   wsPath,
    ]);

    let stdout = '';
    py.stdout.on('data', d => { stdout += d.toString(); });

    const onDone = (durationSec) => {
      const p = this._projects.get(id);
      if (!p) return;
      p.status      = STATUS.DRAFT;
      p.completedAt = new Date();
      p.updatedAt   = p.completedAt;
      p.durationSec = durationSec;
    };

    const onFail = () => {
      const p = this._projects.get(id);
      if (!p) return;
      p.status    = STATUS.FAILED;
      p.updatedAt = new Date();
    };

    py.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        if (result.status === 'done') onDone(result.duration_sec || 42);
        else onFail();
      } catch {
        onFail();
      }
    });

    py.on('error', () => {
      // Python nu e instalat — simulare cu timeout
      setTimeout(() => onDone(Math.max(1, Math.round(this.buildDelay / 1000))), this.buildDelay);
    });
  }

  // ---------- statistici ----------

  stats(userID) {
    const all = this.projects(userID);
    const st  = { total: all.length, drafts: 0, handedOff: 0, avgTime: '—', recentPhrase: '' };
    let totalSec = 0, counted = 0;

    for (const p of all) {
      if (p.status === STATUS.DRAFT) st.drafts++;
      if (p.status === STATUS.HANDED_OFF || p.status === STATUS.DONE) st.handedOff++;
      if (p.durationSec > 0) { totalSec += p.durationSec; counted++; }
    }

    if (counted > 0) st.avgTime = `${Math.round(totalSec / counted)}s`;

    const cutoff = new Date(Date.now() - 14 * 86400000);
    const recent = all.filter(p => p.createdAt > cutoff).length;
    if (recent === 0) st.recentPhrase = 'Niciun proiect în ultimele două săptămâni.';
    else if (recent === 1) st.recentPhrase = 'Ai un proiect în ultimele două săptămâni.';
    else st.recentPhrase = `Ai ${recent} proiecte în ultimele două săptămâni.`;

    return st;
  }
}

module.exports = { STATUS, TOOLS, toolByID, User, Project, Store };
