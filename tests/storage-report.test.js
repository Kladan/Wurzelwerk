import test from 'node:test';
import assert from 'node:assert/strict';
import { createTree, createPerson, validateTree, demoTree, displayName, treeForPrint, deletePerson, upsertPerson } from '../src/domain.js';
import { loadTree, saveTree, safeFilename, STORAGE_KEY } from '../src/storage.js';
import { escapeHtml, formatDate, lifespan, reportMarkup, reportDocument, treePrintMarkup } from '../src/report.js';

test('optional print lineage marks only direct cards, survives hidden intermediates and never exposes hidden names', () => {
  const person = (id, parentIds = []) => createPerson({ id, firstName: id === 'root' ? '<Root>' : id, parentIds });
  const tree = validateTree({ ...createTree(), people: [person('g'), person('p', ['g']), person('root', ['p']),
    person('sibling', ['p']), person('other'), person('child', ['root', 'other']), person('grandchild', ['child'])] });
  const before = structuredClone(tree);
  for (const singlePage of [false, true]) for (const paper of ['A4', 'A3']) {
    const markup = treePrintMarkup(tree, { highlightPersonId: 'root', singlePage, paper });
    const names = [...markup.matchAll(/class="tree-print-card lineage-highlight"><title>([^<]*)<\/title>/g)].map(m => m[1]);
    assert.deepEqual(names.sort(), ['&lt;Root&gt;', 'child', 'g', 'grandchild', 'p']);
    assert.ok(markup.includes('related lineage-connection'));
    const excerpt = treePrintMarkup(tree, { highlightPersonId: 'root', hiddenPersonIds: ['root', 'p'], singlePage, paper, includeIndex: true });
    assert.ok(!excerpt.includes('Root'));
    assert.ok(excerpt.includes('ausgeblendeten Bezugsperson'));
    assert.equal((excerpt.match(/class="tree-print-card lineage-highlight"/g) ?? []).length, 3);
  }
  for (const highlightPersonId of ['', 'missing']) {
    const markup = treePrintMarkup(tree, { highlightPersonId });
    assert.ok(!markup.includes('lineage-highlight'));
    assert.ok(!markup.includes('lineage-connection'));
  }
  assert.deepEqual(tree, before);
});

test('print selection omits people and their references from every output without changing stored data', () => {
  const tree = validateTree({ ...createTree('Fiktiver Auszug'), people: [
    createPerson({ id: 'grandparent', firstName: 'Grosselternname' }),
    createPerson({ id: 'parent', firstName: 'Verborgenername', parentIds: ['grandparent'], partnerIds: ['partner'], notes: 'Verborgene Biografie', labels: ['Verstecktes Label'] }),
    createPerson({ id: 'partner', firstName: 'Partnername', partnerIds: ['parent'] }),
    createPerson({ id: 'child', firstName: '<Kind>', parentIds: ['parent'], notes: 'Sichtbare Erinnerung', labels: ['Sichtbares Label'] }),
  ] });
  const before = JSON.stringify(tree);
  const storage = setupStorage();
  loadTree();
  saveTree(tree);
  const saved = storage.value;
  for (const hiddenPersonIds of [[], ['parent'], ['grandparent', 'parent', 'partner'], tree.people.map(p => p.id), ['missing']]) {
    const projected = treeForPrint(tree, hiddenPersonIds);
    validateTree(projected);
    assert.equal(projected.people.length, tree.people.filter(p => !hiddenPersonIds.includes(p.id)).length);
    if (hiddenPersonIds.includes('parent')) {
      assert.deepEqual(projected.people.find(p => p.id === 'child')?.parentIds ?? [], []);
      assert.deepEqual(projected.people.find(p => p.id === 'partner')?.partnerIds ?? [], []);
    }
    for (const render of [reportMarkup, reportDocument, treePrintMarkup]) {
      for (const singlePage of [false, true]) {
        const output = render(tree, { hiddenPersonIds, includeLabels: true, includeIndex: true, singlePage });
        for (const person of tree.people) {
          assert.equal(output.includes(escapeHtml(displayName(person))), !hiddenPersonIds.includes(person.id));
        }
        if (hiddenPersonIds.includes('parent')) {
          assert.ok(output.includes('Auszug:'));
          assert.ok(!output.includes('Verborgene Biografie'));
          assert.ok(!output.includes('Verstecktes Label'));
        }
        assert.ok(!output.includes('undefined'));
      }
    }
    assert.equal(JSON.stringify(tree), before);
    assert.equal(storage.value, saved);
  }
  assert.match(treePrintMarkup(tree, { hiddenPersonIds: tree.people.map(p => p.id) }), /Alle Personen sind/);
  assert.equal(reportMarkup(tree), reportMarkup(tree, { hiddenPersonIds: [] }));
});

class MemoryStorage {
  value = null;
  failWrites = false;
  getItem(key) { assert.equal(key, STORAGE_KEY); return this.value; }
  setItem(key, value) {
    assert.equal(key, STORAGE_KEY);
    if (this.failWrites) throw new Error('quota');
    this.value = value;
  }
}

function setupStorage(value = null) {
  const storage = new MemoryStorage();
  storage.value = value;
  globalThis.localStorage = storage;
  return storage;
}

test('print options survive reload, backup and person edits; legacy trees get defaults', () => {
  const legacy = demoTree();
  delete legacy.printOptions;
  const storage = setupStorage(JSON.stringify(legacy));
  const tree = loadTree();
  assert.deepEqual(tree.printOptions, { includeLabels: false, includeTreeIndex: false, singlePageTree: false, treePaper: 'A4', hiddenPersonIds: [], highlightPersonId: '' });
  const options = { includeLabels: true, includeTreeIndex: true, singlePageTree: true, treePaper: 'A3', hiddenPersonIds: [tree.people[0].id], highlightPersonId: tree.people[0].id };
  const saved = saveTree({ ...tree, printOptions: { ...options, unexpected: 'discard' } });
  assert.deepEqual(loadTree().printOptions, options);
  assert.deepEqual(validateTree(JSON.parse(storage.value)), saved);
  assert.deepEqual(saved.people, tree.people);
  const edited = upsertPerson(saved, { ...saved.people[1], notes: 'Fiktive Notiz' });
  assert.deepEqual(saveTree(edited).printOptions, options);
  const deleted = saveTree(deletePerson(edited, tree.people[0].id));
  assert.deepEqual(deleted.printOptions.hiddenPersonIds, []);
  assert.equal(deleted.printOptions.highlightPersonId, '');
  assert.deepEqual(createTree().printOptions, tree.printOptions);
});

test('invalid print options and failed writes preserve the previous data and options', () => {
  const storage = setupStorage();
  loadTree();
  const tree = saveTree(demoTree());
  const before = storage.value;
  for (const printOptions of [null, [], 'A4', { includeLabels: 'false' }, { singlePageTree: 1 }, { includeTreeIndex: null }, { treePaper: 'A5' }, { highlightPersonId: null }, { highlightPersonId: '<script>' }, { highlightPersonId: 42 }, { hiddenPersonIds: ['<script>'] }, { hiddenPersonIds: Array(5001).fill('a') }, { hiddenPersonIds: ['a', 'a'] }]) {
    assert.throws(() => saveTree({ ...tree, printOptions }));
    assert.equal(storage.value, before);
  }
  storage.failWrites = true;
  assert.throws(() => saveTree({ ...tree, printOptions: { ...tree.printOptions, treePaper: 'A3' } }), /konnte nicht speichern/);
  assert.equal(storage.value, before);
  assert.deepEqual(loadTree(), tree);
  storage.failWrites = false;
  storage.value = JSON.stringify({ ...tree, title: 'Anderes Fenster' });
  assert.throws(() => saveTree({ ...tree, printOptions: { treePaper: 'A3' } }), /anderen Fenster/);
  assert.equal(JSON.parse(storage.value).title, 'Anderes Fenster');
});

test('labels survive storage and backup; invalid labels and failed writes preserve saved data', () => {
  const legacy = demoTree();
  for (const person of legacy.people) delete person.labels;
  const storage = setupStorage(JSON.stringify(legacy));
  const tree = loadTree();
  assert.deepEqual(tree.people[0].labels, []);
  tree.people[0].labels = ['Krieg', 'Auswanderung'];
  const saved = saveTree(tree);
  assert.deepEqual(loadTree(), saved);
  assert.deepEqual(validateTree(JSON.parse(storage.value)), saved);
  const before = storage.value;
  tree.people[0].labels = [42];
  assert.throws(() => saveTree(tree), /Labels/);
  assert.equal(storage.value, before);
  tree.people[0].labels = [];
  storage.failWrites = true;
  assert.throws(() => saveTree(tree), /konnte nicht speichern/);
  assert.equal(storage.value, before);
});

test('label output is opt-in, escaped, complete and does not mutate the tree', () => {
  const tree = demoTree();
  tree.people[0].labels = ['Krieg', '<img onerror="evil()">', 'x'.repeat(60)];
  const before = JSON.stringify(tree);
  for (const render of [reportMarkup, reportDocument, treePrintMarkup]) {
    assert.ok(!render(tree).includes('Krieg'));
    const output = render(tree, { includeLabels: true });
    assert.ok(output.includes('Krieg'));
    assert.ok(output.includes('&lt;img onerror=&quot;evil()&quot;&gt;'));
    assert.ok(!output.includes('<img'));
    assert.ok(output.includes('x'.repeat(60)));
    assert.equal(JSON.stringify(tree), before);
  }
  assert.ok(treePrintMarkup(tree, { includeLabels: true }).includes('Vollständige Labels'));
  const indexed = treePrintMarkup(tree, { includeLabels: true, includeIndex: true });
  assert.ok(!indexed.includes('Vollständige Labels'));
  assert.ok(indexed.includes('x'.repeat(60)));
  tree.people[0].labels = ['Krieg'];
  const short = treePrintMarkup(tree, { includeLabels: true });
  assert.ok(short.includes('class="tree-print-labels"'));
  assert.ok(!short.includes('Vollständige Labels'));
  tree.people[0].labels = [];
  assert.ok(!treePrintMarkup(tree, { includeLabels: true }).includes('class="tree-print-labels"'));
});

test('nicknames survive legacy loading, saving and backup round trips without replacing given names', () => {
  const legacy = demoTree();
  for (const person of legacy.people) delete person.nickname;
  const storage = setupStorage(JSON.stringify(legacy));
  const tree = loadTree();
  assert.equal(tree.people[0].nickname, '');
  tree.people[0].nickname = '  Otti  ';
  const saved = saveTree(tree);
  assert.equal(saved.people[0].nickname, 'Otti');
  assert.equal(saved.people[0].firstName, 'Otto');
  assert.deepEqual(validateTree(JSON.parse(storage.value)), saved);
  assert.deepEqual(loadTree(), saved);
  const previous = storage.value;
  for (const nickname of [42, {}, [], 'a'.repeat(501)]) {
    tree.people[0].nickname = nickname;
    assert.throws(() => saveTree(tree), /nickname/);
    assert.equal(storage.value, previous);
  }
  tree.people[0].nickname = '';
  assert.equal(displayName(saveTree(tree).people[0]), 'Otto Linden');
});

test('nickname display retains and escapes all given names in chronicle and tree print', () => {
  const person = createPerson({ id: 'nick', firstName: 'Johann <Hans> Friedrich', nickname: 'Hansi <img>', lastName: 'Linden' });
  const tree = validateTree({ ...createTree(), people: [person] });
  assert.equal(displayName(person), 'Hansi <img> Linden');
  for (const output of [reportMarkup(tree), reportDocument(tree), treePrintMarkup(tree, { includeIndex: true })]) {
    assert.ok(output.includes('Hansi &lt;img&gt; Linden'));
    assert.ok(output.includes('Johann &lt;Hans&gt; Friedrich'));
    assert.equal(output.includes('<img>'), false);
    assert.equal(output.includes('<Hans>'), false);
  }
  const print = treePrintMarkup(tree);
  assert.ok(print.includes('class="tree-print-original"'));
  assert.ok(print.includes('font-size="15" data-fit-width="154">Johann'));
  const noGivenNames = createPerson({ id: 'unknown', nickname: 'Hansi', lastName: 'Linden' });
  const output = reportMarkup({ ...createTree(), people: [noGivenNames] });
  assert.equal(output.includes('class="original-names"'), false);
  person.nickname = '';
  assert.equal(displayName(person), 'Johann <Hans> Friedrich Linden');
  assert.equal(treePrintMarkup({ ...tree, people: [person] }).includes('class="tree-print-original"'), false);
});

test('tree print shows differing birth names regardless of parents and preserves full escaped names', () => {
  const longName = '<Sommer> & ' + 'Lang'.repeat(20);
  const tree = validateTree({ ...createTree(), people: [
    createPerson({ id: 'parent', firstName: 'Elternteil', lastName: 'Linden', birthName: 'Berg' }),
    createPerson({ id: 'child', firstName: 'Johann Friedrich', nickname: 'Hans', lastName: 'Linden', birthName: longName,
      parentIds: ['parent'], birthDate: '1920', deathDate: '1990', labels: ['Fiktiv'] }),
    createPerson({ id: 'same', firstName: 'Gleich', lastName: 'Linden', birthName: 'Linden' }),
    createPerson({ id: 'unknown', firstName: 'Offen' }),
  ] });
  const before = structuredClone(tree);
  for (const singlePage of [false, true]) for (const paper of ['A4', 'A3']) {
    const output = treePrintMarkup(tree, { singlePage, paper, includeLabels: true, includeIndex: true });
    const cards = [...output.matchAll(/<g class="tree-print-card[^]*?<\/g>/g)].map(match => match[0]);
    assert.equal(cards.filter(card => card.includes('class="tree-print-birth-name"')).length, 2);
    assert.ok(cards.some(card => card.includes('>geb. Berg</text>')));
    const child = cards.find(card => card.includes('Hans Linden'));
    assert.ok(child.includes(`geb. ${escapeHtml(longName)}`));
    assert.ok(child.includes('…</text>'));
    assert.ok(child.includes('class="tree-print-original"'));
    const rows = [...child.matchAll(/<text [^>]*y="([\d.]+)"[^>]*>([^]*?)<\/text>/g)];
    const baselines = rows.map(row => Number(row[1]));
    for (let index = 1; index < baselines.length; index++) assert.ok(baselines[index] - baselines[index - 1] >= 18);
    const rect = child.match(/<rect [^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/);
    assert.ok(baselines.at(-1) < Number(rect[1]) + Number(rect[2]) - 8);
    assert.ok(output.split('tree-print-index')[1].includes(`geb. ${escapeHtml(longName)}`));
    assert.equal(output.includes('<Sommer>'), false);
    assert.equal(output.includes('geb. Linden'), false);
  }
  const hidden = treePrintMarkup(tree, { hiddenPersonIds: ['parent', 'child'], includeIndex: true });
  assert.equal(hidden.includes('geb. Berg'), false);
  assert.equal(hidden.includes('Sommer'), false);
  assert.equal(hidden.includes('tree-print-birth-name'), false);
  assert.deepEqual(tree, before);
});

test('a new local tree can be saved and loaded without changing its data', () => {
  const storage = setupStorage();
  assert.deepEqual(loadTree(), createTree());
  const tree = demoTree();
  assert.deepEqual(saveTree(tree), tree);
  assert.deepEqual(JSON.parse(storage.value), tree);
  assert.deepEqual(loadTree(), tree);
});

test('a failed storage write preserves the previous data and allows a retry', () => {
  const original = JSON.stringify(demoTree());
  const storage = setupStorage(original);
  loadTree();
  storage.failWrites = true;
  assert.throws(() => saveTree(createTree('Neu')), /konnte nicht speichern/);
  assert.equal(storage.value, original);
  storage.failWrites = false;
  assert.equal(saveTree(createTree('Neu')).title, 'Neu');
});

test('a stale window cannot overwrite data saved by another window', () => {
  const storage = setupStorage(JSON.stringify(demoTree()));
  loadTree();
  const external = JSON.stringify(createTree('Anderes Fenster'));
  storage.value = external;
  assert.throws(() => saveTree(createTree('Veraltet')), /anderen Fenster/);
  assert.equal(storage.value, external);
  assert.equal(loadTree().title, 'Anderes Fenster');
  assert.equal(saveTree(createTree('Nach Neuladen')).title, 'Nach Neuladen');
});

test('a corrupt or unavailable store fails visibly without clearing stored data', () => {
  const storage = setupStorage('{kaputt');
  assert.throws(() => loadTree(), SyntaxError);
  assert.equal(storage.value, '{kaputt');
  globalThis.localStorage = { getItem() { throw new Error('disabled'); } };
  assert.throws(() => loadTree(), /disabled/);
});

test('validation errors do not write storage and supported fields alone are persisted', () => {
  const storage = setupStorage();
  loadTree();
  const invalid = { ...createTree(), people: [{ id: 'x', firstName: '' }] };
  assert.throws(() => saveTree(invalid), /Nachnamen/);
  assert.equal(storage.value, null);
  const tree = demoTree();
  tree.unexpected = 'discarded';
  tree.people[0].unexpected = 'discarded';
  const persisted = saveTree(tree);
  assert.equal(Object.hasOwn(persisted, 'unexpected'), false);
  assert.equal(storage.value.includes('discarded'), false);
});

test('unknown death dates never imply the person is alive', () => {
  assert.equal(lifespan({ birthDate: '1932-04-18', deathDate: '' }), 'geb. 1932');
  assert.equal(lifespan({ birthDate: '', deathDate: '2015' }), 'gest. 2015');
  assert.equal(lifespan({ birthDate: '', deathDate: '' }), 'Lebensdaten offen');
  assert.equal(lifespan({ birthDate: '1932', deathDate: '2015' }), '1932 – 2015 · 82–83 Jahre');
  assert.equal(formatDate('1932-04-18'), '18.04.1932');
  assert.equal(formatDate('1932-04'), '04.1932');
  assert.equal(formatDate('1932'), '1932');
  assert.equal(formatDate(''), 'unbekannt');
});

test('standalone report escapes markup in names, titles, places, notes and sources', () => {
  const attack = '</title><script>alert("x")</script><img src="https://example.invalid/track">';
  const person = createPerson({ id: 'safe-id', firstName: attack, birthName: attack, birthPlace: attack, deathPlace: attack, notes: attack, sources: attack });
  const tree = validateTree({ ...createTree(attack), people: [person] });
  const report = reportDocument(tree);
  assert.ok(report.startsWith('<!doctype html>'));
  assert.equal(report.includes('<script>'), false);
  assert.equal(report.includes('<img'), false);
  assert.ok(report.includes('&lt;script&gt;'));
  assert.ok(report.includes('<style>'));
  assert.ok(report.includes('href="#report-1"'));
  assert.equal(/<[^>]+\ssrc=/.test(report), false);
  assert.equal(report.includes('<link'), false);
  assert.equal(report.includes('heute'), false);
  assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
});

test('report references every relationship and keeps biographies and sources', () => {
  const tree = demoTree();
  tree.people.find(person => person.id === 'paul').sources = 'Familienbuch, Seite 4';
  const report = reportMarkup(tree);
  assert.ok(report.includes('Eltern:'));
  assert.ok(report.includes('Partnerschaften:'));
  assert.ok(report.includes('Kinder:'));
  assert.ok(report.includes('liebte seinen Garten'));
  assert.ok(report.includes('Familienbuch, Seite 4'));
  assert.equal((report.match(/class="report-person"/g) ?? []).length, 7);
  for (let index = 1; index <= 7; index++) {
    assert.ok(report.includes(`href="#report-${index}"`));
    assert.ok(report.includes(`id="report-${index}"`));
  }
  assert.equal(safeFilename('../../Familie <Linden>'), '-Familie-Linden-');
});

test('tree print preserves data and covers every person and relationship across tiles', () => {
  const tree = demoTree();
  for (let i = 0; i < 8; i++) tree.people.push(createPerson({ id: `extra${i}`, firstName: `Extra ${i}` }));
  const before = structuredClone(tree);
  const output = treePrintMarkup(tree, { includeIndex: true });
  const pages = (output.match(/class="tree-print-page"/g) ?? []).length;
  assert.ok(pages > 1);
  assert.equal((output.match(/<rect /g) ?? []).length, tree.people.length);
  assert.equal((output.match(/<li>/g) ?? []).length, tree.people.length);
  assert.ok(output.includes('<path d="M'));
  for (const person of tree.people) {
    const entry = output.split('<li>').find(part => part.startsWith(`<strong>${escapeHtml(displayName(person))}`));
    assert.ok(entry);
    for (const id of [...person.parentIds, ...person.partnerIds]) {
      assert.ok(entry.split('</li>')[0].includes(escapeHtml(displayName(tree.people.find(p => p.id === id)))));
    }
  }
  assert.deepEqual(tree, before);
});

test('tree print escapes names and titles, retains long names and leaves unknown dates blank', () => {
  const name = '<script>alert(1)</script>' + 'Lang'.repeat(100);
  const tree = createTree('</h1><img src="https://example.invalid">');
  tree.people.push(createPerson({ id: 'long', firstName: name }));
  const output = treePrintMarkup(tree);
  assert.ok(output.includes(escapeHtml(name)));
  assert.equal(output.includes('Lebensdaten offen'), false);
  assert.equal(output.includes('offen'), false);
  assert.ok(output.includes('\u2026'));
  assert.equal(output.includes('<script>'), false);
  assert.equal(output.includes('<img'), false);
  assert.equal(output.includes('<link'), false);
});

test('empty and deep trees produce useful print output without omitted cards', () => {
  assert.ok(treePrintMarkup(createTree()).includes('Noch keine Personen erfasst.'));
  const tree = createTree();
  for (let i = 0; i < 9; i++) tree.people.push(createPerson({ id: `p${i}`, firstName: `Person ${i}`, parentIds: i ? [`p${i - 1}`] : [] }));
  const output = treePrintMarkup(validateTree(tree));
  assert.equal((output.match(/class="tree-print-page"/g) ?? []).length, 3);
  assert.equal((output.match(/<rect /g) ?? []).length, 9);
  assert.ok(output.includes('Generation 9'));
  assert.ok(output.includes('Baumblatt 3'));
});

test('long ancestry links are emitted only on endpoint sheets', () => {
  const tree = createTree();
  for (let i = 0; i < 100; i++) tree.people.push(createPerson({
    id: `p${i}`, firstName: 'W'.repeat(54),
    parentIds: i > 1 ? ['p0', `p${i - 1}`] : i ? ['p0'] : [],
  }));
  const output = treePrintMarkup(validateTree(tree));
  assert.ok((output.match(/<path /g) ?? []).length <= 20 * 100);
  for (const match of output.matchAll(/textLength="([\d.]+)"/g)) assert.ok(Number(match[1]) <= 170);
});

function fourGenerationTree() {
  const tree = createTree('Fiktive Familie mit vier Generationen');
  for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
    tree.people.push(createPerson({ id: `g${row}p${col}`, firstName: `Person ${row + 1}.${col + 1}`,
      parentIds: row ? [`g${row - 1}p${col - col % 2}`, `g${row - 1}p${col - col % 2 + 1}`] : [] }));
  }
  return validateTree(tree);
}

test('wide generations keep tiled print height bounded and retain every card', () => {
  const tree = createTree('Fiktive breite Familie');
  for (let row = 0; row < 4; row++) for (let col = 0; col < 100; col++) {
    tree.people.push(createPerson({ id: `g${row}p${col}`, firstName: `Person ${row}.${col}`,
      parentIds: row ? [`g${row - 1}p${col}`] : [] }));
  }
  const output = treePrintMarkup(validateTree(tree));
  assert.equal((output.match(/<rect /g) ?? []).length, 400);
  assert.equal((output.match(/class="tree-print-page"/g) ?? []).length, 13);
  for (const [, height] of output.matchAll(/viewBox="[\d.]+ [\d.]+ 1600 ([\d.]+)"/g)) {
    assert.ok(Number(height) <= 1120); // Wide rows cannot make every tile arbitrarily tall.
  }
});

test('single-page tree fits ten people per generation and all six generations without changing data', () => {
  const tree = createTree('Fiktiver Gesamtbaum');
  for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) {
    tree.people.push(createPerson({ id: `g${row}p${col}`, firstName: `Person ${row}.${col}`,
      parentIds: row ? [`g${row - 1}p${col}`] : [] }));
  }
  const before = structuredClone(tree);
  for (const paper of ['A4', 'A3']) {
    const output = treePrintMarkup(validateTree(tree), { singlePage: true, paper });
    assert.equal((output.match(/class="tree-print-page"/g) ?? []).length, 1);
    assert.equal((output.match(/<rect /g) ?? []).length, 60);
    assert.ok(output.includes('viewBox="0 0 2000 1630"'));
    assert.ok(output.includes('Generation 6'));
    assert.ok(output.includes('<path d="M'));
    assert.equal(output.includes('tree-print-index'), false);
    assert.equal(output.includes('tree-print-a3'), paper === 'A3');
    const indexed = treePrintMarkup(tree, { singlePage: true, paper, includeIndex: true });
    assert.equal((indexed.match(/<li>/g) ?? []).length, 60);
  }
  assert.deepEqual(tree, before);
});

test('single-page tree preserves references for skipped generations and full labels in appendices', () => {
  const tree = validateTree({ ...createTree('<Fiktiv>'), people: [
    createPerson({ id: 'a', firstName: 'Sam' }),
    createPerson({ id: 'b', firstName: 'Sam', parentIds: ['a'] }),
    createPerson({ id: 'c', firstName: '<Kind>', parentIds: ['a', 'b'], labels: ['L'.repeat(60)] }),
  ] });
  const output = treePrintMarkup(tree, { singlePage: true, includeLabels: true });
  assert.equal((output.match(/class="tree-print-page"/g) ?? []).length, 1);
  assert.ok(output.includes('tree-print-continuations'));
  assert.ok(output.includes('Sam · Baumblatt 1, Generation 1, Karte 1 von links'));
  assert.ok(output.includes('Sam · Baumblatt 1, Generation 2, Karte 1 von links'));
  assert.ok(output.includes('L'.repeat(60)));
  assert.ok(output.includes('&lt;Kind&gt;'));
  assert.equal(output.includes('<Kind>'), false);
  assert.ok(treePrintMarkup(createTree(), { singlePage: true }).includes('Noch keine Personen erfasst.'));
  assert.equal(treePrintMarkup(tree, { singlePage: true, paper: 'A3" onload="bad' }).includes('onload='), false);
});

test('32 people in four generations fit one compact tree sheet with an optional index', () => {
  const tree = fourGenerationTree();
  const before = structuredClone(tree);
  const output = treePrintMarkup(tree);
  assert.equal((output.match(/class="tree-print-page"/g) ?? []).length, 1);
  assert.equal((output.match(/<rect /g) ?? []).length, 32);
  assert.ok(output.includes('Generation 4'));
  assert.equal(output.includes('tree-print-index'), false);
  const indexed = treePrintMarkup(tree, { includeIndex: true });
  assert.equal((indexed.match(/<li>/g) ?? []).length, 32);
  assert.deepEqual(tree, before);
});

test('overflow cards continue on a second sheet without splitting or losing people', () => {
  const tree = fourGenerationTree();
  tree.people.push(createPerson({ id: 'extra', firstName: 'Zusatzperson', parentIds: ['g2p0'] }));
  const output = treePrintMarkup(tree, { includeIndex: true });
  assert.equal((output.match(/class="tree-print-page"/g) ?? []).length, 2);
  assert.equal((output.match(/<rect /g) ?? []).length, 33);
  assert.equal((output.match(/<li>/g) ?? []).length, 33);
  for (const match of output.matchAll(/<rect x="(\d+)"[^>]+width="(\d+)"/g)) {
    assert.ok(Number(match[1]) % 1600 + Number(match[2]) < 1600);
  }
});

test('a wide sibling family prints only the visible branches on each sheet', () => {
  const tree = createTree();
  tree.people.push(createPerson({ id: 'parent', firstName: 'Elternteil' }));
  for (let i = 0; i < 999; i++) tree.people.push(createPerson({ id: `child${i}`, firstName: `Kind ${i}`, parentIds: ['parent'] }));
  const output = treePrintMarkup(validateTree(tree));
  assert.equal((output.match(/<rect /g) ?? []).length, 1000);
  assert.ok((output.match(/<path /g) ?? []).length < 8 * 1000);
  assert.ok(output.length < 2_000_000);
});

test('tree cards contain names and only known lifespan data without person numbers or parent text', () => {
  const tree = createTree();
  tree.people = [
    createPerson({ id: 'unknown', firstName: 'Ohne Datum' }),
    createPerson({ id: 'birth', firstName: 'Geburt', birthDate: '1950' }),
    createPerson({ id: 'death', firstName: 'Tod', deathDate: '2001' }),
    createPerson({ id: 'both', firstName: 'Beide', birthDate: '1920', deathDate: '1990', parentIds: ['unknown'] }),
  ];
  const output = treePrintMarkup(validateTree(tree));
  assert.ok(output.includes('geb. 1950'));
  assert.ok(output.includes('gest. 2001'));
  assert.ok(output.includes('1920 – 1990'));
  assert.equal(output.includes('Lebensdaten offen'), false);
  assert.equal(output.includes('Eltern:'), false);
  assert.equal(/\[\d+\]/.test(output), false);
  assert.equal(output.includes('textLength='), false); // Natural text until measured overflow.
});

test('unlined ancestry gets an automatic named appendix with distinct locations for duplicate names', () => {
  const tree = validateTree({ ...createTree(), people: [
    createPerson({ id: 'a', firstName: 'Sam' }),
    createPerson({ id: 'b', firstName: 'Sam', parentIds: ['a'] }),
    createPerson({ id: 'c', firstName: 'Kind', parentIds: ['a', 'b'] }),
  ] });
  const output = treePrintMarkup(tree);
  assert.ok(output.includes('tree-print-continuations'));
  assert.ok(output.includes('Sam · Baumblatt 1, Generation 1, Karte 1 von links'));
  assert.ok(output.includes('Sam · Baumblatt 1, Generation 2, Karte 1 von links'));
  assert.equal(/\[\d+\]/.test(output), false);
  const indexed = treePrintMarkup(tree, { includeIndex: true });
  assert.equal(indexed.includes('tree-print-continuations'), false);
  assert.equal((indexed.match(/<li>/g) ?? []).length, 3);
});
