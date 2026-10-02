# Note sviluppi

## Decisioni
- Abbandonata l'app Flutter (ultimo stato nel commit `old`): tutto in front-end web, sia admin sia cliente.
- DB: SQLite integrato di Node (`node:sqlite`) al posto del pacchetto `sqlite3`.
- Rimane solo la logica di business (backend + db).

## A che punto eravamo
Backend funzionante (Express, porta 3000):
- `users`: addUser, getUser, getUsers, editUser, editPassword, deleteUser, getUserForReservation
- `servizi`: getServizi, getServizio, addServizio
- `giorno`: getGiorni, getGiorno, modificaGiorno, modificaOrario; cron a mezzanotte mantiene 30 giorni
- `prenotazioni`: available-slots (slot da 5 min) e book-slot (una prenotazione per utente al giorno)
- DB: tabelle users, servizi, giorno, prenotazioni, salone; 20 utenti di prova, 8 servizi, 0 prenotazioni
Flutter era a metà: login/registrazione senza chiamate al server, solo `getServizi` collegato.

## Da fare
1. Migrare i moduli backend da `sqlite3` a `node:sqlite` (DatabaseSync, API sincrona); togliere `sqlite3` da package.json.
2. Auth reale: `/login` usa credenziali fisse (`admin`/`password123`) e `logAccess` non è importato; password in chiaro (bcrypt è già nelle dipendenze); ruolo cliente/salone.
3. Mancano API: prenotazioni per utente/storico/annullamento, prodotti, salone preferito, ricerca saloni, abbonamento, FAQ.
4. `book-slot` è un POST ma legge dai query param; `getBookings` dà errore se il giorno non ha prenotazioni (bug: "Giorno non valido"); chiamate axios a localhost tra moduli da sostituire con funzioni.
5. Tabella `giorno` senza `id` (lo schema vecchio lo prevedeva, `modificaGiorno` lo usa).
6. Front-end admin e cliente da zero.
