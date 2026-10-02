# Barbshop

Piattaforma gestionale per barbieri/saloni e clienti: il salone gestisce agenda, servizi e prodotti, il cliente sceglie il salone preferito e prenota.

## Requisito

Barbshop è un'unica **web app** (versione mobile inclusa) con due aree, entrambe in front-end web sopra il backend:

- **Admin (salone)**: prenotazioni attive e storico (filtro per data, nome e cognome) con inserimento di una prenotazione per conto di un cliente e annullamento di qualsiasi prenotazione, gestione servizi e catalogo prodotti, profilo (cambio password, logout, FAQ barbiere, eliminazione account).
- **Cliente**: home (prenotazioni attive, saluto, barbiere preferito; se non scelto, bottone "Seleziona il tuo barbiere preferito" con ricerca/mappa), prenota (scelta servizi → calendario → orari disponibili), catalogo prodotti con immagine, profilo (dati, cambio password, FAQ, logout, eliminazione account).

Accesso: username e password (niente login con Google). Il cliente non si registra liberamente: invia una **richiesta di registrazione** che solo l'admin del salone può accettare o rifiutare; l'admin può anche aggiungere direttamente un utente.

Regole: nessun pagamento online, solo visualizzazione prezzi; i prodotti si possono prenotare e si pagano in loco. Nessuna commissione sulle prenotazioni. Non c'è alcuna gestione di abbonamenti: il prodotto è pensato per essere dato in licenza.

## Tecnologie

- **Backend**: Node.js ≥ 22.13 + Express (`cors`). Nessun cron: la disponibilità si calcola al momento.
- **Database**: SQLite tramite il modulo integrato di Node (`node:sqlite`, sincrono), file `db/database.db`, schema in `db/schema.sql`. Il file si migra da solo all'avvio dallo schema precedente.
- **Test**: `node:test` (nessuna dipendenza aggiuntiva).
- **Front-end**: HTML/CSS/JS senza build, servito dallo stesso backend. Area cliente (home, prenota, shop, profilo, FAQ) e area admin (agenda, servizi, prodotti, orari, utenti). Stile art déco (nero e oro, Cinzel). Il nome del locale si cambia solo in `frontend/brand.js`.

## Modello dell'agenda

Un salone = un'agenda unica (niente più operatori in parallelo).

- **Orario settimanale**: una riga per fascia e giorno (più fasce nello stesso giorno, es. pausa pranzo). Un giorno senza fasce è chiuso. Default: mar–sab 09:00–13:30 e 15:00–20:00.
- **Eccezioni per data**: ferie, festività o orari speciali; sostituiscono l'orario settimanale di quella data.
- **Impostazioni**: passo degli slot (5'), preavviso minimo (60'), quanto in anticipo si prenota (90 giorni).
- **Prenotazioni**: inizio e fine reali (`YYYY-MM-DD HH:MM`, ora locale del salone), durata copiata dal servizio, stato `confermata`/`annullata`. Una al giorno per cliente.
- **Concorrenza**: controlli e inserimento avvengono in una transazione `BEGIN IMMEDIATE`; in più il database stesso rifiuta sovrapposizioni (trigger) e il secondo appuntamento dello stesso cliente nello stesso giorno (indice univoco).

## API (`/api`)

| Metodo | Percorso | Scopo |
|---|---|---|
| GET | `/disponibilita?data=&servizio=&admin=1` | orari liberi per un servizio in una data (`admin=1`: senza preavviso minimo) |
| GET | `/calendario?da=&a=` | per ogni giorno: aperto/chiuso e fasce (max 92 giorni) |
| POST | `/prenotazioni` `{username, servizio, data, ora, da_admin}` | prenota (201; 409 se occupato); `da_admin: true` = inserita dal salone per un cliente |
| GET | `/prenotazioni?data=&da=&a=&username=&q=&stato=` | elenco con filtri (`q` = nome/cognome) |
| DELETE | `/prenotazioni/:id` | annulla |
| GET | `/orari` | orario settimanale, eccezioni, impostazioni |
| PUT | `/orari/settimanali` `{giorni:[{giorno_settimana, fasce}]}` | imposta l'orario settimanale (0 = domenica) |
| PUT | `/orari/eccezioni` `{data, chiuso, fasce, motivo}` | imposta un'eccezione per una data |
| DELETE | `/orari/eccezioni/:data` | rimuove l'eccezione |
| PUT | `/impostazioni` | passo slot, preavviso, finestra |
| GET/POST | `/getServizi`, `/getServizio?id=`, `/addServizio` | servizi |
| PUT/DELETE | `/servizi/:id` | modifica; elimina (409 se già prenotato) |
| GET/POST/PUT/DELETE | `/prodotti`, `/prodotti/:id` | catalogo (`?tutti=1` include i nascosti) |
| POST | `/upload/immagine` (corpo = byte dell'immagine) | carica una foto (JPEG, PNG, WebP, GIF, max 6 MB) e restituisce `{ url: "/uploads/….jpg" }` da mettere in `immagine` del prodotto |
| POST | `/registrazioni` | il cliente invia la richiesta di registrazione |
| GET | `/registrazioni?stato=` | richieste (default: in attesa) |
| POST | `/registrazioni/:id/accetta`, `/registrazioni/:id/rifiuta` | l'admin decide; accettando si crea l'utente `cliente` |
| | `getUsers`, `getUser`, `addUser`, `editUser`, `editPassword`, `deleteUser` | utenti |
| POST | `/login` | **fittizio** (debug): accetta qualsiasi credenziale e crea l'utente se manca |

Gli orari sono sempre `HH:MM`, le date `YYYY-MM-DD`; gli errori rispondono `{ "error": "..." }`.

## Struttura

- `backend/` – `server.js`, `db.js` (apertura, migrazione, transazioni), `agenda.js` (logica di business), `agenda_routes.js`, `users.js`, `servizi.js`, `prodotti.js`, `registrazioni.js`, `auth.js`
- `db/` – `database.db` e `schema.sql`
- `uploads/` – foto dei prodotti caricate dall'admin (ignorata da git; `UPLOAD_DIR` per cambiare cartella). Il browser riduce la foto a 1280 px prima di inviarla, il server riconosce il formato dai byte e all'avvio elimina i file non associati a un prodotto
- `test/` – test della logica, della concorrenza (più processi sullo stesso file), delle API e della migrazione
- `log/log.js` – log applicativi (i `.txt` sono ignorati da git)
- `frontend/` – pagine web: `app.js` (API, sessione, dialog, navigazione), `brand.js` (nome del locale), `style.css`; cliente: `index`, `registrati`, `home`, `prenota`, `shop`, `profilo`, `faq`; admin: `admin` (agenda), `admin_servizi`, `admin_prodotti`, `admin_orari`, `admin_utenti`
- `note_sviluppi.md` – stato lavori e prossimi passi

## Avvio

```
npm install
npm start        # apri http://localhost:3000  (PORT e DB_PATH configurabili via variabili d'ambiente)
npm test
```

Dal telefono (stessa rete Wi-Fi del computer) apri `http://<indirizzo-del-computer>:3000`; il front-end usa lo stesso indirizzo anche per le API, quindi la gestione dei prodotti e il caricamento delle foto funzionano anche da mobile. Su Windows può servire consentire la porta 3000 nel firewall.

Accesso di prova: qualsiasi credenziale. Uno username che inizia per `admin` entra nell'area del salone, gli altri come cliente.
