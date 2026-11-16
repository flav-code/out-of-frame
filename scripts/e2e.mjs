// End-to-end check in a real Chrome, and the timings quoted in the README.
// Usage: node scripts/e2e.mjs   (set CHROME to your Chrome or Chromium binary if it isn't the macOS default,
// and EXT to test another unpacked copy, such as the unzipped store package)
// Drives a throwaway headless Chrome with its own profile over the DevTools pipe; your own Chrome is untouched.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';

const EXT = path.resolve(process.env.EXT || path.join(import.meta.dirname, '..'));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'out-of-frame-e2e-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every test page records whether precover.css was already black when its first script ran,
// when the cover appeared (page clock), and whether it came back from the back/forward cache.
const page = (url) => `<!doctype html><html><head><script>
window.__pre = getComputedStyle(document.documentElement, '::after').backgroundColor;
window.__cover = null;
const seen = () => { if (__cover === null && document.querySelector('out-of-frame-cover')) __cover = performance.now(); };
seen();
new MutationObserver(seen).observe(document.documentElement, { childList: true });
addEventListener('pageshow', (e) => { window.__persisted = e.persisted; });
</script><title>Secret ${url}</title></head>
<body style="margin:0;background:#fff;font:40px sans-serif"><h1>Secret content ${url}</h1></body></html>`;
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(page(req.url));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const host = base.slice('http://'.length);

const chrome = spawn(CHROME, [
  '--headless', '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=800,600', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
let stderr = '';
chrome.stderr.on('data', (d) => (stderr += d));

let nextId = 0;
const pending = new Map();
let buf = '';
chrome.stdio[4].setEncoding('utf8');
chrome.stdio[4].on('data', (d) => {
  buf += d;
  for (let i; (i = buf.indexOf('\0')) >= 0; buf = buf.slice(i + 1)) {
    const msg = JSON.parse(buf.slice(0, i));
    const p = pending.get(msg.id);
    if (!p) continue;
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result);
  }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject, method });
  chrome.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }) + '\0');
});
const evaluate = async (sessionId, expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
  return result.value;
};
const openTab = async (url) => {
  const { targetId } = await send('Target.createTarget', { url });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await sleep(600);
  return sessionId;
};
let extId;
const worker = async (notTargetId) => {
  for (let i = 0; i < 60; i++) {
    const { targetInfos } = await send('Target.getTargets');
    const sw = targetInfos.find((t) => t.type === 'service_worker' && t.url === `chrome-extension://${extId}/background.js` && t.targetId !== notTargetId);
    if (sw) return { targetId: sw.targetId, session: (await send('Target.attachToTarget', { targetId: sw.targetId, flatten: true })).sessionId };
    await sleep(100);
  }
  throw new Error('extension service worker not found');
};
const state = (s) => evaluate(s, `({
  covered: !!document.querySelector('out-of-frame-cover')?.matches(':popover-open'),
  count: document.querySelectorAll('out-of-frame-cover').length,
  title: document.title,
})`);
// Colour of one screen pixel, read from a 1x1 PNG screenshot (any PNG filter leaves a lone pixel unchanged).
const pixel = async (s, x = 100, y = 450) => {
  await send('Page.bringToFront', {}, s);
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: 1, height: 1, scale: 1 } }, s);
  const png = Buffer.from(data, 'base64');
  const idat = [];
  for (let o = 8; o < png.length;) {
    const len = png.readUInt32BE(o);
    if (png.toString('ascii', o + 4, o + 8) === 'IDAT') idat.push(png.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const [r, g, b] = zlib.inflateSync(Buffer.concat(idat)).subarray(1, 4);
  return r < 10 && g < 10 && b < 10 ? 'black' : r > 245 && g > 245 && b > 245 ? 'white' : `rgb(${r},${g},${b})`;
};
const step = (name) => console.log('✔', name);
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return `median ${s[Math.floor(s.length / 2)]} ms, max ${s.at(-1)} ms`;
};

try {
  const early = await openTab(`${base}/admin`);
  assert.equal(await pixel(early), 'white');

  ({ id: extId } = await send('Extensions.loadUnpacked', { path: EXT }));
  let sw = await worker();
  await sleep(800);
  const setMode = (on) => evaluate(sw.session, `chrome.storage.local.set({ enabled: ${on} })`);
  const masked = await evaluate(sw.session, `chrome.i18n.getMessage('maskedTitle')`);
  console.log(`  Chrome UI language: ${await evaluate(sw.session, 'chrome.i18n.getUILanguage()')}, masked title: ${masked}`);
  assert.ok(masked.startsWith('🔒'));
  const { targetInfos } = await send('Target.getTargets');
  assert.ok(targetInfos.some((t) => t.url === `chrome-extension://${extId}/options.html`));
  step('installed, options page opened');

  const [W, H] = await evaluate(early, '[innerWidth, innerHeight]');
  assert.equal((await state(early)).covered, false);
  await evaluate(sw.session, `chrome.storage.local.set({ rules: '${host}/admin' }).then(toggle)`);
  await sleep(300);
  assert.deepEqual(await state(early), { covered: true, count: 1, title: masked });
  for (const [x, y] of [[100, 450], [W / 2, H / 2], [5, 5], [W - 5, H - 5]]) assert.equal(await pixel(early, x, y), 'black', `${x},${y}`);
  assert.equal(await evaluate(sw.session, 'chrome.action.getBadgeText({})'), 'ON');
  step('toggle on: tab opened before install is entirely black (no text by default), title masked, badge ON');

  await evaluate(sw.session, `chrome.storage.local.set({ message: '█████████' })`);
  await sleep(200);
  assert.notEqual(await pixel(early, W / 2, H / 2), 'black');
  await evaluate(sw.session, `chrome.storage.local.set({ message: '' })`);
  await sleep(200);
  assert.equal(await pixel(early, W / 2, H / 2), 'black');
  step('optional text shows on the black screen, and goes away when emptied');

  await evaluate(early, `history.pushState({}, '', '/public')`);
  await sleep(200);
  assert.deepEqual(await state(early), { covered: false, count: 0, title: 'Secret /admin' });
  assert.equal(await pixel(early), 'white');
  await evaluate(early, `history.pushState({}, '', '/admin/users')`);
  await sleep(200);
  assert.equal((await state(early)).covered, true);
  step('SPA navigation out of and back into a hidden path');

  await evaluate(early, `document.title = 'Re: client invoice'`);
  await sleep(100);
  assert.equal((await state(early)).title, masked);
  await evaluate(early, `document.querySelector('out-of-frame-cover').remove()`);
  await sleep(100);
  assert.equal((await state(early)).covered, true);
  step('page cannot change the title or remove the cover');

  await evaluate(early, `(() => {
    const d = document.createElement('dialog');
    d.style.cssText = 'width:95vw;height:95vh;max-width:none;max-height:none;background:red';
    document.body.append(d);
    d.showModal();
  })()`);
  await sleep(300);
  assert.equal(await pixel(early), 'black');
  await evaluate(early, `(() => {
    const p = document.createElement('div');
    p.popover = 'manual';
    p.style.cssText = 'inset:0;width:100vw;height:100vh;background:blue';
    document.body.append(p);
    p.showPopover();
  })()`);
  await sleep(300);
  assert.equal(await pixel(early), 'black');
  step('cover stays above a modal dialog and a popover opened afterwards');

  await evaluate(sw.session, 'toggle()');
  await sleep(300);
  assert.equal((await state(early)).covered, false);
  assert.equal(await evaluate(sw.session, 'chrome.action.getBadgeText({})'), '');
  step('toggle off: uncovered, badge cleared');

  await setMode(true);
  await sleep(300);
  const fresh = await openTab(`${base}/admin/settings`);
  assert.deepEqual(await state(fresh), { covered: true, count: 1, title: masked });
  assert.equal(await evaluate(fresh, 'window.__pre'), 'rgb(0, 0, 0)');
  assert.equal(await pixel(fresh), 'black');
  const other = await openTab(`${base}/blog`);
  assert.equal((await state(other)).covered, false);
  assert.equal(await evaluate(other, `getComputedStyle(document.documentElement, '::after').content`), 'none');
  assert.equal(await pixel(other), 'white');
  step('pages loaded while on: listed page black before its first script ran, other page released and untouched');

  await setMode(false);
  const bf = await openTab(`${base}/admin/bf`);
  await evaluate(bf, `location.href = '${base}/blog/bf'`);
  await sleep(600);
  await setMode(true);
  await sleep(200);
  await evaluate(bf, 'history.back()');
  await sleep(600);
  const back = await evaluate(bf, '({ path: location.pathname, persisted: window.__persisted })');
  assert.equal(back.path, '/admin/bf');
  assert.equal((await state(bf)).covered, true);
  assert.equal(await pixel(bf), 'black');
  step(`turned on while away, then Back ${back.persisted ? '(restored from back/forward cache)' : '(page reloaded)'}: black`);

  await setMode(false);
  const fz = await openTab(`${base}/admin/frozen`);
  await openTab(`${base}/blog/front`);
  await send('Page.setWebLifecycleState', { state: 'frozen' }, fz);
  await sleep(200);
  const frozenTitle = (await send('Target.getTargets')).targetInfos.find((t) => t.url.endsWith('/admin/frozen')).title;
  assert.equal(frozenTitle, masked);
  await setMode(true);
  await sleep(200);
  await send('Page.setWebLifecycleState', { state: 'active' }, fz);
  await sleep(300);
  assert.equal((await state(fz)).covered, true);
  await setMode(false);
  await send('Page.setWebLifecycleState', { state: 'frozen' }, fz);
  await send('Page.setWebLifecycleState', { state: 'active' }, fz);
  await sleep(300);
  assert.deepEqual(await state(fz), { covered: false, count: 0, title: 'Secret /admin/frozen' });
  step('tab frozen by Chrome: masked while asleep, black if turned on meanwhile, normal again if not');

  await setMode(true);
  const again = await send('Extensions.loadUnpacked', { path: EXT });
  assert.equal(again.id, extId);
  await sleep(1500);
  sw = await worker(sw.targetId);
  await sleep(800);
  assert.deepEqual(await state(fresh), { covered: true, count: 1, title: masked });
  await setMode(false);
  await sleep(300);
  assert.deepEqual(await state(fresh), { covered: false, count: 0, title: 'Secret /admin/settings' });
  assert.equal(await pixel(fresh), 'white');
  step('after an extension reload: one cover, and it still obeys the toggle');

  const opts = await openTab(`chrome-extension://${extId}/options.html`);
  const ui = await evaluate(opts, `({
    label: document.querySelector('[data-i18n=rulesLabel]').textContent,
    expected: chrome.i18n.getMessage('rulesLabel'),
    shortcut: document.getElementById('shortcut').textContent,
    rules: document.getElementById('rules').value,
    message: document.getElementById('message').value,
  })`);
  assert.equal(ui.label, ui.expected);
  assert.ok(ui.shortcut);
  assert.equal(ui.rules, `${host}/admin`);
  assert.equal(ui.message, '');
  await evaluate(opts, `(() => { const t = document.getElementById('message'); t.value = 'Not today'; t.dispatchEvent(new Event('input')); })()`);
  await sleep(200);
  assert.equal(await evaluate(sw.session, `chrome.storage.local.get('message').then((s) => s.message)`), 'Not today');
  step(`options page translated ("${ui.label}"), shortcut shown (${ui.shortcut}), fields load and save`);

  // ── Timings ──
  await evaluate(sw.session, `chrome.storage.local.set({ enabled: true, message: '' })`);
  const m = await openTab(`${base}/blog/measure`);
  const loads = [];
  for (let i = 0; i < 30; i++) {
    await send('Page.navigate', { url: `${base}/admin/load?${i}` }, m);
    await sleep(400);
    loads.push(await evaluate(m, `({ pre: window.__pre, cover: window.__cover, paint: performance.getEntriesByName('first-paint')[0]?.startTime ?? null })`));
  }
  const black = loads.filter((l) => l.pre === 'rgb(0, 0, 0)').length;
  const before = loads.filter((l) => l.cover !== null && l.paint !== null && l.cover <= l.paint).length;
  console.log(`  page load (30 runs): page already black when its first script ran in ${black}/30; top-layer cover in place before the first paint in ${before}/30`);
  console.log(`    cover ready after: ${stats(loads.map((l) => Math.round(l.cover)))} | first paint after: ${stats(loads.map((l) => Math.round(l.paint ?? -1)))}`);
  assert.equal(black, 30);

  await send('Page.navigate', { url: `${base}/admin/toggle` }, m);
  await sleep(400);
  const toggles = [];
  for (let i = 0; i < 30; i++) {
    await setMode(false);
    await sleep(100);
    await evaluate(m, `window.__a = null; window.__f = null; window.__o?.disconnect();
      window.__o = new MutationObserver(() => {
        if (window.__a === null && document.querySelector('out-of-frame-cover')) {
          window.__a = Date.now();
          requestAnimationFrame(() => { window.__f = Date.now(); });
        }
      });
      window.__o.observe(document.documentElement, { childList: true }); true`);
    const t0 = await evaluate(sw.session, `(async () => { const t = Date.now(); await chrome.storage.local.set({ enabled: true }); return t; })()`);
    await sleep(150);
    const { a, f } = await evaluate(m, '({ a: window.__a, f: window.__f })');
    toggles.push({ dom: a - t0, frame: f - t0 });
  }
  console.log(`  toggle on (30 runs): cover in the page after ${stats(toggles.map((x) => x.dom))}; next frame after ${stats(toggles.map((x) => x.frame))}`);
  console.log('ALL GOOD');
} catch (e) {
  console.error('FAILED:', e.message);
  console.error(stderr.split('\n').filter((l) => /ERROR|extension/i.test(l) && !/CVDisplayLink/.test(l)).slice(-15).join('\n'));
  process.exitCode = 1;
} finally {
  const exited = new Promise((r) => chrome.once('exit', r));
  chrome.kill();
  await exited;
  server.close();
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}
