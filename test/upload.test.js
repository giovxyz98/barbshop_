// Caricamento delle foto dei prodotti.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../backend/server');
const { pulisciOrfani } = require('../backend/upload');
const { newDb } = require('./helpers');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), Buffer.from('JFIF\0'), Buffer.alloc(32, 1)]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x20, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(32)]);

async function avvia() {
  const { db } = newDb();
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'barbshop-up-'));
  const server = createApp(db, { uploadDir }).listen(0);
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const upload = (body, type) => fetch(`${base}/api/upload/immagine`, { method: 'POST', headers: type ? { 'Content-Type': type } : {}, body });
  const json = (method, url, body) => fetch(`${base}/api${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));
  return { db, uploadDir, base, upload, json, close: () => server.close() };
}

test('upload: immagini valide salvate con nome casuale e servite con il tipo giusto', async t => {
  const { upload, base, uploadDir, close } = await avvia();
  t.after(close);
  for (const [buf, tipo, ext, mime] of [[PNG, 'image/png', 'png', 'image/png'], [JPG, 'image/jpeg', 'jpg', 'image/jpeg'], [GIF, 'image/gif', 'gif', 'image/gif'], [WEBP, 'image/webp', 'webp', 'image/webp']]) {
    const r = await upload(buf, tipo);
    assert.equal(r.status, 201, ext);
    const { url } = await r.json();
    assert.match(url, new RegExp(`^/uploads/[a-f0-9]{32}\\.${ext}$`));
    assert.ok(fs.existsSync(path.join(uploadDir, path.basename(url))));
    const g = await fetch(base + url);
    assert.equal(g.status, 200);
    assert.equal(g.headers.get('content-type'), mime);
    assert.equal(g.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await g.arrayBuffer()), buf);
  }
});

test('upload: il tipo si deduce dai byte, non dall\'intestazione', async t => {
  const { upload, uploadDir, close } = await avvia();
  t.after(close);
  // un HTML/script che si dichiara PNG viene rifiutato
  let r = await upload(Buffer.from('<html><script>alert(1)</script></html>'), 'image/png');
  assert.equal(r.status, 415);
  // un PNG vero ma dichiarato come testo non viene nemmeno letto
  r = await upload(PNG, 'text/plain');
  assert.equal(r.status, 415);
  r = await upload(PNG, 'image/svg+xml');
  assert.equal(r.status, 415);
  r = await upload(undefined, 'image/png');
  assert.equal(r.status, 415);
  assert.equal(fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).length : 0, 0, 'nessun file scritto');
});

test('upload: oltre 6 MB -> 413', async t => {
  const { upload, close } = await avvia();
  t.after(close);
  const grande = Buffer.concat([PNG, Buffer.alloc(7 * 1024 * 1024)]);
  const r = await upload(grande, 'image/png');
  assert.equal(r.status, 413);
  assert.match((await r.json()).error, /troppo grande/);
});

test('upload: non si può uscire dalla cartella con percorsi particolari', async t => {
  const { base, close } = await avvia();
  t.after(close);
  for (const p of ['/uploads/../db/database.db', '/uploads/..%2Fdb%2Fdatabase.db', '/uploads/%2e%2e/package.json', '/uploads/inesistente.png']) {
    const r = await fetch(base + p);
    assert.ok([400, 403, 404].includes(r.status), `${p} -> ${r.status}`);
    assert.doesNotMatch(await r.text(), /"name"|SQLite/);
  }
});

test('prodotti: la foto caricata si associa al prodotto, si sostituisce e si elimina con lui', async t => {
  const { upload, json, uploadDir, close } = await avvia();
  t.after(close);
  const carica = async b => (await (await upload(b, 'image/png')).json()).url;
  const esiste = url => fs.existsSync(path.join(uploadDir, path.basename(url)));

  const url1 = await carica(PNG);
  let r = await json('POST', '/prodotti', { nome: 'Cera', prezzo: 10, immagine: url1 });
  assert.equal(r.status, 201);
  assert.equal(r.body.prodotto.immagine, url1);
  const id = r.body.prodotto.id;

  // modifica senza cambiare foto: il file resta
  r = await json('PUT', `/prodotti/${id}`, { nome: 'Cera forte', prezzo: 11, immagine: url1 });
  assert.equal(r.status, 200);
  assert.ok(esiste(url1));

  // sostituzione: il vecchio file sparisce
  const url2 = await carica(PNG);
  await json('PUT', `/prodotti/${id}`, { nome: 'Cera forte', prezzo: 11, immagine: url2 });
  assert.equal(esiste(url1), false);
  assert.ok(esiste(url2));

  // rimozione della foto dal prodotto
  await json('PUT', `/prodotti/${id}`, { nome: 'Cera forte', prezzo: 11 });
  assert.equal(esiste(url2), false);

  // eliminazione del prodotto: via anche la foto
  const url3 = await carica(PNG);
  r = await json('POST', '/prodotti', { nome: 'Gel', prezzo: 5, immagine: url3 });
  await json('DELETE', `/prodotti/${r.body.prodotto.id}`);
  assert.equal(esiste(url3), false);
});

test('prodotti: indirizzi immagine non validi respinti, URL http(s) ancora accettati', async t => {
  const { json, close } = await avvia();
  t.after(close);
  for (const immagine of ['/uploads/../../etc/passwd', '/uploads/abc.png', '/uploads/' + 'a'.repeat(32) + '.svg', '/altro/' + 'a'.repeat(32) + '.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'ftp://x/y.png']) {
    const r = await json('POST', '/prodotti', { nome: 'X', prezzo: 1, immagine });
    assert.equal(r.status, 400, immagine);
  }
  assert.equal((await json('POST', '/prodotti', { nome: 'X', prezzo: 1, immagine: 'https://example.com/a.jpg' })).status, 201);
});

test('pulizia: via i file non associati e vecchi, restano quelli in uso e quelli recenti', async t => {
  const { db, uploadDir, upload, json, close } = await avvia();
  t.after(close);
  const carica = async () => (await (await upload(PNG, 'image/png')).json()).url;
  const inUso = await carica();
  await json('POST', '/prodotti', { nome: 'P', prezzo: 1, immagine: inUso });
  const orfano = await carica();
  const recente = await carica();

  const vecchio = (Date.now() - 2 * 3600 * 1000) / 1000;
  for (const u of [inUso, orfano]) fs.utimesSync(path.join(uploadDir, path.basename(u)), vecchio, vecchio);
  fs.writeFileSync(path.join(uploadDir, 'nota.txt'), 'non toccare');   // file estraneo: ignorato

  assert.equal(pulisciOrfani(db, uploadDir), 1);
  assert.ok(fs.existsSync(path.join(uploadDir, path.basename(inUso))));
  assert.equal(fs.existsSync(path.join(uploadDir, path.basename(orfano))), false);
  assert.ok(fs.existsSync(path.join(uploadDir, path.basename(recente))));
  assert.ok(fs.existsSync(path.join(uploadDir, 'nota.txt')));
});
