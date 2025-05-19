const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { logEvent } = require('../log/log');
const router = express.Router();

const db = new sqlite3.Database('../db/database.db', (err) => {
  if (err) {
    logEvent("Errore nell'apertura del database: " + err.message+"- Error");
  } 
});


// Funzione per ottenere tutti i giorni
const getGiorni = (req, res) => {
  const query = "SELECT * FROM giorno ORDER BY data";
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
};

// Funzione per modificare un giorno
const modificaGiorno = (req, res) => {
  const { id, data, descrizione } = req.body;
  const query = "UPDATE giorno SET data = ?, descrizione = ? WHERE id = ?";
  db.run(query, [data, descrizione, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: `Giorno con ID ${id} modificato` });
  });
};

// Funzione per modificare l'orario di un giorno
const modificaOrario = (req, res) => {
  const { id, orario } = req.body;
  const query = "UPDATE giorno SET orario = ? WHERE id = ?";
  db.run(query, [orario, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: `Orario del giorno con ID ${id} modificato` });
  });
};
const getGiorno = (req, res) => {
  const data = req.query.data; 
  console.log(data);
  if (!data) {
    res.status(400).json({ error: "Data non fornita" });
    return;
  }
  const query = "SELECT * FROM giorno WHERE data = ?";
  db.get(query, [data], (err, row) => {
    if (err) {
      res.status(500).json({ error: "Errore nel database: " + err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Giorno non trovato" });
      return;
    }
    res.json(row);
  });
};


// Rotte
router.get('/getGiorni', getGiorni);
router.put('/modificaGiorno', modificaGiorno);
router.put('/modificaOrario', modificaOrario);
router.get('/getGiorno', getGiorno);

module.exports = router;
