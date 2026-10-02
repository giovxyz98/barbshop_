const { nowLocal } = require('../backend/agenda');

const addDaysForTest = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Primo martedì (giorno aperto di default) tra almeno 3 giorni da oggi: sempre nel futuro e dentro la finestra.
function prossimoMartedi() {
  let d = addDaysForTest(nowLocal().data, 3);
  while (new Date(`${d}T00:00:00Z`).getUTCDay() !== 2) d = addDaysForTest(d, 1);
  return d;
}

module.exports = { addDaysForTest, prossimoMartedi };
