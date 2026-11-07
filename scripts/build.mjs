import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
const files = [
  'index.html', 'favicon.svg',
  'src/app.js', 'src/domain.js', 'src/storage.js', 'src/report.js', 'src/style.css',
];

await mkdir(join(output, 'src'), { recursive: true });
for (const file of files) {
  await copyFile(join(root, file), join(output, file));
}
console.log('Statische Anwendung nach dist/ gebaut. Alle Ressourcen sind lokal enthalten.');
