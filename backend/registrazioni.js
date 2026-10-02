// Registrazione ibrida: il cliente invia una richiesta, l'admin la accetta (si crea l'utente) o la rifiuta.
const express = require('express');
const { AppError } = require('./agenda');
const { inTransaction } = require('./db');
const { wrap } = require('./wrap');
const { logEvent } = require('../log/log');

const stringa = v => (typeof v === 'string' ? v.trim() : '');

module.exports = db => {
  const router = express.Router();
  const pubblica = r => ({ id: r.id, nome: r.nome, cognome: r.cognome, username: r.username, stato: r.stato, creata: r.creata, gestita: r.gestita });

  // Il cliente invia la richiesta (la password non viene mai restituita).
  router.post('/registrazioni', wrap((req, res) => {
    const nome = stringa(req.body && req.body.nome);
    const cognome = stringa(req.body && req.body.cognome);
    const username = stringa(req.body && req.body.username);
    const password = typeof (req.body && req.body.password) === 'string' ? req.body.password : '';
    if (nome.length < 3) throw new AppError(400, 'Il nome deve avere almeno 3 caratteri');
    if (cognome.length < 3) throw new AppError(400, 'Il cognome deve avere almeno 3 caratteri');
    if (!/^[A-Za-z0-9._-]{5,30}$/.test(username)) throw new AppError(400, 'Username: da 5 a 30 caratteri tra lettere, numeri, punto, trattino e underscore');
    if (password.length < 8) throw new AppError(400, 'La password deve avere almeno 8 caratteri');

    const r = inTransaction(db, () => {
      if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw new AppError(409, 'Nome utente già esistente');
      if (db.prepare("SELECT 1 FROM richieste_registrazione WHERE username = ? AND stato = 'in_attesa'").get(username)) {
        throw new AppError(409, 'Esiste già una richiesta in attesa per questo nome utente');
      }
      return db.prepare('INSERT INTO richieste_registrazione (nome, cognome, username, password) VALUES (?, ?, ?, ?)').run(nome, cognome, username, password);
    });
    logEvent(`Richiesta di registrazione ${username} - Info`);
    res.status(201).json({ message: "Richiesta inviata: potrai accedere dopo l'approvazione del salone", id: Number(r.lastInsertRowid) });
  }));

  // L'admin vede le richieste (di default solo quelle in attesa).
  router.get('/registrazioni', wrap((req, res) => {
    const stato = req.query.stato || 'in_attesa';
    if (!['in_attesa', 'accettata', 'rifiutata', 'tutte'].includes(stato)) throw new AppError(400, 'stato non valido');
    const rows = stato === 'tutte'
      ? db.prepare('SELECT * FROM richieste_registrazione ORDER BY id DESC').all()
      : db.prepare('SELECT * FROM richieste_registrazione WHERE stato = ? ORDER BY id').all(stato);
    res.json({ richieste: rows.map(pubblica) });
  }));

  const gestisci = (decisione) => wrap((req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Id richiesta non valido');
    const risultato = inTransaction(db, () => {
      const r = db.prepare('SELECT * FROM richieste_registrazione WHERE id = ?').get(id);
      if (!r) throw new AppError(404, 'Richiesta non trovata');
      if (r.stato !== 'in_attesa') throw new AppError(409, `Richiesta già ${r.stato}`);
      if (decisione === 'accettata') {
        if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(r.username)) throw new AppError(409, 'Nome utente già esistente: rifiuta la richiesta');
        db.prepare("INSERT INTO users (nome, cognome, username, password, ruolo) VALUES (?, ?, ?, ?, 'cliente')").run(r.nome, r.cognome, r.username, r.password);
      }
      db.prepare('UPDATE richieste_registrazione SET stato = ?, gestita = CURRENT_TIMESTAMP WHERE id = ?').run(decisione, id);
      return db.prepare('SELECT * FROM richieste_registrazione WHERE id = ?').get(id);
    });
    logEvent(`Richiesta di registrazione ${risultato.username} ${decisione} - Success`);
    res.json({ message: decisione === 'accettata' ? 'Utente creato' : 'Richiesta rifiutata', richiesta: pubblica(risultato) });
  });

  router.post('/registrazioni/:id/accetta', gestisci('accettata'));
  router.post('/registrazioni/:id/rifiuta', gestisci('rifiutata'));

  return router;
};
