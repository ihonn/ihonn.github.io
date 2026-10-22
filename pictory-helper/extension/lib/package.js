// Shared by the popup and the content script: parses, normalizes and stores
// AstroStarVibes video packages (the JSON block Claude writes from Channel Stats).
(() => {
  const TYPE = 'astrostarvibes.pictory/v1';
  const MAX_PACKAGES = 50;
  const FORMATS = { landscape: '16:9', portrait: '9:16', square: '1:1' };

  function splitParagraphs(text) {
    return text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  function slugify(text) {
    const slug = text
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return slug || 'video';
  }

  // Accepts Claude's whole reply: a ```json fenced block, bare JSON, or a
  // plain script whose blank-line separated paragraphs become scenes.
  function parsePackage(raw) {
    const text = String(raw ?? '').trim();
    if (!text) throw new Error('Nothing to import — paste the JSON block from Claude.');

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fenced ? fenced[1] : text;
    const looksLikeJson = Boolean(fenced) || body.trimStart().startsWith('{') || /"scenes"\s*:/.test(body);
    if (!looksLikeJson) {
      return normalize({ scenes: splitParagraphs(text) });
    }

    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    let data;
    try {
      data = JSON.parse(body.slice(start, end + 1));
    } catch {
      throw new Error('The JSON is incomplete or invalid — copy the whole block from Claude again.');
    }
    return normalize(data);
  }

  function normalize(data) {
    let scenes = (Array.isArray(data.scenes) ? data.scenes : [])
      .map((s) => (typeof s === 'string' ? { text: s } : s || {}))
      .map((s) => ({ text: String(s.text ?? '').trim(), visual: String(s.visual ?? '').trim() }))
      .filter((s) => s.text);
    if (!scenes.length && typeof data.script === 'string') {
      scenes = splitParagraphs(data.script).map((text) => ({ text, visual: '' }));
    }
    if (!scenes.length) throw new Error('The package has no scenes or script.');

    const title = String(data.title ?? '').trim() || scenes[0].text.slice(0, 70);
    const tags = (Array.isArray(data.tags) ? data.tags : String(data.tags ?? '').split(','))
      .map((t) => String(t).trim().replace(/^#/, ''))
      .filter(Boolean);

    return {
      type: TYPE,
      id: String(data.id ?? '').trim() || `${slugify(title)}-${Date.now().toString(36)}`,
      title,
      description: String(data.description ?? '').trim(),
      tags,
      format: data.format in FORMATS ? data.format : 'landscape',
      voice: String(data.voice ?? '').trim(),
      music: String(data.music ?? '').trim(),
      why: String(data.why ?? '').trim(),
      scenes,
      importedAt: Date.now(),
      status: 'ready',
    };
  }

  function estimateSeconds(pkg) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    let words = 0;
    for (const scene of pkg.scenes) {
      for (const part of segmenter.segment(scene.text)) if (part.isWordLike) words += 1;
    }
    return Math.round((words / 150) * 60);
  }

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  const scriptText = (pkg) => pkg.scenes.map((s) => s.text).join('\n\n');
  const tagsText = (pkg) => pkg.tags.join(', ');
  const visualsText = (pkg) =>
    pkg.scenes.map((s, i) => `Scene ${i + 1}: ${s.visual || '(keep Pictory’s pick)'}`).join('\n');

  // Instructions to paste into Claude in Chrome on the Pictory tab.
  function claudePrompt(pkg) {
    const lines = [
      `ช่วยทำวิดีโอใน Pictory (แท็บนี้) ให้ช่อง AstroStarVibes`,
      `บนหน้านี้มีแผง "AstroStarVibes" จาก extension ของฉัน ซึ่งเก็บสคริปต์เรื่อง "${pkg.title}" ไว้แล้ว (${pkg.scenes.length} ฉาก, ${FORMATS[pkg.format]})`,
      ``,
      `1. เริ่มโปรเจกต์ใหม่แบบ Script / Text to Video ใน Pictory`,
      `2. คลิกในช่องใส่สคริปต์ของ Pictory แล้วกดปุ่ม "Fill script" ในแผง AstroStarVibes — ห้ามพิมพ์สคริปต์เอง แล้วตรวจว่าสคริปต์ขึ้นครบทุกฉาก`,
      `3. ทำขั้นตอนปกติของ Pictory ต่อ: สัดส่วนภาพ ${FORMATS[pkg.format]}` +
        (pkg.voice ? `, เสียงพากย์: ${pkg.voice}` : '') +
        (pkg.music ? `, เพลง: ${pkg.music}` : ''),
      `4. ถ้าภาพของฉากไหนไม่เข้ากับเนื้อหา ให้เปลี่ยนโดยค้นด้วยคีย์เวิร์ดนี้:`,
      visualsText(pkg),
      `5. ถามฉันก่อนทุกครั้งที่จะกด generate / render วิดีโอ หรือขั้นตอนที่ใช้นาทีวิดีโอ และก่อนดาวน์โหลด`,
      `ห้ามแก้การตั้งค่าบัญชี แพ็กเกจ หรือการชำระเงิน และทำทีละวิดีโอเท่านั้น`,
    ];
    return lines.join('\n');
  }

  async function loadState() {
    const { packages = [], activeId = null } = await chrome.storage.local.get(['packages', 'activeId']);
    return { packages, active: packages.find((p) => p.id === activeId) || null };
  }

  async function savePackage(pkg) {
    const { packages } = await loadState();
    const rest = packages.filter((p) => p.id !== pkg.id);
    await chrome.storage.local.set({ packages: [pkg, ...rest].slice(0, MAX_PACKAGES), activeId: pkg.id });
  }

  async function updatePackage(id, changes) {
    const { packages } = await loadState();
    await chrome.storage.local.set({ packages: packages.map((p) => (p.id === id ? { ...p, ...changes } : p)) });
  }

  async function setActive(id) {
    await chrome.storage.local.set({ activeId: id });
  }

  async function removePackage(id) {
    const { packages, active } = await loadState();
    const rest = packages.filter((p) => p.id !== id);
    const activeId = active && active.id !== id ? active.id : rest[0]?.id ?? null;
    await chrome.storage.local.set({ packages: rest, activeId });
  }

  globalThis.ASV = {
    TYPE,
    FORMATS,
    parsePackage,
    estimateSeconds,
    formatDuration,
    scriptText,
    tagsText,
    visualsText,
    claudePrompt,
    loadState,
    savePackage,
    updatePackage,
    setActive,
    removePackage,
  };
})();
