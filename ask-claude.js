/* Ask Claude — in-page tutor panel for the CKA / CKS study guides.
   Two ways to get an answer without leaving the page:
     1. Answer here  — streams from the Claude API using a key you paste once.
     2. Open in claude.ai — no key needed; opens a new chat with the question filled in.
   Also adds highlight-to-ask: select any text, a small chip appears.
   Classic script, no build step. Usage: initAskClaude({ guide: 'cka' }); */
(function () {
  'use strict';

  var API_URL = 'https://api.anthropic.com/v1/messages';
  var API_VERSION = '2023-06-01';
  var FALLBACK_BETA = 'server-side-fallback-2026-07-01';
  var CHAT_URL = 'https://claude.ai/new?q=';

  var DEFAULTS = {
    key: '',
    model: 'claude-opus-5',
    mode: 'web',          // 'web' = open claude.ai (subscription), 'api' = answer in the panel (API key)
    highlight: true
  };

  var CFG = null;         // { guide: 'cka' }
  var SKEY = 'ask-claude';
  var settings = null;
  var history = [];       // [{ role, text }]
  var busy = false;
  var abortCtl = null;
  var pendingContext = '';

  var panelEl, listEl, inputEl, settingsEl, chipEl, statusEl, sendBtn;

  /* ------------------------------------------------------------------ setup */

  function initAskClaude(opts) {
    CFG = Object.assign({ guide: 'cka' }, opts || {});
    SKEY = CFG.guide + '-ask';
    settings = loadSettings();
    injectStyles();
    buildPanel();
    buildChip();
    injectFab();
    bindKeys();
    bindSelection();
    greet();
    if (location.hash === '#ask') openPanel();
  }
  window.initAskClaude = initAskClaude;
  window.askClaudeOpen = openPanel;

  function loadSettings() {
    var s = Object.assign({}, DEFAULTS);
    try {
      var raw = JSON.parse(localStorage.getItem(SKEY));
      if (raw) Object.assign(s, raw);
    } catch (e) {}
    return s;
  }
  function saveSettings() {
    try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------- context from the page */

  function currentSection() {
    var sec = document.querySelector('.section.active');
    if (!sec) return { id: '', title: '' };
    var h1 = sec.querySelector('h1');
    return { id: sec.id.replace(/^sec-/, ''), title: h1 ? h1.textContent.trim() : '' };
  }

  function headingNear(node) {
    while (node && node !== document.body) {
      var p = node.previousElementSibling;
      while (p) {
        if (/^H[23]$/.test(p.tagName)) return p.textContent.trim();
        p = p.previousElementSibling;
      }
      node = node.parentElement;
    }
    return '';
  }

  function systemPrompt() {
    var guide = CFG.guide === 'cks' ? 'CKS (Certified Kubernetes Security Specialist)'
                                   : 'CKA (Certified Kubernetes Administrator)';
    return [
      'You are a tutor for the ' + guide + ' exam. The user is studying from a handbook page and asks you questions from inside it.',
      '',
      'How to answer:',
      '- Be brief. Lead with the answer, then the reason.',
      '- Use short sentences. Use active voice. Give one instruction per sentence.',
      '- Show the exact command or YAML when one exists. Put it in a fenced code block.',
      '- Prefer the imperative kubectl form that is fastest under exam conditions.',
      '- Name the trap when a task has a common one.',
      '- Say plainly when something depends on the Kubernetes version, and name the version you assume.',
      '- Do not invent flags, fields, or file paths. Say so when you are unsure.',
      '- Skip pleasantries and recaps of the question.',
      '',
      'Formatting: plain markdown. Fenced code blocks, inline code, bold, and bullet lists only.'
    ].join('\n');
  }

  /* ------------------------------------------------------------------- UI */

  function buildPanel() {
    panelEl = document.createElement('aside');
    panelEl.className = 'askc-panel';
    panelEl.setAttribute('aria-label', 'Ask Claude');
    panelEl.innerHTML =
      '<header class="askc-head">' +
        '<span class="askc-title">Ask Claude</span>' +
        '<span class="askc-ctx" id="askc-ctx"></span>' +
        '<button type="button" class="askc-ico" id="askc-gear" title="Settings" aria-label="Settings">⚙</button>' +
        '<button type="button" class="askc-ico" id="askc-close" title="Close (Esc)" aria-label="Close">✕</button>' +
      '</header>' +
      '<div class="askc-settings" id="askc-settings" hidden>' +
        '<label class="askc-lbl" for="askc-mode">How to answer</label>' +
        '<select class="askc-in" id="askc-mode">' +
          '<option value="web">Open claude.ai beside this page (your subscription)</option>' +
          '<option value="api">Answer inside this panel (Anthropic API key)</option>' +
        '</select>' +
        '<p class="askc-note">A Claude subscription does not include API access, so the in-panel mode needs a separate API key and is billed per question. Leave this on claude.ai to use the plan you already pay for.</p>' +
        '<label class="askc-lbl" for="askc-key">Anthropic API key <span class="askc-opt">optional</span></label>' +
        '<input class="askc-in" id="askc-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-...">' +
        '<p class="askc-note">Kept in this browser only, in localStorage. It is never sent anywhere except api.anthropic.com. Use a key you can rotate, and clear it on a shared machine.</p>' +
        '<label class="askc-lbl" for="askc-model">Model</label>' +
        '<input class="askc-in" id="askc-model" type="text" spellcheck="false">' +
        '<label class="askc-check"><input type="checkbox" id="askc-hl"> Show the Ask chip when I highlight text</label>' +
        '<div class="askc-srow">' +
          '<button type="button" class="askc-btn ghost" id="askc-forget">Clear key</button>' +
          '<button type="button" class="askc-btn ghost" id="askc-reset">Clear conversation</button>' +
        '</div>' +
      '</div>' +
      '<div class="askc-list" id="askc-list"></div>' +
      '<div class="askc-compose">' +
        '<div class="askc-quote" id="askc-quote" hidden></div>' +
        '<textarea class="askc-ta" id="askc-input" rows="3" placeholder="Ask about this page… (Enter to send, Shift+Enter for a new line)"></textarea>' +
        '<div class="askc-row">' +
          '<button type="button" class="askc-btn" id="askc-send">Send</button>' +
          '<button type="button" class="askc-btn ghost" id="askc-web">Open in claude.ai ↗</button>' +
          '<span class="askc-status" id="askc-status"></span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panelEl);

    listEl = panelEl.querySelector('#askc-list');
    inputEl = panelEl.querySelector('#askc-input');
    settingsEl = panelEl.querySelector('#askc-settings');
    statusEl = panelEl.querySelector('#askc-status');
    sendBtn = panelEl.querySelector('#askc-send');

    panelEl.querySelector('#askc-close').addEventListener('click', closePanel);
    panelEl.querySelector('#askc-gear').addEventListener('click', toggleSettings);
    panelEl.querySelector('#askc-send').addEventListener('click', function () { send(); });
    panelEl.querySelector('#askc-web').addEventListener('click', openInWeb);
    panelEl.querySelector('#askc-forget').addEventListener('click', function () {
      settings.key = ''; saveSettings();
      panelEl.querySelector('#askc-key').value = '';
      setStatus('Key cleared.');
    });
    panelEl.querySelector('#askc-reset').addEventListener('click', function () {
      history = []; listEl.innerHTML = ''; greet(); setStatus('');
    });

    var modeSel = panelEl.querySelector('#askc-mode');
    var keyIn = panelEl.querySelector('#askc-key');
    var modelIn = panelEl.querySelector('#askc-model');
    var hlIn = panelEl.querySelector('#askc-hl');
    modeSel.value = settings.mode;
    keyIn.value = settings.key;
    modelIn.value = settings.model;
    hlIn.checked = !!settings.highlight;
    modeSel.addEventListener('change', function () { settings.mode = modeSel.value; saveSettings(); });
    keyIn.addEventListener('change', function () {
      settings.key = keyIn.value.trim();
      // A pasted key almost always means "answer here" — save the extra click.
      if (settings.key && settings.mode === 'web') {
        settings.mode = 'api';
        modeSel.value = 'api';
        setStatus('Key saved. Answers now appear in this panel.');
      }
      saveSettings();
    });
    modelIn.addEventListener('change', function () {
      settings.model = modelIn.value.trim() || DEFAULTS.model; saveSettings();
    });
    hlIn.addEventListener('change', function () { settings.highlight = hlIn.checked; saveSettings(); });

    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  function buildChip() {
    chipEl = document.createElement('div');
    chipEl.className = 'askc-chip';
    chipEl.hidden = true;
    chipEl.innerHTML =
      '<button type="button" class="askc-chipbtn" data-act="ask">Ask Claude</button>' +
      '<button type="button" class="askc-chipbtn" data-act="explain">Explain</button>';
    document.body.appendChild(chipEl);
    chipEl.addEventListener('mousedown', function (e) { e.preventDefault(); });
    chipEl.addEventListener('click', function (e) {
      var b = e.target.closest('.askc-chipbtn');
      if (!b) return;
      useSelection(b.getAttribute('data-act') === 'explain');
    });
  }

  function injectFab() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'askc-fab';
    btn.title = 'Ask Claude (⌘J)';
    btn.setAttribute('aria-label', 'Ask Claude');
    btn.textContent = '💬';
    btn.addEventListener('click', openPanel);
    document.body.appendChild(btn);
  }

  function openPanel() {
    panelEl.classList.add('open');
    document.body.classList.add('askc-open');
    var c = currentSection();
    panelEl.querySelector('#askc-ctx').textContent = c.title ? 'on: ' + c.title : '';
    setTimeout(function () { inputEl.focus(); }, 60);
  }
  function closePanel() {
    panelEl.classList.remove('open');
    document.body.classList.remove('askc-open');
    hideChip();
  }
  function togglePanel() {
    if (panelEl.classList.contains('open')) closePanel(); else openPanel();
  }
  function toggleSettings() { settingsEl.hidden = !settingsEl.hidden; }
  function setStatus(t) { if (statusEl) statusEl.textContent = t || ''; }

  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'j' || e.key === 'J') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); togglePanel(); return;
      }
      if (e.key === 'Escape' && panelEl.classList.contains('open')) {
        if (!chipEl.hidden) { hideChip(); return; }
        closePanel();
      }
    });
  }

  /* -------------------------------------------------------- highlight chip */

  function bindSelection() {
    document.addEventListener('mouseup', function (e) {
      if (chipEl.contains(e.target)) return;
      setTimeout(maybeShowChip, 10);
    });
    document.addEventListener('scroll', hideChip, true);
    document.addEventListener('mousedown', function (e) {
      if (!chipEl.contains(e.target)) hideChip();
    });
  }

  function maybeShowChip() {
    if (!settings.highlight) return;
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hideChip(); return; }
    var text = sel.toString().trim();
    if (text.length < 2 || text.length > 2000) { hideChip(); return; }
    var range = sel.getRangeAt(0);
    var host = range.commonAncestorContainer;
    if (host.nodeType === 3) host = host.parentElement;
    if (!host || !host.closest('#main .section')) { hideChip(); return; }
    if (host.closest('.askc-panel')) { hideChip(); return; }

    var r = range.getBoundingClientRect();
    if (!r || (!r.width && !r.height)) { hideChip(); return; }
    chipEl.hidden = false;
    var top = r.top - chipEl.offsetHeight - 8;
    if (top < 8) top = r.bottom + 8;
    var left = r.left + (r.width / 2) - (chipEl.offsetWidth / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - chipEl.offsetWidth - 8));
    chipEl.style.top = top + 'px';
    chipEl.style.left = left + 'px';
  }
  function hideChip() { if (chipEl) chipEl.hidden = true; }

  function useSelection(sendNow) {
    var sel = window.getSelection();
    var text = sel ? sel.toString().trim() : '';
    hideChip();
    if (!text) return;
    var node = sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
    if (node && node.nodeType === 3) node = node.parentElement;
    pendingContext = text;
    var q = panelEl.querySelector('#askc-quote');
    q.hidden = false;
    q.innerHTML = '<span class="askc-qlbl">Selected</span>' + esc(text.slice(0, 400)) +
                  (text.length > 400 ? '…' : '') +
                  '<button type="button" class="askc-qx" title="Remove">✕</button>';
    q.querySelector('.askc-qx').onclick = clearQuote;
    openPanel();
    var near = headingNear(node);
    inputEl.value = sendNow
      ? 'Explain this' + (near ? ' (from "' + near + '")' : '') + '. Why does it matter for the CKA exam?'
      : '';
    if (sendNow) send(); else inputEl.focus();
  }
  function clearQuote() {
    pendingContext = '';
    var q = panelEl.querySelector('#askc-quote');
    q.hidden = true; q.innerHTML = '';
  }

  /* ------------------------------------------------------------- messages */

  function greet() {
    addMsg('assistant',
      'Ask anything on this page. Highlight any text and an **Ask Claude** chip appears.\n\n' +
      'Send opens **claude.ai** in a narrow window beside the guide, with the question and the passage ' +
      'already filled in. That uses your Claude subscription, so it costs nothing extra.\n\n' +
      'To get answers inside this panel instead, add an Anthropic API key in ⚙. That is a separate ' +
      'product with its own per-question billing.');
  }

  function addMsg(role, text) {
    var el = document.createElement('div');
    el.className = 'askc-msg askc-' + role;
    el.innerHTML = md(text);
    listEl.appendChild(el);
    listEl.scrollTop = listEl.scrollHeight;
    return el;
  }

  function buildQuestion(text) {
    var c = currentSection();
    var parts = [];
    parts.push('I am reading the "' + c.title + '" page of my CKA handbook.');
    if (pendingContext) {
      parts.push('');
      parts.push('This is the passage I selected:');
      parts.push('"""');
      parts.push(pendingContext);
      parts.push('"""');
    }
    parts.push('');
    parts.push(text);
    return parts.join('\n');
  }

  function send() {
    if (busy) { stop(); return; }
    var text = inputEl.value.trim();
    if (!text) { inputEl.focus(); return; }
    if (settings.mode === 'web' || !settings.key) {
      if (!settings.key && settings.mode === 'api') {
        setStatus('No API key yet — opening claude.ai instead.');
      }
      openInWeb();
      return;
    }
    var question = buildQuestion(text);
    addMsg('user', text);
    inputEl.value = '';
    clearQuote();
    history.push({ role: 'user', text: question });
    stream();
  }

  function openInWeb() {
    var text = inputEl.value.trim();
    if (!text && !pendingContext) { inputEl.focus(); return; }
    var q = buildQuestion(text || 'Explain this passage, and tell me what to remember for the ' +
                                  (CFG.guide === 'cks' ? 'CKS' : 'CKA') + ' exam.');

    // Copy first: if the prefill does not land, the question is ready to paste.
    copyText(q);

    // One narrow window, reused, so it parks beside the guide instead of
    // stacking up tabs. A popup blocker sends us to a plain tab instead.
    var w = Math.min(560, Math.round(window.screen.availWidth * 0.42));
    var feat = 'width=' + w + ',height=' + (window.screen.availHeight - 60) +
               ',left=' + (window.screen.availWidth - w) + ',top=0,noopener';
    var win = window.open(CHAT_URL + encodeURIComponent(q), 'claude-chat', feat);
    if (!win) win = window.open(CHAT_URL + encodeURIComponent(q), 'claude-chat');
    if (win && win.focus) { try { win.focus(); } catch (e) {} }

    addMsg('user', text || 'Explain the selected passage.');
    addMsg('assistant', 'Sent to **claude.ai** in the window beside this one. ' +
                        'The question is also on your clipboard, so you can paste it if the chat opens empty.');
    inputEl.value = '';
    clearQuote();
    setStatus('Opened claude.ai.');
  }

  function copyText(t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t);
        return;
      }
    } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e2) {}
  }

  function stop() {
    if (abortCtl) { try { abortCtl.abort(); } catch (e) {} }
  }

  /* --------------------------------------------------------- Claude API */

  function requestBody(useFallback) {
    var model = settings.model || DEFAULTS.model;
    var body = {
      model: model,
      max_tokens: 8000,
      stream: true,
      system: systemPrompt(),
      messages: history.map(function (m) { return { role: m.role, content: m.text }; })
    };
    // effort is supported on the Opus 5 / Sonnet 5 / Fable tiers; older models reject it.
    if (/^claude-(opus-5|sonnet-5|fable)/.test(model)) {
      body.output_config = { effort: 'medium' };
    }
    // Server-side fallback keeps an answer coming if a safety classifier declines.
    if (useFallback) body.fallbacks = 'default';
    return body;
  }

  function stream() {
    busy = true;
    sendBtn.textContent = 'Stop';
    setStatus('Thinking…');
    var out = addMsg('assistant', '');
    out.classList.add('askc-wait');
    out.textContent = '…';
    run(true, out);
  }

  function run(useFallback, out) {
    abortCtl = new AbortController();
    var headers = {
      'content-type': 'application/json',
      'x-api-key': settings.key,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true'
    };
    if (useFallback) headers['anthropic-beta'] = FALLBACK_BETA;

    fetch(API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody(useFallback)),
      signal: abortCtl.signal
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          // A rejected beta flag should not break the feature — retry once plainly.
          if (res.status === 400 && useFallback && /fallback|beta/i.test(t)) {
            run(false, out);
            return null;
          }
          throw new Error(describeHttp(res.status, t));
        });
      }
      return readStream(res, out);
    }).catch(function (err) {
      if (err && err.name === 'AbortError') { dropDanglingUser(); finish(out, 'Stopped.'); return; }
      fail(out, err);
    });
  }

  function readStream(res, out) {
    var reader = res.body.getReader();
    var dec = new TextDecoder();
    var buf = '';
    var acc = '';
    var first = true;

    function pump() {
      return reader.read().then(function (r) {
        if (r.done) { commit(out, acc); finish(out, ''); return; }
        buf += dec.decode(r.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop();
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('data:') !== 0) continue;
          var payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          var ev;
          try { ev = JSON.parse(payload); } catch (e) { continue; }
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
            if (first) { first = false; out.classList.remove('askc-wait'); setStatus('Writing…'); }
            acc += ev.delta.text;
            out.innerHTML = md(acc);
            listEl.scrollTop = listEl.scrollHeight;
          } else if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason === 'refusal') {
            acc += (acc ? '\n\n' : '') + '_Claude declined this one. Try rewording it._';
          } else if (ev.type === 'error') {
            throw new Error(ev.error && ev.error.message ? ev.error.message : 'Stream error.');
          }
        }
        return pump();
      });
    }
    return pump();
  }

  function commit(out, acc) {
    if (acc) history.push({ role: 'assistant', text: acc });
    else out.innerHTML = md('_Empty response._');
    // Keep the thread short so requests stay cheap and fast.
    if (history.length > 12) history = history.slice(-12);
  }

  // The API needs alternating roles. A failed or stopped turn must not leave
  // a user message with no reply after it, or the next send is rejected.
  function dropDanglingUser() {
    if (history.length && history[history.length - 1].role === 'user') history.pop();
  }

  function finish(out, msg) {
    busy = false;
    abortCtl = null;
    sendBtn.textContent = 'Send';
    out.classList.remove('askc-wait');
    setStatus(msg || '');
  }

  function describeHttp(status, text) {
    var detail = '';
    try {
      var j = JSON.parse(text);
      if (j && j.error && j.error.message) detail = j.error.message;
    } catch (e) {}
    if (status === 401) return 'The API key was rejected (401). Check it in ⚙.';
    if (status === 403) return 'That key is not allowed to call this model (403). ' + detail;
    if (status === 404) return 'Model not found (404). Check the model name in ⚙. ' + detail;
    if (status === 429) return 'Rate limited (429). Wait a moment, then send again.';
    if (status >= 500) return 'Claude API error (' + status + '). Try again shortly.';
    return 'Request failed (' + status + '). ' + detail;
  }

  function fail(out, err) {
    var msg = (err && err.message) ? err.message : String(err);
    var isNetwork = /failed to fetch|networkerror|load failed/i.test(msg);
    var body = isNetwork
      ? 'The request to the Claude API did not go through.\n\n' +
        'Check your network first. A VPN, a corporate proxy, or an ad blocker can block `api.anthropic.com`.\n\n' +
        'If the page runs from a `file://` path and your browser is strict about it, serve the folder over HTTP instead:\n\n' +
        '```bash\npython3 -m http.server 8000\n```\n\n' +
        'Then open `http://localhost:8000/' + CFG.guide + '-study-guide.html`.\n\n' +
        'Or switch to **Open in claude.ai** in ⚙ — that needs no key and no server.'
      : msg;
    dropDanglingUser();
    out.classList.remove('askc-wait');
    out.innerHTML = md(body);
    out.classList.add('askc-err');
    finish(out, 'Failed.');
  }

  /* ------------------------------------------------- tiny markdown render */

  function md(src) {
    var blocks = [];
    var s = esc(src == null ? '' : src);

    s = s.replace(/```([a-z0-9]*)\n([\s\S]*?)```/gi, function (m, lang, code) {
      blocks.push('<pre class="askc-pre">' + (lang ? '<span class="askc-lang">' + lang + '</span>' : '') +
                  '<code>' + code.replace(/\n$/, '') + '</code></pre>');
      return ' B' + (blocks.length - 1) + ' ';
    });

    s = s.replace(/^###\s+(.*)$/gm, '<h4>$1</h4>')
         .replace(/^##\s+(.*)$/gm, '<h3>$1</h3>')
         .replace(/^#\s+(.*)$/gm, '<h3>$1</h3>');
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
                  '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    var lines = s.split('\n');
    var html = '';
    var inList = null;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var ul = ln.match(/^\s*[-*]\s+(.*)$/);
      var ol = ln.match(/^\s*(\d+)\.\s+(.*)$/);
      if (ul) {
        if (inList !== 'ul') { html += closeList(inList) + '<ul>'; inList = 'ul'; }
        html += '<li>' + ul[1] + '</li>';
      } else if (ol) {
        if (inList !== 'ol') { html += closeList(inList) + '<ol>'; inList = 'ol'; }
        html += '<li>' + ol[2] + '</li>';
      } else if (!ln.trim()) {
        html += closeList(inList); inList = null;
      } else if (/^<(h3|h4)>/.test(ln) || /^ B\d+ $/.test(ln.trim())) {
        html += closeList(inList); inList = null;
        html += ln;
      } else {
        if (inList) { html += '<br>' + ln; }
        else html += '<p>' + ln + '</p>';
      }
    }
    html += closeList(inList);
    html = html.replace(/ B(\d+) /g, function (m, i2) { return blocks[+i2]; });
    return html;
  }
  function closeList(kind) { return kind === 'ul' ? '</ul>' : kind === 'ol' ? '</ol>' : ''; }

  /* ---------------------------------------------------------------- styles */

  function injectStyles() {
    var st = document.createElement('style');
    st.textContent =
      '.askc-fab{position:fixed;right:22px;bottom:80px;z-index:900;width:48px;height:48px;border-radius:50%;border:none;background:var(--blue);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;}' +
      '.askc-fab:hover{filter:brightness(1.08);}' +
      '.askc-panel{position:fixed;top:0;right:0;width:420px;max-width:100vw;height:100vh;z-index:950;background:var(--white);border-left:1px solid var(--border);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .18s ease;box-shadow:-8px 0 24px rgba(15,23,42,.10);}' +
      '.askc-panel.open{transform:translateX(0);}' +
      '.askc-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border);background:var(--sb);}' +
      '.askc-title{font-size:14px;font-weight:700;color:#fff;}' +
      '.askc-ctx{flex:1;font-size:11px;color:rgba(255,255,255,.55);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.askc-ico{background:none;border:none;color:rgba(255,255,255,.65);font-size:14px;cursor:pointer;padding:2px 5px;border-radius:5px;}' +
      '.askc-ico:hover{background:rgba(255,255,255,.12);color:#fff;}' +
      '.askc-settings{padding:14px;border-bottom:1px solid var(--border);background:var(--bg);}' +
      '.askc-lbl{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin:10px 0 4px;}' +
      '.askc-lbl:first-child{margin-top:0;}' +
      '.askc-in{width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;background:var(--white);color:var(--text);}' +
      '.askc-opt{font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted);opacity:.75;}' +
      '.askc-note{font-size:11px;color:var(--muted);line-height:1.5;margin:6px 0 0;}' +
      '.askc-check{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--text);margin-top:12px;cursor:pointer;}' +
      '.askc-srow{display:flex;gap:8px;margin-top:12px;}' +
      '.askc-list{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;}' +
      '.askc-msg{font-size:13.5px;line-height:1.65;border-radius:10px;padding:10px 13px;max-width:100%;overflow-wrap:anywhere;}' +
      '.askc-msg p{margin:0 0 8px;}.askc-msg p:last-child{margin-bottom:0;}' +
      '.askc-msg ul,.askc-msg ol{margin:6px 0 8px 20px;}' +
      '.askc-msg li{margin-bottom:3px;}' +
      '.askc-msg h3{font-size:14px;margin:8px 0 5px;}' +
      '.askc-msg h4{font-size:12.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);margin:8px 0 4px;}' +
      '.askc-msg code{background:#eef2f7;color:#0f172a;padding:1px 5px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;}' +
      '.askc-user{background:#eff6ff;border:1px solid #dbeafe;align-self:flex-end;}' +
      '.askc-assistant{background:var(--bg);border:1px solid var(--border);}' +
      '.askc-err{background:#fef2f2;border-color:#fecaca;color:#7f1d1d;}' +
      '.askc-wait{color:var(--muted);font-style:italic;}' +
      '.askc-pre{background:var(--code-bg);border-radius:8px;padding:11px 13px;margin:8px 0;overflow-x:auto;position:relative;}' +
      '.askc-pre code{background:none;color:#e2e8f0;padding:0;font-size:12px;line-height:1.6;white-space:pre;}' +
      '.askc-lang{position:absolute;top:6px;right:10px;font-size:9.5px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.5px;}' +
      '.askc-compose{border-top:1px solid var(--border);padding:11px 14px 14px;background:var(--white);}' +
      '.askc-quote{position:relative;font-size:12px;line-height:1.5;color:var(--muted);background:var(--bg);border-left:3px solid var(--purple);border-radius:0 6px 6px 0;padding:8px 26px 8px 10px;margin-bottom:9px;max-height:88px;overflow:auto;}' +
      '.askc-qlbl{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--purple);margin-bottom:3px;}' +
      '.askc-qx{position:absolute;top:5px;right:5px;border:none;background:none;color:var(--muted);cursor:pointer;font-size:11px;}' +
      '.askc-ta{width:100%;border:1px solid var(--border);border-radius:8px;padding:9px 11px;font-family:inherit;font-size:13.5px;line-height:1.5;resize:vertical;color:var(--text);background:var(--white);}' +
      '.askc-ta:focus,.askc-in:focus{outline:2px solid var(--blue);outline-offset:1px;border-color:var(--blue);}' +
      '.askc-row{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;}' +
      '.askc-btn{padding:7px 14px;border-radius:7px;border:none;background:var(--blue);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;}' +
      '.askc-btn.ghost{background:var(--white);color:var(--text);border:1px solid var(--border);}' +
      '.askc-btn:hover{filter:brightness(1.06);}' +
      '.askc-status{font-size:11.5px;color:var(--muted);}' +
      '.askc-chip[hidden],.askc-settings[hidden],.askc-quote[hidden]{display:none!important;}' +
      '.askc-chip{position:fixed;z-index:940;display:flex;gap:1px;background:var(--sb);border-radius:7px;overflow:hidden;box-shadow:0 3px 10px rgba(15,23,42,.3);}' +
      '.askc-chipbtn{border:none;background:none;color:#fff;font-size:12px;font-weight:600;padding:7px 11px;cursor:pointer;white-space:nowrap;}' +
      '.askc-chipbtn:hover{background:var(--blue);}' +
      '.askc-chipbtn+.askc-chipbtn{border-left:1px solid rgba(255,255,255,.14);}' +
      '@media (max-width:860px){.askc-panel{width:100vw;border-left:none;}.askc-fab{bottom:78px;right:16px;}}' +
      '@media (prefers-reduced-motion:reduce){.askc-panel{transition:none;}}';
    document.head.appendChild(st);
  }
})();
