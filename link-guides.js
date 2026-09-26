/* link-guides.js — makes the CKA study guide and the CKA lab tutorial one system.

   It does four things, and it works over file:// with no build step:

     1. Cross-links. Each exam domain in the study guide gets a "Practice this"
        bar pointing at the matching labs. Each lab gets a "Theory" bar pointing
        back at the domain that explains it.
     2. Deep links. Both pages read `#sec-<id>` on load and open that section.
        The hash updates as you navigate, so any section is linkable.
     3. A shared progress store. Both pages write `cka-progress`. The lab
        prefixes its keys with `lab:` so the two sets never collide.
     4. A lab manifest. The lab page publishes its section and checkpoint list
        to localStorage. The study guide reads it to show lab progress on the
        My Progress page, without loading the lab file.

   Usage:  initGuideLinks({ side: 'theory' });   // in cka-study-guide.html
           initGuideLinks({ side: 'lab' });      // in cka-lab-tutorial.html
*/
(function () {
  'use strict';

  var THEORY_FILE = 'cka-study-guide.html';
  var LAB_FILE    = 'cka-lab-tutorial.html';

  var LAB_PREFIX   = 'lab:';
  var MANIFEST_KEY = 'cka-lab-manifest';

  /* Which labs practise which domain. One domain, many labs. */
  var MAP = {
    cluster:         ['vm-setup', 'lab-etcd', 'lab-upgrade', 'lab-static', 'lab-rbac'],
    workloads:       ['lab-workloads', 'lab-scheduling'],
    networking:      ['lab-networking'],
    storage:         ['lab-storage'],
    troubleshooting: ['lab-trouble']
  };

  var LAB_TITLES = {
    'prereqs':        'Prerequisites & Install',
    'create':         'Create the KinD Cluster',
    'addons':         'Install Add-ons',
    'lab-workloads':  'Lab A · Workloads',
    'lab-scheduling': 'Lab B · Scheduling',
    'lab-networking': 'Lab C · Networking',
    'lab-storage':    'Lab D · Storage',
    'lab-trouble':    'Lab E · Troubleshooting',
    'lab-rbac':       'Lab F · RBAC',
    'vm-setup':       'Provision VMs + kubeadm',
    'lab-etcd':       'Lab G · etcd Backup/Restore',
    'lab-upgrade':    'Lab H · Cluster Upgrade',
    'lab-static':     'Lab I · Static Pods & API'
  };

  var THEORY_TITLES = {
    cluster:         'Cluster Architecture',
    workloads:       'Workloads & Scheduling',
    networking:      'Services & Networking',
    storage:         'Storage',
    troubleshooting: 'Troubleshooting'
  };

  /* Reverse of MAP: lab section -> the one domain that explains it. */
  var BACK = {};
  Object.keys(MAP).forEach(function (domain) {
    MAP[domain].forEach(function (lab) { if (!BACK[lab]) BACK[lab] = domain; });
  });

  var CFG = null;

  function initGuideLinks(opts) {
    CFG = Object.assign({ side: 'theory' }, opts || {});
    injectStyles();
    if (CFG.side === 'lab') {
      publishManifest();
      renderBars(BACK, THEORY_FILE, THEORY_TITLES, '📖', 'Theory for this lab');
    } else {
      renderBars(MAP, LAB_FILE, LAB_TITLES, '🧪', 'Practice this');
    }
    initHashRouting();
  }
  window.initGuideLinks = initGuideLinks;

  /* ------------------------------------------------------------ key shape */

  // The lab namespaces its checkpoints so both files can share one store.
  function progKey(side, sectionId, heading) {
    return (side === 'lab' ? LAB_PREFIX : '') + sectionId + '::' + heading;
  }
  window.guideProgKey = progKey;

  /* --------------------------------------------------------- cross-links */

  function renderBars(table, file, titles, icon, label) {
    Object.keys(table).forEach(function (fromId) {
      var sec = document.getElementById('sec-' + fromId);
      if (!sec) return;
      var targets = table[fromId];
      if (typeof targets === 'string') targets = [targets];
      if (!targets || !targets.length) return;

      var bar = document.createElement('div');
      bar.className = 'xlink';
      var head = '<span class="xlink-label">' + icon + ' ' + esc(label) + '</span>';
      var chips = targets.map(function (id) {
        return '<a class="xlink-chip" href="' + file + '#sec-' + encodeURIComponent(id) + '">' +
               esc(titles[id] || id) + '</a>';
      }).join('');
      bar.innerHTML = head + '<span class="xlink-chips">' + chips + '</span>';

      // Sit the bar under the lead paragraph when there is one, else under the h1.
      var lead = sec.querySelector('.lead');
      var anchor = lead || sec.querySelector('h1');
      if (anchor && anchor.parentNode === sec) sec.insertBefore(bar, anchor.nextSibling);
      else sec.insertBefore(bar, sec.firstChild);
    });
  }

  /* ------------------------------------------------------- deep linking */

  function initHashRouting() {
    // Wrap show() so every navigation writes the hash.
    var inner = window.show;
    if (typeof inner === 'function' && !inner.__wrapped) {
      var wrapped = function (id) {
        inner(id);
        try {
          if (history && history.replaceState) history.replaceState(null, '', '#sec-' + id);
          else location.hash = 'sec-' + id;
        } catch (e) {}
      };
      wrapped.__wrapped = true;
      window.show = wrapped;
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  }

  function openFromHash() {
    var raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return;
    var id = decodeURIComponent(raw).replace(/^sec-/, '');
    if (!id || !document.getElementById('sec-' + id)) return;
    var active = document.querySelector('.section.active');
    if (active && active.id === 'sec-' + id) return;
    if (typeof window.show === 'function') window.show(id);
  }

  /* ---------------------------------------------------------- manifest */

  /* The lab page publishes what it contains, so the study guide's progress
     page can total the labs without loading the lab file. Written on every
     lab visit, so it cannot drift from the lab's real headings. */
  function publishManifest() {
    var skip = { 'sec-cheatsheet': 1 };
    var sections = [];
    document.querySelectorAll('.section').forEach(function (sec) {
      if (skip[sec.id]) return;
      var items = [];
      sec.querySelectorAll('h3').forEach(function (h3) {
        var t = h3.textContent.trim();
        if (t) items.push(t);
      });
      if (!items.length) return;
      sections.push({ id: sec.id.replace(/^sec-/, ''), title: sectionTitle(sec), items: items });
    });
    try {
      localStorage.setItem(MANIFEST_KEY, JSON.stringify({ file: LAB_FILE, sections: sections }));
    } catch (e) {}
  }

  /* -------------------------------------------------------------- utils */

  /* The h1 carries an environment badge ("KinD", "VMs"). Leave it out of the
     stored title, or it runs into the heading text elsewhere. */
  function sectionTitle(sec) {
    var h1 = sec.querySelector('h1');
    if (!h1) return sec.id;
    var clone = h1.cloneNode(true);
    clone.querySelectorAll('.envtag').forEach(function (n) { n.remove(); });
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function injectStyles() {
    var st = document.createElement('style');
    st.textContent =
      '.xlink{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--white);' +
        'border:1px solid var(--border);border-left:3px solid var(--blue);border-radius:10px;' +
        'padding:11px 15px;margin:0 0 26px;}' +
      '.xlink-label{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}' +
      '.xlink-chips{display:flex;gap:7px;flex-wrap:wrap;}' +
      '.xlink-chip{font-size:12.5px;font-weight:600;color:var(--blue);background:rgba(59,130,246,.09);' +
        'border:1px solid rgba(59,130,246,.22);border-radius:99px;padding:3px 11px;text-decoration:none;' +
        'transition:background .12s,color .12s;}' +
      '.xlink-chip:hover{background:var(--blue);color:#fff;text-decoration:none;}' +
      '@media (max-width:700px){.xlink{flex-direction:column;align-items:flex-start;gap:7px;}}';
    document.head.appendChild(st);
  }
})();
