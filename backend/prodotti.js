const express = require('express');
const { AppError } = require('./agenda');
const { wrap } = require('./wrap');
const { logEvent } = require('../log/log');
const { URL_LOCALE, rimuoviImmagine } = require('./upload');

// Valida e normalizza i campi di un prodotto.
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
  const immagine = typeof b.immagine === 'string' && b.immagine.trim() ? b.immagine.trim() : null;
  if (immagine && !/^https?:\/\/\S+$/i.test(immagine) && !URL_LOCALE.test(immagine)) {
    throw new AppError(400, 'Immagine non valida: carica una foto o indica un indirizzo http(s)');
  }
  const disponibile = b.disponibile === undefined ? 1 : (b.disponibile === false || b.disponibile === 0 || b.disponibile === '0' ? 0 : 1);
  return { nome, categoria, descrizione, prezzo, immagine, disponibile };
}

function idValido(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'Id prodotto non valido');
  return n;
}

module.exports = (db, uploadDir) => {
  const router = express.Router();
  const get = id => db.prepare('SELECT * FROM prodotti WHERE id = ?').get(id);

  // Di default solo i prodotti disponibili (vetrina); ?tutti=1 per l'admin.
  router.get('/prodotti', wrap((req, res) => {
    const where = req.query.tutti === '1' ? '' : 'WHERE disponibile = 1';
    res.json({ prodotti: db.prepare(`SELECT * FROM prodotti ${where} ORDER BY categoria, nome`).all() });
  }));

  router.post('/prodotti', wrap((req, res) => {
    const p = leggiProdotto(req.body);
    const r = db.prepare('INSERT INTO prodotti (nome, categoria, descrizione, prezzo, immagine, disponibile) VALUES (?, ?, ?, ?, ?, ?)')
      .run(p.nome, p.categoria, p.descrizione, p.prezzo, p.immagine, p.disponibile);
    logEvent(`Prodotto aggiunto: ${p.nome} - Success`);
    res.status(201).json({ prodotto: get(Number(r.lastInsertRowid)) });
  }));

  router.put('/prodotti/:id', wrap((req, res) => {
    const id = idValido(req.params.id);
    const vecchio = get(id);
    if (!vecchio) throw new AppError(404, 'Prodotto non trovato');
    const p = leggiProdotto(req.body);
    db.prepare('UPDATE prodotti SET nome = ?, categoria = ?, descrizione = ?, prezzo = ?, immagine = ?, disponibile = ? WHERE id = ?')
      .run(p.nome, p.categoria, p.descrizione, p.prezzo, p.immagine, p.disponibile, id);
    if (vecchio.immagine !== p.immagine) rimuoviImmagine(vecchio.immagine, uploadDir);   // la foto sostituita non resta su disco
    res.json({ prodotto: get(id) });
  }));

  router.delete('/prodotti/:id', wrap((req, res) => {
    const id = idValido(req.params.id);
    const vecchio = get(id);
    if (db.prepare('DELETE FROM prodotti WHERE id = ?').run(id).changes === 0) throw new AppError(404, 'Prodotto non trovato');
    rimuoviImmagine(vecchio.immagine, uploadDir);
    res.json({ message: 'Prodotto eliminato' });
  }));

  return router;
};
