import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { createServer } from '../server.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'familytree-server-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'index.html'), '<h1>FamilyTree</h1>');
  await writeFile(join(root, 'src', 'app.js'), 'export const local = true;');
  await writeFile(join(root, 'package.json'), '{"secret":"not public"}');
  const server = createServer({ root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    const withinTemp = relative(tmpdir(), root);
    assert.ok(withinTemp && !withinTemp.startsWith('..') && !isAbsolute(withinTemp));
    // Delete only the test-owned directory verified to remain within the OS temp directory.
    await rm(root, { recursive: true, force: true });
  });
  return ({ path = '/', method = 'GET', host } = {}) => new Promise((resolve, reject) => {
    const req = request({
      host: '127.0.0.1', port: server.address().port, path, method,
      headers: host ? { Host: host } : {},
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves local assets with browser security headers and correct MIME types', async t => {
  const get = await fixture(t);
  const page = await get();
  assert.equal(page.status, 200);
  assert.match(page.body, /FamilyTree/);
  assert.match(page.headers['content-type'], /text\/html/);
  assert.match(page.headers['content-security-policy'], /connect-src 'none'/);
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.equal(page.headers['cache-control'], 'no-store');
  const script = await get({ path: '/src/app.js?v=1' });
  assert.equal(script.status, 200);
  assert.match(script.headers['content-type'], /javascript/);
  const head = await get({ method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
});

test('never exposes arbitrary project files, encoded traversal or unsupported methods', async t => {
  const get = await fixture(t);
  for (const path of ['/package.json', '/.git/config', '/src/../package.json', '/%2e%2e/package.json', '/src%5c..%5cpackage.json', '//index.html']) {
    assert.equal((await get({ path })).status, 404, path);
  }
  assert.equal((await get({ path: '/%ZZ' })).status, 400);
  assert.equal((await get({ method: 'POST' })).status, 405);
  assert.equal((await get({ host: 'external.example' })).status, 403);
});
