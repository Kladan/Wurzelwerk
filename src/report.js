import { displayName, getGenerations, getTreeGenerations } from './domain.js';
import { familyConnections, connectionMarkup } from './tree-layout.js';

export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function formatDate(value) {
  if (!value) return 'unbekannt';
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : parts.length === 2 ? `${parts[1]}.${parts[0]}` : value;
}
export function lifespan(person) {
  const birth = person.birthDate?.slice(0, 4);
  const death = person.deathDate?.slice(0, 4);
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `geb. ${birth}`;
  if (death) return `gest. ${death}`;
  return 'Lebensdaten offen';
}
export function reportMarkup(tree) {
  const people = getGenerations(tree).flat();
  const numbers = new Map(people.map((person, index) => [person.id, index + 1]));
  const names = ids => ids.map(id => {
    const person = people.find(p => p.id === id);
    return `${escapeHtml(displayName(person))} <span class="report-reference">[${numbers.get(id)}]</span>`;
  }).join(', ');
  return `<article class="report" aria-label="Familienchronik">
    <header class="report-cover"><p class="eyebrow">WURZELWERK · FAMILIENCHRONIK</p><h1>${escapeHtml(tree.title)}</h1><p>Menschen, Verbindungen und Erinnerungen.</p><p>${people.length} Personen · Erstellt am ${new Date().toLocaleDateString('de-DE')}</p></header>
    <section class="report-index"><h2>Personenverzeichnis</h2><p>Die Nummern verbinden die Einträge mit ihren Angehörigen. Unbekannte Angaben bleiben offen.</p><ol>${people.map(person => `<li><a href="#report-${numbers.get(person.id)}">${escapeHtml(displayName(person))}</a> <span>${escapeHtml(lifespan(person))}</span></li>`).join('')}</ol></section>
    ${getGenerations(tree).map((generation, index) => `<section class="report-family"><h2>Generation ${index + 1}</h2>${generation.map(person => `<section class="report-person" id="report-${numbers.get(person.id)}"><h3><span>${numbers.get(person.id)}.</span> ${escapeHtml(displayName(person))}</h3>
      ${person.birthName ? `<p>Geburtsname: ${escapeHtml(person.birthName)}</p>` : ''}
      <p>Geboren: ${escapeHtml(formatDate(person.birthDate))}${person.birthPlace ? ` in ${escapeHtml(person.birthPlace)}` : ''}</p>
      ${person.deathDate || person.deathPlace ? `<p>Gestorben: ${escapeHtml(formatDate(person.deathDate))}${person.deathPlace ? ` in ${escapeHtml(person.deathPlace)}` : ''}</p>` : ''}
      <p>Eltern: ${names(person.parentIds) || 'nicht erfasst'}</p>
      ${person.partnerIds.length ? `<p>Partnerschaften: ${names(person.partnerIds)}</p>` : ''}
      ${people.some(p => p.parentIds.includes(person.id)) ? `<p>Kinder: ${names(people.filter(p => p.parentIds.includes(person.id)).map(p => p.id))}</p>` : ''}
      ${person.notes ? `<h4>Erinnerungen & Biografie</h4><p class="preserve-lines">${escapeHtml(person.notes)}</p>` : ''}
      ${person.sources ? `<h4>Quellen</h4><p class="preserve-lines">${escapeHtml(person.sources)}</p>` : ''}
    </section>`).join('')}</section>`).join('')}
    <footer>Privat erstellte Familienchronik · Angaben nach dem eigenen Forschungsstand.</footer>
  </article>`;
}

export function reportDocument(tree) {
  return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(tree.title)}</title><style>body{font:11pt/1.6 Georgia,serif;color:#233d32;max-width:180mm;margin:20mm auto;padding:0 12mm}h1{font-size:34pt}h2{border-bottom:1px solid #bac8bd;padding-bottom:8px}h3{font-size:17pt}h4,p{margin:6px 0}.report-cover{padding:30mm 0;break-after:page}.report-index{break-after:page}a{color:inherit}.report-person{break-inside:avoid;margin-bottom:25px}.preserve-lines{white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:20mm;font-size:9pt}.report-reference{font-size:9pt}@page{size:A4;margin:18mm}@media print{body{margin:0;padding:0}h2{break-after:avoid}}</style>${reportMarkup(tree)}</html>`;
}

// Eight compact cards by four generations fit an A4 landscape tree sheet.
// Page boundaries always fall between cards; the index is an optional appendix.
export function treePrintMarkup(tree, { includeIndex = false } = {}) {
  const generations = getTreeGenerations(tree);
  const nodes = new Map();
  const pages = [];
  const pageByTile = new Map();
  for (let row = 0; row < generations.length; row += 4) {
    const widest = Math.max(...generations.slice(row, row + 4).map(g => g.length));
    for (let col = 0; col < Math.ceil(widest / 8); col++) {
      const page = { row, col, cards: [], number: pages.length + 1 };
      pages.push(page);
      pageByTile.set(`${row}:${col}`, page);
    }
    generations.slice(row, row + 4).forEach((generation, offset) => {
      const start = Math.floor((Math.max(8, widest) - generation.length) / 2);
      generation.forEach((person, index) => {
        const column = start + index;
        const page = pageByTile.get(`${row}:${Math.floor(column / 8)}`);
        const node = { person, number: nodes.size + 1, row: row + offset,
          x: column * 200 + 7, y: (row + offset) * 220 + 28,
          width: 186, height: 118, page: page.number };
        nodes.set(person.id, node); page.cards.push(node);
      });
    });
  }
  const refs = ids => ids.map(id => `[${nodes.get(id).number}]`).join(', ') || 'offen';
  const connections = familyConnections(tree, nodes);
  const header = label => `<header><p>WURZELWERK · STAMMBAUM</p><h1>${escapeHtml(tree.title)}</h1><p>${label}</p></header>`;
  const appendix = includeIndex || !nodes.size ? `<section class="tree-print-index">${header('Personenverzeichnis · Nummern und Baumblätter')}
    ${nodes.size ? `<ol>${[...nodes.values()].map(({ person, number, page }) => `<li value="${number}"><strong>${escapeHtml(displayName(person))}</strong> · ${escapeHtml(lifespan(person))} · Baumblatt ${page}<br>Eltern: ${refs(person.parentIds)} · Partnerschaften: ${refs(person.partnerIds)}</li>`).join('')}</ol>` : '<p>Noch keine Personen erfasst.</p>'}
    <p>Fehlende Angaben bleiben offen. Die Generation folgt den erfassten Eltern.</p></section>` : '';
  return `<article class="tree-print" aria-label="Stammbaum zum Drucken">${pages.map(({ row, col, cards, number }) => {
    const visible = connections.filter(group => group.routeIds.some(id => nodes.get(id)?.page === number));
    return `<section class="tree-print-page">${header(`Baumblatt ${number} von ${pages.length} · Generation ${row + 1}–${Math.min(row + 4, generations.length)} · Spalte ${col + 1}`)}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${col * 1600} ${row * 220} 1600 880" role="img" aria-label="Personen und Familienlinien auf Baumblatt ${number}">
      ${connectionMarkup(visible, null, { x: col * 1600, y: row * 220, width: 1600, height: 880 })}
      ${[row, row + 1, row + 2, row + 3].filter(r => cards.some(node => node.row === r)).map(r => `<text x="${col * 1600 + 7}" y="${r * 220 + 17}" font-size="12">Generation ${r + 1}</text>`).join('')}
      ${cards.map(({ person, number: reference, x, y }) => {
        const name = Array.from(displayName(person));
        const lines = [name.slice(0, 21).join(''), name.slice(21, 42).join('') + (name.length > 42 ? '…' : '')];
        return `<g><title>[${reference}] ${escapeHtml(displayName(person))}</title><rect x="${x}" y="${y}" width="186" height="118" rx="4" fill="white" stroke="#53674c"/>
          <text x="${x + 8}" y="${y + 16}" font-size="14">[${reference}]</text>
          ${lines.map((line, i) => `<text x="${x + 8}" y="${y + 39 + i * 21}" font-size="18"${line ? ` textLength="${Math.min(170, Array.from(line).length * 9)}" lengthAdjust="spacingAndGlyphs"` : ''}>${escapeHtml(line)}</text>`).join('')}
          <text x="${x + 8}" y="${y + 85}" font-size="15">${escapeHtml(lifespan(person))}</text>
          <text x="${x + 8}" y="${y + 107}" font-size="14">Eltern: ${refs(person.parentIds)}</text></g>`;
      }).join('')}</svg>
      <p class="tree-print-legend">Gemeinsame Linien bündeln Eltern und Geschwister; Punkte markieren Verzweigungen. Eltern über Blatt- oder Generationsgrenzen: [Nummern] auf den Karten. Namen mit … sind gekürzt.${includeIndex ? ' Vollständige Namen und Partnerschaften im Verzeichnis.' : ''}</p></section>`;
  }).join('')}${appendix}</article>`;
}
