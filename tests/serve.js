// Local static server for tests and previews.
// Serves the repo root and applies the same headers as vercel.json,
// so content-security-policy problems show up locally before they go live.
// Usage: node tests/serve.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};
// Only these folders are part of the deployed site (see .vercelignore)
const PUBLIC = /^\/(index\.html|css\/[\w.-]+|js\/[\w.-]+|img\/[\w.-]+)$/;

// vercel.json "source" patterns like "/img/(.*)" are regular expressions over the path
function headersFor(urlPath) {
  const out = {};
  for (const rule of config.headers || []) {
    if (new RegExp('^' + rule.source + '$').test(urlPath)) {
      for (const h of rule.headers) out[h.key] = h.value;
    }
  }
  return out;
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath === '/') urlPath = '/index.html';
  const headers = headersFor(urlPath === '/index.html' ? '/' : urlPath);
  if (!PUBLIC.test(urlPath)) {
    res.writeHead(404, headers);
    return res.end('Not found');
  }
  fs.readFile(path.join(ROOT, urlPath), (err, data) => {
    if (err) { res.writeHead(404, headers); return res.end('Not found'); }
    res.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(urlPath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Serving on http://localhost:${PORT}`));
