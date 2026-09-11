'use strict';
// agent.js — Agentul care sta de vorba cu colegul din business.
//
// Modelul e servit prin Microsoft Foundry, care expune API-ul nativ Anthropic
// la <resursa>/anthropic/v1/messages. Folosim clientul dedicat din
// @anthropic-ai/foundry-sdk, nu clientul de baza cu baseURL schimbat.
//
// Doua apeluri, cu roluri diferite:
//   raspunde()    — un pas de conversatie: text + butoane + skill recomandat
//   construieste() — pagina HTML propriu-zisa, dintr-un brief adunat in discutie

const fs   = require('fs');
const path = require('path');
const { AnthropicFoundry } = require('@anthropic-ai/foundry-sdk');
const cunostinte = require('./agent-knowledge');
const persona    = require('./agent-persona');

// Radacina workspace-urilor: aceeasi cale pe care o foloseste si runner-ul,
// ca fisierele scrise de asistent sa ajunga in acelasi loc cu cele generate
// in container (volumul montat la /app/workspaces).
const RADACINA_WS = path.join(__dirname, '../..');

/**
 * Scrie pagina in workspace-ul sesiunii, langa nota pentru echipa de dezvoltare.
 * Intoarce caile scrise, ca apelantul sa poata raporta ce s-a salvat.
 */
function salveazaPagina(workspacePath, html, { nume, descriere, skill }) {
  const dir = path.join(RADACINA_WS, workspacePath);
  fs.mkdirSync(dir, { recursive: true });

  const nota = [
    `# ${nume}`,
    '',
    '## Ce am construit',
    '',
    `Pagina a fost generata din discutia cu asistentul, folosind sablonul \`${skill}\`.`,
    '',
    '## Descrierea data de coleg',
    '',
    descriere,
    '',
    '## Pentru echipa de dezvoltare',
    '',
    '- Pagina e statica: formularele nu trimit datele nicaieri.',
    '- Fara resurse externe (fonturi, imagini, CDN) - ruleaza pe reteaua interna.',
    '- De legat stocarea raspunsurilor inainte de publicare, daca pagina are formular.',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(dir, 'NOTE.md'), nota, 'utf8');
  return { dir, fisiere: ['index.html', 'NOTE.md'] };
}

/** Citeste pagina salvata a unei sesiuni; null daca nu exista inca. */
function citestePagina(workspacePath) {
  const f = path.join(RADACINA_WS, workspacePath, 'index.html');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
}

/** Salveaza istoricul conversatiei ca JSON in workspace-ul proiectului. */
function salveazaChat(workspacePath, mesaje) {
  const dir = path.join(RADACINA_WS, workspacePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'chat.json'), JSON.stringify(mesaje), 'utf8');
}

/** Citeste istoricul conversatiei; [] daca nu exista. */
function citesteChat(workspacePath) {
  const f = path.join(RADACINA_WS, workspacePath, 'chat.json');
  if (!fs.existsSync(f)) return [];
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; }
}

const BASE_URL   = (process.env.CLAUDE_DATA_URL || '').replace(/\/+$/, '');
const API_KEY    = process.env.CLAUDE_DATA_API_KEY || '';
const DEPLOYMENT = process.env.CLAUDE_DEPLOYMENT_NAME || '';

/** Agentul e disponibil doar daca toate cele trei variabile sunt configurate. */
function isConfigured() {
  return Boolean(BASE_URL && API_KEY && DEPLOYMENT);
}

/** Ce lipseste, pentru logul de pornire. Interfata nu arata asta nimanui. */
function lipsuri() {
  const l = [];
  if (!BASE_URL)   l.push('CLAUDE_DATA_URL');
  if (!API_KEY)    l.push('CLAUDE_DATA_API_KEY');
  if (!DEPLOYMENT) l.push('CLAUDE_DEPLOYMENT_NAME');
  return l;
}

let client = null;
function getClient() {
  if (!client) {
    client = new AnthropicFoundry({
      baseURL: `${BASE_URL}/anthropic`,
      apiKey:  API_KEY,
      timeout: 120000,
    });
  }
  return client;
}

// ---------- cost ----------
//
// Preturile sunt cele standard pentru modelul servit (Foundry factureaza la
// aceleasi tarife). Le tinem intr-un tabel ca sa fie usor de corectat cand se
// schimba, si ca sa nu fie imprastiate prin cod.
const PRETURI_USD_PER_MTOK = {
  'claude-sonnet-5': { intrare: 2.00,  iesire: 10.00 },
  'claude-opus-5':   { intrare: 5.00,  iesire: 25.00 },
  'claude-haiku-4-5':{ intrare: 1.00,  iesire:  5.00 },
};
const PRET_IMPLICIT = PRETURI_USD_PER_MTOK['claude-sonnet-5'];

/**
 * Costul unui apel, din usage-ul returnat de API.
 *
 * Numaram doar intrarea si iesirea. Tokenii de cache sunt raportati separat,
 * cu alt tarif; ii returnam ca informatie, dar nu ii amestecam in suma — mai
 * bine o cifra pe care o putem sustine decat una care pare exacta si nu e.
 */
function calculeazaCost(usage, model) {
  const p = PRETURI_USD_PER_MTOK[model] || PRET_IMPLICIT;
  const intrare = usage?.input_tokens  || 0;
  const iesire  = usage?.output_tokens || 0;
  const cacheRead  = usage?.cache_read_input_tokens     || 0;
  const cacheWrite = usage?.cache_creation_input_tokens || 0;

  return {
    tokeniIntrare: intrare,
    tokeniIesire:  iesire,
    tokeniTotal:   intrare + iesire,
    tokeniCacheCitit: cacheRead,
    tokeniCacheScris: cacheWrite,
    tokeniGandire: usage?.output_tokens_details?.thinking_tokens || 0,
    costUSD: (intrare / 1e6) * p.intrare + (iesire / 1e6) * p.iesire,
    model,
  };
}

// ---------- promptul de sistem ----------

// Promptul de sistem se asambleaza din bucati care se schimba din motive
// diferite: cine e agentul (persona), ce stie (knowledge, citit de pe disc),
// cum conduce discutia si cand se opreste din intrebat.
//
// Ordinea conteaza pentru cache: partile stabile stau primele, ca prefixul
// sa ramana acelasi de la o tura la alta si sa se poata refolosi.
const SISTEM = [
  persona.PERSONALITATE,
  '',
  `CU CINE VORBESTI
Un coleg din business — HR, marketing, administrativ, operatiuni. Nu e tehnic si
nu are de ce sa fie. Are o treaba de facut si putin timp.`,
  '',
  `CE STII DESPRE LIBRA MAKER
${cunostinte.PROCES}`,
  '',
  `CE POTI CONSTRUI
Astea sunt sabloanele disponibile. Alegi unul singur, cel mai apropiat de nevoia
colegului, si il pui in campul "skill". Numele lor sunt tehnice — nu i le spune
colegului ca atare, descrie-i in cuvintele lui ce va primi.

${cunostinte.catalogText()}`,
  '',
  cunostinte.REGULI,
  '',
  persona.STRATEGIE,
  '',
  `CAND TE OPRESTI DIN INTREBAT
Pui "gata": true doar dupa ce ai reformulat si colegul a confirmat. Atunci
completezi si "nume" (scurt, cum il recunoaste echipa) si "descriere" (tot ce
trebuie sa contina pagina, adunat din toata discutia, nu doar din ultimul mesaj).
Pana atunci "gata" ramane false, iar "nume" si "descriere" raman goale.`,
  '',
  persona.EXEMPLE,
].join('\n');

const SCHEMA_CONVERSATIE = {
  type: 'object',
  additionalProperties: false,
  properties: {
    raspuns:   { type: 'string', description: 'Mesajul catre coleg. Scurt, cald, fara jargon.' },
    butoane:   {
      type: 'array',
      description: 'Raspunsuri gata scrise, ca sa poata raspunde cu un clic. Intre 0 si 4.',
      items: { type: 'string' },
    },
    skill:     { type: 'string', enum: [...cunostinte.idSkilluri(), 'nedecis'] },
    gata:      { type: 'boolean', description: 'true doar cand avem si nume, si descriere completa.' },
    nume:      { type: 'string', description: 'Numele proiectului; gol pana cand e clar.' },
    descriere: { type: 'string', description: 'Descrierea finala a paginii; goala pana cand e completa.' },
  },
  required: ['raspuns', 'butoane', 'skill', 'gata', 'nume', 'descriere'],
};

/**
 * Un pas de conversatie.
 * @param {Array<{role: string, content: string}>} istoric
 */
async function raspunde(istoric) {
  const r = await getClient().messages.create({
    model: DEPLOYMENT,
    max_tokens: 2000,
    system: [{ type: 'text', text: SISTEM, cache_control: { type: 'ephemeral' } }],
    messages: istoric.map(m => ({ role: m.role, content: m.content })),
    output_config: { format: { type: 'json_schema', schema: SCHEMA_CONVERSATIE } },
  });

  const text = r.content.filter(b => b.type === 'text').map(b => b.text).join('');
  let date;
  try {
    date = JSON.parse(text);
  } catch {
    // Schema face asta improbabil, dar daca totusi nu se poate parsa,
    // e mai bine sa aratam textul decat sa aruncam conversatia.
    date = { raspuns: text, butoane: [], skill: 'nedecis', gata: false, nume: '', descriere: '' };
  }

  return { ...date, cost: calculeazaCost(r.usage, r.model) };
}

// ---------- generarea paginii ----------

const SISTEM_CONSTRUIRE = `Construiesti pagini interne pentru intranetul Libra Bank.

Primesti un nume de proiect si o descriere si returnezi UN SINGUR fisier HTML
complet, gata de deschis in browser.

REGULI
- Un singur fisier: HTML cu CSS inline, in <style>. Fara fisiere separate.
- Fara JavaScript, cu o exceptie: daca pagina are formular, poate avea un
  script scurt care afiseaza un mesaj de confirmare la trimitere. Formularul
  NU trimite date nicaieri — echipa de dezvoltare leaga asta ulterior.
- Fara imagini din exterior, fara fonturi de pe internet, fara CDN-uri. Pagina
  ruleaza pe o retea interna si nu are voie sa ceara nimic din afara.
- Romaneste, cu diacritice.
- Responsiv: sa arate bine si pe telefon, si pe laptop.
- Identitatea Libra: rosu #C2182F ca accent, text inchis #1C1B21, fundal
  deschis #F7F4F2, colturi rotunjite, mult spatiu alb. Sobru, nu tipator.
- Accesibil: contrast bun, etichete pe campurile de formular, un singur <h1>.

Raspunzi DOAR cu HTML-ul. Fara explicatii, fara blocuri de cod cu \`\`\`.`;

/**
 * Genereaza pagina. Streaming, pentru ca un HTML complet poate fi lung si
 * o cerere obisnuita ar risca sa depaseasca timeout-ul HTTP.
 */
async function construieste({ nume, descriere, skill, imagini }) {
  const sablon = cunostinte.catalog().find(s => s.id === skill);
  const textPrompt = [
    `Nume proiect: ${nume}`,
    `Sablon: ${sablon ? sablon.id : 'info-page'}`,
    sablon ? `Ce inseamna sablonul asta: ${sablon.descriere}` : '',
    sablon && sablon.rezumat ? `Pe scurt: ${sablon.rezumat}` : '',
    '',
    'Ce trebuie sa contina pagina:',
    descriere,
    imagini && imagini.length > 0
      ? '\nUtilizatorul a atașat imagini de referință — urmărește structura, layout-ul și elementele vizuale din ele.'
      : '',
  ].filter(Boolean).join('\n');

  const content = [];
  if (imagini && imagini.length > 0) {
    imagini.forEach(img => content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.data },
    }));
  }
  content.push({ type: 'text', text: textPrompt });

  const stream = getClient().messages.stream({
    model: DEPLOYMENT,
    max_tokens: 16000,
    system: [{ type: 'text', text: SISTEM_CONSTRUIRE, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content }],
  });

  const r = await stream.finalMessage();
  let html = r.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();

  const gard = html.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/);
  if (gard) html = gard[1].trim();

  return { html, cost: calculeazaCost(r.usage, r.model) };
}

const SISTEM_MODIFICA = `Ești un asistent care modifică pagini HTML interne pentru intranetul Libra Bank.

Primești pagina HTML curentă și un mesaj de la utilizator.

REGULI STRICTE — respectă-le în ordine:

1. Dacă mesajul este CLAR și SPECIFIC (ex: "schimbă titlul în X", "adaugă un buton roșu", "mută secțiunea sus"):
   → Returnează HTML-ul complet actualizat. Primul caracter trebuie să fie "<".

2. Dacă mesajul este AMBIGUU, VAGUE sau pur CONVERSAȚIONAL
   (ex: "da", "nu", "ok", "bine", "hmm", "mai bine", "schimbă ceva", "fă mai frumos", "nu știu"):
   → NU modifica HTML-ul.
   → Răspunde DOAR cu o întrebare de clarificare, începând exact cu "CLARIFICARE: ".
   → Ex: "CLARIFICARE: Ce anume dorești să schimb? Culori, texte, structura paginii?"

3. Dacă utilizatorul confirmă o modificare propusă anterior (ex: "da, aia", "exact", "perfect"):
   → Cere să reformuleze concret CE să schimbi, pentru că nu ai memorie a propunerilor anterioare.
   → Începe cu "CLARIFICARE: ".

Răspunzi fie cu HTML complet (începând cu "<"), fie cu "CLARIFICARE: ..." — nimic altceva.
Fără explicații, fără blocuri de cod cu \`\`\`.`;

/**
 * Modifica pagina HTML existenta pe baza unui mesaj de la utilizator.
 * Daca mesajul e ambiguu, returneaza o cerere de clarificare (html: null).
 *
 * @param {string} mesaj      - Ce doreste utilizatorul sa schimbe.
 * @param {string} htmlCurent - Continutul HTML curent al paginii.
 */
async function modifica(mesaj, htmlCurent, imagini) {
  const textPrompt = [
    'Pagina HTML curentă:',
    '',
    htmlCurent,
    '',
    'Mesajul utilizatorului:',
    mesaj,
    imagini && imagini.length > 0
      ? '\nUtilizatorul a atașat imagini de referință — ține cont de ele la modificare.'
      : '',
  ].filter(Boolean).join('\n');

  const content = [];
  if (imagini && imagini.length > 0) {
    imagini.forEach(img => content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.data },
    }));
  }
  content.push({ type: 'text', text: textPrompt });

  const stream = getClient().messages.stream({
    model:      DEPLOYMENT,
    max_tokens: 16000,
    system: [{ type: 'text', text: SISTEM_MODIFICA, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content }],
  });

  const r = await stream.finalMessage();
  let text = r.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();

  // Agentul cere clarificari — nu modifica HTML-ul
  if (text.startsWith('CLARIFICARE:')) {
    return {
      html:    null,
      raspuns: text.replace(/^CLARIFICARE:\s*/, '').trim(),
      cost:    calculeazaCost(r.usage, r.model),
    };
  }

  // Scoatem gardul de cod daca modelul l-a adaugat totusi.
  const gard = text.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/);
  if (gard) text = gard[1].trim();

  return {
    html:    text,
    raspuns: 'Am aplicat modificările. Cum arată acum?',
    cost:    calculeazaCost(r.usage, r.model),
  };
}

module.exports = {
  isConfigured, lipsuri, raspunde, construieste, modifica, calculeazaCost,
  salveazaPagina, citestePagina, salveazaChat, citesteChat,
  DEPLOYMENT, NUME: persona.NUME,
};
