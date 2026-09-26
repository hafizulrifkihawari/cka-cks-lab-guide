/* Global command palette + browsable Command Reference section.
   Reads window.CMD_DATA (cmd-data.js). Classic script, works over file://.
   Usage: initCmdPalette({ guide: GUIDE, mount: '#cmd-ref-root' }); */
(function () {
  'use strict';

  const DATA = window.CMD_DATA || { groups: [], commands: [] };
  const GROUP_BY_ID = {};
  DATA.groups.forEach(function (g) { GROUP_BY_ID[g.id] = g; });

  const DOMAIN_LABELS = { all: 'All', k8s: 'Kubernetes', linux: 'Linux', cks: 'CKS Tools' };
  const DEFAULT_GROUP_IDS = ['kubectl-core', 'kubectl-gen', 'debug', 'systemd', 'exam-setup'];

  let CFG = null;
  let currentScope = 'guide'; // 'guide' | 'all'
  let popupEl, inputEl, resultsEl, scopeBtnEl;
  let popupOpen = false;
  let flatResults = [];
  let activeIndex = -1;

  function initCmdPalette(opts) {
    CFG = Object.assign({ guide: 'cka', mount: '#cmd-ref-root', scopeDefault: 'guide' }, opts || {});
    currentScope = CFG.scopeDefault || 'guide';
    injectStyles();
    buildPopup();
    injectFloatingButton();
    injectSidebarTrigger();
    bindGlobalKeys();
    renderSection();
  }
  window.initCmdPalette = initCmdPalette;

  /* ---------------- helpers ---------------- */

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function guideAllowed(cmdObj, scope) {
    if (!cmdObj.exams) return true;
    if (scope === 'all') return true;
    return cmdObj.exams.indexOf(CFG.guide) !== -1;
  }

  function recentsKey() { return CFG.guide + '-cmd-recent'; }
  function loadRecents() {
    try { return JSON.parse(localStorage.getItem(recentsKey())) || []; }
    catch (e) { return []; }
  }
  function addRecent(cmdObj) {
    let arr = loadRecents().filter(function (r) { return r.cmd !== cmdObj.cmd; });
    arr.unshift({ g: cmdObj.g, desc: cmdObj.desc, cmd: cmdObj.cmd });
    arr = arr.slice(0, 8);
    try { localStorage.setItem(recentsKey(), JSON.stringify(arr)); } catch (e) { /* storage unavailable */ }
  }

  function copyText(text) {
    return new Promise(function (resolve) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { resolve(true); }, function () { resolve(fallbackCopy(text)); });
      } else {
        resolve(fallbackCopy(text));
      }
    });
  }
  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* ---------------- search ---------------- */

  function searchCommands(query, scope) {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const scored = [];
    DATA.commands.forEach(function (c) {
      if (!guideAllowed(c, scope)) return;
      const group = GROUP_BY_ID[c.g];
      const desc = c.desc.toLowerCase();
      const cmdText = c.cmd.toLowerCase();
      const tags = (c.tags || []).join(' ').toLowerCase();
      const groupTitle = group ? group.title.toLowerCase() : '';
      let score = -1;
      if (desc.indexOf(q) === 0) score = 100;
      else if (desc.indexOf(q) !== -1) score = 80;
      else if (cmdText.indexOf(q) !== -1) score = 60;
      else if (tags.indexOf(q) !== -1) score = 40;
      else if (groupTitle.indexOf(q) !== -1) score = 20;
      if (score >= 0) scored.push({ c: c, group: group, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 40);
  }

  function defaultResults(scope) {
    const list = [];
    const seen = {};
    loadRecents().forEach(function (r) {
      if (seen[r.cmd]) return;
      seen[r.cmd] = true;
      list.push({ c: r, group: GROUP_BY_ID[r.g], recent: true });
    });
    DEFAULT_GROUP_IDS.forEach(function (gid) {
      DATA.commands
        .filter(function (c) { return c.g === gid && guideAllowed(c, scope) && !seen[c.cmd]; })
        .slice(0, 4)
        .forEach(function (c) {
          seen[c.cmd] = true;
          list.push({ c: c, group: GROUP_BY_ID[c.g] });
        });
    });
    return list.slice(0, 40);
  }

  /* ---------------- popup ---------------- */

  function buildPopup() {
    popupEl = document.createElement('div');
    popupEl.className = 'cmdp-overlay';
    popupEl.innerHTML =
      '<div class="cmdp-modal">' +
        '<div class="cmdp-bar">' +
          '<span class="cmdp-bar-icon">🔎</span>' +
          '<input type="text" class="cmdp-input" placeholder="Search kubectl, systemd, journalctl, openssl…" autocomplete="off" spellcheck="false">' +
          '<button type="button" class="cmdp-scope"></button>' +
          '<button type="button" class="cmdp-close" title="Close (Esc)">Esc</button>' +
        '</div>' +
        '<div class="cmdp-results"></div>' +
        '<div class="cmdp-foot"><span>&uarr;&darr; navigate</span><span>Enter copy &amp; close</span><span>Shift+Enter copy &amp; stay</span></div>' +
      '</div>';
    document.body.appendChild(popupEl);

    inputEl = popupEl.querySelector('.cmdp-input');
    resultsEl = popupEl.querySelector('.cmdp-results');
    scopeBtnEl = popupEl.querySelector('.cmdp-scope');
    updateScopeLabel();

    scopeBtnEl.addEventListener('click', function () {
      currentScope = currentScope === 'guide' ? 'all' : 'guide';
      updateScopeLabel();
      runSearch();
    });
    popupEl.querySelector('.cmdp-close').addEventListener('click', closePopup);
    popupEl.addEventListener('mousedown', function (e) { if (e.target === popupEl) closePopup(); });
    inputEl.addEventListener('input', runSearch);
    inputEl.addEventListener('keydown', onInputKeydown);
  }

  function updateScopeLabel() {
    scopeBtnEl.textContent = currentScope === 'all' ? 'All guides' : 'This guide';
  }

  function openPopup() {
    if (popupOpen) { inputEl.focus(); return; }
    popupOpen = true;
    popupEl.classList.add('open');
    document.body.classList.add('cmdp-noscroll');
    inputEl.value = '';
    runSearch();
    setTimeout(function () { inputEl.focus(); }, 0);
  }
  function closePopup() {
    popupOpen = false;
    popupEl.classList.remove('open');
    document.body.classList.remove('cmdp-noscroll');
  }

  function runSearch() {
    const q = inputEl.value;
    const list = q.trim() ? (searchCommands(q, currentScope) || []) : defaultResults(currentScope);
    flatResults = list;
    activeIndex = list.length ? 0 : -1;
    renderResults(!q.trim());
  }

  function renderResults(isDefault) {
    if (!flatResults.length) {
      resultsEl.innerHTML = '<div class="cmdp-empty">No matching commands.</div>';
      return;
    }
    let html = '';
    if (isDefault && flatResults.some(function (r) { return r.recent; })) {
      html += '<div class="cmdp-section-label">Recent</div>';
    }
    flatResults.forEach(function (item, i) {
      const group = item.group;
      const label = group ? (group.icon + ' ' + escapeHtml(group.title)) : '';
      html +=
        '<div class="cmdp-row' + (i === activeIndex ? ' active' : '') + '" data-idx="' + i + '">' +
          '<div class="cmdp-row-grp">' + label + '</div>' +
          '<div class="cmdp-row-desc">' + escapeHtml(item.c.desc) + '<span class="cmdp-flash" data-flash="' + i + '"></span></div>' +
          '<pre class="cmdp-row-cmd">' + escapeHtml(item.c.cmd) + '</pre>' +
        '</div>';
    });
    resultsEl.innerHTML = html;
    resultsEl.querySelectorAll('.cmdp-row').forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        activeIndex = parseInt(row.getAttribute('data-idx'), 10);
        highlightActive(false);
      });
      row.addEventListener('click', function () {
        activeIndex = parseInt(row.getAttribute('data-idx'), 10);
        commitActive(false);
      });
    });
  }

  function highlightActive(scroll) {
    resultsEl.querySelectorAll('.cmdp-row').forEach(function (row) {
      row.classList.toggle('active', parseInt(row.getAttribute('data-idx'), 10) === activeIndex);
    });
    if (scroll) {
      const el = resultsEl.querySelector('.cmdp-row[data-idx="' + activeIndex + '"]');
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }

  function moveActive(delta) {
    if (!flatResults.length) return;
    activeIndex = (activeIndex + delta + flatResults.length) % flatResults.length;
    highlightActive(true);
  }

  function commitActive(keepOpen) {
    if (activeIndex < 0 || !flatResults[activeIndex]) return;
    const item = flatResults[activeIndex];
    copyText(item.c.cmd).then(function () {
      addRecent(item.c);
      if (keepOpen) {
        const flash = resultsEl.querySelector('.cmdp-flash[data-flash="' + activeIndex + '"]');
        if (flash) {
          flash.textContent = ' ✓ copied';
          setTimeout(function () { flash.textContent = ''; }, 1000);
        }
      } else {
        closePopup();
      }
    });
  }

  function onInputKeydown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); commitActive(e.shiftKey); }
    else if (e.key === 'Escape') { e.preventDefault(); closePopup(); }
  }

  function bindGlobalKeys() {
    document.addEventListener('keydown', function (e) {
      const metaK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      if (metaK) { e.preventDefault(); openPopup(); return; }
      if (!popupOpen && e.key === '/') {
        const active = document.activeElement;
        const tag = active ? active.tagName.toLowerCase() : '';
        const editable = tag === 'input' || tag === 'textarea' || (active && active.isContentEditable);
        if (!editable) { e.preventDefault(); openPopup(); }
        return;
      }
      if (popupOpen && e.key === 'Escape') { closePopup(); }
    });
  }

  function injectFloatingButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cmdp-fab';
    btn.title = 'Search commands (⌘K)';
    btn.textContent = '⌘K';
    btn.addEventListener('click', openPopup);
    document.body.appendChild(btn);
  }

  function injectSidebarTrigger() {
    const footer = document.querySelector('.sb-footer');
    if (!footer) return;
    const trigger = document.createElement('div');
    trigger.className = 'cmdp-sidebar-trigger';
    trigger.textContent = '🔎 Search commands  ⌘K';
    trigger.addEventListener('click', openPopup);
    footer.insertBefore(trigger, footer.firstChild);
  }

  /* ---------------- browsable section ---------------- */

  function renderSection() {
    const mount = document.querySelector(CFG.mount);
    if (!mount) return;
    mount.classList.add('cmdp-section');
    let activeDomain = 'all';

    function draw() {
      const domains = ['all', 'k8s', 'linux', 'cks'];
      let html = '<div class="cmdp-chips">';
      domains.forEach(function (d) {
        html += '<button type="button" class="cmdp-chip' + (d === activeDomain ? ' active' : '') + '" data-domain="' + d + '">' + DOMAIN_LABELS[d] + '</button>';
      });
      html += '</div><div class="cmdp-grid">';

      DATA.groups.forEach(function (g) {
        if (activeDomain !== 'all' && g.domain !== activeDomain) return;
        const cmds = DATA.commands.filter(function (c) { return c.g === g.id && guideAllowed(c, 'guide'); });
        if (!cmds.length) return;
        html += '<div class="cmdp-card"><h3>' + g.icon + ' ' + escapeHtml(g.title) + '</h3>';
        cmds.forEach(function (c) {
          html +=
            '<div class="cmdp-cmditem">' +
              '<div class="cmdp-cmddesc">' + escapeHtml(c.desc) + '</div>' +
              '<pre class="cmdp-cmdpre"><code>' + escapeHtml(c.cmd) + '</code></pre>' +
              (c.note ? '<div class="cmdp-note">' + escapeHtml(c.note) + '</div>' : '') +
              '<button type="button" class="cmdp-copybtn" data-cmd="' + encodeURIComponent(c.cmd) + '">Copy</button>' +
            '</div>';
        });
        html += '</div>';
      });
      html += '</div>';
      mount.innerHTML = html;

      mount.querySelectorAll('.cmdp-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          activeDomain = chip.getAttribute('data-domain');
          draw();
        });
      });
      mount.querySelectorAll('.cmdp-copybtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const cmd = decodeURIComponent(btn.getAttribute('data-cmd'));
          copyText(cmd).then(function () {
            addRecent({ g: '', desc: '', cmd: cmd });
            const orig = btn.textContent;
            btn.textContent = 'Copied ✓';
            btn.classList.add('copied');
            setTimeout(function () { btn.textContent = orig; btn.classList.remove('copied'); }, 1200);
          });
        });
      });
    }
    draw();
  }

  /* ---------------- styles ---------------- */

  function injectStyles() {
    if (document.getElementById('cmdp-styles')) return;
    const style = document.createElement('style');
    style.id = 'cmdp-styles';
    style.textContent =
      '.cmdp-fab{position:fixed;right:22px;bottom:22px;z-index:900;width:48px;height:48px;border-radius:50%;border:none;background:var(--sb);color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;letter-spacing:-.3px;}' +
      '.cmdp-fab:hover{background:var(--blue);}' +
      '.cmdp-sidebar-trigger{color:var(--sb-text);font-size:12px;cursor:pointer;margin-bottom:8px;}' +
      '.cmdp-sidebar-trigger:hover{color:#93c5fd;}' +
      '.cmdp-noscroll{overflow:hidden;}' +
      '.cmdp-overlay{display:none;position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.55);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);align-items:flex-start;justify-content:center;padding:12vh 16px 16px;}' +
      '.cmdp-overlay.open{display:flex;}' +
      '.cmdp-modal{width:100%;max-width:720px;max-height:70vh;background:var(--white);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden;}' +
      '.cmdp-bar{display:flex;align-items:center;gap:8px;background:var(--sb);padding:10px 14px;}' +
      '.cmdp-bar-icon{font-size:14px;opacity:.8;}' +
      '.cmdp-input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14px;font-family:inherit;}' +
      '.cmdp-input::placeholder{color:var(--sb-text);}' +
      '.cmdp-scope,.cmdp-close{background:rgba(255,255,255,.08);color:var(--sb-text);border:none;border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;white-space:nowrap;}' +
      '.cmdp-scope:hover,.cmdp-close:hover{background:rgba(255,255,255,.16);color:#fff;}' +
      '.cmdp-results{overflow-y:auto;padding:8px;flex:1;}' +
      '.cmdp-section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);padding:6px 8px 2px;}' +
      '.cmdp-empty{padding:28px 12px;text-align:center;color:var(--muted);font-size:13px;}' +
      '.cmdp-row{padding:8px 10px;border-radius:8px;cursor:pointer;margin-bottom:2px;}' +
      '.cmdp-row.active{background:rgba(59,130,246,.1);}' +
      '.cmdp-row-grp{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:2px;}' +
      '.cmdp-row-desc{font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;}' +
      '.cmdp-flash{color:var(--green);font-weight:700;}' +
      '.cmdp-row-cmd{margin:0;background:var(--code-bg);color:#c9d1d9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;padding:8px 10px;border-radius:6px;white-space:pre-wrap;overflow-x:auto;}' +
      '.cmdp-foot{display:flex;gap:16px;padding:7px 14px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);background:var(--bg);}' +
      '.cmdp-section .cmdp-chips{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0;}' +
      '.cmdp-chip{padding:5px 14px;border-radius:99px;border:1px solid var(--border);background:var(--white);font-size:12px;color:var(--muted);cursor:pointer;}' +
      '.cmdp-chip.active{background:var(--blue);border-color:var(--blue);color:#fff;}' +
      '.cmdp-section .cmdp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin:14px 0;}' +
      '.cmdp-card{background:var(--white);border:1px solid var(--border);border-radius:8px;overflow:hidden;}' +
      '.cmdp-card h3{font-size:14px;background:var(--sb);color:#60a5fa;padding:8px 14px;margin:0;}' +
      '.cmdp-cmditem{padding:10px 14px;border-bottom:1px solid var(--border);position:relative;}' +
      '.cmdp-cmditem:last-child{border-bottom:none;}' +
      '.cmdp-cmddesc{font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:5px;}' +
      '.cmdp-cmdpre{margin:0 0 6px;background:var(--code-bg);color:#c9d1d9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;padding:8px 10px;border-radius:6px;white-space:pre-wrap;overflow-x:auto;}' +
      '.cmdp-note{font-size:11px;color:var(--muted);font-style:italic;margin-bottom:6px;}' +
      '.cmdp-copybtn{font-size:11px;padding:3px 10px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;}' +
      '.cmdp-copybtn:hover{background:var(--blue);border-color:var(--blue);color:#fff;}' +
      '.cmdp-copybtn.copied{background:var(--green);border-color:var(--green);color:#fff;}' +
      '@media (max-width:820px){.cmdp-overlay{padding:0;}.cmdp-modal{max-width:100%;max-height:100vh;height:100vh;border-radius:0;}.cmdp-section .cmdp-grid{grid-template-columns:1fr;}}';
    document.head.appendChild(style);
  }
})();
