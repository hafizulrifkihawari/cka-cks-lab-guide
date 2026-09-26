/* sidebar-tree.js — turns flat sidebar nav-items into expand/collapse trees
   for quick navigation, wherever a nav-item's target section has multiple
   top-level subsections (h2 for study-guide domains, h3 for lab steps).
   Only the coarsest heading level in a section is listed — nested sub-steps
   (e.g. h3 under an h2 domain section) are left out of the submenu.

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

  /* Reads the same progress store the inline checkbox code writes to, so a
     submenu row can show whether its heading has already been ticked
     "Got it" / "done". Each host page defines its own `loadProg()` — a
     top-level `function` declaration, so (unlike its `const GUIDE`/`PKEY`,
     which stay purely lexical) it really does land on `window` and reads
     the right localStorage key for that page. The lab tutorial namespaces
     its keys with 'lab:' (see guideProgKey in link-guides.js) — check both
     forms rather than depend on reading that page's own `SIDE` const. */
  function readProg() {
    if (typeof window.loadProg === 'function') {
      try { return window.loadProg() || {}; } catch (e) { return {}; }
    }
    return {};
  }

  function isDone(sectionId, heading) {
    var prog = readProg();
    var plain = sectionId + '::' + heading;
    return !!(prog[plain] || prog['lab:' + plain]);
  }

  // Painted inline (not via a CSS class) so the color always shows up,
  // regardless of what the host page's stylesheet does with .nav-subitem.
  function paintDot(dot, done) {
    dot.style.background = done ? '#22c55e' : '#ef4444';
    dot.title = done ? 'Marked “Got it”' : 'Not marked done yet';
  }

  function refreshDoneMarks() {
    document.querySelectorAll('.nav-subitem').forEach(function (row) {
      var dot = row.querySelector('.nav-subitem-dot');
      if (!dot) return;
      paintDot(dot, isDone(row.getAttribute('data-sec-id'), row.getAttribute('data-heading')));
    });
  }
  window.refreshDoneMarks = refreshDoneMarks;

  function directHeadings(section) {
    var all = [];
    for (var i = 0; i < section.children.length; i++) {
      var el = section.children[i];
      if (el.tagName === 'H2' || el.tagName === 'H3') all.push(el);
    }
    // Only the coarsest level present becomes the submenu — e.g. a domain
    // section's H2 subsections (1., 2., 3. ...), not the H3 sub-steps
    // nested under each one (3.1, 3.2 ...).
    var topLevel = all.some(function (h) { return h.tagName === 'H2'; }) ? 'H2' : 'H3';
    return all.filter(function (h) { return h.tagName === topLevel; });
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
      var headingText = h.textContent.trim();
      var row = document.createElement('div');
      row.className = 'nav-subitem';
      row.setAttribute('data-sec-id', section.id);
      row.setAttribute('data-heading', headingText);

      var dot = document.createElement('span');
      dot.className = 'nav-subitem-dot';
      paintDot(dot, isDone(section.id, headingText));
      row.appendChild(dot);
      row.appendChild(document.createTextNode(h.textContent));

      row.addEventListener('click', function (e) {
        e.stopPropagation();
        show(m[1]);
        // show() swaps which .section is visible; give the browser a beat
        // to lay that out before scrolling, or scrollIntoView measures the
        // wrong (still-hidden) position and lands on the top of the page.
        setTimeout(function () {
          var target = document.getElementById(h.id);
          if (target) target.scrollIntoView({ block: 'start' });
        }, 40);
      });
      sub.appendChild(row);
    });

    var toggle = document.createElement('span');
    toggle.className = 'nav-toggle';
    toggle.textContent = '▸'; // ▸
    toggle.title = 'Expand section list';
    toggle.setAttribute('aria-label', 'Expand section list');
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      navItem.classList.toggle('nav-expanded');
    });

    // The arrow is a small hit target — a double-click anywhere on the row
    // also expands/collapses, so people don't have to aim for it.
    navItem.title = 'Double-click to expand the section list';
    navItem.addEventListener('dblclick', function (e) {
      e.preventDefault();
      navItem.classList.toggle('nav-expanded');
    });

    navItem.appendChild(toggle);
    navItem.insertAdjacentElement('afterend', sub);
  }

  function injectStyles() {
    var st = document.createElement('style');
    st.textContent =
      /* The topbar is position:sticky, so a plain scrollIntoView lands the
         heading right under it (partly hidden). scroll-margin-top makes the
         browser stop short and leave room for it. Covers the My Progress
         page's own jump-to-heading too, since it targets .h2wrap/.h3wrap. */
      '.section h2,.section h3,.h2wrap,.h3wrap{scroll-margin-top:76px;}' +
      '.nav-subitem{display:flex;align-items:flex-start;gap:9px;}' +
      '.nav-subitem-dot{width:9px;height:9px;min-width:9px;border-radius:50%;margin-top:5px;' +
        'box-shadow:0 0 0 2px rgba(255,255,255,.08);}' +
      '.nav-toggle{font-size:15px;line-height:1;padding:5px 9px;margin-left:auto;border-radius:6px;' +
        'color:rgba(255,255,255,.55);}' +
      '.nav-toggle:hover{background:rgba(255,255,255,.14);color:#fff;}' +
      '.nav-item.nav-expanded .nav-toggle{color:#fff;}' +
      '.sb-group[data-tree] .nav-item{user-select:none;}';
    document.head.appendChild(st);
  }

  function init() {
    injectStyles();
    document.querySelectorAll('.sb-group[data-tree] .nav-item').forEach(buildSubmenu);
    // Any checkpoint toggle anywhere in the guide updates the submenu marks.
    document.addEventListener('change', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('pchk')) refreshDoneMarks();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
