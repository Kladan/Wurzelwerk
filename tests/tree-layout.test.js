import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerson } from '../src/domain.js';
import { familyConnections, connectionMarkup } from '../src/tree-layout.js';

test('siblings share a family bus while a second parent pair keeps a separate connection', () => {
  const person = (id, parentIds = []) => createPerson({ id, firstName: id, parentIds });
  const tree = { people: [person('a'), person('b'), person('c'), person('d'),
    person('ab1', ['a', 'b']), person('cd', ['c', 'd']), person('ab2', ['b', 'a'])] };
  const nodes = new Map();
  ['a', 'b', 'c', 'd'].forEach((id, i) => nodes.set(id, { x: i * 200, y: 0, width: 180, height: 120, row: 0 }));
  ['ab1', 'ab2', 'cd'].forEach((id, i) => nodes.set(id, { x: i * 200, y: 240, width: 180, height: 120, row: 1 }));
  const before = structuredClone(tree);
  const families = familyConnections(tree, nodes);
  assert.equal(families.length, 2);
  assert.deepEqual(families[0].children, ['ab1', 'ab2']);
  assert.deepEqual(families[0].parentIds, ['a', 'b']);
  assert.deepEqual(families[1].children, ['cd']);
  assert.deepEqual(families[1].parentIds, ['c', 'd']);
  // Every horizontal junction stays in the empty inter-generation corridor.
  for (const family of families) for (const point of family.junctions) {
    assert.ok(point.y > 120 && point.y < 240);
  }
  assert.notEqual(families[0].junctions[0].y, families[1].junctions[0].y);
  const markup = connectionMarkup(families, 'cd');
  assert.equal((markup.match(/class="family-connection related"/g) ?? []).length, 1);
  assert.ok(markup.includes('connection-halo'));
  assert.equal(markup.includes(' C'), false);
  assert.deepEqual(tree, before);
});

test('long ancestry references never draw through intermediate person cards', () => {
  const tree = { people: [createPerson({ id: 'a', firstName: 'A' }),
    createPerson({ id: 'b', firstName: 'B', parentIds: ['a'] })] };
  const nodes = new Map([
    ['a', { x: 0, y: 0, width: 180, height: 120, row: 0 }],
    ['b', { x: 0, y: 480, width: 180, height: 120, row: 2 }],
  ]);
  const [family] = familyConnections(tree, nodes);
  assert.deepEqual(family.linkedIds, ['a', 'b']);
  assert.deepEqual(family.paths, []);
  assert.equal(connectionMarkup([family]), '');
});
