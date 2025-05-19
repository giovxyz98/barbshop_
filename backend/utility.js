// Descrizione: Modulo per l'aggiornamento della tabella giorno.
// Questo modulo si occupa di aggiornare la tabella giorno del database.
// Viene eseguito all'avvio del server e controlla se ci sono meno di 30 record nella tabella giorno.
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { logEvent } = require('../log/log');
const router = express.Router();

const db = new sqlite3.Database('../db/database.db', (err) => {
    if (err) {
        logEvent("Errore nell'apertura del database: " + err.message + " - Error");
    }
});



function updateGiornoTable() {

  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  db.run("DELETE FROM giorno WHERE data < ?", [todayString], function (err) {
    if (err) {
      return logEvent("Errore nella cancellazione dei record vecchi: " + err.message + " - Error");
    }

    db.get("SELECT COUNT(*) as count FROM giorno", (err, row) => {
      if (err) {
        return logEvent("Errore nel conteggio dei record: " + err.message + " - Error");
      }
      let count = row.count;

      if (count < 30) {
        db.get("SELECT MAX(data) as lastDate FROM giorno", (err, row) => {
          if (err) {
            return logEvent("Errore nel recupero dell'ultima data: " + err.message + " - Error");
          }
          let lastDateStr = row.lastDate;
          let lastDate;
          if (lastDateStr) {
            lastDate = new Date(lastDateStr);
          } else {
            lastDate = new Date(today);
          }

          const missing = 30 - count;

          let insertsRemaining = missing;
          function insertNextDay() {
            if (insertsRemaining <= 0) {
              return;
            }
            lastDate.setDate(lastDate.getDate() + 1);
            const newDateStr = lastDate.toISOString().split('T')[0];
            const nomeGiorno = lastDate.toLocaleDateString('it-IT', { weekday: 'long' });
            const giornoNumero = lastDate.getDay();
            const lavorativoMattino = (giornoNumero !== 0 && giornoNumero !== 1) ? 1 : 0;
            const lavorativoPomeriggio = (giornoNumero !== 0 && giornoNumero !== 1) ? 1 : 0;

            // Inserisci il nuovo record
            const sql = `
              INSERT INTO giorno (nome, lavorativo_mattino, lavorativo_pomeriggio, data)
              VALUES (?, ?, ?, ?)
            `;
            db.run(sql, [nomeGiorno, lavorativoMattino, lavorativoPomeriggio, newDateStr], function (err) {
              if (err) {
                logEvent("Errore nell'inserimento del record: " + err.message + " - Error");
              }
              insertsRemaining--;
              insertNextDay();
            });
          }
          insertNextDay();
        });
      }
    });
  });
}




module.exports = {router,updateGiornoTable};