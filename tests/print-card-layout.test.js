import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerson, createTree, validateTree } from '../src/domain.js';
import { treePrintMarkup } from '../src/report.js';

const cards = output => [...output.matchAll(/<g class="tree-print-card[^]*?<\/g>/g)].map(match => match[0]);
const labelLines = card => [...card.matchAll(/class="tree-print-labels"[^>]*>([^]*?)<\/text>/g)].map(match => match[1]);
const rectangle = card => [...card.match(/<rect [^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/)].slice(1).map(Number);

test('print labels use two lines, preserve words and Unicode, and append only actual overflow', () => {
  for (const [labels, expected, overflow] of [
    [['Krieg', 'Auswanderung nach Berlin'], ['Krieg · Auswanderung nach', 'Berlin'], false],
    [['A'.repeat(25), 'Kurz'], ['A'.repeat(25), 'Kurz'], false],
    [['X'.repeat(52)], ['X'.repeat(26), 'X'.repeat(26)], false],
    [['X'.repeat(53)], ['X'.repeat(26), 'X'.repeat(26) + '…'], true],
    [['🌳'.repeat(27)], ['🌳'.repeat(26), '🌳'], false],
    [['<Fiktiv> & Erinnerung'], ['&lt;Fiktiv&gt; &amp; Erinnerung'], false],
  ]) {
    const tree = { ...createTree(), people: [createPerson({ id: 'p', firstName: 'Probe', labels })] };
    for (const paper of ['A4', 'A3']) for (const singlePage of [false, true]) {
      const output = treePrintMarkup(tree, { includeLabels: true, paper, singlePage });
      assert.deepEqual(labelLines(cards(output)[0]), expected);
      assert.equal(output.includes('Vollständige Labels der gedruckten Personen'), overflow);
      assert.equal(output.includes('Labels mit … sind gekürzt'), overflow);
      assert.equal(output.includes('<Fiktiv>'), false);
    }
  }
});

test('print generations reserve only required text height while retaining rows, connections and data', () => {
  const tree = validateTree({ ...createTree(), people: [
    createPerson({ id: 'full', firstName: 'Fiktive lange ursprüngliche Vornamen', nickname: 'Fiktiver langer Spitzname', lastName: 'Linden', birthName: 'Sommer', birthDate: '1920', deathDate: '1990', labels: ['Erinnerung an eine fiktive Reise nach Berlin und Bonn'] }),
    createPerson({ id: 'peer', firstName: 'Kurz' }),
    createPerson({ id: 'child', firstName: 'Kind', birthName: 'Sommer', lastName: 'Linden', birthDate: '1950', parentIds: ['full'], labels: ['Krieg', 'Auswanderung nach Berlin'] }),
  ] });
  const before = structuredClone(tree);
  for (const paper of ['A4', 'A3']) for (const singlePage of [false, true]) {
    const output = treePrintMarkup(tree, { includeLabels: true, singlePage, paper });
    const rendered = cards(output);
    assert.equal(rendered.length, 3);
    const full = rendered.find(card => card.includes('Fiktiver langer Spitzname Linden'));
    const child = rendered.find(card => card.includes('<title>Kind Linden'));
    const peer = rendered.find(card => card.includes('<title>Kurz'));
    assert.equal(rectangle(full)[1], rectangle(peer)[1]);
    assert.ok(rectangle(child)[1] < rectangle(full)[1]);
    assert.ok(rectangle(child)[1] < 190); // Previously every card reserved 190 units.
    for (const card of rendered) {
      const [top, height] = rectangle(card);
      const rows = [...card.matchAll(/<text [^>]*y="([\d.]+)"[^>]*>([^]*?)<\/text>/g)];
      assert.ok(rows.every(row => Number(row[1]) >= top + 20 && Number(row[1]) <= top + height - 10));
      for (let i = 1; i < rows.length; i++) assert.ok(Number(rows[i][1]) - Number(rows[i - 1][1]) >= 22);
    }
    assert.ok(output.includes('<path d="M'));
    const withoutLabels = treePrintMarkup(tree, { includeLabels: false, singlePage, paper });
    assert.equal(withoutLabels.includes('tree-print-labels'), false);
    assert.ok(rectangle(cards(withoutLabels).find(card => card.includes('Fiktiver langer Spitzname Linden')))[1] < rectangle(full)[1]);
    const hidden = treePrintMarkup(tree, { includeLabels: true, hiddenPersonIds: ['full'], paper, singlePage });
    assert.equal(hidden.includes('Fiktiver langer Spitzname'), false);
    assert.equal(cards(hidden).length, 2);
  }
  assert.deepEqual(tree, before);
});
