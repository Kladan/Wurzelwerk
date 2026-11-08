import { displayName, getGenerations, getTreeGenerations } from './domain.js';
import { familyConnections, connectionMarkup } from './tree-layout.js';

export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const originalNamesMarkup = person => person.nickname && person.firstName
  ? `<small class="original-names">Vorname(n): ${escapeHtml(person.firstName)}</small>` : '';
export const labelsMarkup = person => person.labels?.length
  ? `<span class="person-labels" aria-label="Labels">${person.labels.map(label => `<span class="person-label">${escapeHtml(label)}</span>`).join('')}</span>` : '';
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
export function reportMarkup(tree, { includeLabels = false } = {}) {
  const people = getGenerations(tree).flat();
  const numbers = new Map(people.map((person, index) => [person.id, index + 1]));
  const names = ids => ids.map(id => {
    const person = people.find(p => p.id === id);
    return `${escapeHtml(displayName(person))} <span class="report-reference">[${numbers.get(id)}]</span>`;
  }).join(', ');
  return `<article class="report" aria-label="Familienchronik">
    <header class="report-cover"><p class="eyebrow">WURZELWERK · FAMILIENCHRONIK</p><h1>${escapeHtml(tree.title)}</h1><p>Menschen, Verbindungen und Erinnerungen.</p><p>${people.length} Personen · Erstellt am ${new Date().toLocaleDateString('de-DE')}</p></header>
    <section class="report-index"><h2>Personenverzeichnis</h2><p>Die Nummern verbinden die Einträge mit ihren Angehörigen. Unbekannte Angaben bleiben offen.</p><ol>${people.map(person => `<li><a href="#report-${numbers.get(person.id)}">${escapeHtml(displayName(person))}</a> <span>${escapeHtml(lifespan(person))}</span>${originalNamesMarkup(person)}</li>`).join('')}</ol></section>
    ${getGenerations(tree).map((generation, index) => `<section class="report-family"><h2>Generation ${index + 1}</h2>${generation.map(person => `<section class="report-person" id="report-${numbers.get(person.id)}"><h3><span>${numbers.get(person.id)}.</span> ${escapeHtml(displayName(person))}</h3>${originalNamesMarkup(person)}
      ${person.birthName ? `<p>Geburtsname: ${escapeHtml(person.birthName)}</p>` : ''}
      ${includeLabels ? labelsMarkup(person) : ''}
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

export function reportDocument(tree, options = {}) {
  return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(tree.title)}</title><style>body{font:11pt/1.6 Georgia,serif;color:#233d32;max-width:180mm;margin:20mm auto;padding:0 12mm}h1{font-size:34pt}h2{border-bottom:1px solid #bac8bd;padding-bottom:8px}h3{font-size:17pt}h4,p{margin:6px 0}.original-names{display:block;font-size:9pt;overflow-wrap:anywhere;font-weight:400}.report-cover{padding:30mm 0;break-after:page}.report-index{break-after:page}a{color:inherit}.report-person{break-inside:avoid;margin-bottom:25px}.preserve-lines{white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:20mm;font-size:9pt}.report-reference{font-size:9pt}.person-labels{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.person-label{border:1px solid #bac8bd;border-radius:8px;padding:1px 6px;overflow-wrap:anywhere;max-width:100%;font-size:9pt}@page{size:A4;margin:18mm}@media print{body{margin:0;padding:0}h2{break-after:avoid}}</style>${reportMarkup(tree, options)}</html>`;
}

// Eight compact cards by four generations fit an A4 landscape tree sheet.
// Page boundaries always fall between cards; the index is an optional appendix.
export function treePrintMarkup(tree, { includeIndex = false, includeLabels = false } = {}) {
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
        const node = { person, row: row + offset,
          x: column * 200 + 7, y: (row + offset) * 220 + 28,
          width: 186, height: 118, page: page.number };
        nodes.set(person.id, node); page.cards.push(node);
      });
    });
  }
  for (const page of pages) {
    const counts = new Map();
    for (const node of page.cards) {
      node.position = (counts.get(node.row) ?? 0) + 1;
      counts.set(node.row, node.position);
    }
  }
  const printLife = person => person.birthDate || person.deathDate ? lifespan(person) : '';
  const labelText = person => includeLabels ? (person.labels ?? []).join(" · ") : "";
  const printedLabels = person => labelText(person) ? `<span class="print-labels">Labels: ${escapeHtml(labelText(person))}</span>` : "";
  const personLabel = person => `${escapeHtml(displayName(person))}${printLife(person) ? ` (${escapeHtml(printLife(person))})` : ''}${originalNamesMarkup(person)}${printedLabels(person)}`;
  const location = node => `Baumblatt ${node.page}, Generation ${node.row + 1}, Karte ${node.position} von links`;
  const reference = id => {
    const node = nodes.get(id);
    return `${personLabel(node.person)} · ${location(node)}`;
  };
  const refs = ids => ids.map(reference).join('; ');
  const disconnected = [...nodes.values()].filter(node => node.person.parentIds.some(id => {
    const parent = nodes.get(id);
    return parent.page !== node.page || parent.row !== node.row - 1;
  }));
  const connections = familyConnections(tree, nodes);
  const header = label => `<header><p>WURZELWERK · STAMMBAUM</p><h1>${escapeHtml(tree.title)}</h1><p>${label}</p></header>`;
  const appendix = includeIndex || !nodes.size ? `<section class="tree-print-index">${header('Personenverzeichnis')}
    ${nodes.size ? `<ul>${[...nodes.values()].map(node => `<li><strong>${personLabel(node.person)}</strong> · ${location(node)}${node.person.parentIds.length ? `<br>Eltern: ${refs(node.person.parentIds)}` : ''}${node.person.partnerIds.length ? `<br>Partnerschaften: ${refs(node.person.partnerIds)}` : ''}</li>`).join('')}</ul>` : '<p>Noch keine Personen erfasst.</p>'}
    </section>` : disconnected.length ? `<section class="tree-print-index tree-print-continuations">${header('Verbindungen über Blatt- und Generationsgrenzen')}
    <p>Diese Elternbeziehungen lassen sich nicht vollständig durch Linien auf einem Baumblatt zeigen.</p>
    <ul>${disconnected.map(({ person }) => `<li><strong>${reference(person.id)}</strong><br>Eltern: ${refs(person.parentIds)}</li>`).join('')}</ul></section>` : '';
  return `<article class="tree-print" aria-label="Stammbaum zum Drucken">${pages.map(({ row, col, cards, number }) => {
    const visible = connections.filter(group => group.routeIds.some(id => nodes.get(id)?.page === number));
    return `<section class="tree-print-page">${header(`Baumblatt ${number} von ${pages.length} · Generation ${row + 1}–${Math.min(row + 4, generations.length)} · Spalte ${col + 1}`)}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${col * 1600} ${row * 220} 1600 880" role="img" aria-label="Personen und Familienlinien auf Baumblatt ${number}">
      ${connectionMarkup(visible, null, { x: col * 1600, y: row * 220, width: 1600, height: 880 })}
      ${[row, row + 1, row + 2, row + 3].filter(r => cards.some(node => node.row === r)).map(r => `<text class="tree-print-generation" x="${col * 1600 + 7}" y="${r * 220 + 17}" font-size="13">Generation ${r + 1}</text>`).join('')}
      ${cards.map(({ person, x, y }) => {
        const name = Array.from(displayName(person));
        const lines = [name.slice(0, 21).join(''), name.slice(21, 42).join('') + (name.length > 42 ? '…' : '')];
        const life = printLife(person);
        const original = person.nickname && person.firstName ? person.firstName : '';
        const originalChars = Array.from(original);
        const originalLine = originalChars.slice(0, 26).join('') + (originalChars.length > 26 ? '…' : '');
        const labels = Array.from(labelText(person));
        const labelLine = labels.slice(0, 26).join("") + (labels.length > 26 ? "…" : "");
        const nameY = y + (labels.length ? 27 : original ? 31 : life ? 45 : 58) - (!original && lines[1] ? 7 : 0);
        return `<g class="tree-print-card"><title>${escapeHtml(displayName(person))}${original ? ` · Vorname(n): ${escapeHtml(original)}` : ''}</title><rect x="${x}" y="${y}" width="186" height="118" rx="15"/>
          ${lines.filter(Boolean).map((line, i) => `<text class="tree-print-name" x="${x + 93}" y="${nameY + i * 24}" text-anchor="middle" font-size="18" data-fit-width="154">${escapeHtml(line)}</text>`).join('')}
          ${original ? `<text class="tree-print-original" x="${x + 93}" y="${y + (labels.length ? 72 : 77)}" text-anchor="middle" font-size="15" data-fit-width="154">${escapeHtml(originalLine)}</text>` : ''}
          ${life ? `<text class="tree-print-dates" x="${x + 93}" y="${y + (labels.length ? 90 : 96)}" text-anchor="middle" font-size="15">${escapeHtml(life)}</text>` : ''}${labelLine ? `<text class="tree-print-labels" x="${x + 93}" y="${y + 109}" text-anchor="middle" font-size="14" data-fit-width="154">${escapeHtml(labelLine)}</text>` : ''}</g>`;
      }).join('')}</svg>
      <p class="tree-print-legend">Linien verbinden Eltern und Kinder.${includeLabels && cards.some(({ person }) => Array.from(labelText(person)).length > 26) ? ' Labels mit … sind gekürzt; vollständige Labels stehen im Anhang.' : ''}${cards.some(({ person }) => person.nickname && person.firstName) ? ' Bei Spitznamen stehen die Vornamen klein darunter.' : ''}${disconnected.length ? ' Verbindungen über Blatt- und Generationsgrenzen stehen im Anhang.' : ''}${cards.some(({ person }) => Array.from(displayName(person)).length > 42 || (person.nickname && Array.from(person.firstName).length > 26)) ? ' Namen mit … sind gekürzt.' : ''}${includeIndex ? ' Vollständige Namen und Partnerschaften im Verzeichnis.' : ''}</p></section>`;
  }).join('')}${appendix}${includeLabels && !includeIndex && [...nodes.values()].some(({ person }) => Array.from(labelText(person)).length > 26) ? `<section class="tree-print-index">${header('Vollständige Labels')}<ul>${[...nodes.values()].filter(({ person }) => labelText(person)).map(node => `<li>${reference(node.person.id)}</li>`).join('')}</ul></section>` : ''}</article>`;
}

// Keep natural letter spacing for ordinary names; shrink only actual overflow.
// The caller temporarily lays out the print root invisibly before opening print.
export function fitTreePrintText(root) {
  for (const text of root.querySelectorAll('[data-fit-width]')) {
    const width = Number(text.dataset.fitWidth);
    if (text.getComputedTextLength() > width) {
      text.setAttribute('textLength', String(width));
      text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
  }
}
