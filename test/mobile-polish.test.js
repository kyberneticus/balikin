const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('mobile polish keeps a deterministic demo logout and shared bottle detail', () => {
  const script = read('src/script.js');
  assert.match(script, /const DEMO_LOGOUT_KEY/);
  assert.match(script, /if \(!storage\.getItem\(DEMO_LOGOUT_KEY\)\) setUser\(\{ nim: '20240001' \}\)/);
  assert.match(script, /const DEMO_ITEM = Object\.freeze/);
  assert.match(script, /general: 'Botol minum hijau dengan tutup hijau'/);
  assert.doesNotMatch(script, /tutup hitam/i);
  assert.match(script, /DEMO_ITEM\.detection/);
});

test('mobile finder and claim markup support the recorded flow', () => {
  const html = read('src/index.html');
  const script = read('src/script.js');
  const css = read('src/style.css');
  assert.match(html, /id="foundChangeBtn"/);
  assert.match(script, /function scrollFinderFieldsIntoView\(/);
  assert.match(script, /claimHold: 1200/);
  assert.match(script, /wireClaimForm\(item, result\.attempt, 'Belum cocok\. Coba lagi\.', answer\)/);
  assert.match(script, /class="scan-sweep"/);
  assert.match(css, /\.scanner-overlay\.is-scanning \.scan-sweep/);
  assert.match(css, /aspect-ratio: 16 \/ 10/);
});

test('admin support is immediately after summary with a dynamic unread count', () => {
  const html = read('src/index.html');
  const script = read('src/script.js');
  assert.ok(html.indexOf('id="adminSummary"') < html.indexOf('id="adminSupportContent"'));
  assert.match(html, /id="adminUnreadCount"/);
  assert.match(script, /\$\('adminUnreadCount'\)\.textContent = unread/);
  assert.doesNotMatch(html, /Jangan pantau semuanya/);
  assert.doesNotMatch(html, /Operator Himatif/);
});
