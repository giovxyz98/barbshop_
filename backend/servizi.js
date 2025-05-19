const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { logEvent } = require('../log/log');
const router = express.Router();

const db = new sqlite3.Database('../db/database.db', (err) => {
    if (err) {
        logEvent("Errore nell'apertura del database: " + err.message + " - Error");
    }
});

// Funzione per ottenere i servizi
router.get('/getServizi', (req, res) => {
    db.all('SELECT * FROM servizi', (err, rows) => {
        if (err) {
            logEvent(`Errore nel recupero dei servizi: ${err.message} - Error`);
            return res.status(500).json({
                code: 500,
                message: 'Errore interno del server',
                error: err.message
            });
        }

        if (rows.length === 0) {
            return res.status(404).json({
                code: 404,
                message: 'Nessun servizio trovato'
            });
        }

        return res.status(200).json({
            code: 200,
            message: 'Success',
            data: rows
        });
    });
});

router.post('/addServizio', (req, res) => {
    const { nome, descrizione, prezzo, durata, feedback } = req.body;
    if (!nome) {
        return res.status(400).json({
            message: 'Inserire il nome del servizio'
        });
    }
    if (!prezzo) {
        return res.status(400).json({
            message: 'Inserire il prezzo del servizio'
        })
    }
    if (!durata) {
        return res.status(400).json({
            message: 'Inserire la durata del servizio'
        })
    }
    db.run('INSERT INTO servizi (nome, descrizione, prezzo, durata, feedback) VALUES (?, ?, ?, ?, ?)', [nome, descrizione, prezzo, durata, feedback], function (err) {
        if (err) {
            logEvent(`Errore nell'inserimento del servizio: ${err.message} - Error`);
            return res.status(500).json({
                message: 'Errore interno del server',
                error: err.message
            });
        }

        return res.status(200).json({
            message: 'Servizio aggiunto con successo',
            id: this.lastID
        });
    });
});
// Funzione per ottenere un servizio
router.get('/getServizio', (req, res) => {
    const id = req.query.id;

    db.get('SELECT * FROM servizi WHERE id = ?', [id], (err, row) => {
        if (err) {
            logEvent(`Errore nel recupero del servizio: ${err.message} - Error`);
            return res.status(500).json({
                message: 'Errore interno del server',
                error: err.message
            });
        }

        if (!row) {
            return res.status(404).json({

                message: 'Servizio non trovato'
            });
        }

        return res.status(200).json({
            message: 'Success',
            data: row
        });
    });
});



module.exports = router;