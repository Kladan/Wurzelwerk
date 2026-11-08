import test from 'node:test';
import assert from 'node:assert/strict';
import { createTree, createPerson, validateTree, upsertPerson, addRelative, deletePerson, getGenerations, getTreeGenerations, getParentSuggestions, demoTree } from '../src/domain.js';

test('fictional tree survives JSON export/import without information loss', () => {
  const tree = demoTree();
  assert.deepEqual(validateTree(JSON.parse(JSON.stringify(tree))), tree);
  assert.equal(getGenerations(tree).length, 3);
  assert.equal(getGenerations(tree)[2].length, 2);
});

test('a blank tree is valid; imports project only supported fields', () => {
  assert.deepEqual(validateTree(createTree()), createTree());
  const tree = demoTree();
  tree.secret = 'unexpected';
  tree.people[0].unexpected = true;
  const result = validateTree(tree);
  assert.equal(Object.hasOwn(result, 'secret'), false);
  assert.equal(Object.hasOwn(result.people[0], 'unexpected'), false);
});

test('a multi-generation ancestry cycle is rejected without mutating the original', () => {
  const tree = demoTree();
  const otto = { ...tree.people[0], parentIds: ['anna'] };
  assert.throws(() => upsertPerson(tree, otto), /Kreis/);
  assert.deepEqual(tree.people[0].parentIds, []);
});

test('unknown, self and duplicate relationships and too many parents are rejected', () => {
  const tree = demoTree();
  for (const parentIds of [['missing'], ['otto'], ['martha', 'martha'], ['martha', 'paul', 'clara']]) {
    assert.throws(() => upsertPerson(tree, { ...tree.people[0], parentIds }));
  }
  const duplicate = { ...tree, people: [...tree.people, tree.people[0]] };
  assert.throws(() => validateTree(duplicate), /eindeutig/);
});

test('partnership changes are reflected on both sides and preserve the previous tree', () => {
  const tree = demoTree();
  const before = JSON.stringify(tree);
  const anna = tree.people.find(person => person.id === 'anna');
  const result = upsertPerson(tree, { ...anna, partnerIds: ['johanna'] });
  assert.deepEqual(result.people.find(person => person.id === 'johanna').partnerIds, ['anna']);
  const removed = upsertPerson(result, { ...anna, partnerIds: [] });
  assert.deepEqual(removed.people.find(person => person.id === 'johanna').partnerIds, []);
  assert.equal(JSON.stringify(tree), before);
});

test('deletion removes all references while preserving other family members', () => {
  const tree = deletePerson(demoTree(), 'paul');
  assert.deepEqual(tree.people.find(person => person.id === 'clara').partnerIds, []);
  assert.deepEqual(tree.people.find(person => person.id === 'anna').parentIds, ['clara']);
  assert.equal(tree.people.length, 6);
  assert.doesNotThrow(() => validateTree(tree));
});

test('adding a new person supports partners and partial historical dates', () => {
  const tree = demoTree();
  const person = createPerson({ firstName: 'Emil', birthDate: '1890', deathDate: '1950-03', partnerIds: ['johanna'] });
  const result = upsertPerson(tree, person);
  assert.deepEqual(result.people.find(entry => entry.id === 'johanna').partnerIds, [person.id]);
  assert.equal(result.people.at(-1).birthDate, '1890');
});

test('invalid dates, impossible chronology and invalid import shape are rejected', () => {
  const tree = demoTree();
  for (const birthDate of ['2023-02-29', '2024-13-01', '0000', '9.2.1900']) {
    assert.throws(() => upsertPerson(tree, { ...tree.people[0], birthDate }));
  }
  assert.throws(() => upsertPerson(tree, { ...tree.people[0], birthDate: '2024', deathDate: '2020' }), /vor/);
  assert.throws(() => validateTree({ version: 2, people: [] }), /Version/);
  assert.throws(() => validateTree({ version: 1, title: 'T', people: new Array(5001).fill({}) }), /5000/);
  const asymmetric = demoTree();
  asymmetric.people[0].partnerIds = [];
  assert.throws(() => validateTree(asymmetric), /beiden/);
});

test('tree order groups co-parents and places their children in the same family order', () => {
  const person = (id, firstName, parentIds = []) => createPerson({ id, firstName, parentIds });
  const tree = validateTree({ ...createTree(), people: [
    person('left1', 'Anna'), person('right1', 'Bela'), person('right2', 'Yvonne'), person('left2', 'Zora'),
    person('left-child1', 'Anton', ['left1', 'left2']),
    person('right-child', 'Berta', ['right1', 'right2']),
    person('left-child2', 'Clara', ['left2', 'left1']),
    person('left-child3', 'Dora', ['left1', 'left2']),
  ] });
  const rows = getTreeGenerations(tree).map(row => row.map(p => p.id));
  assert.deepEqual(rows[0], ['left1', 'left2', 'right1', 'right2']);
  assert.deepEqual(rows[1], ['left-child1', 'left-child2', 'left-child3', 'right-child']);
  // The chronicle keeps its existing alphabetical order.
  assert.deepEqual(getGenerations(tree)[1].map(p => p.id), ['left-child1', 'right-child', 'left-child2', 'left-child3']);
});

test('tree order preserves ancestry levels, people and input data with patchwork relationships', () => {
  const tree = validateTree({ ...createTree(), people: [
    createPerson({ id: 'a', firstName: 'Anna', partnerIds: ['b', 'c'] }),
    createPerson({ id: 'b', firstName: 'Bela', partnerIds: ['a'] }),
    createPerson({ id: 'c', firstName: 'Clara', partnerIds: ['a'] }),
    createPerson({ id: 'ab1', firstName: 'Dora', parentIds: ['a', 'b'] }),
    createPerson({ id: 'ac', firstName: 'Emil', parentIds: ['a', 'c'] }),
    createPerson({ id: 'ab2', firstName: 'Fritz', parentIds: ['b', 'a'] }),
    createPerson({ id: 'grandchild', firstName: 'Greta', parentIds: ['ab1', 'c'] }),
    createPerson({ id: 'isolated', firstName: 'Hanna' }),
  ] });
  const before = structuredClone(tree);
  const rows = getTreeGenerations(tree);
  const expectedRows = getGenerations(tree).map(row => row.map(p => p.id).sort());
  assert.deepEqual(rows.map(row => row.map(p => p.id).sort()), expectedRows);
  assert.equal(new Set(rows.flat().map(p => p.id)).size, tree.people.length);
  const children = rows[1].map(p => p.id);
  assert.equal(Math.abs(children.indexOf('ab1') - children.indexOf('ab2')), 1);
  assert.deepEqual(tree, before);
  assert.deepEqual(getTreeGenerations({ ...tree, people: [...tree.people].reverse() }), rows);
});

test('tree siblings follow recorded birth order without inventing dates for unknown siblings', () => {
  const tree = validateTree({ ...createTree(), people: [
    createPerson({ id: 'parent', firstName: 'Parent' }),
    createPerson({ id: 'young', firstName: 'Anna', parentIds: ['parent'], birthDate: '2000' }),
    createPerson({ id: 'unknown', firstName: 'Bela', parentIds: ['parent'] }),
    createPerson({ id: 'old', firstName: 'Zora', parentIds: ['parent'], birthDate: '1980' }),
  ] });
  assert.deepEqual(getTreeGenerations(tree)[1].map(p => p.id), ['old', 'young', 'unknown']);
  assert.equal(tree.people.find(p => p.id === 'unknown').birthDate, '');
  assert.deepEqual(getTreeGenerations(createTree()), []);
});

test('tree order keeps recorded partners together within the same generation', () => {
  const tree = validateTree({ ...createTree(), people: [
    createPerson({ id: 'a', firstName: 'Anna', partnerIds: ['z'] }),
    createPerson({ id: 'b', firstName: 'Bela' }),
    createPerson({ id: 'z', firstName: 'Zora', partnerIds: ['a'] }),
  ] });
  assert.deepEqual(getTreeGenerations(tree)[0].map(p => p.id), ['a', 'z', 'b']);
});

test('a parentless partner joins generation three and descendants follow without invented ancestry', () => {
  const tree = demoTree();
  const original = structuredClone(tree);
  const result = addRelative(tree, createPerson({ id: 'new-partner', firstName: 'Robin' }), 'anna', 'partner');
  const withChild = addRelative(result, createPerson({ id: 'new-child', firstName: 'Alex' }), 'new-partner', 'child');
  const rows = getGenerations(withChild).map(row => row.map(person => person.id));
  assert.ok(rows[2].includes('new-partner'));
  assert.ok(rows[2].includes('anna'));
  assert.deepEqual(rows[3], ['new-child']);
  assert.deepEqual(withChild.people.find(person => person.id === 'new-partner').parentIds, []);
  assert.deepEqual(tree, original);
  assert.deepEqual(getGenerations(validateTree(JSON.parse(JSON.stringify(withChild)))) , getGenerations(withChild));
  assert.deepEqual(getTreeGenerations({ ...withChild, people: [...withChild.people].reverse() }), getTreeGenerations(withChild));
  const detached = upsertPerson(withChild, { ...withChild.people.find(person => person.id === 'new-partner'), partnerIds: [] });
  assert.ok(getGenerations(detached)[0].some(person => person.id === 'new-partner'));
  assert.ok(getGenerations(detached)[1].some(person => person.id === 'new-child'));
});

test('parentless partner chains align; recorded parents still determine known ancestry', () => {
  let tree = demoTree();
  tree = addRelative(tree, createPerson({ id: 'robin', firstName: 'Robin' }), 'anna', 'partner');
  tree = addRelative(tree, createPerson({ id: 'alex', firstName: 'Alex' }), 'robin', 'partner');
  tree = upsertPerson(tree, { ...tree.people.find(person => person.id === 'johanna'), partnerIds: ['anna'] });
  const levels = new Map(getGenerations(tree).flatMap((row, level) => row.map(person => [person.id, level])));
  assert.equal(levels.get('robin'), 2);
  assert.equal(levels.get('alex'), 2);
  assert.equal(levels.get('johanna'), 1);
  assert.equal(levels.get('anna'), 2);
});

test('conflicting partner alignment cannot reject or loop on valid ancestry', () => {
  const tree = validateTree({ ...createTree(), people: [
    createPerson({ id: 'a', firstName: 'A', partnerIds: ['b-child'] }),
    createPerson({ id: 'b', firstName: 'B', partnerIds: ['a-child'] }),
    createPerson({ id: 'a-child', firstName: 'AC', parentIds: ['a'], partnerIds: ['b'] }),
    createPerson({ id: 'b-child', firstName: 'BC', parentIds: ['b'], partnerIds: ['a'] }),
  ] });
  const before = structuredClone(tree);
  const rows = getGenerations(tree).map(row => row.map(person => person.id).sort());
  assert.deepEqual(rows, [['a', 'b'], ['a-child', 'b-child']]);
  assert.deepEqual(getGenerations({ ...tree, people: [...tree.people].reverse() }), getGenerations(tree));
  assert.deepEqual(tree, before);
  const ancestorPartner = upsertPerson(demoTree(), { ...demoTree().people[0], partnerIds: ['anna'] });
  assert.ok(getGenerations(ancestorPartner)[0].some(person => person.id === 'otto'));
});

test('adding a parent connects the existing child and changes neither original data nor other relationships', () => {
  const tree = demoTree();
  const before = structuredClone(tree);
  const result = addRelative(tree, createPerson({ id: 'parent', firstName: 'Alex' }), 'clara', 'parent');
  assert.deepEqual(result.people.find(person => person.id === 'clara').parentIds, ['parent']);
  assert.deepEqual(result.people.find(person => person.id === 'clara').partnerIds, ['paul']);
  assert.deepEqual(result.people.find(person => person.id === 'parent').parentIds, []);
  assert.deepEqual(tree, before);
});

test('failed relative creation preserves all data and rejects parent limits, cycles and existing IDs', () => {
  const tree = demoTree();
  const before = structuredClone(tree);
  const input = createPerson({ id: 'new', firstName: 'Alex' });
  assert.throws(() => addRelative(tree, input, 'anna', 'parent'), /zwei Eltern/);
  assert.throws(() => addRelative(tree, { ...input, parentIds: ['clara'] }, 'clara', 'parent'), /Kreis/);
  assert.throws(() => addRelative(tree, { ...input, parentIds: ['otto', 'martha'] }, 'clara', 'child'));
  assert.throws(() => addRelative(tree, tree.people[0], 'clara', 'parent'), /bereits vorhanden/);
  assert.throws(() => addRelative(tree, input, 'missing', 'partner'), /Bezugsperson/);
  assert.throws(() => addRelative(tree, input, 'clara', 'unknown'), /Verbindungsart/);
  assert.deepEqual(tree, before);
});

test('second parent suggestions prioritize partners, include the same generation and never select them automatically', () => {
  let tree = demoTree();
  tree = addRelative(tree, createPerson({ id: 'partner', firstName: 'Zora' }), 'paul', 'partner');
  const before = structuredClone(tree);
  assert.deepEqual(getParentSuggestions(tree, ['paul'], 'johanna').map(person => person.id), ['clara', 'partner']);
  assert.deepEqual(getParentSuggestions(tree, ['paul'], 'anna').map(person => person.id), ['clara', 'partner', 'johanna']);
  assert.deepEqual(getParentSuggestions(tree, [], 'anna'), []);
  assert.deepEqual(getParentSuggestions(tree, ['paul', 'clara'], 'anna'), []);
  assert.deepEqual(getParentSuggestions(tree, ['missing'], 'anna'), []);
  assert.deepEqual(tree, before);
});
