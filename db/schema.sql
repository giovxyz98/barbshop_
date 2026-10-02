-- Schema Barbshop. Letto da backend/db.js all'avvio (CREATE ... IF NOT EXISTS).
-- Orari in minuti dalla mezzanotte (540 = 09:00). Date come 'YYYY-MM-DD'.
-- Prenotazioni: inizio/fine come 'YYYY-MM-DD HH:MM' nell'ora locale del salone
-- (stringhe di formato fisso, quindi confrontabili in ordine lessicografico).

CREATE TABLE IF NOT EXISTS users (
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL PRIMARY KEY,
  password TEXT NOT NULL,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT 1,
  iscritto_da TEXT,
  ultimo_accesso TEXT,
  feedback NUMERIC,
  ruolo TEXT
);

CREATE TABLE IF NOT EXISTS servizi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descrizione TEXT,
  prezzo REAL NOT NULL CHECK (prezzo >= 0),
  durata INTEGER NOT NULL CHECK (durata > 0),   -- minuti
  feedback INTEGER
);

CREATE TABLE IF NOT EXISTS salone (
  id INTEGER PRIMARY KEY NOT NULL,
  indirizzo TEXT NOT NULL
);

-- Orario settimanale: una riga per fascia (più fasce nello stesso giorno = es. pausa pranzo).
-- giorno_settimana: 0 = domenica ... 6 = sabato. Un giorno senza righe è chiuso.
CREATE TABLE IF NOT EXISTS orari_settimanali (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  giorno_settimana INTEGER NOT NULL CHECK (giorno_settimana BETWEEN 0 AND 6),
  apertura INTEGER NOT NULL CHECK (apertura BETWEEN 0 AND 1439),
  chiusura INTEGER NOT NULL CHECK (chiusura BETWEEN 1 AND 1440),
  CHECK (apertura < chiusura)
);

-- Eccezioni per data (ferie, festività, orari speciali). Se per una data esistono righe,
-- sostituiscono interamente l'orario settimanale: chiuso = 1 chiude tutto il giorno,
-- chiuso = 0 definisce le fasce di quel giorno (una riga per fascia).
CREATE TABLE IF NOT EXISTS eccezioni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  chiuso INTEGER NOT NULL DEFAULT 0 CHECK (chiuso IN (0, 1)),
  apertura INTEGER,
  chiusura INTEGER,
  motivo TEXT,
  CHECK (
    (chiuso = 1 AND apertura IS NULL AND chiusura IS NULL) OR
    (chiuso = 0 AND apertura IS NOT NULL AND chiusura IS NOT NULL AND apertura >= 0 AND chiusura <= 1440 AND apertura < chiusura)
  )
);
CREATE INDEX IF NOT EXISTS idx_eccezioni_data ON eccezioni (data);

-- Impostazioni del salone (una sola riga).
CREATE TABLE IF NOT EXISTS impostazioni (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  slot_step INTEGER NOT NULL DEFAULT 5 CHECK (slot_step BETWEEN 1 AND 120),         -- passo degli orari offerti (min)
  anticipo_minimo INTEGER NOT NULL DEFAULT 60 CHECK (anticipo_minimo >= 0),          -- minuti di preavviso
  finestra_giorni INTEGER NOT NULL DEFAULT 90 CHECK (finestra_giorni BETWEEN 1 AND 730) -- quanto in là si può prenotare
);
INSERT OR IGNORE INTO impostazioni (id) VALUES (1);

CREATE TABLE IF NOT EXISTS prenotazioni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT NOT NULL REFERENCES users (username) ON DELETE CASCADE ON UPDATE CASCADE,
  servizio_id INTEGER NOT NULL REFERENCES servizi (id),
  data TEXT NOT NULL,
  inizio TEXT NOT NULL CHECK (inizio GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-2][0-9]:[0-5][0-9]'),
  fine TEXT NOT NULL CHECK (fine GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-2][0-9]:[0-5][0-9]'),
  durata INTEGER NOT NULL CHECK (durata > 0),   -- copiata dal servizio al momento della prenotazione
  stato TEXT NOT NULL DEFAULT 'confermata' CHECK (stato IN ('confermata', 'annullata')),
  creata TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (data = substr(inizio, 1, 10)),
  CHECK (inizio < fine)
);
CREATE INDEX IF NOT EXISTS idx_prenotazioni_data ON prenotazioni (data, stato);

-- Garanzie a livello di database (valgono anche con più processi o connessioni):
-- 1) un cliente ha al massimo una prenotazione confermata al giorno;
CREATE UNIQUE INDEX IF NOT EXISTS uq_prenotazione_utente_giorno
  ON prenotazioni (user, data) WHERE stato = 'confermata';

-- 2) agenda unica per salone: due prenotazioni confermate non possono sovrapporsi.
CREATE TRIGGER IF NOT EXISTS trg_prenotazioni_no_overlap
BEFORE INSERT ON prenotazioni
WHEN NEW.stato = 'confermata'
BEGIN
  SELECT RAISE(ABORT, 'SLOT_OCCUPATO')
  WHERE EXISTS (
    SELECT 1 FROM prenotazioni
    WHERE stato = 'confermata' AND data = NEW.data
      AND inizio < NEW.fine AND fine > NEW.inizio
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_prenotazioni_no_overlap_upd
BEFORE UPDATE OF stato, data, inizio, fine ON prenotazioni
WHEN NEW.stato = 'confermata'
BEGIN
  SELECT RAISE(ABORT, 'SLOT_OCCUPATO')
  WHERE EXISTS (
    SELECT 1 FROM prenotazioni
    WHERE stato = 'confermata' AND data = NEW.data AND id <> NEW.id
      AND inizio < NEW.fine AND fine > NEW.inizio
  );
END;
