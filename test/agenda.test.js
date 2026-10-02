const test = require('node:test');
const assert = require('node:assert/strict');
const agenda = require('../backend/agenda');
const { ADESSO, MARTEDI, newDb } = require('./helpers');

const rifiuta = (fn, status, msg) =>
  assert.throws(fn, e => e instanceof agenda.AppError && e.status === status && (!msg || msg.test(e.message)), `atteso ${status} ${msg || ''}`);
const prenota = (db, user, data, ora, servizio = 1) => agenda.prenota(db, { username: user, servizio, data, ora }, ADESSO);

test('orario settimanale di default: mar-sab due fasce, dom e lun chiusi', () => {
  const { db } = newDb();
  const cal = agenda.getCalendario(db, '2026-10-04', '2026-10-06');
  assert.deepEqual(cal.map(g => g.aperto), [false, false, true]);
  assert.deepEqual(cal[2].fasce, [{ apertura: '09:00', chiusura: '13:30' }, { apertura: '15:00', chiusura: '20:00' }]);
});

test('disponibilità: un giorno senza prenotazioni è prenotabile (bug del vecchio sistema)', () => {
  const { db } = newDb();
  const d = agenda.getDisponibilita(db, MARTEDI, 1, ADESSO);
  assert.equal(d.slots[0], '09:00');
  assert.equal(d.slots.includes('13:00'), true);   // 13:00 + 30 = 13:30, ultimo della fascia
  assert.equal(d.slots.includes('13:05'), false);  // sconfina nella pausa
  assert.equal(d.slots.includes('14:55'), false);
  assert.equal(d.slots.includes('15:00'), true);
  assert.equal(d.slots.at(-1), '19:30');
});

test('la durata del servizio restringe gli slot', () => {
  const { db } = newDb();
  const lungo = agenda.getDisponibilita(db, MARTEDI, 3, ADESSO).slots; // 90 min
  assert.equal(lungo.at(-1), '18:30');
  assert.equal(lungo.includes('12:05'), false);
  assert.equal(lungo.includes('12:00'), true);
});

test('prenotazione: successo, poi slot occupato e sovrapposizioni rifiutate, adiacenti ok', () => {
  const { db } = newDb();
  const p = prenota(db, 'user0', MARTEDI, '10:00');
  assert.equal(p.inizio, '10:00'); assert.equal(p.fine, '10:30'); assert.equal(p.stato, 'confermata');
  rifiuta(() => prenota(db, 'user1', MARTEDI, '10:00'), 409, /non disponibile/);
  rifiuta(() => prenota(db, 'user1', MARTEDI, '10:25'), 409, /non disponibile/);   // si sovrappone in coda
  rifiuta(() => prenota(db, 'user1', MARTEDI, '09:45'), 409, /non disponibile/);   // si sovrappone in testa
  prenota(db, 'user1', MARTEDI, '10:30');  // subito dopo
  prenota(db, 'user2', MARTEDI, '09:30');  // subito prima
  const slots = agenda.getDisponibilita(db, MARTEDI, 1, ADESSO).slots;
  assert.equal(slots.includes('10:00'), false);
  assert.equal(slots.includes('11:00'), true);
});

test('un cliente può avere una sola prenotazione al giorno', () => {
  const { db } = newDb();
  prenota(db, 'user0', MARTEDI, '10:00');
  rifiuta(() => prenota(db, 'user0', MARTEDI, '16:00'), 409, /già una prenotazione/);
  prenota(db, 'user0', '2026-10-07', '10:00'); // altro giorno ok
});

test('validazione input', () => {
  const { db } = newDb();
  rifiuta(() => prenota(db, 'user0', MARTEDI, '03:00'), 400, /fuori dagli orari/);
  rifiuta(() => prenota(db, 'user0', MARTEDI, '13:15'), 400, /fuori dagli orari/);   // finirebbe alle 13:45, oltre la fascia
  rifiuta(() => prenota(db, 'user0', MARTEDI, '14:00'), 400, /fuori dagli orari/);   // pausa
  rifiuta(() => prenota(db, 'user0', MARTEDI, '19:45'), 400, /fuori dagli orari/);   // oltre la chiusura
  rifiuta(() => prenota(db, 'user0', MARTEDI, '09:03'), 400, /allineato/);
  rifiuta(() => prenota(db, 'user0', MARTEDI, 'abc'), 400, /HH:MM/);
  rifiuta(() => prenota(db, 'user0', MARTEDI, '-30'), 400, /HH:MM/);
  rifiuta(() => prenota(db, 'user0', MARTEDI, '9:00'), 400, /HH:MM/);
  rifiuta(() => prenota(db, 'user0', MARTEDI, '24:00'), 400, /HH:MM/);
  rifiuta(() => prenota(db, 'user0', MARTEDI, 540), 400, /HH:MM/);
  rifiuta(() => prenota(db, 'user0', '2026-13-45', '10:00'), 400, /Data non valida/);
  rifiuta(() => prenota(db, 'user0', '06/10/2026', '10:00'), 400, /Data non valida/);
  rifiuta(() => prenota(db, 'user0', MARTEDI, '10:00', 99), 404, /Servizio/);
  rifiuta(() => prenota(db, 'user0', MARTEDI, '10:00', 'x'), 400, /Servizio/);
  rifiuta(() => prenota(db, 'nessuno', MARTEDI, '10:00'), 404, /Utente/);
  rifiuta(() => agenda.prenota(db, { servizio: 1, data: MARTEDI, ora: '10:00' }, ADESSO), 400, /utente/i);
  rifiuta(() => prenota(db, 'user0', '2026-10-05', '10:00'), 409, /chiuso/);      // lunedì
  rifiuta(() => prenota(db, 'user0', '2026-09-30', '10:00'), 400, /passato/);
  rifiuta(() => prenota(db, 'user0', '2027-06-01', '10:00'), 400, /in anticipo/);
  assert.equal(agenda.listPrenotazioni(db).length, 0, 'nessuna prenotazione parziale o sporca nel db');
});

test('preavviso minimo il giorno stesso', () => {
  const { db } = newDb();
  const oggi = { data: '2026-10-06', min: 10 * 60 };           // martedì 10:00, preavviso 60'
  assert.equal(agenda.getDisponibilita(db, '2026-10-06', 1, oggi).slots[0], '11:00');
  rifiuta(() => agenda.prenota(db, { username: 'user0', servizio: 1, data: '2026-10-06', ora: '10:30' }, oggi), 400, /preavviso/);
  agenda.prenota(db, { username: 'user0', servizio: 1, data: '2026-10-06', ora: '11:00' }, oggi);
});

test('eccezioni: chiusura, orario speciale, rimozione', () => {
  const { db } = newDb();
  agenda.setEccezione(db, { data: MARTEDI, chiuso: true, motivo: 'Ferie' });
  assert.deepEqual(agenda.getDisponibilita(db, MARTEDI, 1, ADESSO).slots, []);
  rifiuta(() => prenota(db, 'user0', MARTEDI, '10:00'), 409, /chiuso/);
  assert.equal(agenda.getCalendario(db, MARTEDI, MARTEDI)[0].aperto, false);

  // lunedì normalmente chiuso, ma aperto in via eccezionale in una sola fascia
  agenda.setEccezione(db, { data: '2026-10-05', fasce: [{ apertura: '10:00', chiusura: '12:00' }] });
  const s = agenda.getDisponibilita(db, '2026-10-05', 1, ADESSO).slots;
  assert.equal(s[0], '10:00'); assert.equal(s.at(-1), '11:30');
  prenota(db, 'user0', '2026-10-05', '10:00');

  agenda.deleteEccezione(db, MARTEDI);
  assert.equal(agenda.getDisponibilita(db, MARTEDI, 1, ADESSO).slots[0], '09:00');
  rifiuta(() => agenda.deleteEccezione(db, MARTEDI), 404);
});

test('modifica orario settimanale e validazione fasce', () => {
  const { db } = newDb();
  agenda.setOrariSettimanali(db, [{ giorno_settimana: 2, fasce: [{ apertura: '08:00', chiusura: '12:00' }] }]);
  const s = agenda.getDisponibilita(db, MARTEDI, 1, ADESSO).slots;
  assert.equal(s[0], '08:00'); assert.equal(s.at(-1), '11:30');
  agenda.setOrariSettimanali(db, [{ giorno_settimana: 2, fasce: [] }]); // martedì chiuso
  assert.equal(agenda.getCalendario(db, MARTEDI, MARTEDI)[0].aperto, false);
  rifiuta(() => agenda.setOrariSettimanali(db, [{ giorno_settimana: 2, fasce: [{ apertura: '12:00', chiusura: '09:00' }] }]), 400);
  rifiuta(() => agenda.setOrariSettimanali(db, [{ giorno_settimana: 2, fasce: [{ apertura: '09:00', chiusura: '12:00' }, { apertura: '11:00', chiusura: '13:00' }] }]), 400, /sovrapporsi/);
  rifiuta(() => agenda.setOrariSettimanali(db, [{ giorno_settimana: 9, fasce: [] }]), 400);
  rifiuta(() => agenda.setOrariSettimanali(db, [{ giorno_settimana: 2, fasce: [{ apertura: '9', chiusura: '12:00' }] }]), 400);
  // un errore non lascia l'orario a metà
  assert.equal(agenda.getOrariSettimanali(db)[2].fasce.length, 0);
});

test('impostazioni: passo degli slot', () => {
  const { db } = newDb();
  agenda.setImpostazioni(db, { slot_step: 30 });
  const s = agenda.getDisponibilita(db, MARTEDI, 1, ADESSO).slots;
  assert.deepEqual(s.slice(0, 3), ['09:00', '09:30', '10:00']);
  rifiuta(() => prenota(db, 'user0', MARTEDI, '09:15'), 400, /allineato/);
  rifiuta(() => agenda.setImpostazioni(db, { slot_step: 0 }), 400);
  rifiuta(() => agenda.setImpostazioni(db, { finestra_giorni: 'x' }), 400);
});

test('annullamento libera lo slot e il cliente può riprenotare', () => {
  const { db } = newDb();
  const p = prenota(db, 'user0', MARTEDI, '10:00');
  assert.equal(agenda.annullaPrenotazione(db, p.id).stato, 'annullata');
  rifiuta(() => agenda.annullaPrenotazione(db, p.id), 409);
  rifiuta(() => agenda.annullaPrenotazione(db, 999), 404);
  rifiuta(() => agenda.annullaPrenotazione(db, 'x'), 400);
  prenota(db, 'user1', MARTEDI, '10:00');
  prenota(db, 'user0', MARTEDI, '16:00');
  assert.equal(agenda.listPrenotazioni(db, { stato: 'annullata' }).length, 1);
});

test('elenco prenotazioni: filtri per data, utente, nome', () => {
  const { db } = newDb();
  prenota(db, 'user0', MARTEDI, '10:00');
  prenota(db, 'user1', MARTEDI, '11:00');
  prenota(db, 'user1', '2026-10-07', '11:00');
  assert.equal(agenda.listPrenotazioni(db, { data: MARTEDI }).length, 2);
  assert.equal(agenda.listPrenotazioni(db, { username: 'user1' }).length, 2);
  assert.equal(agenda.listPrenotazioni(db, { da: '2026-10-07' }).length, 1);
  assert.equal(agenda.listPrenotazioni(db, { q: 'Cognome1' }).length, 2);
  assert.equal(agenda.listPrenotazioni(db, { q: "x'; DROP TABLE users;--" }).length, 0);
  assert.equal(agenda.listPrenotazioni(db, { q: '%' }).length, 0, 'i caratteri jolly sono letterali');
  assert.deepEqual(agenda.listPrenotazioni(db, { data: MARTEDI }).map(p => p.inizio), ['10:00', '11:00']);
  rifiuta(() => agenda.listPrenotazioni(db, { data: 'ieri' }), 400);
});

test('il database da solo impedisce doppioni anche saltando la logica applicativa', () => {
  const { db } = newDb();
  const ins = (user, ini, fine) => db.prepare(
    "INSERT INTO prenotazioni (user, servizio_id, data, inizio, fine, durata) VALUES (?, 1, '2026-10-06', ?, ?, 30)").run(user, ini, fine);
  ins('user0', '2026-10-06 10:00', '2026-10-06 10:30');
  assert.throws(() => ins('user1', '2026-10-06 10:15', '2026-10-06 10:45'), /SLOT_OCCUPATO/);
  assert.throws(() => ins('user0', '2026-10-06 16:00', '2026-10-06 16:30'), /UNIQUE/);
  assert.throws(() => db.prepare("INSERT INTO prenotazioni (user, servizio_id, data, inizio, fine, durata) VALUES ('user2', 1, '2026-10-06', '2026-10-07 10:00', '2026-10-07 10:30', 30)").run(), /CHECK/);
  assert.throws(() => db.prepare("INSERT INTO prenotazioni (user, servizio_id, data, inizio, fine, durata) VALUES ('nessuno', 1, '2026-10-06', '2026-10-06 12:00', '2026-10-06 12:30', 30)").run(), /FOREIGN KEY/);
});

test('eliminare un utente elimina le sue prenotazioni', () => {
  const { db } = newDb();
  prenota(db, 'user0', MARTEDI, '10:00');
  db.prepare("DELETE FROM users WHERE username = 'user0'").run();
  assert.equal(agenda.listPrenotazioni(db).length, 0);
});

test('fine giornata: servizio che termina a mezzanotte (24:00)', () => {
  const { db } = newDb();
  agenda.setEccezione(db, { data: MARTEDI, fasce: [{ apertura: '22:00', chiusura: '24:00' }] });
  const s = agenda.getDisponibilita(db, MARTEDI, 1, ADESSO).slots;
  assert.equal(s.at(-1), '23:30');
  prenota(db, 'user0', MARTEDI, '23:30');
  rifiuta(() => prenota(db, 'user1', MARTEDI, '23:30'), 409);
  assert.equal(agenda.getDisponibilita(db, MARTEDI, 1, ADESSO).slots.includes('23:30'), false);
});
