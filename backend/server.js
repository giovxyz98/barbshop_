const express = require('express');
const cors = require('cors');
const { openDb } = require('./db');

function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api', require('./auth'));
  app.use('/api', require('./users')(db));
  app.use('/api', require('./servizi')(db));
  app.use('/api', require('./agenda_routes')(db));

  // JSON malformato e simili: risposta JSON invece della pagina HTML di default
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.status && err.status < 500 ? 'Richiesta non valida' : 'Errore interno' });
  });
  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp(openDb()).listen(port, () => console.log(`Server in ascolto su http://localhost:${port}`));
}
