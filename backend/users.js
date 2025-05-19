const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { logEvent } = require('../log/log');
const router = express.Router();

const db = new sqlite3.Database('../db/database.db', (err) => {
  if (err) {
    logEvent("Errore nell'apertura del database: " + err.message + " - Error");
  }
});

// Funzione per aggiungere un utente
const addUser = (req, res) => {
  const { nome, cognome, username, password } = req.body;
  // Verifica se tutti i campi sono presenti
  if (!nome || !cognome || !username || !password) {
    return res.status(400).json({ message: 'Tutti i campi sono obbligatori' });
  }
  // Controlla se il nome utente esiste già
  db.get('SELECT username FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      return res.status(500).json({ code: 500, message: 'Errore del server' });
    }
    if (row) {
      return res.status(400).json({ code: 400, message: 'Nome utente già esistente' });
    }
    const query = `
        INSERT INTO users (nome, cognome, username, password)
        VALUES (?, ?, ?, ?)
      `;
    db.run(query, [nome, cognome, username, password], function (err) {
      if (err) {
        logEvent('Errore nell\'inserimento dell\'utente: ' + err.message + ' - Error');
        return res.status(500).json({ code: 500, message: 'Errore del server' });
      }

      logEvent(`Nuovo utente aggiunto: ${username} - Success`);
      return res.status(201).json({ code: 200, message: 'Utente aggiunto con successo' });
    });
  });
};

// Funzione per ottenere un utente
const getUser = (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ code: 400, message: 'Il parametro username è obbligatorio' });
  }
  const query = "SELECT * FROM users WHERE username = ?";
  db.get(query, [username], (err, row) => {
    if (err) {
      logEvent('Errore nella query: ' + err.message + ' - Error');
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    res.json({ message: "Success", user: row });
  });
};

const getUserForReservation = (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ code: 400, message: 'Il parametro username è obbligatorio' });
  }
  const query = "SELECT * FROM users WHERE username = ?";
  db.get(query, [username], (err, row) => {
    if (err) {
      logEvent('Errore nella query: ' + err.message + ' - Error');
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(200).json({ code: 404, user: null });
    }
    res.json({ code: 200, user: row });
  });
};

const editUser = (req, res) => {
  const { nome, cognome, username, password } = req.body;
  if (!nome || !cognome || !username || !password) {
    return res.status(400).json({ code: 400, message: 'Tutti i campi sono obbligatori' });
  }
  const query = "UPDATE users SET nome = ?, cognome = ?, password = ? WHERE username = ?";
  db.run(query, [nome, cognome, password, username], function (err) {
    if (err) {
      logEvent('Errore nella query: ' + err.message + ' - Error');
      return res.status(500).json({ code: 500, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ code: 404, message: 'Utente non trovato' });
    }
    logEvent(`Utente modificato: ${username} - Success`);
    res.json({ code: 200, message: 'Utente modificato con successo' });
  });
};

const editPassword = (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ code: 400, message: 'Nome utente e password sono obbligatori' });
  }

  const query = "UPDATE users SET password = ? WHERE username = ?";

  db.run(query, [newPassword, username], function (err) {
    if (err) {
      logEvent('Errore nella query: ' + err.message + ' - Error');
      return res.status(500).json({ code: 500, error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ code: 404, message: 'Utente non trovato' });
    }

    logEvent(`Password modificata per l'utente: ${username} - Success`);
    res.json({ code: 200, message: 'Password modificata con successo' });
  });
};


const getUsers = (req, res) => {
  const query = "SELECT * FROM users";
  db.all(query, (err, rows) => {
    if (err) {
      logEvent('Errore in "getUsers": ' + err.message + ' - Error');
      return res.status(500).json({ code: 500, error: err.message });
    }
    res.json({ code: 200, message: 'Success', users: rows });
  });
};

const deleteUser = (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).json({ code: 400, message: 'Il parametro username è obbligatorio' });
  }

  const query = "DELETE FROM users WHERE username = ?";
  db.run(query, [username], function (err) {
    if (err) {
      logEvent('Errore nella query: ' + err.message + ' - Error');
      return res.status(500).json({ code: 500, error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ code: 404, message: 'Utente non trovato' });
    }

    logEvent(`Utente eliminato: ${username} - Success`);
    res.json({ code: 200, message: 'Utente eliminato con successo' });
  });
};

router.get('/getUserForReservation', getUserForReservation);
router.put('/editPassword', editPassword);
router.put('/editUser', editUser);
router.get('/getUser', getUser);
router.post('/addUser', addUser);
router.delete('/deleteUser', deleteUser);
router.get('/getUsers', getUsers);
module.exports = router;
