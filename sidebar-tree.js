/* sidebar-tree.js — turns flat sidebar nav-items into expand/collapse trees
   for quick navigation, wherever a nav-item's target section has multiple
   top-level subsections (h2 for study-guide domains, h3 for lab steps).

   Opt-in per group: only `.sb-group[data-tree]` gets scanned, so unrelated
   sidebar groups (Start Here, Reference, ...) are left exactly as they are.
   No new data model — it reads the same `onclick="show('id')"` attribute
   the sidebar already uses, and calls the page's existing `show()` to
   navigate. Works over file:// with no build step.

   Usage: just include this script; it runs itself on DOMContentLoaded. */
(function () {
  'use strict';

  function slugify(text, idx) {
    var base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return 'tree-' + (base || 'section') + '-' + idx;
  }

  function directHeadings(section) {
    var out = [];
    for (var i = 0; i < section.children.length; i++) {
      var el = section.children[i];
      if (el.tagName === 'H2' || el.tagName === 'H3') out.push(el);
    }
    return out;
  }

  function buildSubmenu(navItem) {
    var onclickAttr = navItem.getAttribute('onclick') || '';
    var m = onclickAttr.match(/^show\('([^']+)'\)$/);
    if (!m) return; // not a plain show('id') nav-item (e.g. askClaudeOpen(), external links)

    var section = document.getElementById('sec-' + m[1]);
    if (!section) return;

    var heads = directHeadings(section);
    if (heads.length < 2) return; // not worth a submenu

    var sub = document.createElement('div');
    sub.className = 'nav-subtree';

    heads.forEach(function (h, i) {
      if (!h.id) h.id = slugify(h.textContent, i);
      var row = document.createElement('div');
      row.className = 'nav-subitem';
      row.textContent = h.textContent;
      row.addEventListener('click', function (e) {
        e.stopPropagation();
        show(m[1]);
        var target = document.getElementById(h.id);
        if (target) target.scrollIntoView({ block: 'start' });
      });
      sub.appendChild(row);
    });

    var toggle = document.createElement('span');
    toggle.className = 'nav-toggle';
    toggle.textContent = '▸'; // ▸
    toggle.setAttribute('aria-label', 'Expand section list');
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      navItem.classList.toggle('nav-expanded');
    });

    navItem.appendChild(toggle);
    navItem.insertAdjacentElement('afterend', sub);
  }

  function init() {
    document.querySelectorAll('.sb-group[data-tree] .nav-item').forEach(buildSubmenu);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
