const express = require('express');
const { AppError } = require('./agenda');
const { wrap } = require('./wrap');
const { logEvent } = require('../log/log');
const { tipoImmagine, MAX_BYTES, TIPI } = require('./upload');

const URL_HTTP = /^https?:\/\/\S+$/i;

// Valida e normalizza i campi di un prodotto. `immagine` (indirizzo esterno, facoltativo):
// assente o indirizzo relativo = invariato (undefined); '' o null = rimuovi; http(s) = imposta.
function leggiProdotto(body) {
  const b = body || {};
  const nome = typeof b.nome === 'string' ? b.nome.trim() : '';
  if (!nome) throw new AppError(400, 'Inserire il nome del prodotto');
  if (nome.length > 100) throw new AppError(400, 'Nome troppo lungo (max 100 caratteri)');
  const prezzo = Number(b.prezzo);
  if (b.prezzo === undefined || b.prezzo === null || b.prezzo === '' || !Number.isFinite(prezzo) || prezzo < 0) {
    throw new AppError(400, 'Inserire un prezzo valido');
  }
  const categoria = (typeof b.categoria === 'string' && b.categoria.trim()) || 'Altro';
  const descrizione = typeof b.descrizione === 'string' && b.descrizione.trim() ? b.descrizione.trim() : null;

  let immagine;
  if (b.immagine === null || b.immagine === '') immagine = null;
  else if (typeof b.immagine === 'string' && b.immagine.startsWith('/')) immagine = undefined;   // l'indirizzo della foto salvata: non si modifica da qui
  else if (typeof b.immagine === 'string' && URL_HTTP.test(b.immagine.trim())) immagine = b.immagine.trim();
  else if (b.immagine !== undefined) throw new AppError(400, 'Immagine non valida: carica una foto o indica un indirizzo http(s)');

  const disponibile = b.disponibile === undefined ? 1 : (b.disponibile === false || b.disponibile === 0 || b.disponibile === '0' ? 0 : 1);
  return { nome, categoria, descrizione, prezzo, immagine, disponibile };
}

function idValido(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'Id prodotto non valido');
  return n;
}

module.exports = db => {
  const router = express.Router();

  // Il prodotto con l'indirizzo della sua foto: quella nel database se c'è, altrimenti l'eventuale indirizzo esterno.
  const SELECT = `SELECT p.id, p.nome, p.categoria, p.descrizione, p.prezzo, p.immagine, p.disponibile, i.versione
                  FROM prodotti p LEFT JOIN prodotti_immagini i ON i.prodotto_id = p.id`;
  const aggiusta = r => ({
    id: r.id, nome: r.nome, categoria: r.categoria, descrizione: r.descrizione, prezzo: r.prezzo, disponibile: r.disponibile,
    immagine: r.versione ? `/api/prodotti/${r.id}/immagine?v=${r.versione}` : r.immagine,
  });
  const get = id => { const r = db.prepare(`${SELECT} WHERE p.id = ?`).get(id); return r ? aggiusta(r) : null; };
  const esiste = id => { if (!db.prepare('SELECT 1 FROM prodotti WHERE id = ?').get(id)) throw new AppError(404, 'Prodotto non trovato'); };

  // Di default solo i prodotti disponibili (vetrina); ?tutti=1 per l'admin.
  router.get('/prodotti', wrap((req, res) => {
    const where = req.query.tutti === '1' ? '' : 'WHERE p.disponibile = 1';
    res.json({ prodotti: db.prepare(`${SELECT} ${where} ORDER BY p.categoria, p.nome`).all().map(aggiusta) });
  }));

  router.post('/prodotti', wrap((req, res) => {
    const p = leggiProdotto(req.body);
    const r = db.prepare('INSERT INTO prodotti (nome, categoria, descrizione, prezzo, immagine, disponibile) VALUES (?, ?, ?, ?, ?, ?)')
      .run(p.nome, p.categoria, p.descrizione, p.prezzo, p.immagine ?? null, p.disponibile);
    logEvent(`Prodotto aggiunto: ${p.nome} - Success`);
    res.status(201).json({ prodotto: get(Number(r.lastInsertRowid)) });
  }));

  router.put('/prodotti/:id', wrap((req, res) => {
    const id = idValido(req.params.id);
    esiste(id);
    const p = leggiProdotto(req.body);
    db.prepare('UPDATE prodotti SET nome = ?, categoria = ?, descrizione = ?, prezzo = ?, disponibile = ? WHERE id = ?')
      .run(p.nome, p.categoria, p.descrizione, p.prezzo, p.disponibile, id);
    if (p.immagine !== undefined) db.prepare('UPDATE prodotti SET immagine = ? WHERE id = ?').run(p.immagine, id);
    res.json({ prodotto: get(id) });
  }));

  // La foto della riga viene eliminata a cascata (FOREIGN KEY ... ON DELETE CASCADE).
  router.delete('/prodotti/:id', wrap((req, res) => {
    const id = idValido(req.params.id);
    if (db.prepare('DELETE FROM prodotti WHERE id = ?').run(id).changes === 0) throw new AppError(404, 'Prodotto non trovato');
    res.json({ message: 'Prodotto eliminato' });
  }));

  // ----- foto -----

  // Imposta la foto: corpo grezzo con i byte dell'immagine (JPEG, PNG, WebP, GIF; max 6 MB).
  router.put('/prodotti/:id/immagine', express.raw({ type: TIPI, limit: MAX_BYTES }), wrap((req, res) => {
    const id = idValido(req.params.id);
    esiste(id);
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) throw new AppError(415, "Invia un'immagine JPEG, PNG, WebP o GIF");
    const tipo = tipoImmagine(buf);
    if (!tipo) throw new AppError(415, "Il file non è un'immagine valida (JPEG, PNG, WebP o GIF)");
    db.prepare(`INSERT INTO prodotti_immagini (prodotto_id, tipo, dati, versione) VALUES (?, ?, ?, ?)
                ON CONFLICT (prodotto_id) DO UPDATE SET tipo = excluded.tipo, dati = excluded.dati, versione = excluded.versione`)
      .run(id, tipo, buf, Date.now());
    db.prepare('UPDATE prodotti SET immagine = NULL WHERE id = ?').run(id);   // sostituisce l'eventuale indirizzo esterno
    logEvent(`Foto del prodotto ${id} aggiornata (${buf.length} byte) - Success`);
    res.json({ prodotto: get(id) });
  }));

  router.delete('/prodotti/:id/immagine', wrap((req, res) => {
    const id = idValido(req.params.id);
    esiste(id);
    db.prepare('DELETE FROM prodotti_immagini WHERE prodotto_id = ?').run(id);
    db.prepare('UPDATE prodotti SET immagine = NULL WHERE id = ?').run(id);
    res.json({ prodotto: get(id) });
  }));

  // Serve la foto. Con ?v=<versione> il browser può tenerla in cache a lungo: cambia l'indirizzo a ogni modifica.
  router.get('/prodotti/:id/immagine', wrap((req, res) => {
    const id = idValido(req.params.id);
    const r = db.prepare('SELECT tipo, dati, versione FROM prodotti_immagini WHERE prodotto_id = ?').get(id);
    if (!r) throw new AppError(404, 'Foto non trovata');
    const etag = `"${r.versione}"`;
    res.setHeader('ETag', etag);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.setHeader('Content-Type', r.tipo);
    res.end(Buffer.from(r.dati));
  }));

  return router;
};
