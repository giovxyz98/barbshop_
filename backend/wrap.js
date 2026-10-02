const { AppError } = require('./agenda');
const { logEvent } = require('../log/log');

// Cattura errori sincroni degli handler e li traduce in risposte JSON { error }.
const wrap = fn => (req, res) => {
  try {
    fn(req, res);
  } catch (e) {
    if (e instanceof AppError) return res.status(e.status).json({ error: e.message });
    logEvent(`Errore ${req.method} ${req.path}: ${e.message} - Error`);
    res.status(500).json({ error: 'Errore interno' });
  }
};

module.exports = { wrap };
