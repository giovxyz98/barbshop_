const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { logEvent } = require('../log/log');
const axios = require('axios');

const router = express.Router();
const db = new sqlite3.Database('../db/database.db', err => {
  if (err) {
    logEvent("Errore nell'apertura del database: " + err.message + " - Error");
  }
});
const dayNotExistError = 'Giorno non valido o non esistente';

// Funzione per ottenere le prenotazioni dal database
const getBookings = async (data) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT orario_inizio, durata FROM prenotazioni WHERE data = ?`;

    db.all(query, [data], (err, rows) => {
      if (err) {
        reject(err);
      } else if (rows.length === 0) {
        // Se non esistono prenotazioni per quel giorno, controlla la validità del giorno
        return reject(new Error(dayNotExistError));
      } else {
        resolve(rows.map(row => ({
          start: row.orario_inizio,
          end: row.orario_inizio + row.durata
        })));
      }
    });
  });
};


// Funzione per controllare se lo slot è disponibile
const isSlotAvailable = (bookings, start, end) => {
  return !bookings.some(booking => start < booking.end && end > booking.start);
};

// Funzione per ottenere gli orari di lavoro
const getWorkHours = async (data, periodo) => {
  try {
    const response = await axios.get(`http://localhost:3000/api/getGiorno?data=${data}`);
    const giorno = response.data;
    if (!giorno) return null;

    if (periodo === "mattino" && giorno.lavorativo_mattino === 1) {
      return giorno.orario_mattino.split("-").map(h => parseInt(h, 10));
    } else if (periodo === "pomeriggio" && giorno.lavorativo_pomeriggio === 1) {
      return giorno.orario_pomeriggio.split("-").map(h => parseInt(h, 10));
    }
  } catch (e) {
    logEvent("Errore richiesta API getWorkHours: " + e + " - Error");
    return null;
  }
};

// Funzione per ottenere gli slot disponibili
const availableSlots = async (req, res) => {
  const { data, periodo, duration } = req.query;
  if (!data) {
    return res.status(400).json({ error: "Data mancante" }); //Formato YYYY-MM-DD

  }
  if (!periodo) {
    return res.status(400).json({ error: "Periodo mancante" }); //Mattina o Pomeriggio
  }
  if (!duration) {
    return res.status(400).json({ error: "Durata mancante" }); //Formato in minuti
  }

  const workHours = await getWorkHours(data, periodo);
  if (!workHours) {
    return res.status(404).json({ error: "Orari non disponibili" });
  }

  const [startWork, endWork] = workHours;
  try {
    const bookings = await getBookings(data);
    console.log(bookings);
    const availableSlots = [];

    for (let candidateStart = startWork; candidateStart <= endWork - duration; candidateStart += 5) {
      const candidateEnd = candidateStart + duration;
      if (isSlotAvailable(bookings, candidateStart, candidateEnd)) {
        availableSlots.push(`${Math.floor(candidateStart / 60).toString().padStart(2, '0')}:${(candidateStart % 60).toString().padStart(2, '0')}`);
      }
    }
    return res.json({ availableSlots });
  } catch (e) {
    logEvent("Errore interno: " + e + " - Error");
    return res.status(500).json({ error: "Errore interno" });

  }
};

// Funzione per prenotare uno slot
const bookSlot = async (req, res) => {
  try {
    const { username, service, startTime, data } = req.query;

    if (!username) return res.status(400).json({ error: "Nome utente mancante" });
    if (!service) return res.status(400).json({ error: "Servizio mancante" });
    if (!startTime) return res.status(400).json({ error: "Orario di inizio mancante" });
    if (!data) return res.status(400).json({ error: "Data mancante" });
    const user = await axios.get(`http://localhost:3000/api/getUserForReservation?username=${username}`);
    if (user.data.user == null) {
      return res.status(404).json({ error: "Utente non trovato" });
    }else{
     // Controlla se l'utente ha già una prenotazione per quel giorno
     const hasBooking = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM prenotazioni WHERE user = ? AND data = ?`, [username, data], (err, row) => {
        if (err) {
          logEvent("Errore nella query: " + err.message + " - Error");
          reject(err);
        } else {
          resolve(!!row); 
        }
      });
    });

    if (hasBooking) {
      return res.status(400).json({ error: "Hai già una prenotazione per questo giorno" });
    }

    }
    // Recupero durata servizio
    let response;
    try {
      response = await axios.get(`http://localhost:3000/api/getServizio?id=${service}`);
    } catch (err) {
      logEvent(`Errore nella richiesta al servizio: ${err.message} - Error`);
      return res.status(500).json({ error: "Errore nella richiesta al servizio" });
    }

    if (!response.data || !response.data.data || !response.data.data.durata) {
      return res.status(404).json({ error: "Servizio non trovato" });
    }

    const serviceDuration = parseInt(response.data.data.durata, 10);
    const start = parseInt(startTime, 10);
    const end = start + serviceDuration;

    // Controlla disponibilità slot
    const bookings = await getBookings(data);
    if (!isSlotAvailable(bookings, start, end)) {
      return res.status(400).json({ error: "Slot non disponibile" });
    }

    // Inserimento prenotazione
    db.run(
      `INSERT INTO prenotazioni (user, orario_inizio, durata, data, servizio) VALUES (?, ?, ?, ?, ?)`,
      [username, start, serviceDuration, data, service],
      function (err) {
        if (err) {
          logEvent(`Errore prenotazione ${username}: ${err.message} - Error`);
          return res.status(500).json({ error: "Errore nell'inserimento" });
        }
        logEvent(`Prenotazione confermata per ${username} - ${start}-${end} min - Success`);
        return res.status(200).json({ message: "Prenotazione effettuata!" });
      }
    );
  } catch (e) {
    if (e.message === dayNotExistError) {
      return res.status(404).json({ error: e.message});
    }
    logEvent(`Errore interno: ${e.message} - Error`);
    return res.status(500).json({ error: "Errore interno" });
  }
};

router.get('/available-slots', availableSlots);
router.post('/book-slot', bookSlot);
module.exports = router;
