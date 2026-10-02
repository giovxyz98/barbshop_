const express = require('express');
const { logEvent } = require('../log/log');

module.exports = db => {
  const router = express.Router();

  // Esegue fn e traduce eventuali eccezioni del database in 500.
  const safe = (fn, label) => (req, res) => {
    try {
      fn(req, res);
    } catch (e) {
      logEvent(`Errore in "${label}": ${e.message} - Error`);
      res.status(500).json({ code: 500, message: 'Errore del server', error: e.message });
    }
  };

  const addUser = (req, res) => {
    const { nome, cognome, username, password } = req.body || {};
    if (!nome || !cognome || !username || !password) {
      return res.status(400).json({ message: 'Tutti i campi sono obbligatori' });
    }
    if (db.prepare('SELECT username FROM users WHERE username = ?').get(username)) {
      return res.status(400).json({ code: 400, message: 'Nome utente già esistente' });
    }
    db.prepare('INSERT INTO users (nome, cognome, username, password) VALUES (?, ?, ?, ?)').run(nome, cognome, username, password);
    logEvent(`Nuovo utente aggiunto: ${username} - Success`);
    res.status(201).json({ code: 200, message: 'Utente aggiunto con successo' });
  };

  const getUser = (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ code: 400, message: 'Il parametro username è obbligatorio' });
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!row) return res.status(404).json({ message: 'Utente non trovato' });
    res.json({ message: 'Success', user: row });
  };

  const getUserForReservation = (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ code: 400, message: 'Il parametro username è obbligatorio' });
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!row) return res.status(200).json({ code: 404, user: null });
    res.json({ code: 200, user: row });
  };

  const editUser = (req, res) => {
    const { nome, cognome, username, password } = req.body || {};
    if (!nome || !cognome || !username || !password) {
      return res.status(400).json({ code: 400, message: 'Tutti i campi sono obbligatori' });
    }
    const r = db.prepare('UPDATE users SET nome = ?, cognome = ?, password = ?, updated = CURRENT_TIMESTAMP WHERE username = ?')
      .run(nome, cognome, password, username);
    if (r.changes === 0) return res.status(404).json({ code: 404, message: 'Utente non trovato' });
    logEvent(`Utente modificato: ${username} - Success`);
    res.json({ code: 200, message: 'Utente modificato con successo' });
  };

  const editPassword = (req, res) => {
    const { username, newPassword } = req.body || {};
    if (!username || !newPassword) {
      return res.status(400).json({ code: 400, message: 'Nome utente e password sono obbligatori' });
    }
    const r = db.prepare('UPDATE users SET password = ?, updated = CURRENT_TIMESTAMP WHERE username = ?').run(newPassword, username);
    if (r.changes === 0) return res.status(404).json({ code: 404, message: 'Utente non trovato' });
    logEvent(`Password modificata per l'utente: ${username} - Success`);
    res.json({ code: 200, message: 'Password modificata con successo' });
  };

  const getUsers = (req, res) => {
    res.json({ code: 200, message: 'Success', users: db.prepare('SELECT * FROM users').all() });
  };

  // Le prenotazioni dell'utente vengono eliminate a cascata (FOREIGN KEY ... ON DELETE CASCADE).
  const deleteUser = (req, res) => {
    const username = req.body && req.body.username;
    if (!username) return res.status(400).json({ code: 400, message: 'Il parametro username è obbligatorio' });
    const r = db.prepare('DELETE FROM users WHERE username = ?').run(username);
    if (r.changes === 0) return res.status(404).json({ code: 404, message: 'Utente non trovato' });
    logEvent(`Utente eliminato: ${username} - Success`);
    res.json({ code: 200, message: 'Utente eliminato con successo' });
  };

  router.get('/getUserForReservation', safe(getUserForReservation, 'getUserForReservation'));
  router.put('/editPassword', safe(editPassword, 'editPassword'));
  router.put('/editUser', safe(editUser, 'editUser'));
  router.get('/getUser', safe(getUser, 'getUser'));
  router.post('/addUser', safe(addUser, 'addUser'));
  router.delete('/deleteUser', safe(deleteUser, 'deleteUser'));
  router.get('/getUsers', safe(getUsers, 'getUsers'));
  return router;
};
