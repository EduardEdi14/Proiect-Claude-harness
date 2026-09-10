'use strict';
// store.js — modele de date si store PostgreSQL pentru Libra Maker (Node.js).
// Echivalent cu harness/backend/internal/sessions/store.go.

const crypto = require('crypto');
const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

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
  'ă':'a','â':'a','î':'i','ș':'s','ş':'s','ț':'t','ţ':'t',
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

// ---------- conversie row PostgreSQL -> obiecte ----------

function rowToUser(row) {
  return new User({
    id:           row.id,
    email:        row.email,
    name:         row.name,
    username:     row.username,
    department:   row.department,
    passwordHash: row.password_hash,
  });
}

function rowToProject(row) {
  return new Project({
    id:            row.id,
    userID:        row.user_id,
    skillID:       row.skill_id,
    name:          row.name,
    description:   row.description,
    workspacePath: row.workspace_path,
    status:        row.status,
    ticketID:      row.ticket_id,
    durationSec:   row.duration_sec,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
    completedAt:   row.completed_at,
    handedAt:      row.handed_at,
  });
}

// ---------- clasa Store ----------

class Store {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.buildDelay = parseInt(process.env.BUILD_DELAY_MS || '2500', 10);
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID        PRIMARY KEY,
        email         TEXT        UNIQUE NOT NULL,
        name          TEXT        NOT NULL,
        username      TEXT        NOT NULL DEFAULT '',
        department    TEXT        NOT NULL DEFAULT '',
        password_hash TEXT        NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS projects (
        id             UUID        PRIMARY KEY,
        user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_id       TEXT        NOT NULL,
        name           TEXT        NOT NULL,
        description    TEXT        NOT NULL DEFAULT '',
        workspace_path TEXT        NOT NULL DEFAULT '',
        status         TEXT        NOT NULL DEFAULT 'queued',
        ticket_id      INTEGER     NOT NULL DEFAULT 0,
        duration_sec   INTEGER     NOT NULL DEFAULT 0,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at   TIMESTAMPTZ,
        handed_at      TIMESTAMPTZ
      );
      CREATE SEQUENCE IF NOT EXISTS ticket_seq START 2481;
    `);
    await this._initDemo();
  }

  async _initDemo() {
    const existing = await this.pool.query(
      "SELECT id FROM users WHERE email = 'ana.popescu@libra.ro'"
    );
    if (existing.rows.length > 0) return;

    const hash = bcrypt.hashSync('libra2025', 10);
    const uid  = newID();
    await this.pool.query(
      `INSERT INTO users (id, email, name, username, department, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uid, 'ana.popescu@libra.ro', 'Ana Popescu', 'ana.popescu', 'Administrativ', hash]
    );

    const now = new Date();
    const ago = (ms) => new Date(now.getTime() - ms);

    await this._seedProject({ userID: uid, skillID: 'formular',
      name: 'Green Week — înscrieri',
      description: 'O pagină pentru campania internă „Green Week": o scurtă introducere despre programul de colectare selectivă, lista punctelor de reciclare din sediu şi un formular de înscriere cu nume, departament, e-mail şi ziua în care vrei să participi.',
      status: STATUS.HANDED_OFF, durationSec: 38,
      createdAt: ago(5*86400000), updatedAt: ago(5*86400000), completedAt: ago(5*86400000), handedAt: ago(5*86400000) });

    await this._seedProject({ userID: uid, skillID: 'formular',
      name: 'Chestionar cantină',
      description: 'Un formular scurt prin care colegii spun ce meniuri vor la cantină şi în ce interval orar iau prânzul.',
      status: STATUS.DRAFT, durationSec: 46,
      createdAt: ago(40*60000), updatedAt: ago(4*60000), completedAt: ago(38*60000), handedAt: null });

    await this._seedProject({ userID: uid, skillID: 'pagina-informare',
      name: 'Ghid onboarding — echipa nouă',
      description: 'O pagină de informare pentru colegii nou veniți: primele zile, cine pe ce răspunde şi lista de acces pe care trebuie să o ceară.',
      status: STATUS.DONE, durationSec: 42,
      createdAt: ago(12*86400000), updatedAt: ago(12*86400000), completedAt: ago(12*86400000), handedAt: ago(12*86400000) });
  }

  async _seedProject(data) {
    const id = newID();
    let ticketID = 0;
    if (data.status === STATUS.HANDED_OFF || data.status === STATUS.DONE) {
      const r = await this.pool.query("SELECT nextval('ticket_seq') AS t");
      ticketID = parseInt(r.rows[0].t, 10);
    }
    await this.pool.query(
      `INSERT INTO projects
         (id, user_id, skill_id, name, description, workspace_path,
          status, ticket_id, duration_sec, created_at, updated_at, completed_at, handed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, data.userID, data.skillID, data.name, data.description,
       workspacePath(data.userID, id), data.status, ticketID, data.durationSec,
       data.createdAt, data.updatedAt, data.completedAt || null, data.handedAt || null]
    );
  }

  // ---------- acces utilizatori ----------

  async getUser(id) {
    const r = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return r.rows.length ? rowToUser(r.rows[0]) : null;
  }

  async findUserByEmail(email) {
    const e = (email || '').toLowerCase().trim();
    const r = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [e]);
    return r.rows.length ? rowToUser(r.rows[0]) : null;
  }

  async createUser({ email, name, department, password }) {
    const id       = newID();
    const hash     = bcrypt.hashSync(password, 10);
    const username = (email || '').split('@')[0].trim();
    await this.pool.query(
      `INSERT INTO users (id, email, name, username, department, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, (email || '').trim(), (name || '').trim(), username, (department || '').trim(), hash]
    );
    return this.getUser(id);
  }

  // ---------- acces proiecte ----------

  async projects(userID) {
    const r = await this.pool.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [userID]
    );
    return r.rows.map(rowToProject);
  }

  async search(userID, query) {
    if (!query) return this.projects(userID);
    const r = await this.pool.query(
      `SELECT * FROM projects
       WHERE user_id = $1 AND (name ILIKE $2 OR description ILIKE $2)
       ORDER BY updated_at DESC`,
      [userID, `%${query}%`]
    );
    return r.rows.map(rowToProject);
  }

  async getProject(id) {
    const r = await this.pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return r.rows.length ? rowToProject(r.rows[0]) : null;
  }

  async create(userID, skillID, name, description) {
    const id = newID();
    const wp = workspacePath(userID, id);
    await this.pool.query(
      `INSERT INTO projects (id, user_id, skill_id, name, description, workspace_path, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'queued',NOW(),NOW())`,
      [id, userID, skillID, name, description, wp]
    );
    const p = await this.getProject(id);
    this._build(id);
    return p;
  }

  async update(id, skillID, name, description) {
    await this.pool.query(
      `UPDATE projects SET skill_id=$2, name=$3, description=$4, status='queued', updated_at=NOW()
       WHERE id=$1`,
      [id, skillID, name, description]
    );
    this._build(id);
  }

  async handOff(id) {
    const r = await this.pool.query("SELECT nextval('ticket_seq') AS t");
    const ticketID = parseInt(r.rows[0].t, 10);
    await this.pool.query(
      `UPDATE projects
       SET status='handed_off', ticket_id=$2, handed_at=NOW(), updated_at=NOW(),
           completed_at = COALESCE(completed_at, NOW())
       WHERE id=$1 AND status NOT IN ('handed_off','done')`,
      [id, ticketID]
    );
  }

  async stats(userID) {
    const r = await this.pool.query(
      `SELECT
         COUNT(*)                                                    AS total,
         COUNT(*) FILTER (WHERE status='draft')                     AS drafts,
         COUNT(*) FILTER (WHERE status IN ('handed_off','done'))    AS handed_off,
         AVG(duration_sec) FILTER (WHERE duration_sec > 0)         AS avg_sec,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '14 days') AS recent
       FROM projects WHERE user_id=$1`,
      [userID]
    );
    const row = r.rows[0];
    const st  = {
      total:     parseInt(row.total, 10),
      drafts:    parseInt(row.drafts, 10),
      handedOff: parseInt(row.handed_off, 10),
      avgTime:   row.avg_sec ? `${Math.round(parseFloat(row.avg_sec))}s` : '—',
      recentPhrase: '',
    };
    const recent = parseInt(row.recent, 10);
    if (recent === 0)      st.recentPhrase = 'Niciun proiect în ultimele două săptămâni.';
    else if (recent === 1) st.recentPhrase = 'Ai un proiect în ultimele două săptămâni.';
    else                   st.recentPhrase = `Ai ${recent} proiecte în ultimele două săptămâni.`;
    return st;
  }

  // ---------- generare (Python runner / simulare) ----------

  _build(id) {
    const pool      = this.pool;
    const delay     = this.buildDelay;

    setTimeout(async () => {
      await pool.query(
        "UPDATE projects SET status='running' WHERE id=$1 AND status='queued'",
        [id]
      );
    }, 300);

    this.getProject(id).then(project => {
      if (!project) return;

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

      const onDone = async (durationSec) => {
        await pool.query(
          `UPDATE projects SET status='draft', completed_at=NOW(), updated_at=NOW(), duration_sec=$2
           WHERE id=$1`,
          [id, durationSec]
        );
      };

      const onFail = async () => {
        await pool.query(
          "UPDATE projects SET status='failed', updated_at=NOW() WHERE id=$1",
          [id]
        );
      };

      py.on('close', () => {
        try {
          const result = JSON.parse(stdout);
          if (result.status === 'done') onDone(result.duration_sec || 42);
          else onFail();
        } catch {
          onFail();
        }
      });

      py.on('error', () => {
        setTimeout(() => onDone(Math.max(1, Math.round(delay / 1000))), delay);
      });
    });
  }
}

module.exports = { STATUS, TOOLS, toolByID, User, Project, Store };
