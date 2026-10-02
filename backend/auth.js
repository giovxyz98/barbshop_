const express = require('express');
const { logAccess } = require('../log/log');

// LOGIN FITTIZIO (debug): accetta qualsiasi credenziale, anche vuota, e non verifica la password.
// Se lo username non esiste lo crea (così prenotazioni e profilo funzionano senza persone reali).
// Il ruolo è "admin" se lo username inizia per "admin", altrimenti "cliente".
// Da sostituire con l'autenticazione reale (vedi note_sviluppi.md).
module.exports = db => {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const body = req.body || {};
    const username = (typeof body.username === 'string' && body.username.trim()) || 'debug';
    const ruolo = username.toLowerCase().startsWith('admin') ? 'admin' : 'cliente';

    let utente = db.prepare('SELECT nome, cognome, username FROM users WHERE username = ?').get(username);
    if (!utente) {
      const password = typeof body.password === 'string' && body.password ? body.password : 'debug';
      db.prepare('INSERT INTO users (nome, cognome, username, password, ruolo) VALUES (?, ?, ?, ?, ?)')
        .run('Utente', username, username, password, ruolo);
      utente = db.prepare('SELECT nome, cognome, username FROM users WHERE username = ?').get(username);
    }

    const now = new Date();
    logAccess(`{"timestamp": "${now.toLocaleDateString('it-IT')} ${now.toLocaleTimeString('it-IT')}", "ip":"${req.ip}", "Username": "${username}", "code":"200","message":"Success (debug)"}`);

    res.status(200).json({ message: 'Success', debug: true, user: { username: utente.username, nome: utente.nome, cognome: utente.cognome, ruolo } });
  });

  return router;
};
