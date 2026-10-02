const express = require('express');
const { logEvent } = require('../log/log');

module.exports = db => {
  const router = express.Router();

  const safe = (fn, label) => (req, res) => {
    try {
      fn(req, res);
    } catch (e) {
      logEvent(`Errore in "${label}": ${e.message} - Error`);
      res.status(500).json({ code: 500, message: 'Errore interno del server', error: e.message });
    }
  };

  router.get('/getServizi', safe((req, res) => {
    const rows = db.prepare('SELECT * FROM servizi ORDER BY id').all();
    if (rows.length === 0) return res.status(404).json({ code: 404, message: 'Nessun servizio trovato' });
    res.status(200).json({ code: 200, message: 'Success', data: rows });
  }, 'getServizi'));

  router.get('/getServizio', safe((req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Id servizio non valido' });
    const row = db.prepare('SELECT * FROM servizi WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ message: 'Servizio non trovato' });
    res.status(200).json({ message: 'Success', data: row });
  }, 'getServizio'));

  router.post('/addServizio', safe((req, res) => {
    const { nome, descrizione, prezzo, durata, feedback } = req.body || {};
    if (!nome) return res.status(400).json({ message: 'Inserire il nome del servizio' });
    if (prezzo === undefined || prezzo === '' || !(Number(prezzo) >= 0)) {
      return res.status(400).json({ message: 'Inserire un prezzo valido' });
    }
    if (!Number.isInteger(Number(durata)) || Number(durata) <= 0) {
      return res.status(400).json({ message: 'Inserire la durata del servizio in minuti (intero > 0)' });
    }
    const r = db.prepare('INSERT INTO servizi (nome, descrizione, prezzo, durata, feedback) VALUES (?, ?, ?, ?, ?)')
      .run(nome, descrizione ?? null, Number(prezzo), Number(durata), feedback ?? null);
    res.status(200).json({ message: 'Servizio aggiunto con successo', id: Number(r.lastInsertRowid) });
  }, 'addServizio'));

  return router;
};
