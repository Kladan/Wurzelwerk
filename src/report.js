import { displayName, getGenerations } from './domain.js';

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

// Fixed-size tiles keep cards legible, independently of viewport and tree size.
export function treePrintMarkup(tree) {
  const generations = getGenerations(tree);
  const people = generations.flat();
  const nodes = new Map();
  const pages = [];
  for (let row = 0; row < generations.length; row += 2) {
    const columns = Math.ceil(Math.max(...generations.slice(row, row + 2).map(g => g.length)) / 3);
    for (let col = 0; col < columns; col++) pages.push({ row, col });
  }
  generations.forEach((generation, row) => generation.forEach((person, col) => {
    nodes.set(person.id, { person, number: nodes.size + 1, x: col * 300 + 10, y: row * 230 + 40,
      page: pages.findIndex(page => page.row === row - row % 2 && page.col === Math.floor(col / 3)) + 1 });
  }));
  const refs = ids => ids.map(id => `[${nodes.get(id).number}]`).join(', ') || 'nicht erfasst';
  const edges = people.flatMap(child => child.parentIds.map(id => {
    const parent = nodes.get(id), node = nodes.get(child.id);
    const x1 = parent.x + 135, y1 = parent.y + 140, x2 = node.x + 135, y2 = node.y;
    return { parentPage: parent.page, childPage: node.page, markup: `<path d="M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}"/>` };
  }));
  const header = label => `<header><p>WURZELWERK · STAMMBAUM</p><h1>${escapeHtml(tree.title)}</h1><p>${label}</p></header>`;
  return `<article class="tree-print" aria-label="Stammbaum zum Drucken">${pages.map(({ row, col }, index) => {
    const cards = [...nodes.values()].filter(node => node.page === index + 1);
    return `<section class="tree-print-page">${header(`Baumblatt ${index + 1} von ${pages.length} · Zeile ${row / 2 + 1}, Spalte ${col + 1}`)}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${col * 900} ${row * 230} 900 460" role="img" aria-label="Personen und Elternlinien auf Baumblatt ${index + 1}">
      <g fill="none" stroke="#53674c" stroke-width="2">${edges.filter(edge => edge.parentPage === index + 1 || edge.childPage === index + 1).map(edge => edge.markup).join('')}</g>
      ${[row, row + 1].filter(r => generations[r]?.some((_, c) => Math.floor(c / 3) === col)).map(r => `<text x="${col * 900 + 10}" y="${r * 230 + 25}" font-size="14">Generation ${r + 1}</text>`).join('')}
      ${cards.map(({ person, number, x, y }) => {
        const name = Array.from(displayName(person));
        const lines = [name.slice(0, 27).join(''), name.slice(27, 54).join('') + (name.length > 54 ? '…' : '')];
        return `<g><title>[${number}] ${escapeHtml(displayName(person))}</title><rect x="${x}" y="${y}" width="270" height="140" rx="6" fill="white" stroke="#53674c"/>
          <text x="${x + 12}" y="${y + 23}" font-size="14">[${number}]</text>
          ${lines.map((line, i) => `<text x="${x + 12}" y="${y + 49 + i * 22}" font-size="17"${line ? ` textLength="${Math.min(240, Array.from(line).length * 9)}" lengthAdjust="spacingAndGlyphs"` : ''}>${escapeHtml(line)}</text>`).join('')}
          <text x="${x + 12}" y="${y + 99}" font-size="15">${escapeHtml(lifespan(person))}</text>
          <text x="${x + 12}" y="${y + 124}" font-size="14">Eltern: ${refs(person.parentIds)}</text></g>`;
      }).join('')}</svg>
      <p class="tree-print-legend">Linien verbinden Eltern und Kinder. Blattübergreifende Verbindungen über die Elternnummern zuordnen. [Nummern] gelten auf allen Blättern; vollständige Namen und Partnerschaften stehen im Verzeichnis.</p></section>`;
  }).join('')}
    <section class="tree-print-index">${header('Personenverzeichnis · Nummern und Baumblätter')}
    ${people.length ? `<ol>${[...nodes.values()].map(({ person, number, page }) => `<li value="${number}"><strong>${escapeHtml(displayName(person))}</strong> · ${escapeHtml(lifespan(person))} · Baumblatt ${page}<br>Eltern: ${refs(person.parentIds)} · Partnerschaften: ${refs(person.partnerIds)}</li>`).join('')}</ol>` : '<p>Noch keine Personen erfasst.</p>'}
    <p>Fehlende Angaben bleiben offen. Die Generation folgt den erfassten Eltern.</p></section></article>`;
}
