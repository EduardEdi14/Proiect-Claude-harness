'use strict';
// agent-knowledge.js — ce stie agentul.
//
// Cunostintele nu sunt scrise aici de mana. Skill-urile sunt citite de pe disc,
// din aceleasi fisiere SKILL.md pe care le foloseste si runner-ul, ca agentul
// sa nu ajunga sa promita altceva decat construieste containerul. Cand echipa
// adauga un skill nou, agentul il stie fara sa modificam codul.

const fs   = require('fs');
const path = require('path');

// In imagine skill-urile sunt copiate langa cod; local stau in repo.
const CAI_SKILLURI = [
  path.join(__dirname, '../../docker/claude-runner/skills'),
  path.join(__dirname, '../skills'),
];

/** Frontmatter-ul simplu din capul fisierelor SKILL.md (name + description). */
function citesteFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  let cheie = null;
  for (const linie of m[1].split('\n')) {
    const pereche = linie.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (pereche) { cheie = pereche[1]; out[cheie] = pereche[2].trim(); }
    else if (cheie && linie.trim()) { out[cheie] += ' ' + linie.trim(); }  // valoare pe mai multe randuri
  }
  return out;
}

/** Prima fraza de sub titlul H1 — rezumatul scris de autorul skill-ului. */
function citesteRezumat(text) {
  const dupaTitlu = text.split(/^# .*$/m)[1] || '';
  const paragraf = dupaTitlu.trim().split(/\n\s*\n/)[0] || '';
  return paragraf.replace(/\s+/g, ' ').trim();
}

// Doar sectiunea care chiar spune ce NU face skill-ul. Titlurile de tip
// "Rules" contin reguli de stil (aliniere, latime de rand) - zgomot in prompt.
const TITLURI_LIMITE = /^## What this template does not do\s*\n([\s\S]*?)(?=\n## |\n*$)/m;

/** Ce nu face skill-ul, acolo unde autorul a scris-o explicit. */
function citesteLimite(text) {
  const m = text.match(TITLURI_LIMITE);
  if (!m) return '';
  return m[1].split('\n')
    .filter(l => l.trim().startsWith('- '))
    .slice(0, 3)
    .map(l => l.replace(/^\s*-\s*/, '').replace(/\s+/g, ' ').trim())
    .join(' ');
}

// Aprobate sunt doar cele doua instrumente din catalogul aplicatiei. Restul
// fisierelor SKILL.md exista in repo, dar echipa nu le-a deschis inca — agentul
// nu are voie sa promita ce nu poate livra tot fluxul.
//
// Id-ul din stanga e cel cu care lucreaza aplicatia (store.TOOLS, tabela
// sessions); folderul din dreapta e de unde vin cunostintele.
const APROBATE = [
  { id: 'pagina-informare', folder: 'info-page' },
  { id: 'formular',         folder: 'form-page' },
];

let cache = null;

/** Catalogul de skill-uri, citit o singura data la pornire. */
function catalog() {
  if (cache) return cache;

  const radacina = CAI_SKILLURI.find(p => fs.existsSync(p));
  if (!radacina) { cache = []; return cache; }

  cache = APROBATE
    .map(a => {
      const fisier = path.join(radacina, a.folder, 'SKILL.md');
      if (!fs.existsSync(fisier)) return null;
      // Fisierele ajung cu CRLF prin git pe Windows, iar in regex "." nu
      // potriveste \r — frontmatter-ul iesea gol. Normalizam o data, aici.
      const text = fs.readFileSync(fisier, 'utf8').split('\r\n').join('\n');
      const fm = citesteFrontmatter(text);
      return {
        id:        a.id,
        folder:    a.folder,
        descriere: fm.description || '',
        rezumat:   citesteRezumat(text),
        limite:    citesteLimite(text),
      };
    })
    .filter(Boolean);

  return cache;
}

/** Catalogul, formatat pentru promptul de sistem. */
function catalogText() {
  const c = catalog();
  if (!c.length) return '(niciun skill gasit pe disc — spune-i colegului ca nu poti construi acum)';
  return c.map(s => {
    const randuri = [`### ${s.id}`, s.descriere];
    if (s.rezumat) randuri.push(`Pe scurt: ${s.rezumat}`);
    if (s.limite)  randuri.push(`Nu face: ${s.limite}`);
    return randuri.join('\n');
  }).join('\n\n');
}

function idSkilluri() {
  const c = catalog();
  return c.length ? c.map(s => s.id) : ['pagina-informare'];
}

// ---------- cunostinte care nu vin din fisiere ----------
//
// Regulile de mai jos sunt extrase din documentul de implementare si din
// sectiunile "Privacy" si "delivery" ale skill-urilor. Le tinem aici, la un
// loc, ca sa fie usor de corectat cand se schimba procesul.

const PROCES = `Libra Maker e o unealta interna a Libra Bank. Fluxul, pe scurt:

1. Colegul din business descrie ce pagina vrea. Atat — nu scrie cod, nu alege tehnologii.
2. Pagina se genereaza intr-un container izolat, doar pentru sesiunea lui. Containerul
   nu vede alte proiecte, nu are acces la sistemele bancii si nu iese pe internet.
3. Rezultatul e o CIORNA. Colegul o vede, cere modificari, o reface de cate ori vrea.
4. Cand e multumit, o trimite echipei de dezvoltare. Primeste un numar de cerere.
5. Echipa de dezvoltare revizuieste codul si abia apoi il publica pe intranet.

NIMIC nu se publica singur. Asta e de spus clar daca colegul pare grabit sau ingrijorat.`;

const REGULI = `Reguli care nu se negociaza:

DATE PERSONALE (suntem o banca)
- Fara CNP, numar de cont, date de card, salariu, date medicale. Daca cere asa ceva,
  spune-i direct ca nu se poate si construieste restul fara campul acela.
- Se colecteaza doar ce cere efectiv scopul, nimic in plus.
- Pagina spune vizibil la ce se folosesc datele si cat timp se pastreaza.
- Casuta de acord nu vine bifata dinainte.

CE IESE DIN GENERARE
- O singura pagina statica. Nu se conecteaza la niciun sistem, nu are login,
  nu trimite datele nicaieri — echipa de dezvoltare leaga asta ulterior.
- Fara imagini din exterior, fara fonturi de pe internet. Pagina ruleaza pe reteaua
  interna si nu are voie sa ceara nimic din afara.

CAND CEVA NU SE POATE
Spune clar ca nu se poate si propune ce se poate. Nu promite si nu inventa.`;

module.exports = { catalog, catalogText, idSkilluri, PROCES, REGULI };
