/**
 * ASTRA desktop preview: serves local WebView assets without Android SDK.
 * Listens ONLY on 127.0.0.1. Requires Node.js 22+.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ASSET_DIR = resolve(here, '../app/src/main/assets');
const CATALOG_DIR = resolve(here, '../dev/ui-catalog');
const CATALOG_FILES = new Map([
  ['/ui-catalog', 'index.html'],
  ['/ui-catalog/', 'index.html'],
  ['/ui-catalog/catalog.js', 'catalog.js'],
  ['/ui-catalog/catalog.css', 'catalog.css'],
]);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

export function createPreviewServer(assets = DEFAULT_ASSET_DIR) {
  const root = resolve(assets);
  return createServer(async (request, response) => {
    const method = request.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }
    try {
      const url = new URL(request.url || '/', 'http://localhost');
      const filename = decodeURIComponent(url.pathname);
      if (filename.includes('\0') || filename.includes('\\')) throw new Error('Invalid filename');
      const relative = filename === '/' ? 'index.html' : filename.replace(/^\/+/, '');
      // Only the local development server serves these exact files. They are
      // outside Android assets and never included in an APK.
      const catalogFile = root === DEFAULT_ASSET_DIR ? CATALOG_FILES.get(filename) : undefined;
      const allowedRoot = catalogFile ? CATALOG_DIR : root;
      const pathname = resolve(join(allowedRoot, catalogFile || relative));
      if (!pathname.startsWith(allowedRoot + sep)) {
        response.writeHead(403); response.end('Forbidden'); return;
      }
      const info = await stat(pathname).catch(() => null);
      if (!info?.isFile()) {
        response.writeHead(404); response.end('Not found'); return;
      }
      response.writeHead(200, {
        'Content-Type': TYPES[extname(pathname)] || 'application/octet-stream',
        'Content-Length': info.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (method === 'HEAD') response.end();
      else createReadStream(pathname).pipe(response);
    } catch {
      response.writeHead(400); response.end('Bad request');
    }
  });
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Port invalide : choisissez un entier entre 1 et 65535.');
    process.exitCode = 1;
  } else {
    const server = createPreviewServer();
    server.on('error', (error) => {
      console.error('Impossible de lancer le serveur local :', error.message);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log('\nASTRA Preview PC : http://127.0.0.1:' + port + '/');
      console.log('Catalogue UI interne : http://127.0.0.1:' + port + '/ui-catalog/');
      console.log('Ouvrez cette adresse dans votre navigateur. Arrêt : Ctrl+C.');
      console.log('Le calcul reste local. La recherche de ville exige une connexion Internet.\n');
    });
  }
}
