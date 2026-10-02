# Note sviluppi

Cosa è stato scelto, cosa manca e cosa c'è da sapere. Come funziona il progetto è nel `README.md`.

## Scelte di progetto

- **Web app unica** per admin e cliente (anche da mobile), servita dal backend.
- **Un salone, un'agenda**: niente operatori in parallelo, niente più saloni. Se serviranno: `salone_id` su prenotazioni, orari, servizi e utenti.
- **Registrazione con approvazione**: il cliente invia una richiesta, l'admin la accetta o la rifiuta; l'admin può anche aggiungere utenti a mano. Nessun login con Google.
- **Nessun pagamento in app, nessun abbonamento**: prezzi solo da consultare, si paga in salone; il prodotto verrà dato in licenza.
- **Orari a fasce + eccezioni**, disponibilità calcolata al momento: niente giorni pre-generati, niente cron.
- **Database SQLite di Node** (`node:sqlite`), non versionato: foto dei prodotti incluse come BLOB, un solo file da salvare.

## Da fare

1. **Autenticazione reale** (la cosa più importante)
   - Sostituire il login fittizio (`backend/auth.js`: accetta qualsiasi credenziale e crea l'utente se manca).
   - Hash delle password: oggi sono in chiaro e `getUsers`, `getUser` e `getUserForReservation` le restituiscono. `bcrypt` è già tra le dipendenze ma oggi non lo usa nessuno.
   - Sessione o token e controllo dei ruoli lato server: oggi tutte le API sono aperte e il ruolo vive in `sessionStorage`.
   - Legare ai ruoli ciò che oggi si può fare da chiunque: `da_admin` e `?admin=1` (prenotare senza preavviso), gestione di orari, servizi, prodotti, utenti e richieste.
   - Il cambio password verifica la vecchia password nel browser (`profilo.html`, legge la password da `getUser`): va spostato sul server.
2. **Prodotti**: prenotazione di un prodotto da ritirare e pagare in sede (oggi lo shop è solo una vetrina).
3. **Barbiere preferito** con ricerca o mappa (ha senso solo con più saloni).
4. **Notifiche e promemoria** per le prenotazioni (email o SMS), anche quando l'admin annulla.
5. **Chiusura di un giorno con prenotazioni già confermate**: l'admin viene avvisato ma le prenotazioni restano da annullare a mano.
6. **Pagine admin**: ora si cambia pagina con la barra in basso; con più voci su schermi stretti conviene un menu.

## Da sapere

- **Dati di prova**: `npm run seed` carica 20 utenti e 8 servizi (`db/seed.sql`). Il login di debug crea gli utenti che non esistono.
- **Fuso orario**: le date e gli orari sono nell'ora locale del salone (`TZ_SALONE`, default `Europe/Rome`); il front-end calcola "oggi" con l'orologio del browser.
- **Prenotazioni e servizi**: la durata viene copiata nella prenotazione, quindi cambiare un servizio non sposta quelle già fatte; un servizio già prenotato non si elimina.
- **Eliminare un utente** elimina a cascata le sue prenotazioni.
- **Foto**: massimo 6 MB (il browser le riduce a 1280 px prima dell'invio); il formato si riconosce dai byte, non dall'intestazione.

## Pulizia possibile

- `backend/db.js` (parte di passaggio dal vecchio schema) e `importaImmaginiDaFile` in `backend/upload.js` servono solo a chi ha ancora un database di una versione precedente: si possono togliere insieme ai loro test (`migration.test.js`, il test di importazione in `immagini.test.js`).
- `frontend/a.bmp` non è usato da nessuna pagina.
- `bcrypt` in `package.json` non è usato: o si usa per le password o si toglie.
