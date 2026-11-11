import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const run = args => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
try {
  let existing = '';
  try { existing = run(['config', '--get', 'core.hooksPath']); }
  catch (error) { if (error.status !== 1) throw error; }
  if (existing && existing !== '.githooks') {
    throw new Error(`Vorhandener hooksPath bleibt erhalten: ${existing}. Hooks bitte manuell integrieren.`);
  }
  run(['config', '--local', 'core.hooksPath', '.githooks']);
  console.log('Lokale Commit-Hooks aktiviert (.githooks).');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
