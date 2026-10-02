# Barbshop

Piattaforma gestionale per barbieri/saloni e clienti: il salone gestisce agenda, servizi e prodotti, il cliente sceglie il salone preferito e prenota.

## Requisito

Barbshop è un'unica **web app** (versione mobile inclusa) con due aree, entrambe da realizzare interamente in front-end sopra il backend esistente:

- **Admin (salone)**: prenotazioni attive e storico (filtro per data, nome e cognome), gestione servizi e catalogo prodotti, profilo (cambio password, logout, FAQ barbiere, eliminazione account, abbonamento).
- **Cliente**: home (prenotazioni attive, saluto, barbiere preferito; se non scelto, bottone "Seleziona il tuo barbiere preferito" con ricerca/mappa), prenota (scelta servizi → calendario → orari disponibili), catalogo prodotti con immagine, profilo (dati, cambio password, FAQ, logout, eliminazione account).

Regole: nessun pagamento online, solo visualizzazione prezzi; i prodotti si possono prenotare e si pagano in loco. L'abbonamento del salone (mensile, base gratuita) si paga solo da sito web. Nessuna commissione sulle prenotazioni.

## Tecnologie

- **Backend**: Node.js 22 + Express, `node-cron` (aggiornamento giornaliero della tabella `giorno`), `cors`, `axios`
- **Database**: SQLite tramite il modulo integrato di Node (`node:sqlite`), file `db/database.db`, schema in `db/schema.sql`
- **Front-end**: da realizzare (HTML/CSS/JS), una parte admin e una parte cliente

## Struttura

- `backend/` – API REST (`/api/...`): `auth`, `users`, `servizi`, `giorno`, `prenotazioni`, `utility`
- `db/` – database e schema
- `log/log.js` – scrittura dei log applicativi (i file `.txt` sono ignorati da git)
- `frontend/` – prototipi HTML precedenti, da rifare
- `note_sviluppi.md` – stato lavori e prossimi passi

## Avvio

```
npm install
cd backend && node server.js   # http://localhost:3000
```

I percorsi del DB sono relativi (`../db/database.db`): avviare il server dalla cartella `backend`.
