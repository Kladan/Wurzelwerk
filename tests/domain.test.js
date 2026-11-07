import test from 'node:test';
import assert from 'node:assert/strict';
import { createTree, createPerson, validateTree, upsertPerson, deletePerson, getGenerations, demoTree } from '../src/domain.js';

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
