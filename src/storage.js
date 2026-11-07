import { createTree, validateTree } from './domain.js';

export const STORAGE_KEY = 'wurzelwerk.tree.v1';
let expectedRaw;

export function loadTree() {
  expectedRaw = localStorage.getItem(STORAGE_KEY);
  return expectedRaw === null ? createTree() : validateTree(JSON.parse(expectedRaw));
}

export function saveTree(tree) {
  const validated = validateTree(tree);
  if (localStorage.getItem(STORAGE_KEY) !== expectedRaw) {
    throw new Error('Der Stammbaum wurde in einem anderen Fenster geändert. Bitte zuerst die Seite neu laden. Deine Eingaben bleiben bis dahin im Formular.');
  }
  const serialized = JSON.stringify(validated);
  try { localStorage.setItem(STORAGE_KEY, serialized); }
  catch { throw new Error('Der Browser konnte nicht speichern. Bitte freien Speicher und Browser-Einstellungen prüfen und eine Sicherung herunterladen.'); }
  expectedRaw = serialized;
  return validated;
}

export function downloadFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(title) {
  return title.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 70) || 'Stammbaum';
}
