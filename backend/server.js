const path = require('path');
const express = require('express');
const cors = require('cors');
const { openDb } = require('./db');
const { uploadRouter, pulisciOrfani } = require('./upload');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

function createApp(db, { uploadDir = UPLOAD_DIR } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api', require('./auth')(db));
  app.use('/api', require('./users')(db));
  app.use('/api', require('./servizi')(db));
  app.use('/api', require('./prodotti')(db, uploadDir));
  app.use('/api', uploadRouter(uploadDir));
  app.use('/api', require('./registrazioni')(db));
  app.use('/api', require('./agenda_routes')(db));

  // API sconosciuta: JSON, non la pagina HTML di default
  app.use('/api', (req, res) => res.status(404).json({ error: 'Risorsa non trovata' }));

  // Foto dei prodotti caricate dall'admin
  app.use('/uploads', express.static(uploadDir, {
    fallthrough: false, immutable: true, maxAge: '7d',
    setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }));

  // Il front-end è servito dallo stesso server: http://localhost:3000
  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  // JSON malformato e simili: risposta JSON invece della pagina HTML di default
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'File troppo grande (massimo 6 MB)' });
    const status = err.status || 500;
    res.status(status).json({ error: status === 404 ? 'Risorsa non trovata' : status < 500 ? 'Richiesta non valida' : 'Errore interno' });
  });
  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const db = openDb();
  pulisciOrfani(db, UPLOAD_DIR);
  createApp(db).listen(port, () => console.log(`Server in ascolto su http://localhost:${port}`));
}
