# Barbshop

Piattaforma gestionale per barbieri/saloni e clienti: il salone gestisce agenda, servizi e prodotti, il cliente sceglie il salone preferito e prenota.

## Requisito

Barbshop è un'unica **web app** (versione mobile inclusa) con due aree, entrambe da realizzare interamente in front-end sopra il backend esistente:

- **Admin (salone)**: prenotazioni attive e storico (filtro per data, nome e cognome), gestione servizi e catalogo prodotti, profilo (cambio password, logout, FAQ barbiere, eliminazione account, abbonamento).
- **Cliente**: home (prenotazioni attive, saluto, barbiere preferito; se non scelto, bottone "Seleziona il tuo barbiere preferito" con ricerca/mappa), prenota (scelta servizi → calendario → orari disponibili), catalogo prodotti con immagine, profilo (dati, cambio password, FAQ, logout, eliminazione account).

Accesso: username e password (niente login con Google). Il cliente non si registra liberamente: invia una **richiesta di registrazione** che solo l'admin del salone può accettare o rifiutare; l'admin può anche aggiungere direttamente un utente.

Regole: nessun pagamento online, solo visualizzazione prezzi; i prodotti si possono prenotare e si pagano in loco. L'abbonamento del salone (mensile, base gratuita) si paga solo da sito web. Nessuna commissione sulle prenotazioni.

## Tecnologie

- **Backend**: Node.js ≥ 22.13 + Express (`cors`). Nessun cron: la disponibilità si calcola al momento.
- **Database**: SQLite tramite il modulo integrato di Node (`node:sqlite`, sincrono), file `db/database.db`, schema in `db/schema.sql`. Il file si migra da solo all'avvio dallo schema precedente.
- **Test**: `node:test` (nessuna dipendenza aggiuntiva).
- **Front-end**: da realizzare (HTML/CSS/JS), una parte admin e una parte cliente. Stile art déco (nero e oro, Cinzel).

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
| GET | `/disponibilita?data=&servizio=` | orari liberi per un servizio in una data |
| GET | `/calendario?da=&a=` | per ogni giorno: aperto/chiuso e fasce (max 92 giorni) |
| POST | `/prenotazioni` `{username, servizio, data, ora}` | prenota (201; 409 se occupato) |
| GET | `/prenotazioni?data=&da=&a=&username=&q=&stato=` | elenco con filtri (`q` = nome/cognome) |
| DELETE | `/prenotazioni/:id` | annulla |
| GET | `/orari` | orario settimanale, eccezioni, impostazioni |
| PUT | `/orari/settimanali` `{giorni:[{giorno_settimana, fasce}]}` | imposta l'orario settimanale (0 = domenica) |
| PUT | `/orari/eccezioni` `{data, chiuso, fasce, motivo}` | imposta un'eccezione per una data |
| DELETE | `/orari/eccezioni/:data` | rimuove l'eccezione |
| PUT | `/impostazioni` | passo slot, preavviso, finestra |
| `getServizi`, `getServizio`, `addServizio` | | servizi |
| `getUsers`, `getUser`, `addUser`, `editUser`, `editPassword`, `deleteUser` | | utenti |
| POST | `/login` | **fittizio** (debug): accetta qualsiasi credenziale |

Gli orari sono sempre `HH:MM`, le date `YYYY-MM-DD`; gli errori rispondono `{ "error": "..." }`.

## Struttura

- `backend/` – `server.js`, `db.js` (apertura, migrazione, transazioni), `agenda.js` (logica di business), `agenda_routes.js`, `users.js`, `servizi.js`, `auth.js`
- `db/` – `database.db` e `schema.sql`
- `test/` – test della logica, della concorrenza (più processi sullo stesso file), delle API e della migrazione
- `log/log.js` – log applicativi (i `.txt` sono ignorati da git)
- `frontend/` – prototipi HTML da rifare
- `note_sviluppi.md` – stato lavori e prossimi passi

## Avvio

```
npm install
npm start        # http://localhost:3000  (PORT e DB_PATH configurabili via variabili d'ambiente)
npm test
```
