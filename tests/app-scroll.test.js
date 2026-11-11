import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as domain from '../src/domain.js';
import * as report from '../src/report.js';
import * as layout from '../src/tree-layout.js';

const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '');

test('saving a person preserves both scroll axes across consecutive renders and frames', () => {
  let stored = domain.createTree();
  stored.people = [domain.createPerson({ id: 'fictional', firstName: 'Fiktiv' })];
  let scroll;
  let submit;
  const frames = [];
  const node = { dataset: {}, addEventListener() {}, querySelectorAll: () => [] };
  const form = { addEventListener(type, callback) { if (type === 'submit') submit = callback; } };
  const editor = {
    ...node,
    querySelector: selector => selector === 'form' ? form : { ...node, value: '' },
    showModal() { this.open = true; },
    close() { this.open = false; },
  };
  const app = {
    ...node,
    querySelector: () => null,
    // Replacing the DOM resets the new scroll container, as in the browser.
    set innerHTML(markup) { scroll = markup.includes('class="tree-scroll"') ? { scrollLeft: 0, scrollTop: 0 } : null; },
  };
  const fields = new Map([
    ['firstName', 'Geändert'], ['lastName', ''], ['labels', ''],
  ]);
  fields.getAll = () => [];
  const context = {
    ...domain, ...report, ...layout, e: report.escapeHtml,
    loadTree: () => structuredClone(stored),
    saveTree: next => { stored = domain.validateTree(next); return stored; },
    document: { querySelector: selector => ({ '#app': app, '#editor': editor, '#toast': node, '.tree-scroll': scroll })[selector] ?? null },
    window: { addEventListener() {}, matchMedia: () => node },
    requestAnimationFrame: callback => frames.push(callback),
    setTimeout() {}, clearTimeout() {},
    FormData: function () { return fields; },
  };
  runInNewContext(source + '\neditPerson(tree.people[0]);', context);
  scroll.scrollLeft = 740;
  scroll.scrollTop = 325;
  submit({ preventDefault() {}, currentTarget: form });
  assert.equal(stored.people[0].firstName, 'Geändert');
  assert.equal(editor.open, false);
  assert.deepEqual(scroll, { scrollLeft: 740, scrollTop: 325 });
  // All renders queued before the next frame must retain the same position.
  for (const frame of frames) frame();
  assert.deepEqual(scroll, { scrollLeft: 740, scrollTop: 325 });
});
