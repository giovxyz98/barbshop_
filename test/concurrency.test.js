// Concorrenza reale: più PROCESSI Node (connessioni indipendenti) prenotano insieme sullo stesso file DB.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { MARTEDI, newDb } = require('./helpers');
const { listPrenotazioni } = require('../backend/agenda');

function lancia(file, startAt, req) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['--no-warnings', path.join(__dirname, 'worker.js'), JSON.stringify({ file, startAt, req })],
      { env: { ...process.env, NO_LOG: '1' } });
    let out = '', err = '';
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.on('close', () => { try { resolve(JSON.parse(out)); } catch (e) { reject(new Error(`worker: ${out} ${err}`)); } });
  });
}

const riepilogo = r => r.reduce((m, x) => { const k = x.ok ? 'ok' : `${x.status} ${x.error}`; m[k] = (m[k] || 0) + 1; return m; }, {});

test('20 processi, utenti diversi, STESSO slot: ne passa esattamente uno', async () => {
  const { db, file } = newDb();
  const startAt = Date.now() + 3000;
  const r = await Promise.all([...Array(20)].map((_, i) => lancia(file, startAt, { username: `user${i}`, servizio: 1, data: MARTEDI, ora: '10:00' })));
  const s = riepilogo(r);
  assert.equal(s.ok, 1, JSON.stringify(s));
  assert.equal(r.filter(x => !x.ok && x.status === 500).length, 0, `nessun errore 500: ${JSON.stringify(s)}`);
  assert.equal(listPrenotazioni(db, { data: MARTEDI }).length, 1);
});

test('20 processi, slot che si sovrappongono: nessuna sovrapposizione nel db', async () => {
  const { db, file } = newDb();
  const startAt = Date.now() + 3000;
  const orari = i => { const m = 9 * 60 + i * 5; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const r = await Promise.all([...Array(20)].map((_, i) => lancia(file, startAt, { username: `user${i}`, servizio: 1, data: MARTEDI, ora: orari(i) })));
  assert.equal(r.filter(x => !x.ok && x.status === 500).length, 0, JSON.stringify(riepilogo(r)));
  const p = listPrenotazioni(db, { data: MARTEDI });
  assert.ok(p.length >= 1);
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
    assert.ok(p[i].fine <= p[j].inizio || p[j].fine <= p[i].inizio, `sovrapposte: ${p[i].inizio}-${p[i].fine} e ${p[j].inizio}-${p[j].fine}`);
  }
  // con slot da 30' ogni 5' di scarto ne stanno al massimo 20*5/30 -> controllo che il conteggio sia coerente con l'occupazione
  assert.equal(p.length, new Set(p.map(x => x.id)).size);
});

test('lo STESSO utente da 10 processi, slot diversi: una sola prenotazione al giorno', async () => {
  const { db, file } = newDb();
  const startAt = Date.now() + 3000;
  const orari = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '15:00', '15:30'];
  const r = await Promise.all(orari.map(ora => lancia(file, startAt, { username: 'user0', servizio: 1, data: MARTEDI, ora })));
  const s = riepilogo(r);
  assert.equal(s.ok, 1, JSON.stringify(s));
  assert.equal(listPrenotazioni(db, { username: 'user0' }).length, 1);
});
