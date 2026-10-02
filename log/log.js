const fs = require('fs');
const { get } = require('http');
const path = require('path');

// Funzione per salvare i log di info
function logEvent(message) {
  if (process.env.NO_LOG) return;
  const now = new Date();
  const date = now.toLocaleDateString('it-IT');
  const time = now.toLocaleTimeString('it-IT');
  const logMessage = `${date} ${time} - ${message}\n`;
  
  fs.appendFile(path.join(__dirname, '..', 'log', 'log.txt'), logMessage, (err) => {
    if (err) {
      console.error('Errore nel salvataggio del log:', err);
    }
  });
}

// Funzione per salvare i log di accesso
function logAccess(message) {
  const logMessage = `${message}\n`;
  
  fs.appendFile(path.join(__dirname, '..', 'log', 'auth.txt'), logMessage, (err) => {
    if (err) {
      console.error('Errore nel salvataggio del log:', err);
    }
  });
}

// Funzione per recuperare i log di info
function getEventLog() {
  const logContent = fs.readFileSync(path.join(__dirname, '..', 'log', 'log.txt'), 'utf8');
  return logContent.split('\n');
}

module.exports = { logEvent, logAccess };