import test from 'node:test';
import assert from 'node:assert/strict';
import { ageAtDeath, createPerson, createTree } from '../src/domain.js';
import { formatAgeAtDeath, lifespan, reportMarkup, reportDocument, treePrintMarkup } from '../src/report.js';

test('death ages preserve date precision and use completed calendar years, months and days', () => {
  const cases = [
    ['1932-04-18', '2015-04-17', '82 Jahre'],
    ['1932-04-18', '2015-04-18', '83 Jahre'],
    ['1932', '2015', '82–83 Jahre'],
    ['1932-04', '2015-04', '82–83 Jahre'],
    ['1932-04', '2015-05', '83 Jahre'],
    ['1932-04-18', '2015', '82–83 Jahre'],
    ['1932', '2015-04-18', '82–83 Jahre'],
    ['2024-02-29', '2025-02-28', '11 Monate'],
    ['2024-02-29', '2025-03-01', '1 Jahr'],
    ['2024-01-15', '2024-02-15', '1 Monat'],
    ['2024-01-31', '2024-02-29', '29 Tage'],
    ['2024-02-28', '2024-03-01', '2 Tage'],
    ['2023-02-28', '2023-03-01', '1 Tag'],
    ['2024-03-30', '2024-04-01', '2 Tage'],
    ['2024-05-01', '2024-05-01', 'unter 1 Tag'],
    ['2024-02', '2024-02', '0–28 Tage'],
    ['2024', '2024', '0–11 Monate'],
    ['0099-12-31', '0100-01-01', '1 Tag'],
    ['', '2015', ''], ['1932', '', ''], ['', '', ''],
  ];
  for (const [birthDate, deathDate, expected] of cases) {
    const person = createPerson({ firstName: 'Fiktiv', birthDate, deathDate });
    const before = structuredClone(person);
    assert.equal(formatAgeAtDeath(person), expected, `${birthDate} / ${deathDate}`);
    assert.deepEqual(person, before);
  }
  assert.equal(ageAtDeath({ birthDate: '2000', deathDate: '1990' }), null);
});

test('all documents show death ages without persisting derived facts or inventing a living age', () => {
  const tree = createTree('Fiktive Altersprobe');
  tree.people = [createPerson({ id: 'a', firstName: '<Fiktiv>', nickname: 'Probe', labels: ['Test'], birthDate: '1932', deathDate: '2015' }),
    createPerson({ id: 'b', firstName: 'Offen', birthDate: '2000' })];
  const before = JSON.stringify(tree);
  assert.equal(lifespan(tree.people[0]), '1932 – 2015 · 82–83 Jahre');
  assert.equal(lifespan(tree.people[1]), 'geb. 2000');
  for (const render of [reportMarkup, reportDocument]) {
    const output = render(tree);
    assert.match(output, /Alter: 82–83 Jahre/);
    assert.ok(output.includes('&lt;Fiktiv&gt;'));
    assert.ok(!render(tree, { hiddenPersonIds: ['a'] }).includes('82–83 Jahre'));
  }
  for (const paper of ['A4', 'A3']) for (const singlePage of [false, true]) {
    const output = treePrintMarkup(tree, { paper, singlePage, includeLabels: true, includeIndex: true });
    assert.match(output, /class="tree-print-age"[^>]*>82–83 Jahre<\/text>/);
    assert.ok(output.includes('1932 – 2015 · 82–83 Jahre'));
    assert.ok(!treePrintMarkup(tree, { hiddenPersonIds: ['a'] }).includes('tree-print-age'));
  }
  assert.equal(JSON.stringify(tree), before);
});
