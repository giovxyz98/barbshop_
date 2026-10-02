// Processo separato per i test di concorrenza: apre lo stesso file DB e prenota allo scattare dell'istante comune.
const { openDb } = require('../backend/db');
const { prenota } = require('../backend/agenda');
const { ADESSO } = require('./helpers');

const { file, startAt, req } = JSON.parse(process.argv[2]);
const db = openDb(file);
while (Date.now() < startAt) { /* attesa attiva: tutti i processi partono insieme */ }
try {
  const p = prenota(db, req, ADESSO);
  process.stdout.write(JSON.stringify({ ok: true, id: p.id }));
} catch (e) {
  process.stdout.write(JSON.stringify({ ok: false, status: e.status || 500, error: e.message }));
}
