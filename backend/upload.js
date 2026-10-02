// Caricamento delle immagini dei prodotti: file salvati in uploads/ con nome casuale.
// Il tipo si deduce dai primi byte del file (non ci si fida dell'intestazione Content-Type).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { AppError } = require('./agenda');
const { wrap } = require('./wrap');
const { logEvent } = require('../log/log');

const MAX_BYTES = 6 * 1024 * 1024;
const TIPI = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const URL_LOCALE = /^\/uploads\/([a-f0-9]{32}\.(?:jpg|png|webp|gif))$/;

function estensione(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  const testa = buf.subarray(0, 6).toString('latin1');
  if (testa === 'GIF87a' || testa === 'GIF89a') return 'gif';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

// Percorso su disco di un indirizzo locale (/uploads/xxx.jpg), oppure null se non lo è.
function percorsoLocale(url, uploadDir) {
  const m = typeof url === 'string' && URL_LOCALE.exec(url);
  return m ? path.join(uploadDir, m[1]) : null;
}

function rimuoviImmagine(url, uploadDir) {
  const p = percorsoLocale(url, uploadDir);
  if (!p) return;
  try { fs.unlinkSync(p); } catch (e) { /* già assente */ }
}

// Elimina i file caricati e mai associati a un prodotto (es. finestra chiusa dopo l'upload), più vecchi di un'ora.
function pulisciOrfani(db, uploadDir, ora = Date.now()) {
  if (!fs.existsSync(uploadDir)) return 0;
  const usati = new Set(db.prepare("SELECT immagine FROM prodotti WHERE immagine LIKE '/uploads/%'").all().map(r => r.immagine));
  let n = 0;
  for (const nome of fs.readdirSync(uploadDir)) {
    if (!URL_LOCALE.test(`/uploads/${nome}`) || usati.has(`/uploads/${nome}`)) continue;
    const p = path.join(uploadDir, nome);
    if (ora - fs.statSync(p).mtimeMs > 60 * 60 * 1000) { fs.unlinkSync(p); n++; }
  }
  return n;
}

function uploadRouter(uploadDir) {
  const router = express.Router();

  // Corpo grezzo: il browser invia direttamente i byte dell'immagine con il suo Content-Type.
  router.post('/upload/immagine', express.raw({ type: TIPI, limit: MAX_BYTES }), wrap((req, res) => {
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) throw new AppError(415, 'Invia un\'immagine JPEG, PNG, WebP o GIF');
    const ext = estensione(buf);
    if (!ext) throw new AppError(415, 'Il file non è un\'immagine valida (JPEG, PNG, WebP o GIF)');
    fs.mkdirSync(uploadDir, { recursive: true });
    const nome = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, nome), buf);
    logEvent(`Immagine caricata: ${nome} (${buf.length} byte) - Success`);
    res.status(201).json({ url: `/uploads/${nome}` });
  }));

  return router;
}

module.exports = { uploadRouter, percorsoLocale, rimuoviImmagine, pulisciOrfani, URL_LOCALE, MAX_BYTES };
