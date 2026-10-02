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
- Test (`npm test`, 28): logica, API, concorrenza con più processi sullo stesso file, migrazione. Verificato che i test di concorrenza falliscono se si tolgono transazione e vincoli del db.
- Login fittizio per debug (qualsiasi credenziale; ruolo `admin` se lo username inizia per "admin").
- Stile art déco su `frontend/`; `home.html` legge gli orari da `/api/calendario`.

## Da fare
1. Auth reale: sostituire il login fittizio, hash delle password (bcrypt è già nelle dipendenze; ora sono in chiaro e `getUsers`/`getUser` le restituiscono), sessione/token e protezione delle rotte admin (oggi tutte le API sono aperte).
2. Richieste di registrazione: tabella (es. `richieste_registrazione` con stato in attesa/accettata/rifiutata), API per inviare, elencare, accettare (crea l'utente) e rifiutare; ruolo `cliente` in `users`; sezione admin per gestirle.
3. Mancano API: prodotti (catalogo e prenotazione prodotti), salone preferito e ricerca saloni, abbonamento, FAQ, modifica/eliminazione servizi.
4. Front-end admin e cliente da zero sopra queste API: prenota (servizio → giorno da `/calendario` → orario da `/disponibilita`), agenda admin con filtri, gestione orari ed eccezioni.
5. Notifiche/promemoria (email o SMS) e storico: per ora `GET /prenotazioni?da=&a=` copre l'elenco.
6. Se in futuro serviranno più saloni: `salone_id` su prenotazioni, orari, servizi e utenti. Non fatto di proposito.
