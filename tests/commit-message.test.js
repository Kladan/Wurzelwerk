import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareMessage, validMessage } from '../scripts/commit-message.mjs';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

test('commit types use subject intent, then staged paths, with a transparent chore fallback', () => {
  assert.equal(prepareMessage('Add labels\n\nDetails\n', ['src/app.js']), 'feat: Add labels\n\nDetails\n');
  assert.equal(prepareMessage('Preserve scroll position', ['src/app.js']), 'fix: Preserve scroll position');
  assert.equal(prepareMessage('Anleitung aktualisieren', ['README.md', 'docs/review.md']), 'docs: Anleitung aktualisieren');
  assert.equal(prepareMessage('Grenzfälle prüfen', ['tests/domain.test.js']), 'test: Grenzfälle prüfen');
  assert.equal(prepareMessage('Farben anpassen', ['src/style.css']), 'style: Farben anpassen');
  assert.equal(prepareMessage('Werkzeuge anpassen', ['scripts/build.mjs', 'README.md']), 'chore: Werkzeuge anpassen');
});

test('explicit types, empty messages, bodies, reused and Git-generated subjects survive preparation', () => {
  for (const message of ['fix(baum)!: Korrektur\r\n\r\nDetails', '', '\n# Kommentar', 'fixup! feat: Labels', 'squash! fix: Baum', 'amend! feat: Baum', 'Merge branch "topic"', 'Revert "feat: Baum"', 'typo: Inhalt']) {
    assert.equal(prepareMessage(message, ['src/app.js']), message);
  }
  for (const source of ['merge', 'squash', 'commit']) {
    assert.equal(prepareMessage('Original', [], source), 'Original');
  }
});

test('validation rejects unknown types and empty subjects but permits scopes, breaking changes and autosquash', () => {
  for (const message of ['feat: Labels', 'fix(baum)!: Korrektur\n\nText', 'fixup! feat: Labels', 'squash! fix: Baum', 'amend! feat: Baum', 'Merge branch "topic"', 'Revert "feat: Baum"']) {
    assert.ok(validMessage(message), message);
  }
  for (const message of ['', 'Ohne Typ', 'typo: Inhalt', 'feat:', 'fix: ', 'fix(): Text', 'fixup! Ohne Typ']) {
    assert.equal(validMessage(message), false, message);
  }
});

test('real Git hooks add prefixes, preserve bodies, and abort invalid commits without losing staged files', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'wurzelwerk-hooks-'));
  const env = { ...process.env, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'safe.directory', GIT_CONFIG_VALUE_0: cwd };
  const git = args => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  const commit = args => git(['-c', 'user.name=Hook Test', '-c', 'user.email=hook@example.invalid', 'commit', ...args]);
  try {
    git(['init', '--quiet']);
    mkdirSync(join(cwd, 'scripts'));
    mkdirSync(join(cwd, '.githooks'));
    for (const file of ['scripts/commit-message.mjs', 'scripts/setup-hooks.mjs', '.githooks/prepare-commit-msg', '.githooks/commit-msg']) {
      copyFileSync(new URL(`../${file}`, import.meta.url), join(cwd, file));
      if (file.startsWith('.githooks/')) chmodSync(join(cwd, file), 0o755);
    }
    execFileSync(process.execPath, ['scripts/setup-hooks.mjs'], { cwd, env });
    git(['add', '.']);
    commit(['-m', 'Add commit hooks', '-m', 'Body stays intact.']);
    assert.equal(git(['log', '-1', '--format=%B']), 'feat: Add commit hooks\n\nBody stays intact.');
    const head = git(['rev-parse', 'HEAD']);
    writeFileSync(join(cwd, 'README.md'), 'Test\n');
    git(['add', 'README.md']);
    assert.throws(() => commit(['-m', 'wrong: Subject']));
    assert.equal(git(['rev-parse', 'HEAD']), head);
    assert.equal(git(['diff', '--cached', '--name-only']), 'README.md');
    commit(['-m', 'Anleitung aktualisieren']);
    assert.equal(git(['log', '-1', '--format=%s']), 'docs: Anleitung aktualisieren');
    commit(['--allow-empty', '--fixup=HEAD']);
    assert.equal(git(['log', '-1', '--format=%s']), 'fixup! docs: Anleitung aktualisieren');
    const editor = join(cwd, 'editor.mjs');
    writeFileSync(editor, "import { writeFileSync } from 'node:fs'; writeFileSync(process.argv[2], 'Korrigiere Baumposition\\n\\nEditor body.\\n');\n");
    env.GIT_EDITOR = `"${process.execPath.replaceAll('\\', '/')}" "${editor.replaceAll('\\', '/')}"`;
    commit(['--allow-empty']);
    assert.equal(git(['log', '-1', '--format=%B']), 'fix: Korrigiere Baumposition\n\nEditor body.');
    git(['config', '--local', 'core.hooksPath', 'existing-hooks']);
    const setup = spawnSync(process.execPath, ['scripts/setup-hooks.mjs'], { cwd, env, encoding: 'utf8' });
    assert.equal(setup.status, 1);
    assert.equal(git(['config', '--local', '--get', 'core.hooksPath']), 'existing-hooks');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
