/* ─────────────────────────────────────────
   js/navigation.js  —  Home ↔ App routing
   and bottom-nav tab switching
───────────────────────────────────────── */

/* ── Open MicrobiomeX ── */
function openApp() {
  const home = document.getElementById('homescreen');
  const app  = document.getElementById('appScreen');

  home.classList.add('hidden');

  // Small delay so the home fade-out starts before the app fades in
  setTimeout(() => {
    app.classList.add('visible');
  }, 120);
}

/* ── Close MicrobiomeX → back to home ── */
function closeApp() {
  const home = document.getElementById('homescreen');
  const app  = document.getElementById('appScreen');

  app.classList.remove('visible');

  setTimeout(() => {
    home.classList.remove('hidden');
  }, 250);
}

/* ── Bottom nav tab switching ── */
(function () {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active from all
      navItems.forEach(n => n.classList.remove('active'));
      // Set active on clicked
      item.classList.add('active');

      // Optional: you can extend this to swap content panels
      // const tab = item.dataset.tab;
      // showTab(tab);
    });
  });
})();
