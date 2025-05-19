const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const { logEvent } = require('../log/log');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); 

const { updateGiornoTable } = require('./giorno');  // Importa la funzione dal modulo 'giorno'

const giornoRoutes = require('./giorno');
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const prenotazioneRoutes = require('./prenotazioni');
const serviziRoutes = require('./servizi');

app.use('/api', giornoRoutes);
app.use('/api', authRoutes);
app.use('/api', usersRoutes);
app.use('/api', prenotazioneRoutes);
app.use('/api', serviziRoutes);

app.listen(port, () => {
  console.log(`Server in ascolto su http://localhost:${port}`);
});

cron.schedule('0 0 * * *', () => {
  try {
    updateGiornoTable();
    logEvent("Tabella giorno aggiornata" + " - Success");
  } catch (err) {
    logEvent("Errore nell'aggiornamento della tabella giorno: " + err.message + " - Error");
  }
}, {
  scheduled: true,
  timezone: "Europe/Rome" 
  
});
