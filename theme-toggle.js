/* theme-toggle.js — light/dark theme toggle shared across the CKA/CKS guides.

   The theme itself is applied synchronously by a tiny inline script in each
   file's <head>, before first paint, to avoid a flash of the wrong theme:
     localStorage.getItem('ckx-theme') || (system preference) -> data-theme
   This file only wires up the toggle button (icon + click handler) and
   keeps every open guide page in sync, the same way progress-view.js shares
   checkpoint state across pages via one localStorage key. */
(function () {
  'use strict';
  var KEY = 'ckx-theme';

  function current() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  window.toggleTheme = function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply(next);
  };

  document.addEventListener('DOMContentLoaded', function () { apply(current()); });
  window.addEventListener('storage', function (e) {
    if (e.key === KEY && e.newValue) apply(e.newValue);
  });
})();
