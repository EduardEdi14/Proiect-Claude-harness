'use strict';
// store-pg.js — PostgreSQL-backed store for Libra Maker.
//
// Implements the same public interface as the in-memory Store in store.js so
// server.js can swap the two with a single conditional at startup.
//
// All methods are async and return Promises. Express route handlers must
// use async/await (they already do when this module is active).
//
// Schema: backend/internal/db/migrations/001_init.sql

const crypto  = require('crypto');
const path    = require('path');
const { spawn } = require('child_process');
const bcrypt  = require('bcryptjs');

const db = require('./db');
const { STATUS, TOOLS, toolByID, User, Project, MONTHS_RO } = require('./store');

// ---------- helpers (same as store.js) ----------

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

// Row from the `users` table → User instance.
function rowToUser(row) {
  if (!row) return null;
  return new User({
    id:           row.id,
    email:        row.email,
    name:         row.name,
    username:     row.username || '',
    department:   row.department || '',
    passwordHash: row.password_hash,
  });
}

// Row from the `sessions` table → Project instance.
function rowToProject(row) {
  if (!row) return null;
  return new Project({
    id:            row.id,
    userID:        row.user_id,
    skillID:       row.skill_id,
    name:          row.project_name,
    description:   row.description,
    workspacePath: row.workspace_path,
    status:        row.status,
    ticketID:      row.ticket_id   || 0,
    durationSec:   row.duration_sec || 0,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
    completedAt:   row.completed_at || null,
    handedAt:      row.handed_at   || null,
  });
}

// ---------- PgStore ----------

class PgStore {
  constructor() {
    this.buildDelay = parseInt(process.env.BUILD_DELAY_MS || '2500', 10);
  }

  // ---------- users ----------

  /** Returns the first user in the database (demo / SSO placeholder). */
  async demoUser() {
    const { rows } = await db.query(
      'SELECT * FROM users ORDER BY created_at LIMIT 1',
      []
    );
    return rowToUser(rows[0]);
  }

  async getUser(id) {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rowToUser(rows[0]);
  }

  async findUserByEmail(email) {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE lower(email) = lower($1)',
      [(email || '').trim()]
    );
    return rowToUser(rows[0]);
  }

  async createUser({ email, name, department, password }) {
    const id           = newID();
    const username     = (email || '').split('@')[0].trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (id, email, name, username, department, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, (email||'').trim(), (name||'').trim(), username, (department||'').trim(), passwordHash]
    );
    return rowToUser(rows[0]);
  }

  // ---------- projects ----------

  async projects(userID) {
    const { rows } = await db.query(
      `SELECT * FROM sessions WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userID]
    );
    return rows.map(rowToProject);
  }

  async search(userID, query) {
    if (!query || !query.trim()) return this.projects(userID);
    // Case-insensitive, diacritic-tolerant search via ILIKE on both columns.
    const q = `%${query.trim()}%`;
    const { rows } = await db.query(
      `SELECT * FROM sessions
       WHERE user_id = $1 AND (project_name ILIKE $2 OR description ILIKE $2)
       ORDER BY updated_at DESC`,
      [userID, q]
    );
    return rows.map(rowToProject);
  }

  async getProject(id) {
    const { rows } = await db.query(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );
    return rowToProject(rows[0]);
  }

  async create(userID, skillID, name, description) {
    const id  = newID();
    const wsp = workspacePath(userID, id);
    const { rows } = await db.query(
      `INSERT INTO sessions
         (id, user_id, skill_id, project_name, description, workspace_path, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued')
       RETURNING *`,
      [id, userID, skillID, name, description, wsp]
    );
    const project = rowToProject(rows[0]);
    this._build(project.id);   // fire and forget, same as in-memory store
    return project;
  }

  /**
   * Proiect venit de la asistent: pagina e deja construita, deci intra direct
   * ca ciorna. Nu pornim runner-ul — nu mai avem ce genera.
   */
  async createBuilt(userID, skillID, name, description, durationSec) {
    const id  = newID();
    const wsp = workspacePath(userID, id);
    const { rows } = await db.query(
      `INSERT INTO sessions
         (id, user_id, skill_id, project_name, description, workspace_path,
          status, duration_sec, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, now())
       RETURNING *`,
      [id, userID, skillID, name, description, wsp, durationSec || 0]
    );
    return rowToProject(rows[0]);
  }

  async update(id, skillID, name, description) {
    await db.query(
      `UPDATE sessions
       SET skill_id = $2, project_name = $3, description = $4,
           status = 'queued', updated_at = now()
       WHERE id = $1`,
      [id, skillID, name, description]
    );
    const updated = await this.getProject(id);
    if (updated) this._build(id);
  }

  async handOff(id) {
    // Fetch next ticket number: max(ticket_id) + 1.
    const { rows: tRows } = await db.query(
      'SELECT COALESCE(MAX(ticket_id), 2480) + 1 AS next FROM sessions',
      []
    );
    const ticket = tRows[0].next;
    await db.query(
      `UPDATE sessions
       SET status = 'handed_off', ticket_id = $2,
           handed_at = now(), updated_at = now(),
           completed_at = COALESCE(completed_at, now())
       WHERE id = $1
         AND status NOT IN ('handed_off', 'done')`,
      [id, ticket]
    );
  }

  async stats(userID) {
    const { rows } = await db.query(
      `SELECT
         COUNT(*)                                                  AS total,
         COUNT(*) FILTER (WHERE status = 'draft')                 AS drafts,
         COUNT(*) FILTER (WHERE status IN ('handed_off','done'))  AS handed_off,
         ROUND(AVG(duration_sec) FILTER (WHERE duration_sec > 0)) AS avg_sec,
         COUNT(*) FILTER (WHERE created_at > now() - interval '14 days') AS recent
       FROM sessions WHERE user_id = $1`,
      [userID]
    );
    const r = rows[0];
    const avgTime    = r.avg_sec ? `${r.avg_sec}s` : '—';
    const recent     = parseInt(r.recent, 10);
    let recentPhrase;
    if (recent === 0)      recentPhrase = 'Niciun proiect în ultimele două săptămâni.';
    else if (recent === 1) recentPhrase = 'Ai un proiect în ultimele două săptămâni.';
    else                   recentPhrase = `Ai ${recent} proiecte în ultimele două săptămâni.`;

    const st = {
      total:        parseInt(r.total, 10),
      drafts:       parseInt(r.drafts, 10),
      handedOff:    parseInt(r.handed_off, 10),
      avgSec:       r.avg_sec ? parseInt(r.avg_sec, 10) : 0,
      avgTime,
      recentPhrase,
    };
    return this._statsSeries(userID, st);
  }

  /**
   * Serii pentru graficele din pagina Acasa, adaugate peste cifrele de titlu.
   *
   * - stages: cate proiecte sunt in fiecare etapa a fluxului. Etapele sunt
   *   ordonate (ciorna -> la Dev -> finalizat), deci interfata le coloreaza
   *   cu o singura nuanta in trepte, nu cu culori de identitate.
   * - weeks: ultimele 8 saptamani (luni-duminica), cea mai veche prima.
   *   Saptamanile fara proiecte raman in serie, cu zero - altfel graficul ar
   *   comprima golurile si ar minti despre ritm.
   */
  async _statsSeries(userID, st) {
    const stages = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='draft')      AS draft,
         COUNT(*) FILTER (WHERE status='handed_off') AS handed,
         COUNT(*) FILTER (WHERE status='done')       AS done,
         COUNT(*) FILTER (WHERE status IN ('queued','running')) AS in_work
       FROM sessions WHERE user_id=$1`,
      [userID]
    );
    const sr = stages.rows[0];
    const n  = (v) => parseInt(v, 10) || 0;

    st.inWork = n(sr.in_work);
    st.stages = [
      { key: 'draft',  label: 'Ciornă',        count: n(sr.draft)  },
      { key: 'handed', label: 'La echipa Dev', count: n(sr.handed) },
      { key: 'done',   label: 'Finalizat',     count: n(sr.done)   },
    ];
    st.stagesTotal = st.stages.reduce((t, s) => t + s.count, 0);
    for (const s of st.stages) {
      s.pct = st.stagesTotal > 0 ? Math.round((s.count / st.stagesTotal) * 1000) / 10 : 0;
    }

    // generate_series produce si saptamanile goale, ca seria sa fie continua.
    const weeks = await db.query(
      `SELECT w AS week_start,
              COUNT(p.id) AS count
         FROM generate_series(
                date_trunc('week', NOW()) - INTERVAL '7 weeks',
                date_trunc('week', NOW()),
                INTERVAL '1 week'
              ) AS w
         LEFT JOIN sessions p
                ON p.user_id = $1
               AND p.created_at >= w
               AND p.created_at <  w + INTERVAL '1 week'
        GROUP BY w
        ORDER BY w`,
      [userID]
    );

    const rows = weeks.rows.map(r => ({
      date:  new Date(r.week_start),
      count: n(r.count),
    }));
    const peak = rows.reduce((m, r) => Math.max(m, r.count), 0);

    st.weeks = rows.map(r => ({
      label:  `${r.date.getDate()} ${MONTHS_RO[r.date.getMonth()]}`,
      count:  r.count,
      // Inaltimea coloanei ca procent din varf; fara proiecte totul ramane 0.
      height: peak > 0 ? Math.round((r.count / peak) * 100) : 0,
      isPeak: peak > 0 && r.count === peak,
    }));
    st.weeksPeak  = peak;
    st.weeksTotal = rows.reduce((t, r) => t + r.count, 0);

    return st;
  }

  // ---------- runner (same logic as in-memory store) ----------

  _build(id) {
    // Mark as running after 300ms.
    setTimeout(async () => {
      try {
        await db.query(
          `UPDATE sessions SET status = 'running', updated_at = now()
           WHERE id = $1 AND status = 'queued'`,
          [id]
        );
      } catch { /* ignore */ }
    }, 300);

    // Fetch the project to pass its fields to the runner.
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
        try {
          await db.query(
            `UPDATE sessions
             SET status = 'draft', completed_at = now(),
                 updated_at = now(), duration_sec = $2
             WHERE id = $1`,
            [id, durationSec]
          );
        } catch { /* ignore */ }
      };

      const onFail = async () => {
        try {
          await db.query(
            `UPDATE sessions SET status = 'failed', updated_at = now()
             WHERE id = $1`,
            [id]
          );
        } catch { /* ignore */ }
      };

      py.on('close', () => {
        try {
          const result = JSON.parse(stdout);
          if (result.status === 'done') onDone(result.duration_sec || 42);
          else onFail();
        } catch { onFail(); }
      });

      py.on('error', () => {
        // Python not available — simulate.
        setTimeout(() => onDone(Math.max(1, Math.round(this.buildDelay / 1000))), this.buildDelay);
      });
    }).catch(() => {});
  }
}

module.exports = { PgStore };
