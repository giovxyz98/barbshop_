// Foto dei prodotti: riconoscimento del formato dai byte e importazione delle vecchie foto salvate su file.
// (Le foto ora vivono nel database, tabella prodotti_immagini: vedi prodotti.js.)
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 6 * 1024 * 1024;
const TIPI = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Tipo MIME dedotto dai primi byte (non ci si fida dell'intestazione Content-Type); null se non è un'immagine ammessa.
function tipoImmagine(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  const testa = buf.subarray(0, 6).toString('latin1');
  if (testa === 'GIF87a' || testa === 'GIF89a') return 'image/gif';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

// Passaggio dalla versione precedente (file in uploads/): le foto dei prodotti finiscono nel database
// e i file vengono eliminati. Idempotente: se non ci sono più riferimenti a /uploads/ non fa nulla.
function importaImmaginiDaFile(db, uploadDir) {
  const righe = db.prepare("SELECT id, immagine FROM prodotti WHERE immagine LIKE '/uploads/%'").all();
  let importate = 0;
  for (const r of righe) {
    const m = /^\/uploads\/([a-f0-9]{32}\.(?:jpg|png|webp|gif))$/.exec(r.immagine);
    const file = m && path.join(uploadDir, m[1]);
    let buf = null;
    try { buf = file ? fs.readFileSync(file) : null; } catch (e) { /* file mancante */ }
    const tipo = buf && buf.length <= MAX_BYTES ? tipoImmagine(buf) : null;
    if (tipo) {
      db.prepare('INSERT OR REPLACE INTO prodotti_immagini (prodotto_id, tipo, dati, versione) VALUES (?, ?, ?, ?)').run(r.id, tipo, buf, Date.now());
      importate++;
    }
    db.prepare('UPDATE prodotti SET immagine = NULL WHERE id = ?').run(r.id);
    if (file) { try { fs.unlinkSync(file); } catch (e) { /* già assente */ } }
  }
  return importate;
}

module.exports = { tipoImmagine, importaImmaginiDaFile, MAX_BYTES, TIPI };
