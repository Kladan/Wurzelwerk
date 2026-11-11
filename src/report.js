import { displayName, getGenerations, getTreeGenerations, treeForPrint, directLineIds, ageAtDeath } from './domain.js';
import { familyConnections, connectionMarkup, connectionGap } from './tree-layout.js';

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
export function formatAgeAtDeath(person) {
  const age = ageAtDeath(person);
  if (!age) return '';
  if (age.unit === 'days' && age.max === 0) return 'unter 1 Tag';
  const units = { years: ['Jahr', 'Jahre'], months: ['Monat', 'Monate'], days: ['Tag', 'Tage'] };
  const amount = age.min === age.max ? String(age.min) : `${age.min}–${age.max}`;
  return `${amount} ${units[age.unit][age.min === 1 && age.max === 1 ? 0 : 1]}`;
}
export function lifespan(person, { includeAge = true } = {}) {
  const birth = person.birthDate?.slice(0, 4);
  const death = person.deathDate?.slice(0, 4);
  if (birth && death) return `${birth} – ${death}${includeAge && formatAgeAtDeath(person) ? ` · ${formatAgeAtDeath(person)}` : ''}`;
  if (birth) return `geb. ${birth}`;
  if (death) return `gest. ${death}`;
  return 'Lebensdaten offen';
}
export function reportMarkup(tree, { includeLabels = false, hiddenPersonIds = [] } = {}) {
  const total = tree.people.length;
  tree = treeForPrint(tree, hiddenPersonIds);
  const isExcerpt = tree.people.length < total;
  const people = getGenerations(tree).flat();
  const numbers = new Map(people.map((person, index) => [person.id, index + 1]));
  const names = ids => ids.map(id => {
    const person = people.find(p => p.id === id);
    return `${escapeHtml(displayName(person))} <span class="report-reference">[${numbers.get(id)}]</span>`;
  }).join(', ');
  return `<article class="report" aria-label="Familienchronik">
    <header class="report-cover"><p class="eyebrow">WURZELWERK · FAMILIENCHRONIK</p><h1>${escapeHtml(tree.title)}</h1><p>Menschen, Verbindungen und Erinnerungen.</p><p>${people.length} Personen · Erstellt am ${new Date().toLocaleDateString('de-DE')}</p></header>
    ${isExcerpt ? '<p>Auszug: Ausgeblendete Personen und ihre Beziehungen sind nicht enthalten. Freitexte bleiben unverändert.</p>' : ''}
    <section class="report-index"><h2>Personenverzeichnis</h2><p>Die Nummern verbinden die Einträge mit ihren Angehörigen. Unbekannte Angaben bleiben offen.</p><ol>${people.map(person => `<li><a href="#report-${numbers.get(person.id)}">${escapeHtml(displayName(person))}</a> <span>${escapeHtml(lifespan(person))}</span>${originalNamesMarkup(person)}</li>`).join('')}</ol></section>
    ${getGenerations(tree).map((generation, index) => `<section class="report-family"><h2>Generation ${index + 1}</h2>${generation.map(person => `<section class="report-person" id="report-${numbers.get(person.id)}"><h3><span>${numbers.get(person.id)}.</span> ${escapeHtml(displayName(person))}</h3>${originalNamesMarkup(person)}
      ${person.birthName ? `<p>Geburtsname: ${escapeHtml(person.birthName)}</p>` : ''}
      ${includeLabels ? labelsMarkup(person) : ''}
      <p>Geboren: ${escapeHtml(formatDate(person.birthDate))}${person.birthPlace ? ` in ${escapeHtml(person.birthPlace)}` : ''}</p>
      ${person.deathDate || person.deathPlace ? `<p>Gestorben: ${escapeHtml(formatDate(person.deathDate))}${person.deathPlace ? ` in ${escapeHtml(person.deathPlace)}` : ''}${formatAgeAtDeath(person) ? ` · Alter: ${escapeHtml(formatAgeAtDeath(person))}` : ''}</p>` : ''}
      <p>Eltern: ${names(person.parentIds) || (isExcerpt ? 'nicht erfasst oder für diese Ausgabe ausgeblendet' : 'nicht erfasst')}</p>
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

function printLabelLines(value) {
  let remaining = Array.from(value);
  const lines = [];
  while (remaining.length && lines.length < 2) {
    let end = Math.min(26, remaining.length);
    if (remaining.length > 26 && !lines.length) {
      const space = remaining.slice(0, 27).lastIndexOf(' ');
      if (space >= 12) end = space;
      if (remaining[end - 1] === '·' && remaining[end - 2] === ' ') end -= 2;
    }
    lines.push(remaining.slice(0, end).join('').trim());
    // A line break separates labels without leaving their separator on its own.
    const separatorBreak = remaining.slice(end, end + 3).join('') === ' · ';
    remaining = Array.from(remaining.slice(end + (separatorBreak ? 3 : 0)).join('').trimStart());
  }
  if (remaining.length) lines[lines.length - 1] += '…';
  return { lines, truncated: remaining.length > 0 };
}

// Eight compact cards by four generations fit an A4 landscape tree sheet.
// Page boundaries always fall between cards; the index is an optional appendix.
export function treePrintMarkup(tree, { includeIndex = false, includeLabels = false, singlePage = false, paper = 'A4', hiddenPersonIds = [], highlightPersonId = '' } = {}) {
  const highlightedIds = directLineIds(tree, highlightPersonId);
  const highlightPerson = tree.people.find(person => person.id === highlightPersonId);
  const total = tree.people.length;
  tree = treeForPrint(tree, hiddenPersonIds);
  const isExcerpt = tree.people.length < total;
  const generations = getTreeGenerations(tree);
  const birthNameText = person => person.birthName && person.birthName !== person.lastName ? `geb. ${person.birthName}` : '';
  const labelText = person => includeLabels ? (person.labels ?? []).join(' · ') : '';
  const layouts = new Map(tree.people.map(person => {
    const shorten = (value, limit) => {
      const chars = Array.from(value);
      return chars.slice(0, limit).join('') + (chars.length > limit ? '…' : '');
    };
    const name = Array.from(displayName(person));
    const rows = [name.slice(0, 21).join(''), shorten(name.slice(21).join(''), 21)].filter(Boolean)
      .map(text => ({ text, className: 'name', size: 18 }));
    const add = (text, className, size = 15) => { if (text) rows.push({ text, className, size }); };
    if (person.nickname && person.firstName) add(shorten(person.firstName, 26), 'original');
    add(shorten(birthNameText(person), 26), 'birth-name');
    if (person.birthDate || person.deathDate) add(lifespan(person, { includeAge: false }), 'dates');
    add(formatAgeAtDeath(person), 'age');
    const labels = printLabelLines(labelText(person));
    labels.lines.forEach(line => add(line, 'labels', 14));
    let baseline = 27;
    rows.forEach((row, index) => {
      if (index) baseline += row.className === 'name' ? 27 : row.className === 'labels' && rows[index - 1].className === 'labels' ? 22 : 24;
      row.baseline = baseline;
    });
    return [person.id, { rows, labels, contentHeight: baseline + 14, height: Math.max(118, baseline + 14) }];
  }));
  const rowHeights = generations.map(generation => Math.max(118, ...generation.map(person => layouts.get(person.id).height)));
  const rowsPerPage = singlePage ? Math.max(1, generations.length) : 4;
  const columnsPerPage = singlePage ? Math.max(8, ...generations.map(g => g.length)) : 8;
  const pageWidth = columnsPerPage * 200;
  const rowTops = [0];
  for (let row = 0; row < generations.length; row++) {
    // Bound print corridors so a very wide generation cannot shrink every tile.
    // The screen keeps full lane spacing; paper compacts crowded connections.
    rowTops.push(rowTops[row] + rowHeights[row] + Math.max(102, Math.min(176, connectionGap(generations[row + 1]))));
  }
  const nodes = new Map();
  const pages = [];
  const pageByTile = new Map();
  for (let row = 0; row < generations.length; row += rowsPerPage) {
    const widest = Math.max(...generations.slice(row, row + rowsPerPage).map(g => g.length));
    for (let col = 0; col < Math.ceil(widest / columnsPerPage); col++) {
      const page = { row, col, cards: [], number: pages.length + 1 };
      pages.push(page);
      pageByTile.set(`${row}:${col}`, page);
    }
    generations.slice(row, row + rowsPerPage).forEach((generation, offset) => {
      const start = Math.floor((Math.max(columnsPerPage, widest) - generation.length) / 2);
      generation.forEach((person, index) => {
        const column = start + index;
        const page = pageByTile.get(`${row}:${Math.floor(column / columnsPerPage)}`);
        const node = { person, row: row + offset,
          x: column * 200 + 7, y: rowTops[row + offset] + 28,
          width: 186, height: rowHeights[row + offset], page: page.number };
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
  const printedLabels = person => labelText(person) ? `<span class="print-labels">Labels: ${escapeHtml(labelText(person))}</span>` : "";
  const personLabel = person => `${escapeHtml(displayName(person))}${birthNameText(person) ? ` · ${escapeHtml(birthNameText(person))}` : ''}${printLife(person) ? ` (${escapeHtml(printLife(person))})` : ''}${originalNamesMarkup(person)}${printedLabels(person)}`;
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
  const connections = familyConnections(tree, nodes, highlightedIds);
  const header = label => `<header><p>WURZELWERK · STAMMBAUM</p><h1>${escapeHtml(tree.title)}</h1><p>${label}</p>${isExcerpt ? '<p>Auszug: Ausgeblendete Personen und ihre Beziehungen sind nicht enthalten.</p>' : ''}</header>`;
  const appendix = includeIndex || !nodes.size ? `<section class="tree-print-index">${header('Personenverzeichnis')}
    ${nodes.size ? `<ul>${[...nodes.values()].map(node => `<li><strong>${personLabel(node.person)}</strong> · ${location(node)}${node.person.parentIds.length ? `<br>Eltern: ${refs(node.person.parentIds)}` : ''}${node.person.partnerIds.length ? `<br>Partnerschaften: ${refs(node.person.partnerIds)}` : ''}</li>`).join('')}</ul>` : (isExcerpt ? '<p>Alle Personen sind für diese Ausgabe ausgeblendet.</p>' : '<p>Noch keine Personen erfasst.</p>')}
    </section>` : disconnected.length ? `<section class="tree-print-index tree-print-continuations">${header('Verbindungen über Blatt- und Generationsgrenzen')}
    <p>Diese Elternbeziehungen lassen sich nicht vollständig durch Linien auf einem Baumblatt zeigen.</p>
    <ul>${disconnected.map(({ person }) => `<li><strong>${reference(person.id)}</strong><br>Eltern: ${refs(person.parentIds)}</li>`).join('')}</ul></section>` : '';
  return `<article class="tree-print${singlePage ? ' tree-print-single' : ''}${paper === 'A3' ? ' tree-print-a3' : ''}" aria-label="Stammbaum zum Drucken">${pages.map(({ row, col, cards, number }) => {
    const endRow = Math.min(row + rowsPerPage, generations.length);
    const pageHeight = singlePage ? rowTops[endRow] - rowTops[row] - 60
      : rowTops[endRow] - rowTops[row] + (rowsPerPage - (endRow - row)) * 220;
    const visible = connections.filter(group => group.routeIds.some(id => nodes.get(id)?.page === number));
    return `<section class="tree-print-page">${header(`Baumblatt ${number} von ${pages.length} · Generation ${row + 1}–${Math.min(row + rowsPerPage, generations.length)}${singlePage ? ' · Gesamtbaum' : ` · Spalte ${col + 1}`}`)}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${col * pageWidth} ${rowTops[row]} ${pageWidth} ${pageHeight}" role="img" aria-label="Personen und Familienlinien auf Baumblatt ${number}">
      ${connectionMarkup(visible, null, { x: col * pageWidth, y: rowTops[row], width: pageWidth, height: pageHeight })}
      ${Array.from({ length: Math.min(rowsPerPage, generations.length - row) }, (_, i) => row + i).filter(r => cards.some(node => node.row === r)).map(r => `<text class="tree-print-generation" x="${col * pageWidth + 7}" y="${rowTops[r] + 17}" font-size="13">Generation ${r + 1}</text>`).join('')}
      ${cards.map(({ person, x, y, height }) => {
        const layout = layouts.get(person.id);
        const original = person.nickname && person.firstName ? person.firstName : '';
        const age = formatAgeAtDeath(person);
        const offset = (height - layout.contentHeight) / 2;
        return `<g class="tree-print-card${highlightedIds.has(person.id) ? ' lineage-highlight' : ''}"><title>${escapeHtml(displayName(person))}${original ? ` · Vorname(n): ${escapeHtml(original)}` : ''}${birthNameText(person) ? ` · ${escapeHtml(birthNameText(person))}` : ''}${age ? ` · Alter: ${escapeHtml(age)}` : ''}</title><rect x="${x}" y="${y}" width="186" height="${height}" rx="15"/>
          ${layout.rows.map(row => `<text class="tree-print-${row.className}" x="${x + 93}" y="${y + offset + row.baseline}" text-anchor="middle" font-size="${row.size}" data-fit-width="154">${escapeHtml(row.text)}</text>`).join('')}</g>`;
      }).join('')}</svg>
      <p class="tree-print-legend">Linien verbinden Eltern und Kinder.${highlightPerson ? ` Kräftige Ränder und Linien: direkter Strang von ${tree.people.some(person => person.id === highlightPersonId) ? escapeHtml(displayName(highlightPerson)) : 'einer ausgeblendeten Bezugsperson'} (Person, Vorfahren und Nachkommen).` : ''}${includeLabels && cards.some(({ person }) => layouts.get(person.id).labels.truncated) ? ' Labels mit … sind gekürzt; vollständige Labels stehen im Anhang.' : ''}${cards.some(({ person }) => person.nickname && person.firstName) ? ' Bei Spitznamen stehen die Vornamen klein darunter.' : ''}${disconnected.length ? ' Verbindungen über Blatt- und Generationsgrenzen stehen im Anhang.' : ''}${cards.some(({ person }) => Array.from(displayName(person)).length > 42 || Array.from(birthNameText(person)).length > 26 || (person.nickname && Array.from(person.firstName).length > 26)) ? ' Namen mit … sind gekürzt.' : ''}${includeIndex ? ' Vollständige Namen und Partnerschaften im Verzeichnis.' : ''}</p></section>`;
  }).join('')}${appendix}${includeLabels && !includeIndex && [...nodes.values()].some(({ person }) => layouts.get(person.id).labels.truncated) ? `<section class="tree-print-index">${header('Vollständige Labels der gedruckten Personen')}<p>Diese Personen sind im Baum enthalten. Ihre Labels sind auf den Karten gekürzt und stehen hier vollständig.</p><ul>${[...nodes.values()].filter(({ person }) => layouts.get(person.id).labels.truncated).map(node => `<li>${reference(node.person.id)}</li>`).join('')}</ul></section>` : ''}</article>`;
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
