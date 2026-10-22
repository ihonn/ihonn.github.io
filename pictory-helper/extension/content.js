// Floating AstroStarVibes panel on app.pictory.ai. It shows the active package
// and fills its script into Pictory's script box. It only touches the page when
// you (or Claude in Chrome) press one of its buttons: it never clicks Pictory's
// own buttons, never calls Pictory's servers and never runs a queue on its own.
(() => {
  if (window.top !== window || document.getElementById('asv-pictory-helper')) return;

  const CSS = `
    :host { all: initial; }
    .panel {
      position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
      width: 300px; max-height: 72vh; overflow: auto; box-sizing: border-box;
      background: #141a33; color: #eef0ff; border: 1px solid #343d6b; border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
      font: 13px/1.45 -apple-system, system-ui, "Segoe UI", sans-serif;
    }
    .panel.left { right: auto; left: 16px; }
    header { display: flex; align-items: center; gap: 4px; padding: 8px 10px; border-bottom: 1px solid #2a3260; }
    .brand { flex: 1; font-weight: 600; color: #f5c96b; }
    .panel.collapsed header { border-bottom: 0; }
    .panel.collapsed .body { display: none; }
    .body { padding: 10px; }
    h2 { margin: 0 0 2px; font-size: 14px; line-height: 1.35; color: #fff; }
    p { margin: 0 0 8px; }
    .meta, .target, .hint { color: #b7bce0; font-size: 12px; }
    button {
      font: inherit; color: #eef0ff; background: #262e58; border: 1px solid #3b4580;
      border-radius: 8px; padding: 6px 8px; cursor: pointer;
    }
    button:hover { background: #303a6e; }
    button:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid #f5c96b; outline-offset: 1px; }
    header button { padding: 2px 8px; background: transparent; border-color: transparent; }
    .primary { width: 100%; margin: 2px 0 8px; padding: 9px; font-weight: 600; background: #f5c96b; color: #1b1f3b; border-color: #f5c96b; }
    .primary:hover { background: #ffd987; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; gap: 6px; }
    .link { background: transparent; border-color: transparent; color: #c9b3ff; padding: 2px 0; text-decoration: underline; }
    .link:hover { background: transparent; color: #e2d6ff; }
    select, textarea {
      width: 100%; box-sizing: border-box; font: inherit; color: #eef0ff; background: #0d1226;
      border: 1px solid #3b4580; border-radius: 8px; padding: 6px; margin-bottom: 8px;
    }
    textarea { min-height: 90px; resize: vertical; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; }
    .import[hidden] { display: none; }
    .msg { min-height: 1em; margin: 6px 0 0; color: #9ee6b4; }
    .msg.error { color: #ff9c9c; }
    .chip { display: inline-block; padding: 0 6px; border-radius: 6px; background: #2c355f; color: #f5c96b; }
  `;

  const host = document.createElement('div');
  host.id = 'asv-pictory-helper';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>${CSS}</style>
    <section class="panel" role="region" aria-label="AstroStarVibes panel">
      <header>
        <span class="brand">✦ AstroStarVibes</span>
        <button data-act="side" aria-label="Move panel to the other side" title="Move to the other side">⇄</button>
        <button data-act="collapse" aria-label="Collapse or expand panel" title="Collapse / expand">–</button>
      </header>
      <div class="body">
        <div class="pkg"></div>
        <div class="import" hidden>
          <textarea aria-label="Package JSON" placeholder="Paste the JSON block Claude wrote from Channel Stats"></textarea>
          <button data-act="import">Import package</button>
        </div>
        <p class="msg" role="status" aria-live="polite"></p>
      </div>
    </section>`;

  const panel = root.querySelector('.panel');
  const pkgBox = root.querySelector('.pkg');
  const importBox = root.querySelector('.import');
  const importText = importBox.querySelector('textarea');
  const msg = root.querySelector('.msg');

  let state = { packages: [], active: null };
  let picking = false;
  let picked = null;
  let lastEditable = null;

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  function say(text, isError = false) {
    msg.textContent = text;
    msg.classList.toggle('error', isError);
  }

  // --- Finding Pictory's script box -------------------------------------

  function editableRoot(node) {
    if (node && !(node instanceof Element)) node = node.parentElement;
    if (!node || node === host || root.contains(node)) return null;
    if (node.matches('textarea, input[type="text"], input:not([type])')) return node;
    if (!node.isContentEditable) return null;
    while (node.parentElement && node.parentElement.isContentEditable) node = node.parentElement;
    return node;
  }

  const area = (el) => {
    const r = el.getBoundingClientRect();
    return r.width * r.height;
  };
  const usable = (el) =>
    el.isConnected && !el.disabled && !el.readOnly && area(el) > 0 && getComputedStyle(el).visibility !== 'hidden';

  // Priority: the box you picked, then the last box you clicked into, then the
  // biggest visible text box on the page.
  function findScriptBox() {
    for (const el of [picked, lastEditable]) if (el && usable(el)) return el;
    const candidates = [...document.querySelectorAll('textarea, [contenteditable]')]
      .map(editableRoot)
      .filter((el) => el && el.tagName !== 'INPUT' && usable(el));
    return candidates.sort((a, b) => area(b) - area(a))[0] || null;
  }

  function targetLabel() {
    if (picked && usable(picked)) return 'picked';
    if (lastEditable && usable(lastEditable)) return 'the box you clicked last';
    return 'auto (largest text box)';
  }

  function flash(el) {
    const old = el.style.outline;
    el.style.outline = '3px solid #f5c96b';
    setTimeout(() => (el.style.outline = old), 1500);
  }

  document.addEventListener(
    'focusin',
    (e) => {
      const el = editableRoot(e.composedPath()[0]);
      if (el && el.tagName !== 'INPUT') lastEditable = el;
    },
    true,
  );

  document.addEventListener(
    'click',
    (e) => {
      if (!picking) return;
      const el = editableRoot(e.composedPath()[0]);
      if (!el) return;
      picking = false;
      picked = el;
      flash(el);
      say('Script box picked.');
      render();
    },
    true,
  );

  document.addEventListener('keydown', (e) => {
    if (picking && e.key === 'Escape') {
      picking = false;
      say('Picking cancelled.');
    }
  });

  // --- Filling and copying ----------------------------------------------

  function selectContents(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Replaces the box's content with `text`. Rich editors get a synthetic paste
  // first (most handle it, keeping line breaks), then insertText as a fallback.
  async function insertInto(el, text) {
    el.scrollIntoView({ block: 'center' });
    el.focus({ preventScroll: true });

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return norm(el.value) === norm(text);
    }

    const flat = norm(text);
    const head = flat.slice(0, 60);
    const tail = flat.slice(-60);
    const filled = () => {
      const now = norm(el.innerText);
      return now.includes(head) && now.includes(tail);
    };

    selectContents(el);
    await wait(50);
    const data = new DataTransfer();
    data.setData('text/plain', text);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    await wait(250);
    if (filled()) return true;

    selectContents(el);
    await wait(50);
    document.execCommand('insertText', false, text);
    await wait(250);
    return filled();
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  }

  async function fill() {
    const pkg = state.active;
    const text = ASV.scriptText(pkg);
    const el = findScriptBox();
    if (!el) {
      await copy(text);
      say("No script box found — script copied. Click in Pictory's script box and press Ctrl+V (⌘V on Mac).", true);
      return;
    }
    flash(el);
    if (await insertInto(el, text)) {
      say(`Script filled (${pkg.scenes.length} scenes). Check it in Pictory before you continue.`);
      await ASV.updatePackage(pkg.id, { status: 'filled' });
    } else {
      await copy(text);
      say("Couldn't fill this box automatically — script copied. Click in the box and press Ctrl+V (⌘V on Mac).", true);
    }
  }

  const copies = {
    'copy-script': ['Script', ASV.scriptText],
    'copy-title': ['Title', (p) => p.title],
    'copy-description': ['Description', (p) => p.description],
    'copy-tags': ['Tags', ASV.tagsText],
    'copy-visuals': ['Visual keywords', ASV.visualsText],
    'copy-prompt': ['Claude in Chrome prompt', ASV.claudePrompt],
  };

  // --- Rendering ----------------------------------------------------------

  function render() {
    const pkg = state.active;
    if (!pkg) {
      pkgBox.innerHTML = `<p class="hint">No package yet. Ask Claude (with Channel Stats) for the next AstroStarVibes video, then paste its JSON block here.</p>`;
      importBox.hidden = false;
      return;
    }

    const options =
      state.packages.length > 1
        ? `<select data-act="choose" aria-label="Choose package">${state.packages
            .map((p) => `<option value="${escapeHtml(p.id)}"${p.id === pkg.id ? ' selected' : ''}>${escapeHtml(p.title)}</option>`)
            .join('')}</select>`
        : '';
    const duration = ASV.formatDuration(ASV.estimateSeconds(pkg));

    pkgBox.innerHTML = `
      ${options}
      <h2>${escapeHtml(pkg.title)}</h2>
      <p class="meta">${pkg.scenes.length} scenes · ~${duration} · ${ASV.FORMATS[pkg.format]} · <span class="chip">${escapeHtml(pkg.status)}</span></p>
      <p class="target">Script box: <b>${targetLabel()}</b> · <button class="link" data-act="pick">Pick box</button></p>
      <button class="primary" data-act="fill">Fill script</button>
      <div class="grid">
        <button data-act="copy-script">Copy script</button>
        <button data-act="copy-title">Copy title</button>
        <button data-act="copy-description">Copy description</button>
        <button data-act="copy-tags">Copy tags</button>
        <button data-act="copy-visuals">Copy visuals</button>
        <button data-act="copy-prompt">Copy Claude prompt</button>
      </div>
      <div class="row">
        <button class="link" data-act="toggle-import">Import another</button>
        <button class="link" data-act="done">Mark done</button>
      </div>`;
  }

  async function refresh() {
    state = await ASV.loadState();
    render();
  }

  async function applyLayout() {
    const { panelSide = 'right', panelCollapsed = false } = await chrome.storage.local.get(['panelSide', 'panelCollapsed']);
    panel.classList.toggle('left', panelSide === 'left');
    panel.classList.toggle('collapsed', panelCollapsed);
  }

  root.addEventListener('click', async (e) => {
    const button = e.target.closest('button[data-act]');
    if (!button) return;
    const act = button.dataset.act;
    try {
      if (act === 'side') {
        await chrome.storage.local.set({ panelSide: panel.classList.contains('left') ? 'right' : 'left' });
      } else if (act === 'collapse') {
        await chrome.storage.local.set({ panelCollapsed: !panel.classList.contains('collapsed') });
      } else if (act === 'import') {
        const pkg = ASV.parsePackage(importText.value);
        await ASV.savePackage(pkg);
        importText.value = '';
        importBox.hidden = true;
        say(`Imported “${pkg.title}”.`);
      } else if (act === 'toggle-import') {
        importBox.hidden = !importBox.hidden;
        if (!importBox.hidden) importText.focus();
      } else if (act === 'pick') {
        picking = true;
        say("Click inside Pictory's script box… (Esc to cancel)");
      } else if (act === 'fill') {
        await fill();
      } else if (act === 'done') {
        await ASV.updatePackage(state.active.id, { status: 'done' });
        say('Marked as done.');
      } else if (act in copies) {
        const [label, build] = copies[act];
        const text = build(state.active);
        if (!text) say(`${label} is empty in this package.`, true);
        else if (await copy(text)) say(`${label} copied.`);
        else say(`Couldn't copy ${label.toLowerCase()}.`, true);
      }
    } catch (err) {
      say(err.message, true);
    }
  });

  root.addEventListener('change', async (e) => {
    if (e.target.matches('select[data-act="choose"]')) {
      picked = null;
      await ASV.setActive(e.target.value);
      say('');
    }
  });

  // Keep typing, pasting and clicking inside the panel away from Pictory's
  // shortcuts and click-outside handlers (which could close an open dialog).
  const contained = ['keydown', 'keyup', 'keypress', 'paste', 'copy', 'cut', 'input'];
  contained.push('pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click');
  for (const type of contained) {
    root.addEventListener(type, (e) => e.stopPropagation());
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.panelSide || changes.panelCollapsed) applyLayout();
    if (changes.packages || changes.activeId) refresh();
  });

  document.documentElement.appendChild(host);
  // Pictory is a single-page app; put the panel back if a re-render drops it.
  setInterval(() => {
    if (!host.isConnected) document.documentElement.appendChild(host);
  }, 2000);

  applyLayout();
  refresh();
})();
