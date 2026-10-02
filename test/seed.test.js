const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openDb } = require('../backend/db');
const { tmpDbPath } = require('./helpers');

test('i dati di esempio si applicano a un database nuovo e rieseguirli non duplica nulla', () => {
  const db = openDb(tmpDbPath());
  const seed = fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8');
  db.exec(seed);
  const conta = t => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  assert.equal(conta('users'), 20);
  assert.equal(conta('servizi'), 8);
  assert.equal(db.prepare('SELECT typeof(durata) t FROM servizi LIMIT 1').get().t, 'integer');
  db.exec(seed);
  assert.equal(conta('users'), 20);
  assert.equal(conta('servizi'), 8);
  db.close();
});
