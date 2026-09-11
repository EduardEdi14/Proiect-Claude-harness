'use strict';
// store-memory.js — store in-memory pentru Libra Maker.
// Folosit automat cand DATABASE_URL lipseste sau PostgreSQL nu e accesibil.
// Datele dispar la restart. Util pentru dezvoltare locala fara BD.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { STATUS, TOOLS, toolByID, User, Project } = require('./store');

function newID() {
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function ago(ms) { return new Date(Date.now() - ms); }

const MONTHS_RO = ['ian.','feb.','mar.','apr.','mai','iun.','iul.','aug.','sept.','oct.','nov.','dec.'];

class MemoryStore {
  constructor() {
    this._users    = new Map();
    this._projects = new Map();
    this._ticket   = 2481;
    this.buildDelay = parseInt(process.env.BUILD_DELAY_MS || '2500', 10);
  }

  async init() {
    const uid  = newID();
    const hash = bcrypt.hashSync('libra2025', 10);
    const demo = new User({ id: uid, email: 'ana.popescu@libra.ro', name: 'Ana Popescu',
      username: 'ana.popescu', department: 'Administrativ', passwordHash: hash });
    this._users.set(uid, demo);

    const seed = (opts) => {
      const id = newID();
      const p  = new Project({
        id, userID: uid, skillID: opts.skillID, name: opts.name,
        description: opts.desc, workspacePath: `workspaces/${uid}/${id}`,
        status: opts.status, ticketID: opts.ticket || 0,
        durationSec: opts.dur || 0,
        createdAt: opts.created, updatedAt: opts.updated,
        completedAt: opts.completed || null, handedAt: opts.handed || null,
      });
      this._projects.set(id, p);
    };

    seed({ skillID: 'form-page', name: 'Green Week — înscrieri',
      desc: 'O pagină pentru campania internă „Green Week": o scurtă introducere despre programul de colectare selectivă, lista punctelor de reciclare din sediu şi un formular de înscriere.',
      status: STATUS.HANDED_OFF, ticket: this._ticket++, dur: 38,
      created: ago(5*86400000), updated: ago(5*86400000),
      completed: ago(5*86400000), handed: ago(5*86400000) });

    seed({ skillID: 'form-page', name: 'Chestionar cantină',
      desc: 'Un formular scurt prin care colegii spun ce meniuri vor la cantină şi în ce interval orar iau prânzul.',
      status: STATUS.DRAFT, dur: 46,
      created: ago(40*60000), updated: ago(4*60000), completed: ago(38*60000) });

    seed({ skillID: 'info-page', name: 'Ghid onboarding — echipa nouă',
      desc: 'O pagină de informare pentru colegii nou veniți: primele zile, cine pe ce răspunde şi lista de acces pe care trebuie să o ceară.',
      status: STATUS.DONE, ticket: this._ticket++, dur: 42,
      created: ago(12*86400000), updated: ago(12*86400000),
      completed: ago(12*86400000), handed: ago(12*86400000) });
  }

  async getUser(id) { return this._users.get(id) || null; }

  async findUserByEmail(email) {
    const e = (email || '').toLowerCase().trim();
    for (const u of this._users.values()) {
      if (u.email.toLowerCase() === e) return u;
    }
    return null;
  }

  async createUser({ email, name, department, password }) {
    const id       = newID();
    const hash     = bcrypt.hashSync(password, 10);
    const username = (email || '').split('@')[0].trim();
    const u = new User({ id, email: (email||'').trim(), name: (name||'').trim(),
      username, department: (department||'').trim(), passwordHash: hash });
    this._users.set(id, u);
    return u;
  }

  async projects(userID) {
    return [...this._projects.values()]
      .filter(p => p.userID === userID)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async search(userID, query) {
    if (!query) return this.projects(userID);
    const q = query.toLowerCase();
    return (await this.projects(userID)).filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  async getProject(id) { return this._projects.get(id) || null; }

  async create(userID, skillID, name, description) {
    const id = newID();
    const p  = new Project({
      id, userID, skillID, name, description,
      workspacePath: `workspaces/${userID}/${id}`,
      status: STATUS.QUEUED, createdAt: new Date(), updatedAt: new Date(),
    });
    this._projects.set(id, p);
    this._build(id);
    return p;
  }

  async update(id, skillID, name, description) {
    const p = this._projects.get(id);
    if (!p) return;
    p.skillID = skillID; p.name = name; p.description = description;
    p.status = STATUS.QUEUED; p.updatedAt = new Date();
    this._build(id);
  }

  async deleteProject(id) {
    this._projects.delete(id);
  }

  async handOff(id) {
    const p = this._projects.get(id);
    if (!p) return;
    p.status    = STATUS.HANDED_OFF;
    p.ticketID  = this._ticket++;
    p.handedAt  = new Date();
    p.updatedAt = new Date();
    if (!p.completedAt) p.completedAt = new Date();
  }

  async stats(userID) {
    const all = await this.projects(userID);
    const total     = all.length;
    const drafts    = all.filter(p => p.status === STATUS.DRAFT).length;
    const handedOff = all.filter(p => p.status === STATUS.HANDED_OFF || p.status === STATUS.DONE).length;
    const withDur   = all.filter(p => p.durationSec > 0);
    const avgSec    = withDur.length ? Math.round(withDur.reduce((s, p) => s + p.durationSec, 0) / withDur.length) : 0;
    const fortnight = new Date(Date.now() - 14 * 86400000);
    const recent    = all.filter(p => p.createdAt >= fortnight).length;

    const st = {
      total, drafts, handedOff, avgSec,
      avgTime: avgSec ? `${avgSec}s` : '—',
      recentPhrase: recent === 0 ? 'Niciun proiect în ultimele două săptămâni.'
        : recent === 1 ? 'Ai un proiect în ultimele două săptămâni.'
        : `Ai ${recent} proiecte în ultimele două săptămâni.`,
    };

    const stagesMap = { draft: 0, handed: 0, done: 0, inWork: 0 };
    for (const p of all) {
      if (p.status === STATUS.DRAFT)                                 stagesMap.draft++;
      else if (p.status === STATUS.HANDED_OFF)                       stagesMap.handed++;
      else if (p.status === STATUS.DONE)                             stagesMap.done++;
      else if (p.status === STATUS.QUEUED || p.status === STATUS.RUNNING) stagesMap.inWork++;
    }
    st.inWork = stagesMap.inWork;
    const stagesTotal = stagesMap.draft + stagesMap.handed + stagesMap.done;
    st.stagesTotal = stagesTotal;
    st.stages = [
      { key: 'draft',  label: 'Ciornă',        count: stagesMap.draft,
        pct: stagesTotal ? Math.round(stagesMap.draft  / stagesTotal * 1000) / 10 : 0 },
      { key: 'handed', label: 'La echipa Dev', count: stagesMap.handed,
        pct: stagesTotal ? Math.round(stagesMap.handed / stagesTotal * 1000) / 10 : 0 },
      { key: 'done',   label: 'Finalizat',     count: stagesMap.done,
        pct: stagesTotal ? Math.round(stagesMap.done   / stagesTotal * 1000) / 10 : 0 },
    ];

    // Ultimele 8 saptamani
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const wStart = new Date(); wStart.setHours(0,0,0,0);
      wStart.setDate(wStart.getDate() - wStart.getDay() - i * 7);
      const wEnd = new Date(wStart.getTime() + 7 * 86400000);
      const count = all.filter(p => p.createdAt >= wStart && p.createdAt < wEnd).length;
      weeks.push({ label: `${wStart.getDate()} ${MONTHS_RO[wStart.getMonth()]}`, count });
    }
    const peak = weeks.reduce((m, w) => Math.max(m, w.count), 0);
    st.weeks = weeks.map(w => ({
      ...w,
      height: peak > 0 ? Math.round(w.count / peak * 100) : 0,
      isPeak: peak > 0 && w.count === peak,
    }));
    st.weeksPeak  = peak;
    st.weeksTotal = weeks.reduce((t, w) => t + w.count, 0);

    return st;
  }

  _build(id) {
    const delay = this.buildDelay;
    const map   = this._projects;

    setTimeout(() => {
      const p = map.get(id);
      if (p && p.status === STATUS.QUEUED) p.status = STATUS.RUNNING;
    }, 300);

    const { spawn } = require('child_process');
    const path = require('path');

    setTimeout(() => {
      const project = map.get(id);
      if (!project) return;

      const runnerPath = path.join(__dirname, '../python/runner.py');
      const wsPath     = path.join(__dirname, '../..', project.workspacePath);
      const py = spawn('python3', [
        runnerPath,
        '--skill-id',    project.skillID,
        '--description', project.description,
        '--workspace',   wsPath,
      ]);
      let stdout = '';
      py.stdout.on('data', d => { stdout += d.toString(); });
      const finish = (ok, dur) => {
        const p2 = map.get(id);
        if (!p2) return;
        p2.status      = ok ? STATUS.DRAFT : STATUS.FAILED;
        p2.completedAt = new Date();
        p2.updatedAt   = new Date();
        if (ok) p2.durationSec = dur;
      };
      py.on('close', () => {
        try { const r = JSON.parse(stdout); finish(r.status === 'done', r.duration_sec || 3); }
        catch { finish(false, 0); }
      });
      py.on('error', () => {
        setTimeout(() => finish(true, Math.max(1, Math.round(delay / 1000))), delay);
      });
    }, 500);
  }
}

module.exports = { MemoryStore };
