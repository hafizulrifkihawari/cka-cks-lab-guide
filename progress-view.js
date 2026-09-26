/* Progress view — one page that adds up every checkpoint in the guide.
   Reads the same localStorage key the inline checkbox code writes:
     <guide>-progress  ->  { "<sectionId>::<h2 text>": 1, ... }
   Classic script, no build step. Usage: initProgressView({ guide: 'cka', mount: '#prog-root' });

   It also repairs one thing: the Cluster Architecture page was rewritten and its
   headings renamed, which stranded ticks saved under the old names. RENAMES maps
   the old heading to the new one that covers the same ground. Runs once. */
(function () {
  'use strict';

  var CFG = null, PKEY = '', QKEY = '', MKEY = '';

  var RENAMES = {
    cka: {
      'sec-cluster': {
        '1. Cluster Setup with kubeadm': '4. Step 2 — Create the Control Plane with kubeadm',
        '2. Cluster Upgrade': '8. Upgrade the Cluster',
        '3. etcd Backup & Restore': '10. etcd Backup and Restore',
        '4. RBAC — Role-Based Access Control': '11. RBAC — Role-Based Access Control',
        '5. kubeconfig Management': '13. kubeconfig Management',
        '6. CRDs & Operators': '15. CRDs and Operators'
      }
    }
  };

  function initProgressView(opts) {
    CFG = Object.assign({ guide: 'cka', mount: '#prog-root' }, opts || {});
    PKEY = CFG.guide + '-progress';
    QKEY = CFG.guide + '-quiz';
    MKEY = CFG.guide + '-progress-migrated';
    injectStyles();
    migrate();
    render();
    // Any checkpoint toggle anywhere in the guide refreshes this page.
    document.addEventListener('change', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('pchk')) render();
    });
    // Re-render when the user navigates back to this section.
    document.addEventListener('click', function (e) {
      var nav = e.target.closest ? e.target.closest('.nav-item') : null;
      if (nav && /show\('progress'\)/.test(nav.getAttribute('onclick') || '')) setTimeout(render, 0);
    });
    window.addEventListener('storage', render);
  }
  window.initProgressView = initProgressView;
  window.renderProgressView = render;

  /* ------------------------------------------------------------- storage */

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function migrate() {
    try { if (localStorage.getItem(MKEY)) return; } catch (e) { return; }
    var map = RENAMES[CFG.guide];
    if (map) {
      var prog = load(PKEY);
      var moved = 0;
      Object.keys(map).forEach(function (secId) {
        Object.keys(map[secId]).forEach(function (oldH) {
          var oldKey = secId + '::' + oldH;
          var newKey = secId + '::' + map[secId][oldH];
          if (prog[oldKey] && !prog[newKey]) { prog[newKey] = 1; moved++; }
          if (prog[oldKey]) delete prog[oldKey];
        });
      });
      if (moved) save(PKEY, prog);
      // Reflect the restored ticks in checkboxes already on the page.
      if (moved) syncCheckboxes(prog);
    }
    try { localStorage.setItem(MKEY, '1'); } catch (e) {}
  }

  function syncCheckboxes(prog) {
    document.querySelectorAll('.section').forEach(function (sec) {
      sec.querySelectorAll('h2').forEach(function (h2) {
        if (!prog[sec.id + '::' + h2.textContent.trim()]) return;
        var wrap = h2.closest('.h2wrap');
        if (!wrap) return;
        var cb = wrap.querySelector('.pchk');
        if (cb && !cb.checked) { cb.checked = true; wrap.classList.add('done'); }
      });
    });
    if (typeof window.updateBadges === 'function') window.updateBadges();
  }

  /* ------------------------------------------------------------ gathering */

  // Sections that hold no study checkpoints — same list the inline code skips.
  var SKIP = { 'sec-practice': 1, 'sec-quiz': 1, 'sec-cheatsheet': 1, 'sec-progress': 1 };

  function gather() {
    var prog = load(PKEY);
    var out = [];
    document.querySelectorAll('.section').forEach(function (sec) {
      if (SKIP[sec.id]) return;
      var h2s = sec.querySelectorAll('h2');
      if (!h2s.length) return;
      var id = sec.id.replace(/^sec-/, '');
      var h1 = sec.querySelector('h1');
      var items = [];
      h2s.forEach(function (h2) {
        var text = h2.textContent.trim();
        items.push({ text: text, done: !!prog[sec.id + '::' + text] });
      });
      out.push({
        id: id,
        title: h1 ? h1.textContent.trim() : id,
        weight: navWeight(id),
        items: items,
        done: items.filter(function (i) { return i.done; }).length
      });
    });
    return out;
  }

  /* Lab checkpoints live in the same store under a prefix. The lab page
     publishes its section list to localStorage, so this page can total them
     without loading the lab file. Returns [] until the lab is opened once. */
  function gatherLabs() {
    var L = CFG.labs;
    if (!L) return { file: '', secs: [] };
    var man;
    try { man = JSON.parse(localStorage.getItem(L.manifestKey)); } catch (e) { man = null; }
    if (!man || !man.sections || !man.sections.length) return { file: '', secs: [] };
    var prog = load(PKEY);
    var secs = man.sections.map(function (sec) {
      var items = sec.items.map(function (text) {
        return { text: text, done: !!prog[L.prefix + 'sec-' + sec.id + '::' + text] };
      });
      return {
        id: sec.id,
        title: sec.title,
        weight: '',
        items: items,
        lab: true,
        done: items.filter(function (i) { return i.done; }).length
      };
    });
    return { file: man.file || '', secs: secs };
  }

  // The "25%" style badge already in the sidebar, when a section has one.
  function navWeight(id) {
    var nav = document.querySelector('.nav-item[onclick*="show(\'' + id + '\')"]');
    if (!nav) return '';
    var badge = nav.querySelector('.nav-pct:not(.prog)');
    return badge ? badge.textContent.trim() : '';
  }

  function quizStats() {
    var marks = load(QKEY);
    var known = 0, review = 0;
    Object.keys(marks).forEach(function (k) {
      if (marks[k] === 'known') known++;
      else if (marks[k] === 'review') review++;
    });
    var total = (window.QUIZ && window.QUIZ.length) ? window.QUIZ.length : 0;
    return { known: known, review: review, total: total };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* -------------------------------------------------------------- render */

  function render() {
    var root = document.querySelector(CFG.mount);
    if (!root) return;
    var secs = gather();
    var labInfo = gatherLabs();
    var labSecs = labInfo.secs;
    var all = secs.concat(labSecs);
    var total = 0, done = 0;
    all.forEach(function (s) { total += s.items.length; done += s.done; });
    var theoryTotal = 0, theoryDone = 0;
    secs.forEach(function (s) { theoryTotal += s.items.length; theoryDone += s.done; });
    var labTotal = 0, labDone = 0;
    labSecs.forEach(function (s) { labTotal += s.items.length; labDone += s.done; });
    var pct = total ? Math.round((done / total) * 100) : 0;
    var finished = all.filter(function (s) { return s.items.length && s.done === s.items.length; }).length;
    var q = quizStats();

    var html = '';

    html += '<div class="pv-hero">' +
              '<div class="pv-ring" style="--pct:' + pct + '">' +
                '<span class="pv-ring-num">' + pct + '<small>%</small></span>' +
              '</div>' +
              '<div class="pv-hero-body">' +
                '<div class="pv-hero-big">' + done + ' of ' + total + ' checkpoints</div>' +
                '<p class="pv-hero-sub">Tick the box beside any heading once you can do that task without looking. ' +
                  (done === 0 ? 'Nothing ticked yet — start with Core Concepts.'
                   : done === total ? 'Every checkpoint is ticked. Move to the practice cases and the quiz.'
                   : 'Keep going: ' + (total - done) + ' left.') + '</p>' +
                '<div class="pv-stats">' +
                  '<span class="pv-stat"><b>' + finished + '</b>/' + all.length + ' sections complete</span>' +
                  '<span class="pv-stat"><b>' + theoryDone + '</b>/' + theoryTotal + ' theory</span>' +
                  (labTotal ? '<span class="pv-stat"><b>' + labDone + '</b>/' + labTotal + ' labs</span>' : '') +
                  (q.total ? '<span class="pv-stat"><b>' + q.known + '</b>/' + q.total + ' quiz cards known</span>' : '') +
                  (q.review ? '<span class="pv-stat pv-warn"><b>' + q.review + '</b> marked review</span>' : '') +
                '</div>' +
              '</div>' +
            '</div>';

    // Only split into groups when this guide actually has a lab file beside it.
    if (CFG.labs) html += '<h2 class="pv-group">Theory \u2014 Study Guide</h2>';
    secs.forEach(function (s) {
      var spct = s.items.length ? Math.round((s.done / s.items.length) * 100) : 0;
      var complete = s.done === s.items.length;
      var open = s.items.filter(function (i) { return !i.done; });
      html += '<div class="pv-sec' + (complete ? ' pv-complete' : '') + '">' +
                '<div class="pv-sec-head" data-go="' + esc(s.id) + '">' +
                  '<span class="pv-check">' + (complete ? '✓' : '') + '</span>' +
                  '<span class="pv-sec-name">' + esc(s.title) + '</span>' +
                  (s.weight ? '<span class="pv-weight">' + esc(s.weight) + '</span>' : '') +
                  '<span class="pv-count">' + s.done + '/' + s.items.length + '</span>' +
                '</div>' +
                '<div class="pv-bar"><i style="width:' + spct + '%"></i></div>';
      if (open.length) {
        html += '<ul class="pv-open">';
        open.forEach(function (i) {
          html += '<li data-go="' + esc(s.id) + '" data-h="' + esc(i.text) + '">' + esc(i.text) + '</li>';
        });
        html += '</ul>';
      }
      html += '</div>';
    });

    if (labSecs.length) {
      html += '<h2 class="pv-group">' + esc(CFG.labs.title || 'Hands-On Labs') +
              '<a class="pv-group-link" href="' + esc(labInfo.file) + '">open the lab →</a></h2>';
      labSecs.forEach(function (s) {
        var spct = s.items.length ? Math.round((s.done / s.items.length) * 100) : 0;
        var complete = s.done === s.items.length;
        var open = s.items.filter(function (i) { return !i.done; });
        var href = labInfo.file + '#sec-' + encodeURIComponent(s.id);
        html += '<div class="pv-sec' + (complete ? ' pv-complete' : '') + '">' +
                  '<a class="pv-sec-head" href="' + esc(href) + '">' +
                    '<span class="pv-check">' + (complete ? '✓' : '') + '</span>' +
                    '<span class="pv-sec-name">' + esc(s.title) + '</span>' +
                    '<span class="pv-count">' + s.done + '/' + s.items.length + '</span>' +
                  '</a>' +
                  '<div class="pv-bar"><i style="width:' + spct + '%"></i></div>';
        if (open.length) {
          html += '<ul class="pv-open">';
          open.forEach(function (i) {
            html += '<li><a href="' + esc(href) + '">' + esc(i.text) + '</a></li>';
          });
          html += '</ul>';
        }
        html += '</div>';
      });
    } else if (CFG.labs) {
      html += '<h2 class="pv-group">' + esc(CFG.labs.title || 'Hands-On Labs') + '</h2>' +
              '<div class="pv-empty">Open the <a href="cka-lab-tutorial.html">lab tutorial</a> once. ' +
              'It then reports its checkpoints here, beside the theory.</div>';
    }

    html += '<div class="pv-foot">Progress is saved in this browser only. ' +
            'The study guide and the lab tutorial share one store, so both count toward the ring above. ' +
            'Use <b>↺ Reset all progress</b> at the bottom of the sidebar to clear it.</div>';

    root.innerHTML = html;

    root.querySelectorAll('[data-go]').forEach(function (el) {
      el.addEventListener('click', function () {
        jump(el.getAttribute('data-go'), el.getAttribute('data-h'));
      });
    });
  }

  function jump(sectionId, heading) {
    if (typeof window.show === 'function') window.show(sectionId);
    if (!heading) return;
    setTimeout(function () {
      var sec = document.getElementById('sec-' + sectionId);
      if (!sec) return;
      var hit = null;
      sec.querySelectorAll('h2').forEach(function (h2) {
        if (!hit && h2.textContent.trim() === heading) hit = h2;
      });
      if (!hit) return;
      var target = hit.closest('.h2wrap') || hit;
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.classList.add('pv-flash');
      setTimeout(function () { target.classList.remove('pv-flash'); }, 1600);
    }, 40);
  }

  /* -------------------------------------------------------------- styles */

  function injectStyles() {
    var st = document.createElement('style');
    st.textContent =
      '.pv-hero{display:flex;gap:22px;align-items:center;background:var(--white);border:1px solid var(--border);border-radius:14px;padding:22px;margin:18px 0 26px;flex-wrap:wrap;}' +
      '.pv-ring{--pct:0;width:104px;height:104px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;' +
        'background:conic-gradient(var(--green) calc(var(--pct)*1%),var(--border) 0);}' +
      '.pv-ring-num{width:80px;height:80px;border-radius:50%;background:var(--white);display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums;}' +
      '.pv-ring-num small{font-size:12px;font-weight:700;color:var(--muted);margin-left:1px;}' +
      '.pv-hero-body{flex:1;min-width:240px;}' +
      '.pv-hero-big{font-size:21px;font-weight:800;color:var(--text);letter-spacing:-.3px;font-variant-numeric:tabular-nums;}' +
      '.pv-hero-sub{font-size:13.5px;color:var(--muted);line-height:1.6;margin:5px 0 12px;}' +
      '.pv-stats{display:flex;gap:8px;flex-wrap:wrap;}' +
      '.pv-stat{font-size:12px;color:var(--muted);background:var(--bg);border:1px solid var(--border);border-radius:99px;padding:4px 11px;}' +
      '.pv-stat b{color:var(--text);font-weight:700;}' +
      '.pv-stat.pv-warn{background:var(--cal-warn-bg);border-color:#fde68a;color:var(--cal-warn-text);}' +
      '.pv-stat.pv-warn b{color:#92400e;}' +
      '.pv-sec{margin-bottom:18px;}' +
      '.pv-sec-head{display:flex;align-items:center;gap:9px;cursor:pointer;padding:2px 0 7px;}' +
      '.pv-sec-head:hover .pv-sec-name{color:var(--blue);}' +
      '.pv-check{width:17px;height:17px;border-radius:50%;flex-shrink:0;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;}' +
      '.pv-complete .pv-check{background:var(--green);border-color:var(--green);}' +
      '.pv-sec-name{font-size:14.5px;font-weight:600;color:var(--text);flex:1;}' +
      '.pv-weight{font-size:11px;color:var(--muted);background:var(--bg);border-radius:4px;padding:1px 7px;}' +
      '.pv-count{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums;}' +
      '.pv-bar{height:6px;border-radius:99px;background:var(--border);overflow:hidden;}' +
      '.pv-bar i{display:block;height:100%;background:var(--green);border-radius:99px;transition:width .25s;}' +
      '.pv-open{list-style:none;margin:9px 0 0;padding:0;display:flex;flex-direction:column;gap:1px;}' +
      '.pv-open li{font-size:13px;color:var(--muted);padding:5px 10px 5px 26px;border-radius:6px;cursor:pointer;position:relative;line-height:1.45;}' +
      '.pv-open li::before{content:"";position:absolute;left:10px;top:11px;width:7px;height:7px;border:1.5px solid var(--border);border-radius:2px;}' +
      '.pv-open li:hover{background:var(--bg);color:var(--text);}' +
      '.pv-group{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--muted);border-bottom:1px solid var(--border);padding-bottom:7px;margin:30px 0 16px;display:flex;align-items:center;gap:10px;}' +
      '.pv-group:first-of-type{margin-top:8px;}' +
      '.pv-group-link{margin-left:auto;font-size:11.5px;font-weight:600;text-transform:none;letter-spacing:0;color:var(--blue);}' +
      'a.pv-sec-head{text-decoration:none;}' +
      '.pv-open li a{color:inherit;text-decoration:none;display:block;}' +
      '.pv-empty{font-size:13px;color:var(--muted);background:var(--bg);border:1px dashed var(--border);border-radius:10px;padding:14px 16px;line-height:1.6;}' +
      '.pv-foot{font-size:12px;color:var(--muted);border-top:1px solid var(--border);padding-top:14px;margin-top:26px;line-height:1.6;}' +
      '.pv-flash{animation:pvflash 1.6s ease;}' +
      '@keyframes pvflash{0%,100%{background:transparent;}18%{background:#fef9c3;}}' +
      '@media (prefers-reduced-motion:reduce){.pv-flash{animation:none;}.pv-bar i{transition:none;}}' +
      '@media (max-width:860px){.pv-hero{gap:16px;padding:18px;}.pv-ring{width:84px;height:84px;}.pv-ring-num{width:64px;height:64px;font-size:19px;}}';
    document.head.appendChild(st);
  }
})();
