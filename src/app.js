import { createTree, createPerson, validateTree, upsertPerson, deletePerson, displayName, getGenerations, demoTree } from './domain.js';
import { loadTree, saveTree, downloadFile, safeFilename, STORAGE_KEY } from './storage.js';
import { escapeHtml as e, formatDate, lifespan, reportMarkup, reportDocument, treePrintMarkup } from './report.js';

const app = document.querySelector('#app');
const editor = document.querySelector('#editor');
let tree;
let loadError = '';
try { tree = loadTree(); } catch { tree = createTree(); loadError = 'Die lokale Speicherung ist nicht lesbar oder nicht verfügbar. Sichere zuerst die Rohdaten. Über „Sicherung öffnen“ kannst du anschließend eine gültige Sicherung zur Wiederherstellung einlesen. Bestehende Daten bleiben bis zur bestätigten Wiederherstellung erhalten.'; }
let view = 'tree';
let selectedId = tree.people[0]?.id;
let query = '';
let undoTree = null;
let toastTimer;
const personById = id => tree.people.find(p => p.id === id);
const icon = name => ({ tree: '♧', people: '☷', report: '▤', plus: '+', backup: '↓', import: '↑' })[name];
const action = (name, label, classes = 'secondary', extra = '') => `<button type="button" class="button ${classes}" data-action="${name}" ${extra}>${label}</button>`;
const initials = person => e([person.firstName[0], person.lastName[0]].filter(Boolean).join('') || '?');
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
  loadError = '';
  // Undo restores a snapshot, so later changes must invalidate that snapshot.
  undoTree = null;
  if (!personById(selectedId)) selectedId = tree.people[0]?.id;
  render();
  if (message) notify(message);
}

function personCard(person) {
  return `<button class="person-card ${selectedId === person.id ? 'selected' : ''}" data-person="${e(person.id)}" data-node="${e(person.id)}" aria-pressed="${selectedId === person.id}">
    <span class="avatar">${initials(person)}</span><span class="person-name">${e(displayName(person))}</span>
    ${person.birthName ? `<span class="person-meta">geb. ${e(person.birthName)}</span>` : ''}<span class="person-dates">${e(lifespan(person))}</span>
    <span class="person-meta">${e(person.birthPlace || 'Geburtsort offen')}</span>
    ${person.parentIds.length ? `<span class="tree-card-footer">Eltern: ${person.parentIds.map(id => e(displayName(personById(id)))).join(' &amp; ')}</span>` : ''}
    ${person.partnerIds.length ? `<span class="person-meta">♡ ${person.partnerIds.map(id => e(displayName(personById(id)))).join(', ')}</span>` : ''}
  </button>`;
}

function detailPanel() {
  const person = personById(selectedId);
  if (!person) return `<aside class="detail-panel"><div class="empty-state"><h2>Jede Geschichte beginnt mit einem Menschen.</h2><p>Füge die erste Person hinzu. Eltern, Kinder und Partnerschaften kannst du anschließend verbinden.</p>${action('add', '+ Erste Person', 'primary')}</div></aside>`;
  const children = tree.people.filter(p => p.parentIds.includes(person.id));
  return `<aside class="detail-panel" aria-label="Personendetails"><div class="panel-header"><span class="eyebrow">PERSON IM FOKUS</span>${action('edit', 'Bearbeiten', 'ghost small')}</div>
    <div class="detail-content"><span class="avatar large">${initials(person)}</span><h2>${e(displayName(person))}</h2>${person.birthName ? `<p class="muted">geborene/r ${e(person.birthName)}</p>` : ''}
    <dl class="person-facts"><dt>Geboren</dt><dd>${e(formatDate(person.birthDate))}${person.birthPlace ? `<br>${e(person.birthPlace)}` : ''}</dd>
    ${person.deathDate || person.deathPlace ? `<dt>Gestorben</dt><dd>${e(formatDate(person.deathDate))}${person.deathPlace ? `<br>${e(person.deathPlace)}` : ''}</dd>` : ''}</dl>
    <div class="detail-section"><h3>Verbindungen</h3><p><span class="muted">Eltern</span><br>${nameLinks(person.parentIds) || 'Noch nicht erfasst'}</p><p><span class="muted">Partnerschaften</span><br>${nameLinks(person.partnerIds) || 'Noch nicht erfasst'}</p><p><span class="muted">Kinder</span><br>${nameLinks(children.map(p => p.id)) || 'Noch nicht erfasst'}</p>${action('child', '+ Kind hinzufügen', 'secondary small')}</div>
    ${person.notes ? `<div class="detail-section"><h3>Erinnerungen</h3><p class="preserve-lines">${e(person.notes)}</p></div>` : ''}${person.sources ? `<div class="detail-section"><h3>Quellen</h3><p class="preserve-lines">${e(person.sources)}</p></div>` : ''}
    <div class="detail-section">${action('delete', 'Person löschen', 'danger small')}</div></div></aside>`;
}

function emptyState() {
  return `<div class="empty-state welcome"><span class="welcome-tree" aria-hidden="true">♧</span><p class="eyebrow">PLATZ FÜR DEINE GESCHICHTE</p><h2>Aus Namen werden Wurzeln.</h2><p>Halte fest, woher du kommst. Beginne mit dir selbst oder mit einem Menschen, an den du dich gerne erinnerst.</p><div class="empty-actions">${action('add', '+ Erste Person anlegen', 'primary')}${action('demo', 'Beispiel erkunden', 'secondary')}</div><small>Das Beispiel enthält ausschließlich erfundene Personen.</small></div>`;
}

function workspace() {
  if (!tree.people.length) return emptyState();
  const filtered = tree.people.filter(p => [displayName(p), p.birthName, p.birthPlace].join(' ').toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')));
  const content = view === 'people' || query ? `<div class="person-list">${filtered.length ? filtered.sort((a,b) => displayName(a).localeCompare(displayName(b), 'de')).map(p => `<button class="list-person ${selectedId === p.id ? 'selected' : ''}" data-person="${e(p.id)}"><span class="avatar">${initials(p)}</span><span><strong>${e(displayName(p))}</strong><small>${e(lifespan(p))} · ${e(p.birthPlace || 'Ort offen')}</small></span><span aria-hidden="true">→</span></button>`).join('') : '<div class="empty-state"><h3>Keine Person gefunden</h3><p>Versuche einen anderen Namen oder Geburtsort.</p></div>'}</div>` : `<div class="tree-scroll"><div class="tree-canvas"><svg class="tree-lines" aria-hidden="true"></svg>${getGenerations(tree).map((generation, index) => `<section class="generation-group"><p class="generation-label">GENERATION ${String(index + 1).padStart(2, '0')}</p><div class="generation">${generation.map(personCard).join('')}</div></section>`).join('')}</div></div>`;
  return `<div class="workspace"><section class="tree-panel"><div class="panel-header"><h2>${view === 'people' || query ? 'Personenverzeichnis' : 'Deine Familie im Überblick'}</h2><span class="muted">${view === 'people' || query ? `${filtered.length} Einträge` : 'Ältere Generationen oben'}</span></div>${content}<p class="tree-hint">${view === 'tree' && !query ? 'Linien zeigen Eltern und Kinder. Die Generation folgt den erfassten Eltern; Partner können in verschiedenen Zeilen stehen.' : 'Wähle eine Person, um ihre Geschichte und Verbindungen zu sehen.'}</p></section>${detailPanel()}</div>`;
}

function render() {
  const oldScroll = document.querySelector('.tree-scroll');
  const scrollPosition = oldScroll ? [oldScroll.scrollLeft, oldScroll.scrollTop] : null;
  const generations = getGenerations(tree);
  app.innerHTML = `<div class="app-shell"><aside class="sidebar no-print"><a class="brand" href="/" aria-label="Wurzelwerk Start"><img class="brand-mark" src="/favicon.svg" alt=""><span>Wurzelwerk<small>Deine Familiengeschichte</small></span></a><div class="sidebar-label">MEIN FAMILIENARCHIV</div><nav aria-label="Ansichten">${[['tree','Stammbaum'],['people','Personen'],['report','Familienchronik']].map(([key,label]) => `<button class="nav-button ${view === key ? 'active' : ''}" data-view="${key}" ${view === key ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon(key)}</span>${label}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="privacy-badge"><span aria-hidden="true">◉</span> Nur auf diesem Rechner</div><p>Deine Geschichte gehört dir.<br>Ohne Konto. Ohne Cloud.</p>${action('backup', '↓ Sicherung speichern', 'sidebar-action')}${action('import', '↑ Sicherung öffnen', 'sidebar-action')}${action('new', 'Neuer Stammbaum', 'sidebar-action')}<small>Browserdaten sind kein Backup.<br>Sichere deine Arbeit regelmäßig.</small></div></aside>
    <main class="main"><header class="page-header no-print"><div><p class="eyebrow">VERGANGENHEIT BEWAHREN. VERBINDUNGEN ENTDECKEN.</p><h1>${e(tree.title)}</h1><p class="page-subtitle">${view === 'report' ? 'Eine Familiengeschichte zum Aufbewahren und Weitergeben.' : 'Jeder Mensch ein Kapitel. Gemeinsam eine Geschichte.'}</p></div><div class="header-actions">${action('rename', 'Titel ändern', 'ghost')}${view === 'report' ? action('print', 'Drucken / PDF', 'primary') : action('print', 'Baum drucken / PDF', 'secondary') + action('add', '+ Person hinzufügen', 'primary')}</div></header>
    ${loadError ? `<div class="notice error no-print" role="alert">${e(loadError)} ${action('raw', 'Rohdaten sichern', 'secondary small')}</div>` : ''}
    <section class="stats no-print" aria-label="Stammbaum in Zahlen"><div class="stat"><span class="stat-value">${tree.people.length}</span><span>Menschen im Stammbaum</span></div><div class="stat"><span class="stat-value">${generations.length}</span><span>erfasste Generationen</span></div><div class="stat"><span class="stat-value">${new Set(tree.people.map(p => p.birthPlace).filter(Boolean)).size}</span><span>Geburtsorte</span></div><div class="stat privacy-stat"><span class="stat-value">Lokal.</span><span>Deine Daten bleiben bei dir</span></div></section>
    ${view === 'report' ? `<div class="toolbar no-print"><p>Die Chronik enthält alle Personen, Beziehungen, Erinnerungen und Quellen.</p>${action('html', 'Dokument herunterladen', 'secondary')}</div>${tree.people.length ? reportMarkup(tree) : emptyState()}` : `<div class="toolbar no-print"><div class="view-tabs" aria-label="Darstellung">${[['tree','Stammbaum'],['people','Alle Personen']].map(([key,label]) => `<button class="view-tab ${view === key ? 'active' : ''}" data-view="${key}">${label}</button>`).join('')}</div><label class="search-field"><span aria-hidden="true">⌕</span><input id="search" aria-label="Personen durchsuchen" placeholder="Name oder Geburtsort suchen …" value="${e(query)}"></label></div>${workspace()}`}
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
  const cards = new Map([...canvas.querySelectorAll('[data-node]')].map(node => [node.dataset.node, node.getBoundingClientRect()]));
  const paths = [];
  for (const child of tree.people) for (const parentId of child.parentIds) {
    const parent = cards.get(parentId);
    const card = cards.get(child.id);
    if (!parent || !card) continue;
    const x1 = parent.x + parent.width / 2 - origin.x;
    const y1 = parent.bottom - origin.y;
    const x2 = card.x + card.width / 2 - origin.x;
    const y2 = card.top - origin.y;
    paths.push(`<path d="M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}"/>`);
  }
  svg.innerHTML = paths.join('');
}

function showDialog(markup, onSubmit) {
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

function editPerson(person = createPerson()) {
  const field = (key, label, hint = '') => `<label class="field"><span>${label}</span><input name="${key}" value="${e(person[key])}" maxlength="${key.endsWith('Date') ? 10 : 500}" ${hint ? `placeholder="${hint}"` : ''}></label>`;
  const options = tree.people.filter(p => p.id !== person.id).sort((a,b) => displayName(a).localeCompare(displayName(b), 'de'));
  showDialog(`<form><div class="dialog-header"><div><p class="eyebrow">EIN STÜCK FAMILIENGESCHICHTE</p><h2 id="dialog-title">${personById(person.id) ? 'Person bearbeiten' : 'Person hinzufügen'}</h2></div><button type="button" class="button ghost" data-close aria-label="Schließen">✕</button></div><div class="dialog-body"><p>Ein Vor- oder Nachname genügt. Alles andere darf offen bleiben.</p><div class="notice error" role="alert" hidden></div><div class="form-grid">${field('firstName','Vorname(n)')}${field('lastName','Nachname')}${field('birthName','Geburtsname')}${field('birthDate','Geburtsdatum','z. B. 1948 oder 1948-03-21')}${field('birthPlace','Geburtsort')}${field('deathDate','Sterbedatum','Jahr, Jahr-Monat oder Jahr-Monat-Tag')}${field('deathPlace','Sterbeort')}</div><p class="field-hint">Datumsformat: JJJJ, JJJJ-MM oder JJJJ-MM-TT. Ein leeres Sterbedatum sagt nichts über den Lebensstatus aus.</p>
    <fieldset class="relationship-fieldset"><legend>Eltern <small>(höchstens zwei)</small></legend><div class="relationship-options">${options.length ? options.map(p => `<label><input type="checkbox" name="parentIds" value="${e(p.id)}" ${person.parentIds.includes(p.id) ? 'checked' : ''}> ${e(displayName(p))}</label>`).join('') : '<p>Zuerst weitere Personen anlegen, dann hier verbinden.</p>'}</div></fieldset>
    <fieldset class="relationship-fieldset"><legend>Partnerschaften</legend><div class="relationship-options">${options.length ? options.map(p => `<label><input type="checkbox" name="partnerIds" value="${e(p.id)}" ${person.partnerIds.includes(p.id) ? 'checked' : ''}> ${e(displayName(p))}</label>`).join('') : '<p>Noch keine weiteren Personen erfasst.</p>'}</div></fieldset>
    <label class="field"><span>Erinnerungen & Biografie</span><textarea name="notes" rows="4" maxlength="20000" placeholder="Was macht diesen Menschen unvergesslich?">${e(person.notes)}</textarea></label><label class="field"><span>Quellen & Forschungsnotizen</span><textarea name="sources" rows="3" maxlength="20000" placeholder="z. B. Familienbuch, Urkunde, Gespräch …">${e(person.sources)}</textarea></label></div><div class="dialog-actions"><button type="button" class="button secondary" data-close-secondary>Abbrechen</button><button class="button primary" type="submit">Person speichern</button></div></form>`, data => {
      const nextPerson = { ...person, ...Object.fromEntries([...data].filter(([key]) => !['parentIds','partnerIds'].includes(key))), parentIds: data.getAll('parentIds'), partnerIds: data.getAll('partnerIds') };
      const next = upsertPerson(tree, nextPerson);
      selectedId = person.id;
      commit(next, 'Person gespeichert.');
      editor.close();
    });
  editor.querySelector('[data-close-secondary]').onclick = requestCloseEditor;
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

const actions = {
  add: () => editPerson(),
  edit: () => editPerson(personById(selectedId)),
  child: () => editPerson(createPerson({ lastName: personById(selectedId).lastName, parentIds: [selectedId] })),
  backup: () => { if (loadError) { actions.raw(); return; } downloadFile(JSON.stringify(tree, null, 2), `${safeFilename(tree.title)}-${new Date().toISOString().slice(0,10)}.json`, 'application/json'); notify('Sicherung heruntergeladen. Bewahre sie an einem sicheren Ort auf.'); },
  raw: () => { const raw = localStorage.getItem(STORAGE_KEY); if (raw) downloadFile(raw, 'Wurzelwerk-Rohdaten.json', 'application/json'); else notify('Keine gespeicherten Rohdaten verfügbar.'); },
  import: () => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.onchange = () => importBackup(input.files[0]); input.click(); },
  html: () => downloadFile(reportDocument(tree), `${safeFilename(tree.title)}-Chronik.html`, 'text/html;charset=utf-8'),
  print: () => window.print(),
  demo: () => confirmChange('Beispiel erkunden?', 'Ein erfundener Stammbaum mit sieben Personen zeigt dir die Möglichkeiten. Er wird lokal gespeichert.', 'Beispiel laden', () => commit(demoTree(), 'Fiktives Beispiel geladen.')),
  new: () => confirmChange('Neuen Stammbaum beginnen?', 'Der aktuelle Stammbaum wird in diesem Browser ersetzt. Lade vorher eine Sicherung herunter, wenn du ihn behalten möchtest.', 'Leeren Stammbaum anlegen', () => { commit(createTree(), 'Neuer Stammbaum angelegt.'); undoTree = null; render(); }),
  rename: () => showDialog(`<form><div class="dialog-header"><h2 id="dialog-title">Dein Familientitel</h2></div><div class="dialog-body"><label class="field"><span>Titel des Stammbaums</span><input name="title" required maxlength="200" value="${e(tree.title)}"></label><div class="notice error" role="alert" hidden></div></div><div class="dialog-actions"><button type="button" class="button secondary" data-close>Abbrechen</button><button type="submit" class="button primary">Titel speichern</button></div></form>`, data => { commit({ ...tree, title: data.get('title') }, 'Titel gespeichert.'); editor.close(); }),
  delete: () => confirmChange('Person löschen?', `${displayName(personById(selectedId))} und alle Verbindungen zu dieser Person werden entfernt. Die anderen Personen bleiben erhalten.`, 'Person löschen', () => { const previous = tree; commit(deletePerson(tree, selectedId), 'Person gelöscht. Du kannst die Löschung unten rückgängig machen.'); undoTree = previous; render(); }),
  undo: () => { commit(undoTree, 'Löschung rückgängig gemacht.'); undoTree = null; render(); },
};

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  try {
    if (button.dataset.view) { view = button.dataset.view; query = ''; render(); }
    else if (button.dataset.person) {
      selectedId = button.dataset.person;
      render();
      app.querySelector(`[data-person="${CSS.escape(selectedId)}"]`)?.focus({ preventScroll: true });
    }
    else if (button.dataset.action) actions[button.dataset.action]?.();
  } catch (error) { notify(error.message); }
});

app.addEventListener('input', event => {
  if (event.target.id !== 'search') return;
  const position = event.target.selectionStart;
  query = event.target.value;
  render();
  const search = document.querySelector('#search');
  search.focus(); search.setSelectionRange(position, position);
});
window.addEventListener('resize', drawConnections);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) notify('Änderung in einem anderen Fenster erkannt. Bitte diese Seite neu laden, bevor du weiter speicherst.'); });
function requestCloseEditor() {
  if (!editor.dataset.dirty || window.confirm('Ungespeicherte Eingaben verwerfen?')) editor.close();
}
editor.addEventListener('input', () => { editor.dataset.dirty = 'true'; });
editor.addEventListener('cancel', event => { event.preventDefault(); requestCloseEditor(); });
window.addEventListener('beforeunload', event => { if (editor.open && editor.dataset.dirty) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('beforeprint', () => {
  if (view === 'report' || document.querySelector('#tree-print-output')) return;
  const output = document.createElement('div');
  output.id = 'tree-print-output';
  output.innerHTML = treePrintMarkup(tree);
  document.body.append(output);
  document.body.classList.add('printing-tree');
});
window.addEventListener('afterprint', () => {
  document.querySelector('#tree-print-output')?.remove();
  document.body.classList.remove('printing-tree');
});
render();
