// Logica di business dell'agenda: orari, disponibilità e prenotazioni.
// Agenda unica per salone. Nessuna dipendenza da Express: tutto testabile direttamente.
const { inTransaction } = require('./db');

const TZ = process.env.TZ_SALONE || 'Europe/Rome';

class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------- utilità data / ora ----------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const pad = n => String(n).padStart(2, '0');

function isValidDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function parseTime(s) {
  const m = typeof s === 'string' && TIME_RE.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const fmtTime = min => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const dayOfWeek = date => new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = domenica
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Data e minuti correnti nell'ora locale del salone.
function nowLocal(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(now).map(p => [p.type, p.value])
  );
  return { data: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) };
}

// ---------- impostazioni e orari ----------

function getImpostazioni(db) {
  return db.prepare('SELECT slot_step, anticipo_minimo, finestra_giorni FROM impostazioni WHERE id = 1').get();
}

function setImpostazioni(db, input) {
  const cur = getImpostazioni(db);
  const next = {
    slot_step: input.slot_step ?? cur.slot_step,
    anticipo_minimo: input.anticipo_minimo ?? cur.anticipo_minimo,
    finestra_giorni: input.finestra_giorni ?? cur.finestra_giorni,
  };
  if (!Number.isInteger(next.slot_step) || next.slot_step < 1 || next.slot_step > 120) throw new AppError(400, 'slot_step deve essere un intero tra 1 e 120');
  if (!Number.isInteger(next.anticipo_minimo) || next.anticipo_minimo < 0) throw new AppError(400, 'anticipo_minimo deve essere un intero >= 0');
  if (!Number.isInteger(next.finestra_giorni) || next.finestra_giorni < 1 || next.finestra_giorni > 730) throw new AppError(400, 'finestra_giorni deve essere un intero tra 1 e 730');
  db.prepare('UPDATE impostazioni SET slot_step = ?, anticipo_minimo = ?, finestra_giorni = ? WHERE id = 1')
    .run(next.slot_step, next.anticipo_minimo, next.finestra_giorni);
  return next;
}

// Valida e normalizza fasce [{apertura:"HH:MM", chiusura:"HH:MM"}] -> [[minA, minC]] ordinate e senza sovrapposizioni.
function parseFasce(fasce) {
  if (!Array.isArray(fasce)) throw new AppError(400, 'fasce deve essere un elenco');
  const out = fasce.map(f => {
    const a = parseTime(f && f.apertura);
    const c = f && f.chiusura === '24:00' ? 1440 : parseTime(f && f.chiusura);
    if (a === null || c === null) throw new AppError(400, 'Orario non valido: usare il formato HH:MM');
    if (a >= c) throw new AppError(400, `La fascia ${f.apertura}-${f.chiusura} ha la chiusura prima dell'apertura`);
    return [a, c];
  }).sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < out.length; i++) {
    if (out[i][0] < out[i - 1][1]) throw new AppError(400, 'Le fasce di uno stesso giorno non possono sovrapporsi');
  }
  return out;
}

const fasceToApi = rows => rows.map(([a, c]) => ({ apertura: fmtTime(a), chiusura: c === 1440 ? '24:00' : fmtTime(c) }));

function getOrariSettimanali(db) {
  const rows = db.prepare('SELECT giorno_settimana g, apertura a, chiusura c FROM orari_settimanali ORDER BY g, a').all();
  return [0, 1, 2, 3, 4, 5, 6].map(g => ({
    giorno_settimana: g,
    fasce: fasceToApi(rows.filter(r => r.g === g).map(r => [r.a, r.c])),
  }));
}

// Sostituisce l'orario settimanale. giorni: [{giorno_settimana, fasce:[...]}]; i giorni non citati restano invariati.
function setOrariSettimanali(db, giorni) {
  if (!Array.isArray(giorni)) throw new AppError(400, 'giorni deve essere un elenco');
  const parsed = giorni.map(g => {
    if (!g || !Number.isInteger(g.giorno_settimana) || g.giorno_settimana < 0 || g.giorno_settimana > 6) {
      throw new AppError(400, 'giorno_settimana deve essere un intero tra 0 (domenica) e 6 (sabato)');
    }
    return { g: g.giorno_settimana, fasce: parseFasce(g.fasce || []) };
  });
  inTransaction(db, () => {
    const del = db.prepare('DELETE FROM orari_settimanali WHERE giorno_settimana = ?');
    const ins = db.prepare('INSERT INTO orari_settimanali (giorno_settimana, apertura, chiusura) VALUES (?, ?, ?)');
    for (const { g, fasce } of parsed) {
      del.run(g);
      for (const [a, c] of fasce) ins.run(g, a, c);
    }
  });
  return getOrariSettimanali(db);
}

function getEccezioni(db, da, a) {
  const rows = db.prepare(`SELECT data, chiuso, apertura, chiusura, motivo FROM eccezioni
                           WHERE data >= ? AND data <= ? ORDER BY data, apertura`).all(da || '0000-01-01', a || '9999-12-31');
  const byDate = new Map();
  for (const r of rows) {
    if (!byDate.has(r.data)) byDate.set(r.data, { data: r.data, chiuso: !!r.chiuso, motivo: r.motivo, fasce: [] });
    if (!r.chiuso) byDate.get(r.data).fasce.push({ apertura: fmtTime(r.apertura), chiusura: r.chiusura === 1440 ? '24:00' : fmtTime(r.chiusura) });
  }
  return [...byDate.values()];
}

// Imposta l'eccezione di una data: chiuso=true chiude il giorno, altrimenti usa le fasce indicate.
function setEccezione(db, { data, chiuso = false, fasce = [], motivo = null }) {
  if (!isValidDate(data)) throw new AppError(400, 'Data non valida: usare il formato YYYY-MM-DD');
  const parsed = chiuso ? [] : parseFasce(fasce);
  if (!chiuso && parsed.length === 0) throw new AppError(400, 'Indicare almeno una fascia oppure chiuso=true');
  inTransaction(db, () => {
    db.prepare('DELETE FROM eccezioni WHERE data = ?').run(data);
    if (chiuso) {
      db.prepare('INSERT INTO eccezioni (data, chiuso, motivo) VALUES (?, 1, ?)').run(data, motivo);
    } else {
      const ins = db.prepare('INSERT INTO eccezioni (data, chiuso, apertura, chiusura, motivo) VALUES (?, 0, ?, ?, ?)');
      for (const [a, c] of parsed) ins.run(data, a, c, motivo);
    }
  });
  return getEccezioni(db, data, data)[0];
}

function deleteEccezione(db, data) {
  if (!isValidDate(data)) throw new AppError(400, 'Data non valida: usare il formato YYYY-MM-DD');
  const r = db.prepare('DELETE FROM eccezioni WHERE data = ?').run(data);
  if (r.changes === 0) throw new AppError(404, 'Nessuna eccezione per questa data');
}

// Fasce di apertura di una data in minuti: l'eccezione, se c'è, vince sull'orario settimanale.
function fasceDelGiorno(db, data) {
  const exc = db.prepare('SELECT chiuso, apertura, chiusura FROM eccezioni WHERE data = ? ORDER BY apertura').all(data);
  if (exc.length) return exc.some(e => e.chiuso) ? [] : exc.map(e => [e.apertura, e.chiusura]);
  return db.prepare('SELECT apertura, chiusura FROM orari_settimanali WHERE giorno_settimana = ? ORDER BY apertura')
    .all(dayOfWeek(data)).map(r => [r.apertura, r.chiusura]);
}

// Calendario per i giorni in [da, a] (massimo 92 giorni): per ogni giorno se è aperto e con quali fasce.
function getCalendario(db, da, a) {
  if (!isValidDate(da) || !isValidDate(a)) throw new AppError(400, 'Parametri da e a obbligatori nel formato YYYY-MM-DD');
  if (a < da) throw new AppError(400, 'La data finale è precedente a quella iniziale');
  if (addDays(da, 92) < a) throw new AppError(400, 'Intervallo massimo: 92 giorni');
  const giorni = [];
  for (let d = da; d <= a; d = addDays(d, 1)) {
    const fasce = fasceDelGiorno(db, d);
    giorni.push({ data: d, giorno_settimana: dayOfWeek(d), aperto: fasce.length > 0, fasce: fasceToApi(fasce) });
  }
  return giorni;
}

// ---------- disponibilità ----------

function getServizio(db, id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'Servizio non valido');
  const s = db.prepare('SELECT id, nome, prezzo, durata FROM servizi WHERE id = ?').get(n);
  if (!s) throw new AppError(404, 'Servizio non trovato');
  return s;
}

// Controlla che la data sia prenotabile (non passata, entro la finestra).
function checkData(data, imp, ora) {
  if (!isValidDate(data)) throw new AppError(400, 'Data non valida: usare il formato YYYY-MM-DD');
  if (data < ora.data) throw new AppError(400, 'Non si può prenotare in un giorno passato');
  if (data > addDays(ora.data, imp.finestra_giorni)) throw new AppError(400, `Si può prenotare al massimo ${imp.finestra_giorni} giorni in anticipo`);
}

// Minuti dalla mezzanotte da una stringa 'YYYY-MM-DD HH:MM' (fine giornata inclusa: 24:00 = 1440).
const minutiDi = s => (s.endsWith('24:00') ? 1440 : parseTime(s.slice(11)));

// Minuti [inizio, fine) occupati da prenotazioni confermate in una data.
function occupati(db, data) {
  return db.prepare("SELECT inizio, fine FROM prenotazioni WHERE data = ? AND stato = 'confermata'").all(data)
    .map(r => [minutiDi(r.inizio), minutiDi(r.fine)]);
}

// Orari di inizio possibili per un servizio di `durata` minuti: dentro una fascia, sulla griglia
// slot_step dall'apertura della fascia, senza toccare altre prenotazioni e rispettando il preavviso.
function slotValidi(fasce, durata, step, occ, minStart) {
  const slots = [];
  for (const [apertura, chiusura] of fasce) {
    for (let start = apertura; start + durata <= chiusura; start += step) {
      if (start < minStart) continue;
      if (occ.some(([o, f]) => start < f && start + durata > o)) continue;
      slots.push(start);
    }
  }
  return slots;
}

// Primo minuto prenotabile in una data. Il giorno stesso vale il preavviso minimo; l'admin lo salta
// (es. cliente in sede) ma non può comunque prenotare orari già passati.
function minStartPerData(data, imp, ora, admin = false) {
  return data === ora.data ? ora.min + (admin ? 0 : imp.anticipo_minimo) : 0;
}

function getDisponibilita(db, data, servizioId, ora = nowLocal(), { admin = false } = {}) {
  const imp = getImpostazioni(db);
  checkData(data, imp, ora);
  const servizio = getServizio(db, servizioId);
  const slots = slotValidi(fasceDelGiorno(db, data), servizio.durata, imp.slot_step, occupati(db, data), minStartPerData(data, imp, ora, admin));
  return { data, servizio: { id: servizio.id, nome: servizio.nome, durata: servizio.durata }, slots: slots.map(fmtTime) };
}

// ---------- prenotazioni ----------

function rowToPrenotazione(r) {
  return {
    id: r.id, user: r.user, nome: r.nome, cognome: r.cognome,
    servizio: { id: r.servizio_id, nome: r.servizio_nome, prezzo: r.prezzo },
    data: r.data, inizio: r.inizio.slice(11), fine: r.fine.slice(11), durata: r.durata, stato: r.stato,
  };
}

const SELECT_PRENOTAZIONE = `SELECT p.id, p.user, u.nome, u.cognome, p.servizio_id, s.nome AS servizio_nome, s.prezzo,
                                    p.data, p.inizio, p.fine, p.durata, p.stato
                             FROM prenotazioni p
                             JOIN users u ON u.username = p.user
                             JOIN servizi s ON s.id = p.servizio_id`;

// Crea una prenotazione. Tutti i controlli e l'INSERT avvengono nella stessa transazione.
// da_admin: prenotazione inserita dal salone per conto di un cliente (salta il preavviso minimo).
function prenota(db, { username, servizio, data, ora, da_admin = false }, adesso = nowLocal()) {
  if (typeof username !== 'string' || !username) throw new AppError(400, 'Nome utente mancante');
  if (servizio === undefined || servizio === null || servizio === '') throw new AppError(400, 'Servizio mancante');
  if (!data) throw new AppError(400, 'Data mancante');
  if (!ora) throw new AppError(400, 'Orario mancante');
  const start = parseTime(ora);
  if (start === null) throw new AppError(400, 'Orario non valido: usare il formato HH:MM');

  return inTransaction(db, () => {
    const imp = getImpostazioni(db);
    checkData(data, imp, adesso);
    const s = getServizio(db, servizio);

    const user = db.prepare('SELECT username, active FROM users WHERE username = ?').get(username);
    if (!user) throw new AppError(404, 'Utente non trovato');
    if (user.active === 0) throw new AppError(403, 'Utente non attivo');

    const fasce = fasceDelGiorno(db, data);
    if (fasce.length === 0) throw new AppError(409, 'Il salone è chiuso in questa data');
    const nelleFasce = fasce.some(([a, c]) => start >= a && start + s.durata <= c && (start - a) % imp.slot_step === 0);
    if (!nelleFasce) throw new AppError(400, 'Orario non valido: fuori dagli orari di apertura o non allineato agli slot');
    if (start < minStartPerData(data, imp, adesso, da_admin === true)) {
      throw new AppError(400, da_admin === true ? 'Orario già passato' : `Servono almeno ${imp.anticipo_minimo} minuti di preavviso`);
    }

    if (db.prepare("SELECT 1 FROM prenotazioni WHERE user = ? AND data = ? AND stato = 'confermata'").get(username, data)) {
      throw new AppError(409, 'Hai già una prenotazione per questo giorno');
    }
    if (occupati(db, data).some(([o, f]) => start < f && start + s.durata > o)) {
      throw new AppError(409, 'Slot non disponibile');
    }

    try {
      const r = db.prepare(`INSERT INTO prenotazioni (user, servizio_id, data, inizio, fine, durata) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(username, s.id, data, `${data} ${fmtTime(start)}`, `${data} ${fmtTime(start + s.durata)}`, s.durata);
      return rowToPrenotazione(db.prepare(`${SELECT_PRENOTAZIONE} WHERE p.id = ?`).get(Number(r.lastInsertRowid)));
    } catch (e) {
      // rete di sicurezza: trigger di sovrapposizione e indice univoco utente/giorno
      if (/SLOT_OCCUPATO/.test(e.message)) throw new AppError(409, 'Slot non disponibile');
      if (/UNIQUE constraint failed: prenotazioni/.test(e.message)) throw new AppError(409, 'Hai già una prenotazione per questo giorno');
      throw e;
    }
  });
}

// Elenco prenotazioni con filtri: data, da, a, username, q (nome/cognome), stato.
function listPrenotazioni(db, f = {}) {
  const where = [];
  const args = [];
  for (const k of ['data', 'da', 'a']) {
    if (f[k] !== undefined && !isValidDate(f[k])) throw new AppError(400, `Parametro ${k} non valido: usare il formato YYYY-MM-DD`);
  }
  if (f.data) { where.push('p.data = ?'); args.push(f.data); }
  if (f.da) { where.push('p.data >= ?'); args.push(f.da); }
  if (f.a) { where.push('p.data <= ?'); args.push(f.a); }
  if (f.username) { where.push('p.user = ?'); args.push(f.username); }
  if (f.q) {
    where.push("(u.nome LIKE ? ESCAPE '\\' OR u.cognome LIKE ? ESCAPE '\\' OR (u.nome || ' ' || u.cognome) LIKE ? ESCAPE '\\')");
    const like = `%${String(f.q).replace(/[\\%_]/g, c => '\\' + c)}%`;
    args.push(like, like, like);
  }
  if (f.stato) {
    if (!['confermata', 'annullata'].includes(f.stato)) throw new AppError(400, "stato deve essere 'confermata' o 'annullata'");
    where.push('p.stato = ?'); args.push(f.stato);
  }
  const sql = `${SELECT_PRENOTAZIONE} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.inizio`;
  return db.prepare(sql).all(...args).map(rowToPrenotazione);
}

function annullaPrenotazione(db, id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'Id prenotazione non valido');
  return inTransaction(db, () => {
    const p = db.prepare('SELECT stato FROM prenotazioni WHERE id = ?').get(n);
    if (!p) throw new AppError(404, 'Prenotazione non trovata');
    if (p.stato === 'annullata') throw new AppError(409, 'Prenotazione già annullata');
    db.prepare("UPDATE prenotazioni SET stato = 'annullata' WHERE id = ?").run(n);
    return rowToPrenotazione(db.prepare(`${SELECT_PRENOTAZIONE} WHERE p.id = ?`).get(n));
  });
}

module.exports = {
  AppError, nowLocal, isValidDate, parseTime, fmtTime,
  getImpostazioni, setImpostazioni,
  getOrariSettimanali, setOrariSettimanali, getEccezioni, setEccezione, deleteEccezione, getCalendario,
  getDisponibilita, prenota, listPrenotazioni, annullaPrenotazione,
};
