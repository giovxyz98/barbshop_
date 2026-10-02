// Inserisce i dati di esempio (db/seed.sql) nel database. Uso: npm run seed
const fs = require('fs');
const path = require('path');
const { openDb } = require('../backend/db');

const db = openDb();
db.exec(fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8'));
const n = t => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
console.log(`Dati di esempio inseriti: ${n('users')} utenti, ${n('servizi')} servizi.`);
