import { createTree, createPerson, validateTree, upsertPerson, addRelative, linkPeople, getFamilyLinkSuggestion, getParentSuggestions, deletePerson, displayName, getGenerations, getTreeGenerations, demoTree } from './domain.js';
import { loadTree, saveTree, downloadFile, safeFilename, STORAGE_KEY } from './storage.js';
import { escapeHtml as e, formatDate, lifespan, formatAgeAtDeath, reportMarkup, reportDocument, treePrintMarkup, fitTreePrintText, originalNamesMarkup, labelsMarkup } from './report.js';

import { familyConnections, connectionMarkup, connectionGap } from './tree-layout.js';

const app = document.querySelector('#app');
const editor = document.querySelector('#editor');
let tree;
let loadError = '';
try { tree = loadTree(); } catch { tree = createTree(); loadError = 'Die lokale Speicherung ist nicht lesbar oder nicht verfügbar. Sichere zuerst die Rohdaten. Über „Sicherung öffnen“ kannst du anschließend eine gültige Sicherung zur Wiederherstellung einlesen. Bestehende Daten bleiben bis zur bestätigten Wiederherstellung erhalten.'; }
let view = 'tree';
let expandedTree = false;
let printOptionsOpen = false;
let selectedId = tree.people[0]?.id;
let selectedIds = new Set(selectedId ? [selectedId] : []);
let selectionAnchor = selectedId;
let multipleSelection = false;
let query = '';
let undoTree = null;
let toastTimer;
let includeTreeIndex, includeLabels, singlePageTree, treePaper, hiddenPersonIds, highlightPersonId;
syncPrintOptions();

function syncPrintOptions() {
  ({ includeTreeIndex, includeLabels, singlePageTree, treePaper, highlightPersonId } = tree.printOptions);
  hiddenPersonIds = new Set(tree.printOptions.hiddenPersonIds);
}

function savePrintOptions(changes) {
  if (loadError) throw new Error(loadError);
  tree = saveTree({ ...tree, printOptions: { ...tree.printOptions, ...changes } });
  syncPrintOptions();
  undoTree = null;
}
const printSelectionOption = () => action('printSelection', `Personen für Druck auswählen (${tree.people.filter(p => !hiddenPersonIds.has(p.id)).length}/${tree.people.length})`, 'secondary small');
const treePrintOptions = () => `<fieldset class="tree-print-options"><legend>Baumdruck</legend>
  <label class="print-index-option"><input type="checkbox" id="print-tree-single" ${singlePageTree ? 'checked' : ''} aria-describedby="tree-print-hint"> Gesamten Baum auf eine Seite</label>
  <label class="print-index-option">Papier <select id="print-tree-paper"><option value="A4" ${treePaper === 'A4' ? 'selected' : ''}>A4 quer</option><option value="A3" ${treePaper === 'A3' ? 'selected' : ''}>A3 quer</option></select></label>
  <label class="print-index-option"><input type="checkbox" id="print-tree-index" ${includeTreeIndex ? 'checked' : ''}> Verzeichnis im PDF</label>
  <label class="print-lineage-option">Direkten Strang hervorheben <select id="print-tree-lineage" aria-describedby="tree-lineage-hint"><option value="">Keine Hervorhebung</option>${[...tree.people].sort((a, b) => displayName(a).localeCompare(displayName(b), 'de')).map(person => `<option value="${e(person.id)}" ${highlightPersonId === person.id ? 'selected' : ''}>${e(displayName(person))} (${e(lifespan(person))})${person.birthPlace ? ` · ${e(person.birthPlace)}` : ''}</option>`).join('')}</select></label>
  <p id="tree-lineage-hint">Markiert die Person sowie alle direkten Vorfahren und Nachkommen mit kräftigen Kartenrändern und Linien. Ausgeblendete Personen bleiben ausgeblendet.</p>
  <p id="tree-print-hint">Eine Seite: Bei großen Bäumen wird die Schrift klein; A3 bietet mehr Platz. Verzeichnis, lange Labels und Beziehungen über Generationsgrenzen können zusätzliche Anhangseiten erzeugen.</p>
  </fieldset>`;
const labelOption = () => `<label class="print-index-option"><input type="checkbox" id="include-labels" ${includeLabels ? "checked" : ""}> Labels ausgeben</label>`;
const printControls = () => `<details class="print-controls" ${printOptionsOpen ? 'open' : ''}><summary>Druck / PDF</summary><div class="print-controls-body">
  <fieldset class="print-content-options"><legend>Inhalt</legend>${printSelectionOption()}${labelOption()}</fieldset>
  ${view === 'report' ? '' : treePrintOptions()}
  <div class="print-actions">${action('print', view === 'report' ? 'Chronik drucken / PDF' : 'Baum drucken / PDF', 'primary')}${view === 'report' ? action('html', 'Dokument herunterladen', 'secondary') : ''}</div>
  </div></details>`;
const personById = id => tree.people.find(p => p.id === id);
const icon = name => ({ tree: '♧', people: '☷', report: '▤', plus: '+', backup: '↓', import: '↑' })[name];
const action = (name, label, classes = 'secondary', extra = '') => `<button type="button" class="button ${classes}" data-action="${name}" ${extra}>${label}</button>`;
const initials = person => e([(person.nickname || person.firstName)[0], person.lastName[0]].filter(Boolean).join('') || '?');
const nameLinks = ids => ids.map(id => `<button class="text-link" data-person="${e(id)}">${e(displayName(personById(id)))}</button>`).join(', ');

function notify(message) {
  const toast = document.querySelector('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
}

function commit(next, message, recovery = false) {
  if (loadError && !recovery) throw new Error(loadError);
  tree = saveTree(next);
  syncPrintOptions();
  loadError = '';
  // Undo restores a snapshot, so later changes must invalidate that snapshot.
  undoTree = null;
  if (!personById(selectedId)) selectedId = tree.people[0]?.id;
  selectedIds = new Set([...selectedIds].filter(id => personById(id)));
  if (!personById(selectionAnchor)) selectionAnchor = undefined;
  render();
  if (message) notify(message);
}

function personCard(person) {
  return `<button class="person-card ${selectedIds.has(person.id) ? 'selected' : ''}" data-person="${e(person.id)}" data-node="${e(person.id)}" aria-pressed="${selectedIds.has(person.id)}">
    <span class="avatar">${initials(person)}</span><span class="person-name">${e(displayName(person))}</span>${originalNamesMarkup(person)}
    ${person.birthName ? `<span class="person-meta">geb. ${e(person.birthName)}</span>` : ''}<span class="person-dates">${e(lifespan(person))}</span>
    ${includeLabels ? labelsMarkup(person) : ''}<span class="person-meta">${e(person.birthPlace || 'Geburtsort offen')}</span>
    ${person.parentIds.length ? `<span class="tree-card-footer">Eltern: ${person.parentIds.map(id => e(displayName(personById(id)))).join(' &amp; ')}</span>` : ''}
    ${person.partnerIds.length ? `<span class="person-meta">♡ ${person.partnerIds.map(id => e(displayName(personById(id)))).join(', ')}</span>` : ''}
  </button>`;
}

function detailPanel() {
  const person = personById(selectedId);
  if (!person) return `<aside class="detail-panel"><div class="empty-state"><h2>Jede Geschichte beginnt mit einem Menschen.</h2><p>Füge die erste Person hinzu. Eltern, Kinder und Partnerschaften kannst du anschließend verbinden.</p>${action('add', '+ Erste Person', 'primary')}</div></aside>`;
  const children = tree.people.filter(p => p.parentIds.includes(person.id));
  return `<aside class="detail-panel" aria-label="Personendetails"><div class="panel-header"><span class="eyebrow">PERSON IM FOKUS</span>${action('edit', 'Bearbeiten', 'ghost small')}</div>
    <div class="detail-content"><span class="avatar large">${initials(person)}</span><h2>${e(displayName(person))}</h2>${originalNamesMarkup(person)}${person.birthName ? `<p class="muted">geborene/r ${e(person.birthName)}</p>` : ''}
    ${labelsMarkup(person)}<dl class="person-facts"><dt>Geboren</dt><dd>${e(formatDate(person.birthDate))}${person.birthPlace ? `<br>${e(person.birthPlace)}` : ''}</dd>
    ${person.deathDate || person.deathPlace ? `<dt>Gestorben</dt><dd>${e(formatDate(person.deathDate))}${person.deathPlace ? `<br>${e(person.deathPlace)}` : ''}${formatAgeAtDeath(person) ? `<br><span class="death-age">Alter: ${e(formatAgeAtDeath(person))}</span>` : ''}</dd>` : ''}</dl>
    <div class="detail-section"><h3>Verbindungen</h3><p><span class="muted">Eltern</span><br>${nameLinks(person.parentIds) || 'Noch nicht erfasst'}</p><p><span class="muted">Partnerschaften</span><br>${nameLinks(person.partnerIds) || 'Noch nicht erfasst'}</p><p><span class="muted">Kinder</span><br>${nameLinks(children.map(p => p.id)) || 'Noch nicht erfasst'}</p><div class="relative-actions">${person.parentIds.length < 2 ? action('parent', '+ Elternteil hinzufügen', 'secondary small') : ''}${action('partner', '+ Partnerschaft hinzufügen', 'secondary small')}${action('child', '+ Kind hinzufügen', 'secondary small')}</div></div>
    ${person.notes ? `<div class="detail-section"><h3>Erinnerungen</h3><p class="preserve-lines">${e(person.notes)}</p></div>` : ''}${person.sources ? `<div class="detail-section"><h3>Quellen</h3><p class="preserve-lines">${e(person.sources)}</p></div>` : ''}
    <div class="detail-section">${action('delete', 'Person löschen', 'danger small')}</div></div></aside>`;
}

function emptyState() {
  return `<div class="empty-state welcome"><span class="welcome-tree" aria-hidden="true">♧</span><p class="eyebrow">PLATZ FÜR DEINE GESCHICHTE</p><h2>Aus Namen werden Wurzeln.</h2><p>Halte fest, woher du kommst. Beginne mit dir selbst oder mit einem Menschen, an den du dich gerne erinnerst.</p><div class="empty-actions">${action('add', '+ Erste Person anlegen', 'primary')}${action('demo', 'Beispiel erkunden', 'secondary')}</div><small>Das Beispiel enthält ausschließlich erfundene Personen.</small></div>`;
}

function workspace() {
  if (!tree.people.length) return emptyState();
  const filtered = tree.people.filter(p => [displayName(p), `${p.firstName} ${p.lastName}`, p.birthName, p.birthPlace].join(' ').toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')));
  const content = view === 'people' || query ? `<div class="person-list">${filtered.length ? filtered.sort((a,b) => displayName(a).localeCompare(displayName(b), 'de')).map(p => `<button class="list-person ${selectedIds.has(p.id) ? 'selected' : ''}" data-person="${e(p.id)}" aria-pressed="${selectedIds.has(p.id)}"><span class="avatar">${initials(p)}</span><span><strong>${e(displayName(p))}</strong>${originalNamesMarkup(p)}${includeLabels ? labelsMarkup(p) : ''}<small>${e(lifespan(p))} · ${e(p.birthPlace || 'Ort offen')}</small></span><span aria-hidden="true">→</span></button>`).join('') : '<div class="empty-state"><h3>Keine Person gefunden</h3><p>Versuche einen anderen Namen oder Geburtsort.</p></div>'}</div>` : `<div class="tree-scroll"><div class="tree-canvas"><svg class="tree-lines" aria-hidden="true"></svg>${getTreeGenerations(tree).map((generation, index, generations) => `<section class="generation-group" data-generation="${index}" style="padding-bottom:${generations[index + 1] ? connectionGap(generations[index + 1]) : 0}px"><p class="generation-label">GENERATION ${String(index + 1).padStart(2, '0')}</p><div class="generation">${generation.map(personCard).join('')}</div></section>`).join('')}</div></div>`;
  return `<div class="workspace"><section class="tree-panel"><div class="panel-header"><h2>${view === 'people' || query ? 'Personenverzeichnis' : 'Deine Familie im Überblick'}</h2><span class="muted">${view === 'people' || query ? `${filtered.length} Einträge` : 'Ältere Generationen oben'}</span></div>${selectionToolbar()}${content}<p class="tree-hint">${view === 'tree' && !query ? 'Gemeinsame Linien bündeln Eltern und Geschwister; Punkte markieren Verzweigungen. Wähle eine Person, um ihre Familienlinien hervorzuheben. Eltern über mehrere Generationen stehen als Verweis auf der Karte. Die Generation folgt den erfassten Eltern; ohne Elternangaben orientiert sie sich an Partnerschaften.' : 'Wähle eine Person, um ihre Geschichte und Verbindungen zu sehen.'}</p></section>${detailPanel()}</div>`;
}

function selectionToolbar() {
  const visible = new Set((view === 'people' || query
    ? tree.people.filter(p => [displayName(p), `${p.firstName} ${p.lastName}`, p.birthName, p.birthPlace].join(' ').toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')))
    : tree.people).map(p => p.id));
  const hidden = [...selectedIds].filter(id => !visible.has(id)).length;
  return `<div class="selection-toolbar no-print" aria-label="Personenauswahl">
    <span role="status">${selectedIds.size} ausgewählt${hidden ? ` · ${hidden} außerhalb der Ansicht` : ''}</span>
    <div class="selection-actions">${action('multiple', 'Mehrfachauswahl', 'secondary small', `aria-pressed="${multipleSelection}"`)}${action('clearSelection', 'Auswahl aufheben', 'ghost small', selectedIds.size ? '' : 'disabled')}${action('linkPartners', 'Verpartnern', 'secondary small', selectedIds.size === 2 ? '' : 'disabled')}${action('linkFamily', 'Als Eltern / Kinder verknüpfen', 'secondary small', selectedIds.size >= 2 ? '' : 'disabled')}</div>
    <small>Strg/⌘ + Klick: einzeln umschalten. Shift + Klick: Bereich in sichtbarer Reihenfolge. Im Mehrfachauswahl-Modus genügt Klick oder Enter/Leertaste. Für eine Partnerschaft genau zwei Personen wählen.</small>
  </div>`;
}

function selectPerson(button, event) {
  const id = button.dataset.person;
  const isCard = button.matches('.person-card, .list-person');
  const visibleIds = [...app.querySelectorAll('.person-card, .list-person')].map(node => node.dataset.person);
  if (isCard && event.shiftKey && visibleIds.includes(selectionAnchor)) {
    const from = visibleIds.indexOf(selectionAnchor);
    const to = visibleIds.indexOf(id);
    const range = visibleIds.slice(Math.min(from, to), Math.max(from, to) + 1);
    selectedIds = new Set(event.ctrlKey || event.metaKey || multipleSelection ? [...selectedIds, ...range] : range);
  } else if (isCard && (event.ctrlKey || event.metaKey || multipleSelection)) {
    if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
    selectionAnchor = id;
  } else {
    selectedIds = new Set([id]);
    selectionAnchor = id;
  }
  selectedId = id;
  render();
  app.querySelector(`.person-card[data-person="${CSS.escape(id)}"], .list-person[data-person="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
}

function linkSelection(type) {
  const ids = [...selectedIds];
  if (type === 'partner') {
    if (ids.length !== 2) return;
    confirmChange('Ausgewählte Personen verpartnern?', ids.map(id => displayName(personById(id))).join(' und ') + ' werden als Paar verbunden. Bestehende Partnerschaften bleiben erhalten.', 'Partnerschaft speichern', () => commit(linkPeople(tree, { partnerIds: ids }), 'Partnerschaft gespeichert.'));
    return;
  }
  if (ids.length < 2) return;
  const suggestion = getFamilyLinkSuggestion(tree, ids);
  showDialog(`<form><div class="dialog-header"><h2 id="dialog-title">Eltern und Kinder zuordnen</h2><button type="button" class="button ghost" data-close aria-label="Schließen">✕</button></div><div class="dialog-body"><p>Wähle für jede ausgewählte Person eine Rolle: ein oder zwei Elternteile und mindestens ein Kind. Alle gewählten Eltern werden mit allen gewählten Kindern verbunden. Bestehende Eltern bleiben erhalten; Partnerschaften werden separat erfasst.</p><div class="notice error" role="alert" hidden></div><div class="family-roles">${ids.map(id => `<label class="field"><span>${e(displayName(personById(id)))}</span><select name="role-${e(id)}" required><option value="">Rolle wählen …</option><option value="parent">Elternteil</option><option value="child">Kind</option></select></label>`).join('')}</div></div><div class="dialog-actions"><button type="button" class="button secondary" data-close-secondary>Abbrechen</button><button type="submit" class="button primary">Verknüpfungen speichern</button></div></form>`, data => {
    const parentIds = ids.filter(id => data.get(`role-${id}`) === 'parent');
    const childIds = ids.filter(id => data.get(`role-${id}`) === 'child');
    commit(linkPeople(tree, { parentIds, childIds }), 'Eltern und Kinder verknüpft.');
    editor.close();
  });
  editor.querySelector('[data-close-secondary]').onclick = requestCloseEditor;
  const hint = document.createElement('p');
  hint.className = 'field-hint';
  hint.textContent = suggestion
    ? 'Aus zwei benachbarten Generationen vorgeschlagen: oben Eltern, darunter Kinder. Bitte prüfen und bei Bedarf ändern. Erst beim Speichern werden die Beziehungen hergestellt.'
    : 'Aus der Auswahl lässt sich keine eindeutige, gültige Zuordnung über zwei benachbarte Generationen vorschlagen. Bitte die Rollen selbst wählen.';
  editor.querySelector('.family-roles').before(hint);
  if (suggestion) {
    for (const select of editor.querySelectorAll('.family-roles select')) {
      select.value = suggestion.parentIds.includes(select.name.slice('role-'.length)) ? 'parent' : 'child';
    }
  }
}

function render() {
  printOptionsOpen = app.querySelector('.print-controls')?.open ?? printOptionsOpen;
  const oldScroll = document.querySelector('.tree-scroll');
  const scrollPosition = oldScroll ? [oldScroll.scrollLeft, oldScroll.scrollTop] : null;
  const generations = getGenerations(tree);
  app.innerHTML = `<div class="app-shell ${view === 'tree' ? 'tree-view' : ''} ${expandedTree && view === 'tree' && tree.people.length ? 'tree-expanded' : ''}"><aside class="sidebar no-print"><a class="brand" href="/" aria-label="Wurzelwerk Start"><img class="brand-mark" src="/favicon.svg" alt=""><span>Wurzelwerk<small>Deine Familiengeschichte</small></span></a><div class="sidebar-label">MEIN FAMILIENARCHIV</div><nav aria-label="Ansichten">${[['tree','Stammbaum'],['people','Personen'],['report','Familienchronik']].map(([key,label]) => `<button class="nav-button ${view === key ? 'active' : ''}" data-view="${key}" ${view === key ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon(key)}</span>${label}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="privacy-badge"><span aria-hidden="true">◉</span> Nur auf diesem Rechner</div><p>Deine Geschichte gehört dir.<br>Ohne Konto. Ohne Cloud.</p>${action('backup', '↓ Sicherung speichern', 'sidebar-action')}${action('import', '↑ Sicherung öffnen', 'sidebar-action')}${action('new', 'Neuer Stammbaum', 'sidebar-action')}<small>Browserdaten sind kein Backup.<br>Sichere deine Arbeit regelmäßig.</small></div></aside>
    <main class="main"><header class="page-header no-print"><div><p class="eyebrow">VERGANGENHEIT BEWAHREN. VERBINDUNGEN ENTDECKEN.</p><h1>${e(tree.title)}</h1><p class="page-subtitle">${view === 'report' ? 'Eine Familiengeschichte zum Aufbewahren und Weitergeben.' : 'Jeder Mensch ein Kapitel. Gemeinsam eine Geschichte.'}</p></div><div class="header-actions">${action('rename', 'Titel ändern', 'ghost')}${view === 'report' ? '' : action('add', '+ Person hinzufügen', 'primary')}</div></header>
    ${loadError ? `<div class="notice error no-print" role="alert">${e(loadError)} ${action('raw', 'Rohdaten sichern', 'secondary small')}</div>` : ''}
    <section class="stats no-print" aria-label="Stammbaum in Zahlen"><div class="stat"><span class="stat-value">${tree.people.length}</span><span>Menschen im Stammbaum</span></div><div class="stat"><span class="stat-value">${generations.length}</span><span>erfasste Generationen</span></div><div class="stat"><span class="stat-value">${new Set(tree.people.map(p => p.birthPlace).filter(Boolean)).size}</span><span>Geburtsorte</span></div><div class="stat privacy-stat"><span class="stat-value">Lokal.</span><span>Deine Daten bleiben bei dir</span></div></section>
    ${view === 'report' ? `<div class="toolbar no-print"><p>Die Chronik enthält die für den Druck gewählten Personen mit Beziehungen, Erinnerungen und Quellen.</p>${printControls()}</div>${tree.people.length ? reportMarkup(tree, { includeLabels, hiddenPersonIds }) : emptyState()}` : `<div class="toolbar view-toolbar no-print"><div class="view-controls"><div class="view-tabs" aria-label="Darstellung">${[['tree','Stammbaum'],['people','Alle Personen']].map(([key,label]) => `<button class="view-tab ${view === key ? 'active' : ''}" data-view="${key}">${label}</button>`).join('')}</div>${view === 'tree' && tree.people.length ? action('expandTree', expandedTree ? 'Ansicht verkleinern' : 'Baum vergrößern', 'secondary small', `aria-pressed="${expandedTree}" title="Große Baumansicht; mit Escape verlassen"`) : ''}</div><label class="search-field"><span aria-hidden="true">⌕</span><input id="search" aria-label="Personen durchsuchen" placeholder="Name oder Geburtsort suchen …" value="${e(query)}"></label>${printControls()}</div>${workspace()}`}
    <footer class="app-footer no-print"><span>WURZELWERK</span><span>${loadError ? 'Speicherung prüfen' : 'Änderungen werden in diesem Browser lokal gespeichert.'}</span>${undoTree ? action('undo', 'Letzte Löschung rückgängig', 'ghost small') : ''}</footer></main></div>`;
  if (view === 'tree' && !query) requestAnimationFrame(() => {
    const scroll = document.querySelector('.tree-scroll');
    if (scroll && scrollPosition) { scroll.scrollLeft = scrollPosition[0]; scroll.scrollTop = scrollPosition[1]; }
    drawConnections();
  });
}

function drawConnections() {
  const canvas = document.querySelector('.tree-canvas');
  if (!canvas) return;
  const svg = canvas.querySelector('svg');
  const origin = canvas.getBoundingClientRect();
  svg.setAttribute('width', String(canvas.scrollWidth));
  svg.setAttribute('height', String(canvas.scrollHeight));
  const cards = new Map([...canvas.querySelectorAll('[data-node]')].map(node => {
    const bounds = node.getBoundingClientRect();
    return [node.dataset.node, { x: bounds.x - origin.x, y: bounds.y - origin.y,
      width: bounds.width, height: bounds.height, row: Number(node.closest('[data-generation]').dataset.generation) }];
  }));
  svg.innerHTML = connectionMarkup(familyConnections(tree, cards), selectedId);
}

function showDialog(markup, onSubmit) {
  const opener = document.activeElement;
  const openerAction = opener?.dataset.action;
  editor.addEventListener('close', () => {
    const target = opener?.isConnected ? opener
      : (openerAction && app.querySelector(`[data-action="${CSS.escape(openerAction)}"]:not(:disabled)`))
        || (selectedId && app.querySelector(`.person-card[data-person="${CSS.escape(selectedId)}"], .list-person[data-person="${CSS.escape(selectedId)}"]`));
    target?.focus({ preventScroll: true });
  }, { once: true });
  editor.innerHTML = markup;
  editor.dataset.dirty = '';
  editor.showModal();
  editor.querySelector('[data-close]')?.addEventListener('click', requestCloseEditor);
  editor.querySelector('form')?.addEventListener('submit', event => {
    event.preventDefault();
    try { onSubmit(new FormData(event.currentTarget)); }
    catch (error) { const box = editor.querySelector('[role="alert"]'); box.textContent = error.message; box.hidden = false; }
  });
}

function editPerson(person = createPerson(), relationship = null) {
  const field = (key, label, hint = '') => `<label class="field"><span>${label}</span><input name="${key}" value="${e(person[key])}" maxlength="${key.endsWith('Date') ? 10 : 500}" ${hint ? `placeholder="${hint}"` : ''}></label>`;
  const options = tree.people.filter(p => p.id !== person.id).sort((a,b) => displayName(a).localeCompare(displayName(b), 'de'));
  showDialog(`<form class="person-editor"><div class="dialog-header"><div><p class="eyebrow">EIN STÜCK FAMILIENGESCHICHTE</p><h2 id="dialog-title">${relationship ? ({ parent: 'Elternteil hinzufügen', partner: 'Partnerschaft hinzufügen', child: 'Kind hinzufügen' })[relationship.type] : personById(person.id) ? 'Person bearbeiten' : 'Person hinzufügen'}</h2></div><button type="button" class="button ghost" data-close aria-label="Schließen">✕</button></div><div class="dialog-actions"><button type="button" class="button secondary" data-close-secondary>Abbrechen</button><button class="button primary" type="submit">Person speichern</button></div><div class="dialog-body"><p>${relationship ? `Neue Person als ${{ parent: 'Elternteil', partner: 'Partnerperson', child: 'Kind' }[relationship.type]} von <strong>${e(displayName(personById(relationship.id)))}</strong> anlegen. Diese Verbindung ist vorausgewählt und wird beim Speichern hergestellt. ` : ''}Ein Vor- oder Nachname genügt. Alles andere darf offen bleiben.</p><div class="notice error" role="alert" hidden></div><div class="form-grid">${field('firstName','Vorname(n)')}${field('lastName','Nachname')}${field('nickname','Spitzname (optional)')}${field('birthName','Geburtsname')}${field('birthDate','Geburtsdatum','z. B. 21.03.1948 oder 1948')}${field('birthPlace','Geburtsort')}${field('deathDate','Sterbedatum','z. B. 21.03.1948 oder 1948')}${field('deathPlace','Sterbeort')}</div><p class="field-hint">Ein Spitzname ersetzt die Vornamen in der Anzeige; die Vornamen bleiben klein darunter erhalten.</p><p class="field-hint">Datumsformat: TT.MM.JJJJ, JJJJ, JJJJ-MM oder JJJJ-MM-TT. Ein leeres Sterbedatum sagt nichts über den Lebensstatus aus.</p>
    <fieldset class="relationship-fieldset"><legend>Eltern <small>(höchstens zwei)</small></legend><label class="field"><span>Eltern nach Namen suchen</span><input type="search" id="parent-search" placeholder="Name eingeben …"></label><p class="field-hint">Nach Auswahl eines Elternteils: bekannte Partner zuerst, danach Personen derselben Generation. Vorschläge bitte selbst prüfen.</p><div id="parent-options" class="relationship-options"></div><p id="parent-status" class="field-hint" role="status"></p></fieldset>
    <fieldset class="relationship-fieldset"><legend>Partnerschaften</legend><div class="relationship-options">${options.length ? options.map(p => `<label><input type="checkbox" name="partnerIds" value="${e(p.id)}" ${person.partnerIds.includes(p.id) ? 'checked' : ''}> ${e(displayName(p))}</label>`).join('') : '<p>Noch keine weiteren Personen erfasst.</p>'}</div></fieldset>
    <label class="field"><span>Labels (optional, ein Label pro Zeile)</span><textarea name="labels" rows="3" maxlength="1219" aria-describedby="labels-hint" placeholder="z. B. Krieg">${e(person.labels.join("\n"))}</textarea></label><p id="labels-hint" class="field-hint">Bis zu 20 Labels mit je 60 Zeichen. Beispiel: „Krieg“ für eine Person, die im Krieg war. Details und Belege kannst du unter Erinnerungen und Quellen festhalten.</p><label class="field"><span>Erinnerungen & Biografie</span><textarea name="notes" rows="4" maxlength="20000" placeholder="Was macht diesen Menschen unvergesslich?">${e(person.notes)}</textarea></label><label class="field"><span>Quellen & Forschungsnotizen</span><textarea name="sources" rows="3" maxlength="20000" placeholder="z. B. Familienbuch, Urkunde, Gespräch …">${e(person.sources)}</textarea></label></div></form>`, data => {
      const nextPerson = { ...person, ...Object.fromEntries([...data].filter(([key]) => !['parentIds','partnerIds','labels'].includes(key))), labels: data.get('labels').split(/\r?\n/).map(label => label.trim()).filter(Boolean), parentIds: data.getAll('parentIds'), partnerIds: data.getAll('partnerIds') };
      const next = relationship ? addRelative(tree, nextPerson, relationship.id, relationship.type) : upsertPerson(tree, nextPerson);
      commit(next, 'Person gespeichert.');
      selectedId = person.id;
      selectedIds = new Set([person.id]);
      selectionAnchor = person.id;
      render();
      editor.close();
    });
  editor.querySelector('[data-close-secondary]').onclick = requestCloseEditor;
  const selectedParents = new Set(person.parentIds);
  const parentOptions = editor.querySelector('#parent-options');
  const parentSearch = editor.querySelector('#parent-search');
  function updateParentOptions(focusedId) {
    const suggestions = getParentSuggestions(tree, [...selectedParents], person.id);
    const suggested = new Set(suggestions.map(p => p.id));
    const ordered = [...options.filter(p => selectedParents.has(p.id)), ...suggestions, ...options.filter(p => !selectedParents.has(p.id) && !suggested.has(p.id))];
    const search = parentSearch.value.trim().toLocaleLowerCase('de');
    const matches = ordered.filter(p => selectedParents.has(p.id) || [displayName(p), `${p.firstName} ${p.lastName}`].join(' ').toLocaleLowerCase('de').includes(search));
    parentOptions.innerHTML = matches.map(p => `<label><input type="checkbox" name="parentIds" value="${e(p.id)}" ${selectedParents.has(p.id) ? 'checked' : ''} ${(relationship?.type === 'child' && p.id === relationship.id) || (selectedParents.size >= 2 && !selectedParents.has(p.id)) ? 'disabled' : ''}> <span>${e(displayName(p))}${suggested.has(p.id) ? '<small class="parent-suggestion">Vorschlag</small>' : ''}</span></label>`).join('');
    editor.querySelector('#parent-status').textContent = `${selectedParents.size} von 2 Elternteilen ausgewählt.${matches.length ? '' : ' Keine passenden Personen gefunden.'}`;
    if (focusedId) [...parentOptions.querySelectorAll('input')].find(input => input.value === focusedId)?.focus({ preventScroll: true });
  }
  parentOptions.addEventListener('change', event => {
    const input = event.target;
    if (input.checked) selectedParents.add(input.value); else selectedParents.delete(input.value);
    updateParentOptions(input.value);
  });
  parentSearch.addEventListener('input', () => updateParentOptions());
  if (relationship?.type === 'partner') {
    const linkedPartner = [...editor.querySelectorAll('[name="partnerIds"]')].find(input => input.value === relationship.id);
    if (linkedPartner) linkedPartner.disabled = true;
  }
  updateParentOptions();
}

function confirmChange(title, description, label, callback) {
  showDialog(`<form><div class="dialog-header"><h2 id="dialog-title">${e(title)}</h2></div><div class="dialog-body"><p>${e(description)}</p><div class="notice error" role="alert" hidden></div></div><div class="dialog-actions"><button type="button" class="button secondary" data-close>Abbrechen</button><button type="submit" class="button primary">${e(label)}</button></div></form>`, () => { callback(); editor.close(); });
}

async function importBackup(file) {
  if (!file) return;
  try {
    if (file.size > 25 * 1024 * 1024) throw new Error('Die Datei ist zu groß. Maximal 25 MB sind erlaubt.');
    const next = validateTree(JSON.parse(await file.text()));
    confirmChange('Sicherung öffnen?', `„${next.title}“ mit ${next.people.length} Personen ersetzt den aktuellen Stammbaum. ${loadError ? 'Der bisherige lokale Speicher ist nicht lesbar. Lade vor dem Ersetzen die Rohdaten herunter, wenn du sie noch nicht gesichert hast.' : 'Speichere deine bisherige Arbeit vorher als Sicherung.'}`, 'Stammbaum öffnen', () => { commit(next, 'Sicherung geöffnet.', true); undoTree = null; render(); });
  } catch (error) { notify(error instanceof SyntaxError ? 'Diese Datei enthält kein gültiges JSON.' : error.message); }
}

function editPrintSelection() {
  const hidden = new Set(hiddenPersonIds);
  const people = [...tree.people].sort((a, b) => displayName(a).localeCompare(displayName(b), 'de'));
  showDialog(`<form><div class="dialog-header"><h2 id="dialog-title">Personen für Druck auswählen</h2></div>
    <div class="dialog-body"><p>Nur angehakte Personen erscheinen in Baumdruck, Chronik und HTML-Dokument. Die Auswahl wird mit dem Stammbaum lokal gespeichert. Alle Personen bleiben gespeichert. Beziehungen zu ausgeblendeten Personen entfallen in der Ausgabe; Freitexte bleiben unverändert.</p>
    <label class="field"><span>Personen suchen</span><input type="search" id="print-person-search" placeholder="Name suchen …"></label>
    <div class="print-selection-actions"><button type="button" class="button secondary small" id="print-select-all">Alle einblenden</button><button type="button" class="button ghost small" id="print-select-none">Alle ausblenden</button></div>
    <p id="print-selection-count" role="status"></p><div id="print-person-options" class="relationship-options print-person-options"></div>
    <div class="notice error" role="alert" hidden></div></div>
    <div class="dialog-actions"><button type="button" class="button secondary" data-close>Abbrechen</button><button class="button primary" type="submit">Auswahl übernehmen</button></div></form>`, () => {
      savePrintOptions({ hiddenPersonIds: [...hidden] });
      render();
      editor.close();
    });
  const options = editor.querySelector('#print-person-options');
  const search = editor.querySelector('#print-person-search');
  function update() {
    const query = search.value.trim().toLocaleLowerCase('de');
    const matches = people.filter(p => [displayName(p), p.firstName, p.lastName].join(' ').toLocaleLowerCase('de').includes(query));
    options.innerHTML = matches.map(p => `<label><input type="checkbox" value="${e(p.id)}" ${hidden.has(p.id) ? '' : 'checked'}><span>${e(displayName(p))} · ${e(lifespan(p))}</span></label>`).join('') || '<p>Keine passenden Personen gefunden.</p>';
    editor.querySelector('#print-selection-count').textContent = `${people.filter(p => !hidden.has(p.id)).length} von ${people.length} Personen im Druck. Die Schaltflächen gelten für alle Personen, auch außerhalb der Suche.`;
  }
  search.addEventListener('input', update);
  options.addEventListener('change', event => {
    if (event.target.checked) hidden.delete(event.target.value); else hidden.add(event.target.value);
    editor.querySelector('#print-selection-count').textContent = `${people.filter(p => !hidden.has(p.id)).length} von ${people.length} Personen im Druck. Die Schaltflächen gelten für alle Personen, auch außerhalb der Suche.`;
  });
  editor.querySelector('#print-select-all').onclick = () => { hidden.clear(); editor.dataset.dirty = 'true'; update(); };
  editor.querySelector('#print-select-none').onclick = () => { people.forEach(p => hidden.add(p.id)); editor.dataset.dirty = 'true'; update(); };
  update();
}

const actions = {
  printSelection: editPrintSelection,
  expandTree: () => {
    expandedTree = !expandedTree;
    render();
    app.querySelector('[data-action="expandTree"]')?.focus({ preventScroll: true });
  },
  multiple: () => { multipleSelection = !multipleSelection; render(); app.querySelector('[data-action="multiple"]')?.focus(); },
  clearSelection: () => { selectedIds.clear(); selectionAnchor = undefined; render(); app.querySelector('[data-action="multiple"]')?.focus(); },
  linkPartners: () => linkSelection('partner'),
  linkFamily: () => linkSelection('family'),
  add: () => editPerson(),
  edit: () => editPerson(personById(selectedId)),
  child: () => editPerson(createPerson({ lastName: personById(selectedId).lastName, parentIds: [selectedId] }), { type: 'child', id: selectedId }),
  partner: () => editPerson(createPerson({ partnerIds: [selectedId] }), { type: 'partner', id: selectedId }),
  parent: () => editPerson(createPerson(), { type: 'parent', id: selectedId }),
  backup: () => { if (loadError) { actions.raw(); return; } downloadFile(JSON.stringify(tree, null, 2), `${safeFilename(tree.title)}-${new Date().toISOString().slice(0,10)}.json`, 'application/json'); notify('Sicherung heruntergeladen. Bewahre sie an einem sicheren Ort auf.'); },
  raw: () => { const raw = localStorage.getItem(STORAGE_KEY); if (raw) downloadFile(raw, 'Wurzelwerk-Rohdaten.json', 'application/json'); else notify('Keine gespeicherten Rohdaten verfügbar.'); },
  import: () => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.onchange = () => importBackup(input.files[0]); input.click(); },
  html: () => downloadFile(reportDocument(tree, { includeLabels, hiddenPersonIds }), `${safeFilename(tree.title)}-Chronik.html`, 'text/html;charset=utf-8'),
  print: () => window.print(),
  demo: () => confirmChange('Beispiel erkunden?', 'Ein erfundener Stammbaum mit sieben Personen zeigt dir die Möglichkeiten. Er wird lokal gespeichert.', 'Beispiel laden', () => commit(demoTree(), 'Fiktives Beispiel geladen.', false)),
  new: () => confirmChange('Neuen Stammbaum beginnen?', 'Der aktuelle Stammbaum wird in diesem Browser ersetzt. Lade vorher eine Sicherung herunter, wenn du ihn behalten möchtest.', 'Leeren Stammbaum anlegen', () => { commit(createTree(), 'Neuer Stammbaum angelegt.', false); undoTree = null; render(); }),
  rename: () => showDialog(`<form><div class="dialog-header"><h2 id="dialog-title">Dein Familientitel</h2></div><div class="dialog-body"><label class="field"><span>Titel des Stammbaums</span><input name="title" required maxlength="200" value="${e(tree.title)}"></label><div class="notice error" role="alert" hidden></div></div><div class="dialog-actions"><button type="button" class="button secondary" data-close>Abbrechen</button><button type="submit" class="button primary">Titel speichern</button></div></form>`, data => { commit({ ...tree, title: data.get('title') }, 'Titel gespeichert.'); editor.close(); }),
  delete: () => confirmChange('Person löschen?', `${displayName(personById(selectedId))} und alle Verbindungen zu dieser Person werden entfernt. Die anderen Personen bleiben erhalten.`, 'Person löschen', () => { const previous = tree; commit(deletePerson(tree, selectedId), 'Person gelöscht. Du kannst die Löschung unten rückgängig machen.'); undoTree = previous; render(); }),
  undo: () => { commit(undoTree, 'Löschung rückgängig gemacht.'); undoTree = null; render(); },
};

app.addEventListener('click', event => {
  const printControls = app.querySelector('.print-controls');
  if (printControls?.open && !printControls.contains(event.target)) printControls.open = false;
  const button = event.target.closest('button');
  if (!button) return;
  try {
    if (button.dataset.view) { view = button.dataset.view; query = ''; render(); }
    else if (button.dataset.person) {
      selectPerson(button, event);
    }
    else if (button.dataset.action) actions[button.dataset.action]?.();
  } catch (error) { notify(error.message); }
});

app.addEventListener('change', event => {
  const key = { 'include-labels': 'includeLabels', 'print-tree-index': 'includeTreeIndex', 'print-tree-single': 'singlePageTree', 'print-tree-paper': 'treePaper', 'print-tree-lineage': 'highlightPersonId' }[event.target.id];
  if (!key) return;
  try {
    savePrintOptions({ [key]: ['treePaper', 'highlightPersonId'].includes(key) ? event.target.value : event.target.checked });
  } catch (error) { notify(error.message); }
  render();
  app.querySelector(`#${event.target.id}`)?.focus();
});

app.addEventListener('input', event => {
  if (event.target.id !== 'search') return;
  const position = event.target.selectionStart;
  query = event.target.value;
  render();
  const search = document.querySelector('#search');
  search.focus(); search.setSelectionRange(position, position);
});
window.addEventListener('keydown', event => {
  const printControls = app.querySelector('.print-controls[open]');
  if (event.key === 'Escape' && !editor.open && printControls) {
    event.preventDefault();
    printControls.open = false;
    printControls.querySelector('summary').focus({ preventScroll: true });
    return;
  }
  if (event.key === 'Escape' && !editor.open && app.querySelector('.tree-expanded')) {
    event.preventDefault();
    actions.expandTree();
  }
});
window.addEventListener('resize', drawConnections);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) notify('Änderung in einem anderen Fenster erkannt. Bitte diese Seite neu laden, bevor du weiter speicherst.'); });
function requestCloseEditor() {
  if (!editor.dataset.dirty || window.confirm('Ungespeicherte Eingaben verwerfen?')) editor.close();
}
editor.addEventListener('input', () => { editor.dataset.dirty = 'true'; });
editor.addEventListener('cancel', event => { event.preventDefault(); requestCloseEditor(); });
window.addEventListener('beforeunload', event => { if (editor.open && editor.dataset.dirty) { event.preventDefault(); event.returnValue = ''; } });
let printFocus = null;
function restorePrintFocus() {
  if (window.matchMedia('print').matches) return;
  if (printFocus?.isConnected) printFocus.focus({ preventScroll: true });
  printFocus = null;
}
window.addEventListener('beforeprint', () => {
  if (view === 'report' || document.querySelector('#tree-print-output')) return;
  printFocus = document.activeElement;
  const output = document.createElement('div');
  output.id = 'tree-print-output';
  output.innerHTML = treePrintMarkup(tree, { includeIndex: includeTreeIndex, includeLabels, hiddenPersonIds, singlePage: singlePageTree, paper: treePaper, highlightPersonId });
  output.style.cssText = 'display:block;position:fixed;visibility:hidden;pointer-events:none';
  document.body.append(output);
  fitTreePrintText(output);
  output.removeAttribute('style');
  document.body.classList.add('printing-tree');
});
window.addEventListener('afterprint', () => {
  document.querySelector('#tree-print-output')?.remove();
  document.body.classList.remove('printing-tree');
  restorePrintFocus();
});
window.matchMedia('print').addEventListener('change', event => {
  if (!event.matches) restorePrintFocus();
});
render();
