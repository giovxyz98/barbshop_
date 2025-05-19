const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { logEvent } = require('../log/log');
const router = express.Router();

const db = new sqlite3.Database('../db/database.db', (err) => {
  if (err) {
    logEvent("Errore nell'apertura del database: " + err.message);
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Dati utente di esempio
  const user = { username: 'admin', password: 'password123' };

  // Otteniamo l'indirizzo IP dell'utente (questa volta usando req.connection.remoteAddress)
  const ip = req.ip;
  const now = new Date();
  const date = now.toLocaleDateString('it-IT');
  const time = now.toLocaleTimeString('it-IT');

  // Log del tentativo di login
  let logMessage = `{"timestamp": "${date} ${time}", "ip":"${ip}", "Username": "${username}",`;

  // Controlliamo le credenziali
  if (username === user.username && password === user.password) {
    logMessage += '"code":"200","message":"Success"';
    res.status(200).json({ message: 'Success' });
  } else {
    logMessage += '"code":"401","message":"Failed"';

    res.status(401).json({ message: 'Failed' });
  }
  logMessage += "}";
  logAccess(logMessage);
});

module.exports = router;
