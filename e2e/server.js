// Petit serveur statique pour les tests e2e.
// Reproduit le comportement "cleanUrls" de Vercel : /apprendre-phase2 → apprendre-phase2.html
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..'); // racine du dépôt (où vivent les .html)
const PORT = process.env.PORT || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // Empêche la traversée de répertoire
  let filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  // cleanUrls : si pas d'extension et fichier absent, essaie .html
  if (!path.extname(filePath) && !fs.existsSync(filePath)) {
    filePath += '.html';
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found: ' + urlPath);
    send(res, 200, data, TYPES[path.extname(filePath)] || 'application/octet-stream');
  });
});

server.listen(PORT, () => console.log(`e2e server: http://localhost:${PORT} (racine: ${ROOT})`));
