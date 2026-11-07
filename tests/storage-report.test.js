import test from 'node:test';
import assert from 'node:assert/strict';
import { createTree, createPerson, validateTree, demoTree } from '../src/domain.js';
import { loadTree, saveTree, safeFilename, STORAGE_KEY } from '../src/storage.js';
import { escapeHtml, formatDate, lifespan, reportMarkup, reportDocument } from '../src/report.js';

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
  assert.equal(lifespan({ birthDate: '1932', deathDate: '2015' }), '1932 – 2015');
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
