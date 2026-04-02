const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 4173;
const rootDir = __dirname;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function resolvePath(urlPathname) {
  const safePath = path.normalize(decodeURIComponent(urlPathname)).replace(/^(\.\.[/\\])+/, '');
  const requestedPath = safePath === path.sep ? 'index.html' : safePath.replace(/^[/\\]+/, '');
  return path.join(rootDir, requestedPath);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = resolvePath(url.pathname);

  if (!filePath.startsWith(rootDir)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (!statErr && stats.isDirectory())
      filePath = path.join(filePath, 'index.html');

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        if (readErr.code === 'ENOENT')
          send(res, 404, 'Not found');
        else
          send(res, 500, 'Internal server error');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, data, contentTypes[ext] || 'application/octet-stream');
    });
  });
});

server.listen(port, () => {
  console.log(`Echo-Prompter available at http://localhost:${port}`);
});
