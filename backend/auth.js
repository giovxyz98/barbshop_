const express = require('express');
const { logAccess } = require('../log/log');
const router = express.Router();

// LOGIN FITTIZIO (debug): accetta qualsiasi credenziale, anche vuota, senza leggere il database.
// Il ruolo è "admin" se lo username inizia per "admin", altrimenti "cliente".
// Da sostituire con l'autenticazione reale (vedi note_sviluppi.md).
router.post('/login', (req, res) => {
  const username = (req.body && req.body.username) || 'debug';
  const ruolo = username.toLowerCase().startsWith('admin') ? 'admin' : 'cliente';

  const now = new Date();
  logAccess(`{"timestamp": "${now.toLocaleDateString('it-IT')} ${now.toLocaleTimeString('it-IT')}", "ip":"${req.ip}", "Username": "${username}", "code":"200","message":"Success (debug)"}`);

  res.status(200).json({ message: 'Success', debug: true, user: { username, ruolo } });
});

module.exports = router;
