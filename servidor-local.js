const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 4173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.mp3': 'audio/mpeg'
};

function send(res, status, body, type = 'text/plain; charset=utf-8'){
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const cleanUrl = decodeURIComponent(req.url.split('?')[0]);
  const target = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
  const file = path.resolve(root, target);

  if(!file.startsWith(root)){
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(file, (error, data) => {
    if(error){
      send(res, 404, 'Not found');
      return;
    }
    send(res, 200, data, types[path.extname(file)] || 'application/octet-stream');
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`MemoraBet listo en http://127.0.0.1:${port}/index.html`);
  console.log('Deja esta ventana abierta mientras juegas.');
});

server.on('error', error => {
  if(error.code === 'EADDRINUSE'){
    console.log(`El puerto ${port} ya esta en uso. Abre http://127.0.0.1:${port}/index.html`);
  }else{
    console.error(error);
  }
});
