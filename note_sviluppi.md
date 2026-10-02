# Note sviluppi

## Decisioni
- Abbandonata l'app Flutter (ultimo stato nel commit `old`): tutto in front-end web, sia admin sia cliente.
- DB: SQLite integrato di Node (`node:sqlite`) al posto del pacchetto `sqlite3`. Fatto.
- Registrazione ibrida: il cliente invia una richiesta, l'admin la accetta o la rifiuta; l'admin può comunque aggiungere utenti a mano. Nessun login con Google.
- Agenda unica per salone (niente multi-operatore, niente multi-salone per ora).
- Niente più divisione fissa mattino/pomeriggio: orario settimanale a fasce + eccezioni per data, disponibilità calcolata al volo (niente tabella `giorno`, niente cron).
- Rimane solo la logica di business (backend + db).

## Fatto
- Schema nuovo (`db/schema.sql`) e migrazione automatica dal vecchio db (`backend/db.js`, `PRAGMA user_version`): `giorno` rimossa, `servizi.durata` intera, prenotazioni storiche convertite.
- Logica dell'agenda in `backend/agenda.js` (orari, eccezioni, impostazioni, disponibilità, prenota, annulla, elenco) con API in `backend/agenda_routes.js`.
- Prenotazione atomica (`BEGIN IMMEDIATE`) più trigger anti-sovrapposizione e indice univoco utente/giorno nel db.
- Validazione completa di data, orario (HH:MM, dentro una fascia, sulla griglia degli slot, preavviso, finestra massima), servizio e utente.
- Bug dello stress test risolti: doppie prenotazioni sullo stesso slot, limite "una al giorno" aggirato, giorno senza prenotazioni non prenotabile, orari non validi accettati, errori 500 al posto di 404.
- Test (`npm test`, 33): logica, API, prodotti, registrazioni, concorrenza con più processi sullo stesso file, migrazione. Verificato che i test di concorrenza falliscono se si tolgono transazione e vincoli del db.
- Login fittizio per debug (qualsiasi credenziale; ruolo `admin` se lo username inizia per "admin").
- Stile art déco su `frontend/`; `home.html` legge gli orari da `/api/calendario`.
- Abbonamento tolto dal progetto (si valuta la licenza). L'admin inserisce prenotazioni per conto di un cliente (`da_admin: true` salta il preavviso minimo, `?admin=1` su `/disponibilita`) e annulla qualsiasi prenotazione. Il flag `da_admin` oggi non è protetto: va legato al ruolo con l'auth reale.
- Backend completato per il front-end: prodotti (CRUD), richieste di registrazione (invio, accetta, rifiuta), modifica/eliminazione servizi, login di debug che crea l'utente se manca, front-end servito dallo stesso server.
- Front-end rifatto con le nuove logiche, senza più mattino/pomeriggio. Cliente: login, richiesta di registrazione, home (prenotazioni attive con annullamento, servizi, orari), prenota (servizio → giorno da `/calendario` → orario con selettore unico → conferma), shop (catalogo con categorie), profilo (cambio password, storico, elimina account, logout), FAQ. Admin: agenda (attive/storico, filtri data e nome), servizi, prodotti, orari (settimana a fasce, eccezioni, impostazioni), utenti (richieste da accettare/rifiutare, aggiungi, modifica, elimina). Libreria comune in `frontend/app.js`, nome del locale in `frontend/brand.js`.

## Da fare
1. Auth reale: sostituire il login fittizio, hash delle password (bcrypt è già nelle dipendenze; ora sono in chiaro e `getUsers`/`getUser` le restituiscono; il cambio password verifica la vecchia password lato client), sessione/token e protezione delle rotte admin (oggi tutte le API sono aperte e il ruolo vive in `sessionStorage`).
2. Prenotazione dei prodotti (da pagare in sede), "barbiere preferito" con ricerca/mappa (oggi un solo salone).
3. Chiudere un giorno con prenotazioni già confermate avvisa ma non le annulla.
4. Notifiche/promemoria (email o SMS).
5. Se in futuro serviranno più saloni: `salone_id` su prenotazioni, orari, servizi e utenti. Non fatto di proposito.
