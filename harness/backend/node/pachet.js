'use strict';
// pachet.js — impacheteaza fisierele unui proiect intr-un .zip descarcabil.
//
// Ce primeste echipa de dezvoltare cand colegul apasa "Descarcă":
//   index.html   pagina
//   style.css    stilurile, scoase din pagina cand se poate (vezi mai jos)
//   NOTE.md      nota pentru echipa
//
// chat.json ramane afara: e starea conversatiei, nu un fisier livrabil.

const fs    = require('fs');
const path  = require('path');
const JSZip = require('jszip');

/** Fisiere din workspace care nu au ce cauta in pachetul de livrare. */
const EXCLUSE = new Set(['chat.json']);

/**
 * Scoate stilurile din pagina intr-un fisier separat.
 *
 * Conventia echipei (docker/claude-runner/skills/_common/delivery.md) e
 * index.html + style.css. Modelul genereaza un singur fisier cu <style> inline,
 * asa ca il despartim aici — dar numai cand e sigur: exact un bloc <style>,
 * fara atribute pe el. Daca pagina arata altfel, o livram cum e; mai bine un
 * fisier corect decat doua rupte.
 */
function separaStilurile(html) {
  const blocuri = html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];
  if (blocuri.length !== 1) return null;

  const bloc = blocuri[0];
  if (!/^<style\s*>/i.test(bloc)) return null;   // are atribute (media, nonce) — nu atingem

  const css = bloc.replace(/^<style\s*>/i, '').replace(/<\/style>$/i, '').trim();
  if (!css) return null;

  const link = '<link rel="stylesheet" href="style.css">';
  return { html: html.replace(bloc, link), css };
}

/**
 * Construieste arhiva unui proiect.
 * @param {string} dir  directorul workspace-ului
 * @param {string} nume numele proiectului, pentru radacina din arhiva
 * @returns {Promise<{buffer: Buffer, fisiere: string[]}>}
 */
async function construieste(dir, nume) {
  if (!fs.existsSync(dir)) throw new Error('Proiectul nu are fisiere pe disc.');

  const zip = new JSZip();
  // Radacina cu numele proiectului: la dezarhivare nu se imprastie fisiere
  // peste ce are omul in Downloads.
  const radacina = zip.folder(numeSigur(nume) || 'pagina');

  const peDisc = fs.readdirSync(dir).filter(f => !EXCLUSE.has(f));
  const fisiere = [];

  for (const f of peDisc) {
    const caleF = path.join(dir, f);
    if (!fs.statSync(caleF).isFile()) continue;

    if (f === 'index.html') {
      const html = fs.readFileSync(caleF, 'utf8');
      const separat = separaStilurile(html);
      if (separat) {
        radacina.file('index.html', separat.html);
        radacina.file('style.css', separat.css);
        fisiere.push('index.html', 'style.css');
      } else {
        radacina.file('index.html', html);
        fisiere.push('index.html');
      }
    } else {
      radacina.file(f, fs.readFileSync(caleF));
      fisiere.push(f);
    }
  }

  if (!fisiere.length) throw new Error('Proiectul nu are fisiere de descarcat.');

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return { buffer, fisiere };
}

/** Numele proiectului, curatat pentru a fi folosit ca nume de fisier. */
function numeSigur(nume) {
  return String(nume || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // fara diacritice
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

module.exports = { construieste, numeSigur, separaStilurile };
