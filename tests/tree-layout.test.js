import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerson } from '../src/domain.js';
import { familyConnections, connectionMarkup, connectionGap } from '../src/tree-layout.js';

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
  assert.ok(markup.includes(' Q')); // Real curved elbows, rather than round caps.
  assert.equal(markup.includes(' C'), false);
  const tile = connectionMarkup(families, null, { x: 200, y: 0, width: 400, height: 400 });
  assert.equal(tile.includes('M90 '), false); // Off-sheet parent/child stems are absent.
  assert.ok(tile.includes('L290 240')); // The visible sibling still has its connection.
  for (const match of tile.matchAll(/d="M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+)"/g)) {
    assert.ok(Number(match[1]) >= 200 && Number(match[1]) <= 600);
    assert.ok(Number(match[3]) >= 200 && Number(match[3]) <= 600);
  }
  assert.deepEqual(tree, before);
});

test('crowded generations retain twelve-pixel lanes and all card endpoints', () => {
  const nodes = new Map();
  const parents = [], children = [];
  for (let i = 0; i < 16; i++) {
    const parent = createPerson({ id: `p${i}`, firstName: 'Parent' });
    const child = createPerson({ id: `c${i}`, firstName: 'Child', parentIds: [parent.id] });
    parents.push(parent); children.push(child);
    nodes.set(parent.id, { x: i * 200, y: 0, width: 180, height: 120, row: 0 });
    nodes.set(child.id, { x: (15 - i) * 200, y: 0, width: 180, height: 120, row: 1 });
  }
  const gap = connectionGap(children);
  for (const child of children) nodes.get(child.id).y = 120 + gap;
  const tree = { people: [...parents, ...children] };
  const before = structuredClone(tree);
  const families = familyConnections(tree, nodes);
  const lanes = [];
  for (const family of families) {
    assert.equal(family.curves.length, 2);
    assert.equal(family.junctions.length, 0); // A bend is not a branch.
    const p = nodes.get(family.parentIds[0]), c = nodes.get(family.children[0]);
    assert.ok(family.segments.some(s => s.x1 === p.x + 90 && s.y1 === 120));
    assert.ok(family.segments.some(s => s.x2 === c.x + 90 && s.y2 === c.y));
    for (const curve of family.curves) lanes.push(curve.corner.y);
  }
  const distinctLanes = [...new Set(lanes)].sort((a, b) => a - b);
  assert.equal(distinctLanes.length, 16);
  for (let i = 1; i < distinctLanes.length; i++) assert.ok(distinctLanes[i] - distinctLanes[i - 1] >= 12);
  assert.deepEqual(tree, before);
});

test('aligned single-parent connections stay straight and sibling buses keep their branches', () => {
  const parent = createPerson({ id: 'p', firstName: 'P' });
  const child = id => createPerson({ id, firstName: id, parentIds: ['p'] });
  const nodes = new Map([
    ['p', { x: 200, y: 0, width: 180, height: 120, row: 0 }],
    ['a', { x: 200, y: 240, width: 180, height: 120, row: 1 }],
    ['b', { x: 0, y: 240, width: 180, height: 120, row: 1 }],
    ['c', { x: 400, y: 240, width: 180, height: 120, row: 1 }],
  ]);
  const [straight] = familyConnections({ people: [parent, child('a')] }, nodes);
  assert.equal(straight.curves.length, 0);
  assert.equal(straight.junctions.length, 0);
  const [siblings] = familyConnections({ people: [parent, ...['a', 'b', 'c'].map(child)] }, nodes);
  assert.equal(siblings.curves.length, 2);
  assert.deepEqual(siblings.junctions.map(p => p.x), [290]);
  const print = connectionMarkup([siblings], null, { x: 88, y: 0, width: 8, height: 400 });
  assert.ok(print.includes(' Q'));
  assert.ok(print.includes('overflow="hidden"')); // The rounded corner is clipped at the sheet edge.
  assert.equal(print.includes('<circle'), false);
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
