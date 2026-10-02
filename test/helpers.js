const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDb } = require('../backend/db');

// "Adesso" fisso (ora locale del salone) per test deterministici: giovedì 2026-10-01, 10:00.
const ADESSO = { data: '2026-10-01', min: 600 };
// 2026-10-06 è un martedì (aperto), 2026-10-05 un lunedì (chiuso), 2026-10-04 una domenica (chiusa).
const MARTEDI = '2026-10-06';

function tmpDbPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'barbshop-')), 'test.db');
}

function newDb(file = tmpDbPath()) {
  const db = openDb(file);
  const u = db.prepare('INSERT INTO users (nome, cognome, username, password, ruolo) VALUES (?, ?, ?, ?, ?)');
  for (let i = 0; i < 40; i++) u.run(`Nome${i}`, `Cognome${i}`, `user${i}`, 'pw', 'cliente');
  const s = db.prepare('INSERT INTO servizi (nome, prezzo, durata) VALUES (?, ?, ?)');
  s.run('Taglio', 15, 30); // id 1
  s.run('Barba', 10, 20);  // id 2
  s.run('Colore', 40, 90); // id 3
  return { db, file };
}

module.exports = { ADESSO, MARTEDI, newDb, tmpDbPath };
