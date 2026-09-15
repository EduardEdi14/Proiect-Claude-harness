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
    id:            'dashboard',
    name:          'Tablou de bord',
    shortName:     'Dashboard',
    desc:          'Indicatori, grafice și un tabel de detaliu — totul pe un singur ecran.',
    icon:          '📊',
    version:       'v1',
    tags:          ['indicatori', 'grafice', 'tabel'],
    examplePrompt: 'Tablou de bord cu situația cererilor de credit din trimestrul 3: total cereri, cereri aprobate, cereri respinse și timp mediu de procesare, cu un grafic pe luni și un tabel pe sucursale.',
  },
  {
    id:            'chart',
    name:          'Grafic din date',
    shortName:     'Grafic',
    desc:          'Un grafic bine făcut, cu fraza care îl explică și datele ca tabel.',
    icon:          '📈',
    version:       'v1',
    tags:          ['coloane', 'linie', 'bare', 'SVG'],
    examplePrompt: 'Grafic cu evoluția numărului de clienți noi pe luni în 2026: ian. 318, feb. 276, mar. 412, apr. 389, mai 445, iun. 512.',
  },
  {
    id:            'report',
    name:          'Raport lunar',
    shortName:     'Raport',
    desc:          'Document de tipărit: sinteză, narativ, grafice mici, acțiuni, anexă.',
    icon:          '📄',
    version:       'v1',
    tags:          ['printabil', 'A4', 'conducere'],
    examplePrompt: 'Raport pentru conducere despre operațiunile din august 2026: 1.284 cereri primite (−8% față de iulie), timp mediu de soluționare 2,8 zile, restanțe scăzute de la 46 la 12. Propun redistribuirea cozii și 2 posturi temporare.',
  },
  {
    id:            'data-table',
    name:          'Tabel de date',
    shortName:     'Tabel',
    desc:          'Tabel cu căutare, sortare, filtrare, totaluri și export CSV.',
    icon:          '🗂️',
    version:       'v1',
    tags:          ['căutare', 'sortare', 'export CSV'],
    examplePrompt: 'Tabel cu situația pe sucursale, august 2026: Sucursala Nord 318 cereri Finalizat, Sucursala Vest 208 cereri În lucru, Sucursala Centru 154 cereri Finalizat, Sucursala Sud 289 cereri Finalizat, Sucursala Est 315 cereri În lucru.',
  },
  {
    id:            'info-page',
    name:          'Pagină de informare',
    shortName:     'Pagină',
    desc:          'Anunț intern, ghid sau campanie cu secțiuni, liste și contacte.',
    icon:          '📢',
    version:       'v1',
    tags:          ['anunț', 'ghid', 'campanie'],
    examplePrompt: 'Pagină pentru campania internă Green Week (12–16 octombrie): introducere despre colectarea selectivă, punctele de colectare din sediu (parter și etaj 3), program și contact Ana Popescu, Administrativ.',
  },
  {
    id:            'form-page',
    name:          'Formular de colectare',
    shortName:     'Formular',
    desc:          'Înscriere, chestionar sau cerere cu validare și confirmare.',
    icon:          '📋',
    version:       'v1',
    tags:          ['max. 8 câmpuri', 'validare', 'confirmare'],
    examplePrompt: 'Formular de înscriere la Green Week: câmpuri pentru nume, departament, email și ziua preferată (luni–vineri, 12–16 octombrie). Confirmare automată după trimitere.',
  },
  {
    id:            'slides',
    name:          'Prezentare',
    shortName:     'Slides',
    desc:          'Slide-uri pentru ședință internă — navigare cu tastele, tipărit câte un slide pe pagină.',
    icon:          '🖥️',
    version:       'v1',
    tags:          ['prezentare', 'comitet', '6–12 slide-uri'],
    examplePrompt: 'Prezentare pentru comitetul de operațiuni: situația curentă (2,8 zile medie de soluționare), cauzele principale ale întârzierilor, 3 măsuri propuse cu costul estimat, și cerere de aprobare pentru 2 posturi temporare.',
  },

  // Instrumentele de mai jos sunt specializari: fiecare are propriul SKILL.md, cu
  // structura de pagina impusa pentru situatia lui. Primele sapte rezolva un tip
  // de rezultat (tabel, grafic, formular); acestea rezolva o situatie concreta,
  // care are de fiecare data aceleasi secțiuni, in aceeasi ordine.
  {
    id:            'campaign',
    name:          'Campanie internă',
    shortName:     'Campanie',
    desc:          'Pagină de campanie cu perioadă, termen de înscriere, puncte și responsabil.',
    icon:          '🌱',
    version:       'v1',
    tags:          ['perioadă', 'termen', 'participare'],
    examplePrompt: 'Pagină pentru campania internă Green Week (12–16 octombrie): colectăm selectiv hârtie, plastic și metal, punctele sunt la parter și etaj 3, înscrierea se face până pe 9 octombrie, contact Ana Popescu, Administrativ.',
  },
  {
    id:            'onboarding',
    name:          'Pagină de onboarding',
    shortName:     'Onboarding',
    desc:          'Primele zile pentru un coleg nou: cronologie, cine răspunde de ce, accesuri de cerut.',
    icon:          '🧭',
    version:       'v1',
    tags:          ['prima săptămână', 'accesuri', 'responsabili'],
    examplePrompt: 'Pagină de onboarding pentru colegii noi din Operațiuni: ce se întâmplă în prima zi și în prima săptămână, cine răspunde de IT, HR și Administrativ, lista de accesuri de cerut și cu cine vorbesc dacă se blochează.',
  },
  {
    id:            'announcement',
    name:          'Anunț intern',
    shortName:     'Anunț',
    desc:          'Ce se schimbă, de la ce dată, ce era înainte și ce trebuie să facă angajatul.',
    icon:          '📢',
    version:       'v1',
    tags:          ['ce se schimbă', 'dată', 'înainte/după'],
    examplePrompt: 'Anunț intern despre noua politică de concediu, valabilă de la 1 ianuarie 2027: se schimbă modul de aprobare și termenul de depunere, comparativ cu regulile actuale, plus întrebări frecvente și ce trebuie să facă fiecare angajat.',
  },
  {
    id:            'event',
    name:          'Pagină de eveniment',
    shortName:     'Eveniment',
    desc:          'Ce, când și unde, programul pe ore și detaliile practice ale unui eveniment.',
    icon:          '📅',
    version:       'v1',
    tags:          ['program pe ore', 'locație', 'detalii practice'],
    examplePrompt: 'Pagină pentru Team Building 2027, 18 iunie la Brașov: programul pe ore, transportul de la sediu, ținuta recomandată, mesele incluse și contact Maria Ionescu, HR.',
  },
  {
    id:            'team',
    name:          'Prezentare echipă',
    shortName:     'Echipă',
    desc:          'Misiunea echipei, membrii cu rolurile lor și cum îi ceri ceva.',
    icon:          '🏛️',
    version:       'v1',
    tags:          ['membri', 'roluri', 'cum ne ceri ceva'],
    examplePrompt: 'Pagină de prezentare a departamentului Inovație și Digitalizare: misiunea echipei, cei 6 membri cu rolurile lor, proiectele în desfășurare și cum cer alte departamente o colaborare.',
  },
  {
    id:            'faq',
    name:          'Întrebări frecvente',
    shortName:     'FAQ',
    desc:          'Întrebări grupate pe teme, fiecare cu răspuns scurt, cele mai cerute primele.',
    icon:          '❓',
    version:       'v1',
    tags:          ['pe teme', 'răspunsuri scurte', 'contact'],
    examplePrompt: 'Pagină cu întrebări frecvente pentru colegii noi: cum obțin accesul la sisteme, pe cine contactează pentru IT, HR și Administrativ, cum funcționează programul hibrid și unde găsesc ghidul de beneficii.',
  },
  {
    id:            'schedule',
    name:          'Program pe intervale',
    shortName:     'Program',
    desc:          'Agendă pe intervale orare: ce se întâmplă, cine susține, unde.',
    icon:          '🕒',
    version:       'v1',
    tags:          ['intervale orare', 'sesiuni', 'tipărire'],
    examplePrompt: 'Program pentru ziua de training Risc Operațional, 3 martie, sala Mare: intervalele de la 9:00 la 17:00, ce se discută în fiecare, cine susține sesiunea și pauzele.',
  },
  {
    id:            'benefits',
    name:          'Ghid de beneficii',
    shortName:     'Beneficii',
    desc:          'Fiecare beneficiu explicat la fel: ce este, cine are dreptul, cum îl accesezi.',
    icon:          '🎁',
    version:       'v1',
    tags:          ['ce este', 'cine are dreptul', 'cum accesezi'],
    examplePrompt: 'Pagină despre beneficiile angajaților cu contract pe perioadă nedeterminată: asigurarea medicală privată, zilele libere suplimentare și abonamentul sportiv — pentru fiecare, cine are dreptul și cum se accesează.',
  },
  {
    id:            'regulations',
    name:          'Regulament',
    shortName:     'Regulament',
    desc:          'Condiții de participare, reguli numerotate, termene și excepții.',
    icon:          '⚖️',
    version:       'v1',
    tags:          ['puncte numerotate', 'termene', 'excepții'],
    examplePrompt: 'Regulamentul concursului interior de idei, 1–31 octombrie: cine poate participa, regulile de înscriere, cum se jurizează, premiile, termenele și excepțiile, plus responsabil Andrei Pop, Inovație.',
  },
  {
    id:            'guide',
    name:          'Ghid pas cu pas',
    shortName:     'Ghid',
    desc:          'Ce îți trebuie, pașii în ordine, ce vezi după fiecare și ce faci când nu merge.',
    icon:          '📘',
    version:       'v1',
    tags:          ['pași numerotați', 'ce vezi', 'depanare'],
    examplePrompt: 'Ghid pentru colegii din sucursale despre cum cer accesul la aplicația de raportare: ce le trebuie înainte, pașii de urmat în ordine, ce văd după fiecare pas, ce fac dacă cererea e respinsă și pe cine contactează.',
  },
  {
    id:            'request',
    name:          'Formular de cerere',
    shortName:     'Cerere',
    desc:          'Ce se cere, motivul, aprobatorul și data până la care e nevoie.',
    icon:          '🗒️',
    version:       'v1',
    tags:          ['motivare', 'aprobator', 'dată limită'],
    examplePrompt: 'Formular de cerere pentru echipament IT: ce echipament se cere, motivul business, departamentul și aprobatorul, plus data până la care este necesar. Confirmare automată după trimitere.',
  },
  {
    id:            'survey',
    name:          'Sondaj intern',
    shortName:     'Sondaj',
    desc:          'Întrebări grupate, o singură scală de notare, un câmp liber la final.',
    icon:          '📊',
    version:       'v1',
    tags:          ['o singură scală', 'întrebări neutre', 'anonimat'],
    examplePrompt: 'Sondaj despre programul de lucru hibrid, pentru toți colegii din sediu: întrebări despre zilele preferate la birou și despre echiparea de acasă, o notă de la 1 la 5 pentru echilibrul actual și un câmp liber pentru sugestii.',
  },
  {
    id:            'feedback',
    name:          'Formular de feedback',
    shortName:     'Feedback',
    desc:          'Note pe criterii fixe plus ce a fost util și ce lipsea, identificare opțională.',
    icon:          '💬',
    version:       'v1',
    tags:          ['criterii fixe', 'ce lipsea', 'opțional anonim'],
    examplePrompt: 'Formular de feedback după trainingul de Risc Operațional din 3 martie: note de la 1 la 5 pentru utilitate, ritm și materiale, ce a fost util, ce lipsea și un câmp opțional de nume.',
  },
  {
    id:            'course-signup',
    name:          'Înscriere la cursuri',
    shortName:     'Cursuri',
    desc:          'Alegerea cursului din listă, nivelul de experiență și intervalul preferat.',
    icon:          '🎓',
    version:       'v1',
    tags:          ['alegere curs', 'nivel', 'a doua opțiune'],
    examplePrompt: 'Formular de înscriere la cursurile interne din semestrul 2: alegerea cursului din listă (Excel avansat, Prezentări eficiente, Managementul timpului), nivelul de experiență și intervalul orar preferat, cu o a doua opțiune.',
  },
  {
    id:            'referral',
    name:          'Recomandă un candidat',
    shortName:     'Recrutare',
    desc:          'Poziția, candidatul, relația cu recomandantul și un scurt argument.',
    icon:          '🤝',
    version:       'v1',
    tags:          ['poziție', 'CV ca link', 'acordul candidatului'],
    examplePrompt: 'Formular de recomandare pentru poziția de Analist Credite din Sucursala Nord: numele candidatului, cum îl contactăm, CV sau profil LinkedIn ca link, relația cu recomandantul și un scurt argument.',
  },
];

function toolByID(id) {
  return TOOLS.find(t => t.id === id) || null;
}

// ---------- general-purpose templates (discover gallery + builder panel) ----------

const TEMPLATES = [
  { name: 'Tablou de bord',        skill: 'dashboard',
    tpl: 'Tablou de bord cu situatia [activitate] din [trimestrul/luna]: total [indicator 1], [indicator 2] si [indicator 3], cu un grafic pe luni si un tabel detaliat pe [sucursale/departamente].' },
  { name: 'Grafic din date',       skill: 'chart',
    tpl: 'Grafic cu evolutia [metrica] pe luni in [an]: [luna 1] [valoare], [luna 2] [valoare], [luna 3] [valoare], [luna 4] [valoare], [luna 5] [valoare], [luna 6] [valoare].' },
  { name: 'Raport',                skill: 'report',
    tpl: 'Raport pentru [conducere/departament] despre [subiect] din [luna/trimestrul]: [cifra principala] ([comparatie fata de perioada anterioara]), [observatie cheie]. Propun [actiuni recomandate].' },
  { name: 'Tabel de date',         skill: 'data-table',
    tpl: 'Tabel cu situatia [activitate] din [perioada]: coloane pentru [camp 1], [camp 2], [camp 3] si [camp 4], cu filtrare, sortare si export CSV.' },
  { name: 'Pagina de informare',   skill: 'info-page',
    tpl: 'Pagina de informare despre [subiect]: [introducere scurta], [detalii principale] si [contact sau actiune de urmat].' },
  { name: 'Formular de colectare', skill: 'form-page',
    tpl: 'Formular pentru [scop]: campuri pentru [camp 1], [camp 2], [camp 3] si [camp 4]. Confirmare automata dupa trimitere.' },
  { name: 'Prezentare',            skill: 'slides',
    tpl: 'Prezentare pentru [comitet/sedinta] despre [subiect]: situatia curenta, [problema/oportunitatea], [propunere cu argumente], [costuri si beneficii] si cerere de aprobare pentru [decizie].' },
  { name: 'Cerere',                skill: 'request',
    tpl: 'Formular de cerere pentru [tipul de cerere]: campuri pentru [camp 1], [camp 2], motivul cererii si data la care este necesar. Confirmare automata dupa trimitere.' },
  { name: 'Sondaj',                skill: 'survey',
    tpl: 'Sondaj despre [subiect] pentru [audienta]: intrebari despre [tema 1], [tema 2], o nota de satisfactie de la 1 la 5 si camp liber pentru sugestii.' },
  { name: 'Campanie',              skill: 'campaign',
    tpl: 'Pagina pentru campania interna [numele campaniei] ([data start]-[data end]): [scopul campaniei], [detalii principale] si contact [persoana responsabila], [departament].' },
  { name: 'Onboarding',            skill: 'onboarding',
    tpl: 'Pagina de onboarding pentru [rol/departament]: primele [zile/saptamani] in companie, cine raspunde de [domeniu 1] si [domeniu 2], lista de accesuri necesare si calendarul de integrare.' },
  { name: 'Anunt',                 skill: 'announcement',
    tpl: 'Anunt intern despre [subiect]: ce se schimba de la [data], [detalii principale], intrebari frecvente si [actiunea necesara din partea angajatului].' },
  { name: 'Eveniment',             skill: 'event',
    tpl: 'Pagina pentru evenimentul [numele evenimentului] din [data] la [locatie]: programul pe ore, [detalii principale] si contact [persoana responsabila].' },
  { name: 'Echipa',                skill: 'team',
    tpl: 'Pagina de prezentare a echipei [numele echipei/departamentului]: misiunea echipei, membrii cu rolurile lor, proiectele active si [contact pentru colaborari interne].' },
  { name: 'FAQ',                   skill: 'faq',
    tpl: 'Pagina FAQ despre [subiect]: raspunsuri la [intrebarea 1], [intrebarea 2], [intrebarea 3] si contact pentru intrebari suplimentare la [persoana/email].' },
  { name: 'Feedback',              skill: 'feedback',
    tpl: 'Formular de feedback dupa [activitate/training/eveniment]: ce a fost util, ce lipsea, o nota de la 1 la 5 pentru [criteriu] si camp liber pentru sugestii.' },
  { name: 'Program',               skill: 'schedule',
    tpl: 'Program pentru [evenimentul/activitatea] din [data] la [locatie]: intervalele orare, [descrierea activitatilor/sesiunilor], [prezentatorii/responsabilii] si informatii de contact.' },
  { name: 'Beneficii',             skill: 'benefits',
    tpl: 'Pagina despre beneficiile [tipul de angajat]: [beneficiul 1] - cum se acceseaza, [beneficiul 2] - cum se acceseaza si [beneficiul 3] - cum se acceseaza.' },
  { name: 'Cursuri',               skill: 'course-signup',
    tpl: 'Formular de inscriere la [cursul/programul de training] din [perioada]: campuri pentru [camp 1], alegerea cursului din lista, nivelul de experienta si [intervalul orar/locatia preferata].' },
  { name: 'Regulament',            skill: 'regulations',
    tpl: 'Pagina cu regulamentul [activitatii/concursului/procedurii]: conditiile de participare, [regulile principale], [termene si exceptii] si contact [persoana responsabila].' },
  { name: 'Recrutare',             skill: 'referral',
    tpl: 'Formular de recomandare pentru pozitia de [denumirea pozitiei] din [departament]: campuri pentru numele candidatului, CV sau profil LinkedIn, relatia cu recomandantul si un scurt argument.' },
  { name: 'Ghid',                  skill: 'guide',
    tpl: 'Ghid despre [subiect] pentru [audienta]: [sectiunea 1 - descriere], [sectiunea 2 - descriere], [sectiunea 3 - descriere] si [contact sau resurse suplimentare].' },
];

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
    const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });
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

  /**
   * Proiect venit de la asistent: pagina e deja construita, deci intra direct
   * ca ciorna. Nu pornim runner-ul — nu mai avem ce genera.
   */
  async createBuilt(userID, skillID, name, description, durationSec) {
    const id = newID();
    const wp = workspacePath(userID, id);
    await this.pool.query(
      `INSERT INTO projects (id, user_id, skill_id, name, description, workspace_path,
                             status, duration_sec, created_at, updated_at, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,NOW(),NOW(),NOW())`,
      [id, userID, skillID, name, description, wp, durationSec || 0]
    );
    return this.getProject(id);
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

  async deleteProject(id) {
    await this.pool.query('DELETE FROM projects WHERE id=$1', [id]);
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
      avgSec:    row.avg_sec ? Math.round(parseFloat(row.avg_sec)) : 0,
      avgTime:   row.avg_sec ? `${Math.round(parseFloat(row.avg_sec))}s` : '—',
      recentPhrase: '',
    };
    const recent = parseInt(row.recent, 10);
    if (recent === 0)      st.recentPhrase = 'Niciun proiect în ultimele două săptămâni.';
    else if (recent === 1) st.recentPhrase = 'Ai un proiect în ultimele două săptămâni.';
    else                   st.recentPhrase = `Ai ${recent} proiecte în ultimele două săptămâni.`;
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
    const stages = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='draft')      AS draft,
         COUNT(*) FILTER (WHERE status='handed_off') AS handed,
         COUNT(*) FILTER (WHERE status='done')       AS done,
         COUNT(*) FILTER (WHERE status IN ('queued','running')) AS in_work
       FROM projects WHERE user_id=$1`,
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
    const weeks = await this.pool.query(
      `SELECT w AS week_start,
              COUNT(p.id) AS count
         FROM generate_series(
                date_trunc('week', NOW()) - INTERVAL '7 weeks',
                date_trunc('week', NOW()),
                INTERVAL '1 week'
              ) AS w
         LEFT JOIN projects p
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
      // Doua niveluri, nu trei: workspaces/ e langa backend/, deci
      // fisierele generate trebuie sa cada in volumul montat /app/workspaces.
      const wsPath     = path.join(__dirname, '../..', project.workspacePath);

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

module.exports = { STATUS, TOOLS, TEMPLATES, toolByID, User, Project, Store, MONTHS_RO };
