/* ─────────────────────────────────────────
   js/clock.js  —  Live status-bar clock
   and date widget updater
───────────────────────────────────────── */

(function () {
  const DAYS   = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const MONTHS = [
    'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
    'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
  ];

  function updateClock() {
    const now = new Date();
    const h   = now.getHours();
    const m   = String(now.getMinutes()).padStart(2, '0');

    // Status bar clock (12-hour human-friendly)
    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = `${formatHour(h)}:${m} ${h < 12 ? 'AM' : 'PM'}`;

    // Date widget
    const dayEl   = document.getElementById('dayName');
    const dateEl  = document.getElementById('dateNum');
    const monthEl = document.getElementById('monthName');

    if (dayEl)   dayEl.textContent   = DAYS[now.getDay()];
    if (dateEl)  dateEl.textContent  = now.getDate();
    if (monthEl) monthEl.textContent = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  }

  function formatHour(hour) {
    const h12 = ((hour + 11) % 12) + 1;
    return String(h12).padStart(2, '0');
  }

  // Run immediately then every 30 seconds
  updateClock();
  setInterval(updateClock, 30_000);
})();
