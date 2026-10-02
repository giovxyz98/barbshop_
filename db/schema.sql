CREATE TABLE giorno (nome TEXT NOT NULL, lavorativo_mattino BOOLEAN NOT NULL, lavorativo_pomeriggio BOOLEAN NOT NULL, data DATE NOT NULL PRIMARY KEY, orario_mattino TEXT DEFAULT "540-810", orario_pomeriggio TEXT DEFAULT "900-1200");

CREATE TABLE prenotazioni (idPrenotazione INTEGER PRIMARY KEY AUTOINCREMENT, servizio TEXT REFERENCES servizi (id), user REFERENCES users (username), durata INTEGER, orario_inizio INTEGER, data REFERENCES giorno (data));

CREATE TABLE servizi (id INTEGER PRIMARY KEY NOT NULL, nome TEXT, prezzo REAL, durata REAL, descrizione TEXT, feedback INTEGER);

CREATE TABLE salone (indirizzo TEXT NOT NULL, id INTEGER PRIMARY KEY NOT NULL);

CREATE TABLE users (nome TEXT NOT NULL, cognome TEXT NOT NULL, username TEXT UNIQUE NOT NULL PRIMARY KEY, password TEXT NOT NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP, active BOOLEAN DEFAULT 1, iscritto_da TEXT, ultimo_accesso TEXT, feedback NUMERIC, ruolo TEXT);

