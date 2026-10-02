// Foto dei prodotti salvate nel database.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../backend/server');
const { importaImmaginiDaFile } = require('../backend/upload');
const { newDb } = require('./helpers');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), Buffer.from('JFIF\0'), Buffer.alloc(32, 1)]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x20, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(32)]);

async function avvia() {
  const { db } = newDb();
  const server = createApp(db).listen(0);
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = (method, url, body) => fetch(`${base}/api${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));
  const foto = (id, body, type) => fetch(`${base}/api/prodotti/${id}/immagine`, { method: 'PUT', headers: type ? { 'Content-Type': type } : {}, body });
  const nuovoProdotto = async (nome = 'Cera') => (await json('POST', '/prodotti', { nome, prezzo: 10 })).body.prodotto.id;
  return { db, base, json, foto, nuovoProdotto, close: () => server.close() };
}

test('foto nel database: formati ammessi, servita con il tipo giusto e cache', async t => {
  const { foto, nuovoProdotto, base, json, close } = await avvia();
  t.after(close);
  for (const [buf, mime] of [[PNG, 'image/png'], [JPG, 'image/jpeg'], [GIF, 'image/gif'], [WEBP, 'image/webp']]) {
    const id = await nuovoProdotto(`P-${mime}`);
    const r = await foto(id, buf, mime);
    assert.equal(r.status, 200, mime);
    const url = (await r.json()).prodotto.immagine;
    assert.match(url, new RegExp(`^/api/prodotti/${id}/immagine\\?v=[0-9]+$`));

    const g = await fetch(base + url);
    assert.equal(g.status, 200);
    assert.equal(g.headers.get('content-type'), mime);
    assert.equal(g.headers.get('x-content-type-options'), 'nosniff');
    assert.match(g.headers.get('cache-control'), /immutable/);
    assert.deepEqual(Buffer.from(await g.arrayBuffer()), buf);

    // revalidazione
    const etag = g.headers.get('etag');
    assert.equal((await fetch(base + url, { headers: { 'If-None-Match': etag } })).status, 304);
  }
  // senza ?v= niente cache lunga
  const id = await nuovoProdotto('Senza v');
  await foto(id, PNG, 'image/png');
  assert.equal((await fetch(`${base}/api/prodotti/${id}/immagine`)).headers.get('cache-control'), 'no-cache');
  assert.equal((await json('GET', '/prodotti')).body.prodotti.every(p => p.immagine), true);
});

test('foto: il formato si deduce dai byte e i file non validi sono respinti', async t => {
  const { foto, nuovoProdotto, db, close } = await avvia();
  t.after(close);
  const id = await nuovoProdotto();
  assert.equal((await foto(id, Buffer.from('<html><script>alert(1)</script></html>'), 'image/png')).status, 415);
  assert.equal((await foto(id, PNG, 'text/plain')).status, 415);
  assert.equal((await foto(id, PNG, 'image/svg+xml')).status, 415);
  assert.equal((await foto(id, undefined, 'image/png')).status, 415);
  assert.equal((await foto(999, PNG, 'image/png')).status, 404);
  assert.equal((await foto('abc', PNG, 'image/png')).status, 400);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM prodotti_immagini').get().c, 0, 'nessuna foto salvata');
});

test('foto: oltre 6 MB -> 413', async t => {
  const { foto, nuovoProdotto, close } = await avvia();
  t.after(close);
  const r = await foto(await nuovoProdotto(), Buffer.concat([PNG, Buffer.alloc(7 * 1024 * 1024)]), 'image/png');
  assert.equal(r.status, 413);
  assert.match((await r.json()).error, /troppo grande/);
});

test('foto: sostituzione cambia indirizzo, rimozione e eliminazione del prodotto la tolgono', async t => {
  const { foto, nuovoProdotto, base, json, db, close } = await avvia();
  t.after(close);
  const id = await nuovoProdotto();

  const url1 = (await (await foto(id, PNG, 'image/png')).json()).prodotto.immagine;
  await new Promise(r => setTimeout(r, 5));
  const url2 = (await (await foto(id, JPG, 'image/jpeg')).json()).prodotto.immagine;
  assert.notEqual(url1, url2, 'un\'altra versione = un altro indirizzo (la cache non resta vecchia)');
  assert.equal(db.prepare('SELECT COUNT(*) c FROM prodotti_immagini').get().c, 1, 'una sola foto per prodotto');
  assert.equal((await fetch(base + url2)).headers.get('content-type'), 'image/jpeg');

  // modificare i dati del prodotto non tocca la foto, nemmeno se il client rimanda l'indirizzo che ha ricevuto
  let r = await json('PUT', `/prodotti/${id}`, { nome: 'Cera forte', prezzo: 12, immagine: url2 });
  assert.equal(r.body.prodotto.immagine, url2);
  r = await json('PUT', `/prodotti/${id}`, { nome: 'Cera forte', prezzo: 12 });
  assert.equal(r.body.prodotto.immagine, url2);

  // rimozione
  r = await json('DELETE', `/prodotti/${id}/immagine`);
  assert.equal(r.body.prodotto.immagine, null);
  assert.equal((await fetch(base + url2)).status, 404);

  // eliminazione del prodotto: la foto va via con lui (cascata)
  await foto(id, PNG, 'image/png');
  assert.equal(db.prepare('SELECT COUNT(*) c FROM prodotti_immagini').get().c, 1);
  await json('DELETE', `/prodotti/${id}`);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM prodotti_immagini').get().c, 0);
});

test('foto: la lista dei prodotti non contiene i byte e la foto caricata sostituisce l\'indirizzo esterno', async t => {
  const { foto, json, close } = await avvia();
  t.after(close);
  const id = (await json('POST', '/prodotti', { nome: 'Gel', prezzo: 5, immagine: 'https://example.com/g.jpg' })).body.prodotto.id;
  await foto(id, PNG, 'image/png');
  const lista = await json('GET', '/prodotti');
  assert.match(lista.body.prodotti[0].immagine, /^\/api\/prodotti\//);
  assert.ok(JSON.stringify(lista.body).length < 600, 'nessun dato binario nella lista');
  assert.deepEqual(Object.keys(lista.body.prodotti[0]).sort(), ['categoria', 'descrizione', 'disponibile', 'id', 'immagine', 'nome', 'prezzo']);
});

test('foto: indirizzi non validi nel corpo del prodotto respinti', async t => {
  const { json, close } = await avvia();
  t.after(close);
  for (const immagine of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'ftp://x/y.png', 5, {}]) {
    assert.equal((await json('POST', '/prodotti', { nome: 'X', prezzo: 1, immagine })).status, 400, String(immagine));
  }
});

test('importazione dalla versione a file: le foto passano nel database e i file spariscono', async t => {
  const { db, foto, json, nuovoProdotto, close } = await avvia();
  t.after(close);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'barbshop-imp-'));
  const nome = `${'a'.repeat(32)}.png`;
  fs.writeFileSync(path.join(dir, nome), PNG);

  const conFile = await nuovoProdotto('Con file');
  const senzaFile = await nuovoProdotto('File mancante');
  const finto = await nuovoProdotto('File falso');
  fs.writeFileSync(path.join(dir, `${'b'.repeat(32)}.png`), Buffer.from('non sono un\'immagine'));
  db.prepare('UPDATE prodotti SET immagine = ? WHERE id = ?').run(`/uploads/${nome}`, conFile);
  db.prepare('UPDATE prodotti SET immagine = ? WHERE id = ?').run(`/uploads/${'c'.repeat(32)}.png`, senzaFile);
  db.prepare('UPDATE prodotti SET immagine = ? WHERE id = ?').run(`/uploads/${'b'.repeat(32)}.png`, finto);

  assert.equal(importaImmaginiDaFile(db, dir), 1);
  const lista = (await json('GET', '/prodotti')).body.prodotti;
  assert.match(lista.find(p => p.id === conFile).immagine, /^\/api\/prodotti\//);
  assert.equal(lista.find(p => p.id === senzaFile).immagine, null);
  assert.equal(lista.find(p => p.id === finto).immagine, null);
  assert.equal(fs.readdirSync(dir).length, 0, 'file eliminati');
  assert.equal(importaImmaginiDaFile(db, dir), 0, 'seconda esecuzione: niente da fare');
});
