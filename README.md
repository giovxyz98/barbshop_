# Barbshop

Web app per saloni e barbieri: il salone gestisce agenda, servizi, prodotti e clienti; il cliente prenota online, da computer o da telefono. Un salone, un'agenda, nessun pagamento online e nessuna commissione sulle prenotazioni. Il prodotto è pensato per essere dato in licenza al singolo salone.

## Cosa fa

**Cliente**
- Chiede un account con una richiesta di registrazione; potrà accedere dopo l'approvazione del salone.
- **Home**: prenotazioni attive (annullabili), servizi, orari dei prossimi 7 giorni. Toccando un giorno aperto si passa alla prenotazione con quel giorno già scelto.
- **Prenota**: servizio → giorno (calendario con i soli giorni aperti) → orario libero (selettore unico) → conferma. Una prenotazione al giorno per cliente; si paga in salone.
- **Shop**: catalogo prodotti con foto e prezzi, filtrabile per categoria. È solo una vetrina: non si acquista online.
- **Profilo**: dati, cambio password, storico prenotazioni, FAQ, uscita, eliminazione dell'account.

**Admin (salone)**
- **Agenda**: prenotazioni del giorno o storico per periodo, ricerca per nome e cognome, inserimento di una prenotazione per conto di un cliente (anche senza preavviso) e annullamento di qualsiasi prenotazione.
- **Servizi**: nome, descrizione, prezzo e durata; modifica ed eliminazione (non si elimina un servizio già prenotato).
- **Prodotti**: catalogo con categoria, prezzo, descrizione, visibilità e foto scattata o scelta dal telefono.
- **Orari**: orario settimanale a fasce, chiusure ed eccezioni per data, impostazioni di prenotazione.
- **Utenti**: richieste di registrazione da accettare o rifiutare, aggiunta, modifica ed eliminazione di account.

## Avvio

Serve Node.js ≥ 22.13.

```
npm install
npm start          # poi apri http://localhost:3000
npm run seed       # facoltativo: dati di esempio (20 utenti, 8 servizi)
npm test           # 45 test
```

- **Accesso di prova**: il login è fittizio e accetta qualsiasi credenziale. Uno username che inizia per `admin` entra nell'area del salone, qualunque altro entra come cliente (l'utente viene creato se non esiste).
- **Dal telefono**: sulla stessa rete Wi-Fi del computer apri `http://<indirizzo-del-computer>:3000`. Il front-end usa lo stesso indirizzo per le API, quindi funziona tutto, comprese le foto dei prodotti. Su Windows può servire consentire la porta 3000 nel firewall.
- **Variabili d'ambiente**: `PORT` (default 3000), `DB_PATH` (file del database), `TZ_SALONE` (fuso orario del salone, default `Europe/Rome`).
- **Nome del locale**: si cambia solo in `frontend/brand.js` (nome, sottotitolo, logo).
- **Database**: `db/database.db` non è in git. Si crea da solo da `db/schema.sql` al primo avvio e contiene tutto (utenti, prenotazioni, foto): per il backup basta copiare quel file.

## Tecnologie

- **Backend**: Node.js + Express, nessun cron e nessun servizio esterno.
- **Database**: SQLite con il modulo integrato di Node (`node:sqlite`, sincrono). Foto dei prodotti come BLOB nel database.
- **Front-end**: HTML, CSS e JavaScript senza build, serviti dallo stesso backend. Stile art déco (nero e oro, Cinzel, DM Mono).
- **Test**: `node:test`, senza dipendenze aggiuntive.

## Come funziona l'agenda

- **Orario settimanale**: una o più fasce per giorno (ad esempio mattina e pomeriggio); un giorno senza fasce è chiuso. Di default martedì–sabato 09:00–13:30 e 15:00–20:00.
- **Eccezioni**: ferie, festività o orari speciali per una data; sostituiscono l'orario settimanale di quel giorno.
- **Impostazioni**: passo degli orari offerti (5'), preavviso minimo (60') e quanti giorni in anticipo si può prenotare (90).
- **Disponibilità**: non esistono giorni pre-generati; gli orari liberi si calcolano al momento da fasce, eccezioni e prenotazioni esistenti. Un orario è valido se sta dentro una fascia, sulla griglia degli slot, senza toccare altre prenotazioni e rispettando il preavviso.
- **Prenotazioni**: inizio e fine reali (`YYYY-MM-DD HH:MM`, ora locale del salone), durata copiata dal servizio al momento della prenotazione (cambiare la durata di un servizio non sposta quelle esistenti), stato `confermata` o `annullata`.
- **Concorrenza**: controlli e inserimento avvengono in un'unica transazione `BEGIN IMMEDIATE`; in più il database rifiuta da solo le sovrapposizioni (trigger) e un secondo appuntamento dello stesso cliente nello stesso giorno (indice univoco). Funziona anche con più processi sullo stesso file ed è coperto da test.

## API (`/api`)

Orari sempre `HH:MM`, date `YYYY-MM-DD`; gli errori rispondono `{ "error": "..." }` con il codice HTTP adeguato (400, 404, 409, 413, 415).

| Metodo | Percorso | Scopo |
|---|---|---|
| GET | `/disponibilita?data=&servizio=&admin=1` | orari liberi per un servizio in una data (`admin=1`: senza preavviso minimo) |
| GET | `/calendario?da=&a=` | per ogni giorno: aperto/chiuso e fasce (max 92 giorni) |
| POST | `/prenotazioni` `{username, servizio, data, ora, da_admin}` | prenota (201; 409 se occupato); `da_admin: true` = inserita dal salone |
| GET | `/prenotazioni?data=&da=&a=&username=&q=&stato=` | elenco con filtri (`q` = nome o cognome) |
| DELETE | `/prenotazioni/:id` | annulla |
| GET | `/orari` | orario settimanale, eccezioni, impostazioni |
| PUT | `/orari/settimanali` `{giorni:[{giorno_settimana, fasce}]}` | imposta l'orario (0 = domenica) |
| PUT | `/orari/eccezioni` `{data, chiuso, fasce, motivo}` | imposta l'eccezione di una data |
| DELETE | `/orari/eccezioni/:data` | rimuove l'eccezione |
| PUT | `/impostazioni` | passo slot, preavviso, finestra |
| GET, POST | `/getServizi`, `/getServizio?id=`, `/addServizio` | servizi |
| PUT, DELETE | `/servizi/:id` | modifica; elimina (409 se già prenotato) |
| GET, POST, PUT, DELETE | `/prodotti`, `/prodotti/:id` | catalogo (`?tutti=1` include i nascosti) |
| PUT, DELETE, GET | `/prodotti/:id/immagine` | foto del prodotto: `PUT` con i byte dell'immagine (JPEG, PNG, WebP, GIF, max 6 MB), `DELETE` la toglie, `GET` la serve. Il campo `immagine` del prodotto ne contiene l'indirizzo con la versione (`?v=`), così il browser la tiene in cache finché non cambia |
| POST | `/registrazioni` | il cliente invia la richiesta di registrazione |
| GET | `/registrazioni?stato=` | richieste (default: in attesa) |
| POST | `/registrazioni/:id/accetta`, `/registrazioni/:id/rifiuta` | l'admin decide; accettando si crea l'utente `cliente` |
| GET, POST, PUT, DELETE | `/getUsers`, `/getUser`, `/addUser`, `/editUser`, `/editPassword`, `/deleteUser` | utenti |
| POST | `/login` | **fittizio** (debug) |

## Limiti noti

Sono i punti da chiudere prima di un uso reale (dettagli in `note_sviluppi.md`):

- Il login è fittizio, il ruolo vive nel browser e **tutte le API sono aperte**: manca un'autenticazione vera con protezione delle rotte admin.
- Le password sono salvate in chiaro e alcune rotte utente le restituiscono.
- Manca la prenotazione dei prodotti (da pagare in sede), la scelta del salone preferito (oggi c'è un solo salone) e l'invio di notifiche o promemoria.

## Struttura

```
backend/    server.js        avvio, rotte, file statici
            db.js            apertura del database, schema, transazioni
            agenda.js        logica di business: orari, disponibilità, prenotazioni
            agenda_routes.js orari, calendario, disponibilità, prenotazioni
            prodotti.js      catalogo e foto
            servizi.js  users.js  registrazioni.js  auth.js  upload.js  wrap.js
db/         schema.sql       struttura del database
            seed.sql/.js     dati di esempio
frontend/   app.js           API, sessione, finestre di dialogo, navigazione
            brand.js         nome e logo del locale
            style.css
            cliente:  index, registrati, home, prenota, shop, profilo, faq
            admin:    admin (agenda), admin_servizi, admin_prodotti, admin_orari, admin_utenti
test/       logica, concorrenza (più processi), API, foto, migrazione, dati di esempio
log/        log.js           log applicativi (i .txt non sono in git)
```
