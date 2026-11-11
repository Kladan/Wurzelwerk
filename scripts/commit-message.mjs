import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const conventional = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^\r\n()]+\))?!?: \S[^\r\n]*$/u;

export function prepareMessage(message, files = [], source = '') {
  // Git-generated messages and reused messages retain their original meaning.
  if (['merge', 'squash', 'commit'].includes(source)) return message;
  const [subject] = message.split(/\r?\n/u);
  if (!subject?.trim() || subject.startsWith('#') || conventional.test(subject)
    || /^(fixup! |squash! |amend! |Merge |Revert ")/u.test(subject)) return message;
  // A supplied (but invalid) prefix is for the author to correct, not overwrite.
  if (/^[\w-]+(?:\([^)]*\))?!?:/u.test(subject)) return message;
  let type = 'chore';
  if (/^(fix\b|correct\b|repair\b|preserve\b|prevent\b|beheb|korrig)/iu.test(subject)) type = 'fix';
  else if (/^(add\b|support\b|show\b|persist\b|implement\b|ergänz|implementier)/iu.test(subject)) type = 'feat';
  else if (/^(refactor\b|restrukturier)/iu.test(subject)) type = 'refactor';
  else if (files.length && files.every(file => /(^docs\/|\.(md|txt)$)/iu.test(file))) type = 'docs';
  else if (files.length && files.every(file => /(^tests\/|\.(test|spec)\.[cm]?js$)/u.test(file))) type = 'test';
  else if (files.length && files.every(file => /\.(css|scss)$/u.test(file))) type = 'style';
  return `${type}: ${message}`;
}

export function validMessage(message) {
  let subject = message.split(/\r?\n/u)[0];
  if (/^(Merge |Revert ")/u.test(subject)) return true;
  subject = subject.replace(/^(fixup! |squash! |amend! )+/u, '');
  return conventional.test(subject);
}

if (process.argv[2] === 'prepare' || process.argv[2] === 'validate') {
  const [, , mode, path, source = ''] = process.argv;
  try {
    let message = readFileSync(path, 'utf8');
    if (mode === 'prepare' || !validMessage(message)) {
      const files = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { encoding: 'utf8' })
        .split('\0').filter(Boolean);
      const prepared = prepareMessage(message, files, source);
      if (prepared !== message) {
        writeFileSync(path, prepared, 'utf8');
        process.stderr.write(`Commit-Typ ergänzt: ${prepared.split(/\r?\n/u)[0]}\n`);
        message = prepared;
      }
    }
    if (mode === 'validate' && !validMessage(message)) {
      process.stderr.write('Commit abgebrochen: erwartet wird z. B. feat: Beschreibung oder fix(baum): Beschreibung.\n');
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`Commit-Hook fehlgeschlagen: ${error.message}\n`);
    process.exitCode = 1;
  }
}
