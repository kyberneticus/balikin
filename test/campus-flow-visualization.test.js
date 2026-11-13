const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('student prototype keeps four primary service tabs', () => {
  const html = read('src/index.html');
  for (const id of ['tab-temukan', 'tab-cari', 'tab-lokasi', 'tab-bantuan']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /Hubungi admin/);
  assert.doesNotMatch(html, /Kondisi khusus/);
  assert.doesNotMatch(html, /exceptionGrid/);
});

test('finder flow has camera, gallery, and a deterministic demo photo path', () => {
  const html = read('src/index.html');
  const script = read('src/script.js');
  assert.match(html, /id="foundCamera"[^>]*accept="image\/\*"[^>]*capture="environment"/);
  assert.match(html, /id="foundGallery"[^>]*accept="image\/\*"/);
  assert.match(html, /id="foundDemoBtn"/);
  assert.match(html, /assets\/botol-hijau\.jpg/);
  assert.match(html, /id="detailLocation"/);
  assert.match(script, /function previewFoundPhoto\(/);
  assert.match(script, /function useDemoPhoto\(/);
});

test('finder exposes scan, simulated assistance, and private-detail helper', () => {
  const html = read('src/index.html');
  const script = read('src/script.js');
  for (const id of ['foundAiProgress', 'foundAiTitle', 'foundAiPercent', 'foundAiBar', 'foundAiHint']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /BANTUAN AI · SIMULASI/);
  assert.match(script, /Stiker nama di bagian bawah/);
  assert.match(script, /Tutup hijau/);
  assert.match(script, /const DEMO_TIMING/);
  assert.match(script, /function startFoundAiSimulation\(/);
  assert.match(script, /function applyFoundAiSuggestions\(/);
  assert.match(script, /setFinderStep\(1\)/);
});

test('claim and simulated backend seam cover the demo lifecycle', () => {
  const html = read('src/index.html');
  const script = read('src/script.js');
  assert.match(script, /Sebutkan ciri khusus yang tidak terlihat di katalog/);
  assert.match(script, /Isi jawaban demo/);
  for (const marker of ['submitFound', 'searchItems', 'submitClaim', 'confirmPickup', 'sendSupportMessage', 'listSupportThreads', 'replySupport']) {
    assert.match(script, new RegExp(`async ${marker}\\(`));
  }
  assert.match(script, /PIN penitipan berlaku 15 menit/);
  assert.match(script, /Simulasi pencocokan/);
  assert.match(script, /id="claimCameraBtn"/);
  assert.match(script, /function previewClaimPhoto\(/);
  assert.match(script, /function prepareImage\(/);
  assert.match(script, /uploadBytes: 12 \* 1024 \* 1024/);
  assert.match(script, /storageBytes: 2 \* 1024 \* 1024/);
  assert.match(script, /window\.localStorage/);
  assert.match(script, /balikin-(?:demo-)?items-v1/);
  assert.match(script, /class="item-details"/);
  assert.match(script, /score: match \? 94 : 38/);
});

test('student prototype restores the fixed four-item mobile menu', () => {
  const html = read('src/index.html');
  assert.match(html, /id="mobileNav"/);
  for (const tab of ['temukan', 'cari', 'lokasi', 'bantuan']) {
    assert.match(html, new RegExp(`mobile-nav-item[^>]*data-tab="${tab}"`));
  }
});

test('support chat replaces exceptions in student and admin views', () => {
  const html = read('src/index.html');
  const script = read('src/script.js');
  for (const id of ['supportThread', 'supportMessage', 'supportSend', 'adminSupportContent']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(script, /balikin-support-v1/);
  assert.match(script, /function renderAdminDashboard\(/);
  assert.match(script, /function renderAdminSupport\(/);
  assert.match(script, /Klaim perlu review/);
});
