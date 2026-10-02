const express = require('express');
const agenda = require('./agenda');
const { logEvent } = require('../log/log');
const { wrap } = require('./wrap');

module.exports = db => {
  const router = express.Router();

  // --- orari e calendario ---
  router.get('/orari', wrap((req, res) => {
    res.json({
      settimanali: agenda.getOrariSettimanali(db),
      eccezioni: agenda.getEccezioni(db, req.query.da, req.query.a),
      impostazioni: agenda.getImpostazioni(db),
    });
  }));
  router.put('/orari/settimanali', wrap((req, res) => {
    res.json({ settimanali: agenda.setOrariSettimanali(db, req.body && req.body.giorni) });
  }));
  router.put('/orari/eccezioni', wrap((req, res) => {
    res.json({ eccezione: agenda.setEccezione(db, req.body || {}) });
  }));
  router.delete('/orari/eccezioni/:data', wrap((req, res) => {
    agenda.deleteEccezione(db, req.params.data);
    res.json({ message: 'Eccezione rimossa' });
  }));
  router.put('/impostazioni', wrap((req, res) => {
    res.json({ impostazioni: agenda.setImpostazioni(db, req.body || {}) });
  }));
  router.get('/calendario', wrap((req, res) => {
    res.json({ giorni: agenda.getCalendario(db, req.query.da, req.query.a) });
  }));

  // --- disponibilità e prenotazioni ---
  router.get('/disponibilita', wrap((req, res) => {
    const { data, servizio } = req.query;
    if (!data) return res.status(400).json({ error: 'Data mancante' });
    if (!servizio) return res.status(400).json({ error: 'Servizio mancante' });
    res.json(agenda.getDisponibilita(db, data, servizio, undefined, { admin: req.query.admin === '1' }));
  }));
  router.get('/prenotazioni', wrap((req, res) => {
    res.json({ prenotazioni: agenda.listPrenotazioni(db, req.query) });
  }));
  router.post('/prenotazioni', wrap((req, res) => {
    const prenotazione = agenda.prenota(db, req.body || {});
    logEvent(`Prenotazione ${prenotazione.id} per ${prenotazione.user}: ${prenotazione.data} ${prenotazione.inizio}-${prenotazione.fine} - Success`);
    res.status(201).json({ message: 'Prenotazione effettuata', prenotazione });
  }));
  router.delete('/prenotazioni/:id', wrap((req, res) => {
    const prenotazione = agenda.annullaPrenotazione(db, req.params.id);
    logEvent(`Prenotazione ${prenotazione.id} annullata - Success`);
    res.json({ message: 'Prenotazione annullata', prenotazione });
  }));

  return router;
};
