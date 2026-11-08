import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ...['app.js', 'domain.js', 'storage.js', 'report.js', 'tree-layout.js'].map(name => [
    `/src/${name}`, [`src/${name}`, 'text/javascript; charset=utf-8'],
  ]),
  ['/src/style.css', ['src/style.css', 'text/css; charset=utf-8']],
]);

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/** This server supplies application files only; family data never reaches it. */
export function createServer({ root = projectRoot } = {}) {
  return createHttpServer(async (request, response) => {
    const reply = (status, message) => {
      response.writeHead(status, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : message);
    };

    // Reject foreign Host headers as well as binding to loopback to resist DNS rebinding.
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(request.headers.host ?? '')) {
      reply(403, 'Nur lokal erreichbar.');
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      reply(405, 'Methode nicht erlaubt.');
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent((request.url ?? '').split('?')[0]);
    } catch {
      reply(400, 'Ungültige Adresse.');
      return;
    }
    // A fixed allowlist avoids path normalization accidentally exposing project files.
    const asset = assets.get(pathname);
    if (!asset) {
      reply(404, 'Nicht gefunden.');
      return;
    }
    try {
      const content = await readFile(join(root, asset[0]));
      response.writeHead(200, {
        ...securityHeaders,
        'Content-Type': asset[1],
        'Content-Length': content.length,
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch {
      reply(404, 'Nicht gefunden.');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT muss eine ganze Zahl zwischen 1 und 65535 sein.');
    process.exitCode = 1;
  } else {
    const server = createServer();
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE'
        ? `Port ${port} ist belegt. Beende die andere Instanz oder setze PORT.`
        : 'Der lokale Server konnte nicht gestartet werden.');
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`FamilyTree läuft lokal: http://127.0.0.1:${port}`);
      console.log('Zum Beenden Strg+C drücken. Keine Synchronisierung, keine Cloud.');
    });
  }
}
