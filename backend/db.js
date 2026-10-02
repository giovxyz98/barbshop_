// Apertura del database con il modulo integrato di Node (node:sqlite) e migrazione dallo schema precedente.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_VERSION = 1;
const SCHEMA_FILE = path.join(__dirname, '..', 'db', 'schema.sql');
const DEFAULT_DB = path.join(__dirname, '..', 'db', 'database.db');

// Orario settimanale iniziale: mar-sab 09:00-13:30 e 15:00-20:00 (domenica e lunedì chiuso).
const DEFAULT_FASCE = [[540, 810], [900, 1200]];
const DEFAULT_GIORNI = [2, 3, 4, 5, 6];

function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}

const pad = n => String(n).padStart(2, '0');
const hhmm = min => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

// Dal vecchio schema (tabella giorno + prenotazioni a minuti) a quello attuale.
function migrateLegacy(db) {
  const old = tableExists(db, 'prenotazioni')
    ? db.prepare('SELECT * FROM prenotazioni').all()
    : [];

  db.exec('DROP TABLE IF EXISTS prenotazioni');
  db.exec('DROP TABLE IF EXISTS giorno');
  const hadServizi = tableExists(db, 'servizi');
  if (hadServizi) db.exec('ALTER TABLE servizi RENAME TO servizi_old');

  db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));

  if (hadServizi) {
    db.exec(`INSERT INTO servizi (id, nome, descrizione, prezzo, durata, feedback)
             SELECT id, nome, descrizione, COALESCE(prezzo, 0), CAST(durata AS INTEGER), feedback
             FROM servizi_old WHERE nome IS NOT NULL AND CAST(durata AS INTEGER) > 0`);
    db.exec('DROP TABLE servizi_old');
  }

  const insert = db.prepare(`INSERT INTO prenotazioni (user, servizio_id, data, inizio, fine, durata)
                             VALUES (?, ?, ?, ?, ?, ?)`);
  for (const p of old) {
    if (p.orario_inizio == null || p.durata == null) continue; // Number(null) darebbe 0: righe con orario mancante
    const start = Number(p.orario_inizio);
    const durata = Number(p.durata);
    if (!p.user || !/^\d{4}-\d{2}-\d{2}$/.test(p.data || '')) continue;
    if (!Number.isInteger(start) || !Number.isInteger(durata) || start < 0 || durata <= 0 || start + durata > 1440) continue;
    try {
      insert.run(p.user, Number(p.servizio), p.data, `${p.data} ${hhmm(start)}`, `${p.data} ${hhmm(start + durata)}`, durata);
    } catch (e) { /* riga storica incoerente o sovrapposta: scartata */ }
  }
}

function seedDefaults(db) {
  const ins = db.prepare('INSERT INTO orari_settimanali (giorno_settimana, apertura, chiusura) VALUES (?, ?, ?)');
  for (const g of DEFAULT_GIORNI) for (const [a, c] of DEFAULT_FASCE) ins.run(g, a, c);
}

function openDb(file = process.env.DB_PATH || DEFAULT_DB) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA foreign_keys = OFF');

  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version < SCHEMA_VERSION) {
    db.exec('BEGIN IMMEDIATE');
    try {
      if (tableExists(db, 'users')) migrateLegacy(db);
      else db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));
      seedDefaults(db);
      db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  } else {
    db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  }

  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

// Esegue fn dentro una transazione che prende subito il lock di scrittura.
// Con più connessioni/processi i controlli fatti in fn e l'INSERT restano atomici.
function inTransaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (_) { /* già chiusa */ }
    throw e;
  }
}

module.exports = { openDb, inTransaction };
