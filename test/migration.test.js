// Migrazione dal vecchio schema (tabella giorno, prenotazioni a minuti, durata REAL).
const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { openDb } = require('../backend/db');
const { tmpDbPath } = require('./helpers');
const { listPrenotazioni, getOrariSettimanali } = require('../backend/agenda');

function creaVecchioDb(file) {
  const old = new DatabaseSync(file);
  old.exec('PRAGMA foreign_keys = OFF'); // il vecchio db non applicava le chiavi esterne (node:sqlite le attiva di default)
  old.exec(`
    CREATE TABLE giorno (nome TEXT NOT NULL, lavorativo_mattino BOOLEAN NOT NULL, lavorativo_pomeriggio BOOLEAN NOT NULL, data DATE NOT NULL PRIMARY KEY, orario_mattino TEXT DEFAULT "540-810", orario_pomeriggio TEXT DEFAULT "900-1200");
    CREATE TABLE prenotazioni (idPrenotazione INTEGER PRIMARY KEY AUTOINCREMENT, servizio TEXT REFERENCES servizi (id), user REFERENCES users (username), durata INTEGER, orario_inizio INTEGER, data REFERENCES giorno (data));
    CREATE TABLE servizi (id INTEGER PRIMARY KEY NOT NULL, nome TEXT, prezzo REAL, durata REAL, descrizione TEXT, feedback INTEGER);
    CREATE TABLE salone (indirizzo TEXT NOT NULL, id INTEGER PRIMARY KEY NOT NULL);
    CREATE TABLE users (nome TEXT NOT NULL, cognome TEXT NOT NULL, username TEXT UNIQUE NOT NULL PRIMARY KEY, password TEXT NOT NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP, active BOOLEAN DEFAULT 1, iscritto_da TEXT, ultimo_accesso TEXT, feedback NUMERIC, ruolo TEXT);
    INSERT INTO users (nome, cognome, username, password, ruolo) VALUES ('Luca','Ferri','lucaf98','pw','barbiere'), ('Sara','Rossi','sara','pw','cliente');
    INSERT INTO servizi VALUES (1,'Taglio',15,30.0,'x',0), (2,'Barba',10,20.0,NULL,NULL);
    INSERT INTO giorno (nome, lavorativo_mattino, lavorativo_pomeriggio, data) VALUES ('martedì',1,1,'2026-10-06');
    INSERT INTO prenotazioni (servizio, user, durata, orario_inizio, data) VALUES
      ('1','lucaf98',30,600,'2026-10-06'),
      ('1','sara',30,615,'2026-10-06'),     -- sovrappone la precedente: scartata
      ('2','sara',20,700,'2026-10-06'),
      ('1','sara',30,NULL,'2026-10-07');    -- incoerente: scartata
  `);
  old.close();
}

test('migrazione dal vecchio schema: dati utenti/servizi conservati, prenotazioni convertite', () => {
  const file = tmpDbPath();
  creaVecchioDb(file);
  const db = openDb(file);

  assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'giorno'").get(), undefined, 'tabella giorno rimossa');
  assert.equal(db.prepare('SELECT COUNT(*) c FROM users').get().c, 2);
  const servizi = db.prepare('SELECT id, nome, durata, typeof(durata) t FROM servizi ORDER BY id').all();
  assert.deepEqual(servizi.map(s => [s.id, s.nome, s.durata, s.t]), [[1, 'Taglio', 30, 'integer'], [2, 'Barba', 20, 'integer']]);

  const p = listPrenotazioni(db, {});
  assert.deepEqual(p.map(x => [x.user, x.inizio, x.fine, x.servizio.id]), [['lucaf98', '10:00', '10:30', 1], ['sara', '11:40', '12:00', 2]]);

  assert.equal(getOrariSettimanali(db)[2].fasce.length, 2, 'orario di default inserito');
  assert.equal(getOrariSettimanali(db)[1].fasce.length, 0, 'lunedì chiuso');
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  db.close();

  // riaprire non rifà la migrazione e non perde nulla
  const db2 = openDb(file);
  assert.equal(listPrenotazioni(db2, {}).length, 2);
  db2.close();
});

test('database nuovo: schema completo e orari di default', () => {
  const db = openDb(tmpDbPath());
  assert.equal(db.prepare('SELECT COUNT(*) c FROM orari_settimanali').get().c, 10);
  assert.equal(db.prepare('SELECT slot_step FROM impostazioni').get().slot_step, 5);
  db.close();
});

test('un orario settimanale svuotato di proposito non viene ricreato al riavvio', () => {
  const file = tmpDbPath();
  const db = openDb(file);
  db.exec('DELETE FROM orari_settimanali');
  db.close();
  const db2 = openDb(file);
  assert.equal(db2.prepare('SELECT COUNT(*) c FROM orari_settimanali').get().c, 0);
  db2.close();
});
