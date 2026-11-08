import test from 'node:test';
import assert from 'node:assert/strict';
import { createTree, createPerson, validateTree, upsertPerson, addRelative, linkPeople, getFamilyLinkSuggestion, deletePerson, getGenerations, getTreeGenerations, getParentSuggestions, demoTree } from '../src/domain.js';

test('labels are optional, bounded, projected and editable without changing relatives', () => {
  const legacy = demoTree();
  for (const person of legacy.people) delete person.labels;
  const tree = validateTree(legacy);
  assert.deepEqual(tree.people[0].labels, []);
  const input = { ...tree.people[0], labels: [' Krieg ', 'Auswanderung', 'Krieg'] };
  const result = upsertPerson(tree, input);
  assert.deepEqual(result.people[0].labels, ['Krieg', 'Auswanderung']);
  assert.deepEqual(tree.people[0].labels, []);
  input.labels[0] = 'Verändert';
  assert.equal(result.people[0].labels[0], 'Krieg');
  assert.deepEqual(result.people.slice(1), tree.people.slice(1));
  assert.deepEqual(upsertPerson(result, { ...result.people[0], labels: [] }), tree);
  for (const labels of [null, 'Krieg', {}, [42], [''], ['  '], ['a\nb'], ['a\rb'], ['x'.repeat(61)], Array(21).fill('Krieg')]) {
    assert.throws(() => upsertPerson(tree, { ...tree.people[0], labels }), /Labels/);
  }
  assert.equal(createPerson({ firstName: 'Test', labels: Array.from({ length: 20 }, (_, i) => `${i}`) }).labels.length, 20);
});

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

test('parents follow child branches while married siblings retain birth order', () => {
  const person = (id, fields = {}) => createPerson({ id, firstName: id, ...fields });
  const tree = validateTree({ ...createTree(), people: [
    ...['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].map(id => person(id)),
    ...['aa', 'ab', 'ac'].map((id, i) => person(id, { parentIds: ['a1', 'a2'], birthDate: String(1980 + i), partnerIds: i === 0 ? ['ca'] : [] })),
    ...['ba', 'bb', 'bc', 'bd'].map(id => person(id, { parentIds: ['b1', 'b2'] })),
    person('ca', { parentIds: ['c1', 'c2'], partnerIds: ['aa'] }),
    person('child', { parentIds: ['aa', 'ca'] }),
  ] });
  const before = structuredClone(tree);
  const rows = getTreeGenerations(tree).map(row => row.map(p => p.id));
  assert.deepEqual(rows, [
    ['a1', 'a2', 'c1', 'c2', 'b1', 'b2'],
    ['aa', 'ab', 'ac', 'ca', 'ba', 'bb', 'bc', 'bd'], ['child'],
  ]);
  const reversed = { ...tree, people: [...tree.people].reverse().map(p => ({ ...p,
    parentIds: [...p.parentIds].reverse(), partnerIds: [...p.partnerIds].reverse() })) };
  assert.deepEqual(getTreeGenerations(reversed).map(row => row.map(p => p.id)), rows);
  assert.deepEqual(getTreeGenerations(tree).map(row => row.map(p => p.id)), rows);
  assert.deepEqual(tree, before);
  // Shared children give co-parents the same placement even without a recorded partnership.
  const coParents = { ...tree, people: tree.people.map(p => ({ ...p, partnerIds: [] })) };
  assert.deepEqual(getTreeGenerations(coParents).map(row => row.map(p => p.id)), rows);
});

test('partnerships on both sides never override sibling birth order', () => {
  const person = (id, fields = {}) => createPerson({ id, firstName: id, ...fields });
  const tree = validateTree({ ...createTree(), people: [person('p'),
    person('left', { partnerIds: ['s1'] }), person('right', { partnerIds: ['s2'] }),
    ...['s1', 's2', 's3', 's4'].map((id, i) => person(id, { parentIds: ['p'],
      birthDate: String(1980 + i), partnerIds: i < 2 ? [i === 0 ? 'left' : 'right'] : [] })),
  ] });
  const row = getTreeGenerations(tree)[1].map(p => p.id);
  assert.equal(Math.abs(row.indexOf('left') - row.indexOf('s1')), 1);
  assert.deepEqual(row.filter(id => id.startsWith('s')), ['s1', 's2', 's3', 's4']);
  assert.equal(row.indexOf('right') - row.indexOf('s4'), 1);
});

test('equal family anchors remain deterministic across permuted relationship arrays', () => {
  const records = [
    ['p2', 'B', '', [], ['p18']], ['p5', 'A', '1996', [], ['p17']],
    ['p6', 'A', '', [], []], ['p7', 'C', '1979', [], []],
    ['p9', 'B', '', ['p7'], []], ['p10', 'B', '1953', ['p2'], []],
    ['p11', 'B', '1995', ['p10'], []], ['p12', 'B', '1981', ['p5'], []],
    ['p13', 'A', '1969', ['p5'], []], ['p14', 'C', '', ['p7'], []],
    ['p15', 'B', '1955', ['p6', 'p5'], []], ['p17', 'C', '', ['p2'], ['p5']],
    ['p18', 'A', '1985', ['p2', 'p6'], ['p2']], ['p20', 'B', '1959', ['p15'], []],
    ['p23', 'B', '1977', ['p2'], []],
  ];
  const tree = validateTree({ ...createTree(), people: records.map(([id, firstName, birthDate, parentIds, partnerIds]) =>
    createPerson({ id, firstName, birthDate, parentIds, partnerIds })) });
  const before = structuredClone(tree);
  const reversed = { ...tree, people: [...tree.people].reverse().map(p => ({ ...p,
    parentIds: [...p.parentIds].reverse(), partnerIds: [...p.partnerIds].reverse() })) };
  const rows = getTreeGenerations(tree);
  assert.deepEqual(getTreeGenerations(reversed).map(row => row.map(p => p.id)), rows.map(row => row.map(p => p.id)));
  assert.deepEqual(rows.map(row => row.map(p => p.id).sort()), getGenerations(tree).map(row => row.map(p => p.id).sort()));
  assert.deepEqual(tree, before);
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

test('family role suggestions follow adjacent display generations regardless of selection order and preserve data', () => {
  const tree = demoTree();
  const before = structuredClone(tree);
  assert.deepEqual(getFamilyLinkSuggestion(tree, ['felix', 'clara', 'anna', 'paul']), {
    parentIds: ['clara', 'paul'], childIds: ['felix', 'anna'],
  });
  assert.deepEqual(getFamilyLinkSuggestion(tree, ['clara', 'otto', 'martha']), {
    parentIds: ['otto', 'martha'], childIds: ['clara'],
  });
  assert.deepEqual(tree, before);
});

test('ambiguous, skipped-generation and invalid family proposals leave roles open', () => {
  const tree = demoTree();
  const before = structuredClone(tree);
  for (const ids of [[], ['otto'], ['otto', 'martha'], ['otto', 'paul', 'anna'],
    ['otto', 'anna'], ['otto', 'missing'], ['otto', 'otto', 'paul'],
    ['paul', 'clara', 'johanna', 'anna'], ['johanna', 'anna']]) {
    assert.equal(getFamilyLinkSuggestion(tree, ids), null, ids.join(', '));
  }
  assert.deepEqual(tree, before);
});

test('linking existing partners preserves other partnerships, order and source data and is idempotent', () => {
  const tree = demoTree();
  const before = structuredClone(tree);
  const result = linkPeople(tree, { partnerIds: ['paul', 'johanna'] });
  assert.deepEqual(result.people.find(p => p.id === 'paul').partnerIds, ['clara', 'johanna']);
  assert.deepEqual(result.people.find(p => p.id === 'johanna').partnerIds, ['paul']);
  assert.deepEqual(result.people.map(p => p.id), tree.people.map(p => p.id));
  assert.deepEqual(linkPeople(result, { partnerIds: ['johanna', 'paul'] }), result);
  assert.deepEqual(tree, before);
});

test('linking two parents to several existing children preserves known parents without inventing partnerships', () => {
  const tree = validateTree({ ...createTree(), people: [
    createPerson({ id: 'a', firstName: 'Alex' }),
    createPerson({ id: 'b', firstName: 'Bela' }),
    createPerson({ id: 'c', firstName: 'Chris', parentIds: ['a'] }),
    createPerson({ id: 'd', firstName: 'Dora' }),
  ] });
  const before = structuredClone(tree);
  const relationship = { parentIds: ['a', 'b'], childIds: ['c', 'd'] };
  const result = linkPeople(tree, relationship);
  assert.deepEqual(result.people.find(p => p.id === 'c').parentIds, ['a', 'b']);
  assert.deepEqual(result.people.find(p => p.id === 'd').parentIds, ['a', 'b']);
  assert.ok(result.people.every(p => !p.partnerIds.length));
  assert.deepEqual(linkPeople(result, relationship), result);
  assert.deepEqual(tree, before);
});

test('failed bulk links preserve every person when a later child exceeds parent limits or creates a cycle', () => {
  const tree = demoTree();
  const before = structuredClone(tree);
  assert.throws(() => linkPeople(tree, { parentIds: ['otto'], childIds: ['clara', 'anna'] }), /höchstens zwei/);
  assert.throws(() => linkPeople(tree, { parentIds: ['anna'], childIds: ['clara'] }), /Kreis/);
  assert.throws(() => linkPeople(tree, { parentIds: ['otto'], childIds: ['otto'] }), /zugleich/);
  assert.deepEqual(tree, before);
});

test('bulk links reject missing IDs, ambiguous modes, duplicate selections and incomplete roles', () => {
  const tree = demoTree();
  const before = structuredClone(tree);
  for (const relationship of [
    undefined, {}, { partnerIds: [] }, { partnerIds: ['otto'] },
    { partnerIds: ['otto', 'martha', 'paul'] }, { partnerIds: ['otto', 'otto'] },
    { partnerIds: ['otto', 'missing'] }, { parentIds: ['missing'], childIds: ['otto'] },
    { parentIds: ['otto'], childIds: ['missing'] }, { parentIds: [], childIds: ['otto'] },
    { parentIds: ['otto'], childIds: [] }, { parentIds: ['otto', 'otto'], childIds: ['clara'] },
    { parentIds: ['otto'], childIds: ['clara', 'clara'] },
    { parentIds: ['otto', 'martha', 'paul'], childIds: ['clara'] },
    { partnerIds: ['otto', 'martha'], parentIds: ['paul'], childIds: ['clara'] },
  ]) assert.throws(() => linkPeople(tree, relationship));
  assert.deepEqual(tree, before);
});
