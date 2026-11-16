const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULTS, isHidden } = require('../shared.js');

const rules = ['mail.google.com', 'dashboard.stripe.com', 'monsite.com/admin', 'localhost:3000', '*secret*'].join('\n');

test('a domain covers itself and its subdomains, not look-alikes', () => {
  assert.ok(isHidden('https://mail.google.com/mail/u/0/#inbox', rules));
  assert.ok(isHidden('https://dashboard.stripe.com/payments', rules));
  assert.ok(isHidden('https://eu.dashboard.stripe.com/', rules));
  assert.ok(!isHidden('https://stripe.com/', rules));
  assert.ok(!isHidden('https://notmail.google.com/', rules));
  assert.ok(!isHidden('https://www.google.com/', rules));
});

test('a path covers everything under it only', () => {
  assert.ok(isHidden('https://monsite.com/admin', rules));
  assert.ok(isHidden('https://www.monsite.com/admin/users?id=1', rules));
  assert.ok(!isHidden('https://monsite.com/', rules));
  assert.ok(!isHidden('https://monsite.com/blog/admin', rules));
  assert.ok(isHidden('https://monsite.com/#/admin/users', 'monsite.com/#/admin'));
});

test('ports, wildcards, every site, pasted URLs, blank lines', () => {
  assert.ok(isHidden('http://localhost:3000/', rules));
  assert.ok(!isHidden('http://localhost:8080/', rules));
  assert.ok(isHidden('https://x.com/my-secret-page', rules));
  assert.ok(isHidden('https://anything.org/', '*'));
  assert.ok(isHidden('https://Mail.Google.com/', '  https://mail.google.com/  '));
  assert.ok(!isHidden('https://anything.org/', '\n  \n'));
  assert.ok(!isHidden('not a url', '*'));
});

test('defaults: off, Gmail and Stripe listed, plain black screen', () => {
  assert.ok(isHidden('https://mail.google.com/', DEFAULTS.rules));
  assert.ok(isHidden('https://dashboard.stripe.com/', DEFAULTS.rules));
  assert.equal(DEFAULTS.enabled, false);
  assert.equal(DEFAULTS.message, '');
});

const root = path.join(__dirname, '..');
const messages = (lang) => JSON.parse(fs.readFileSync(path.join(root, '_locales', lang, 'messages.json'), 'utf8'));

test('every language has exactly the English messages', () => {
  const english = Object.keys(messages('en')).sort();
  for (const lang of fs.readdirSync(path.join(root, '_locales'))) {
    assert.deepEqual(Object.keys(messages(lang)).sort(), english, lang);
  }
});

test('every message the code asks for exists', () => {
  const source = ['manifest.json', 'background.js', 'content.js', 'options.html', 'options.js']
    .map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  const used = [...source.matchAll(/__MSG_(\w+)__|data-i18n="(\w+)"|getMessage\(([^)]*)\)/g)]
    .flatMap((m) => m[1] || m[2] || [...m[3].matchAll(/'(\w+)'/g)].map((k) => k[1]));
  assert.ok(used.length > 10);
  for (const key of used) assert.ok(key in messages('en'), key);
});
