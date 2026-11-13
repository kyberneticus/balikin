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

test('finder flow uses camera and gallery without demo shortcuts', () => {
  const html = read('src/index.html');
  const script = read('src/script.js');
  assert.match(html, /id="foundCamera"[^>]*accept="image\/\*"[^>]*capture="environment"/);
  assert.match(html, /id="foundGallery"[^>]*accept="image\/\*"/);
  assert.match(html, /Pilih galeri/);
  assert.doesNotMatch(html, /id="foundDemoBtn"/);
  assert.doesNotMatch(html, /id="demoPhotoSource"/);
  assert.doesNotMatch(html, /id="secretExampleBtn"/);
  assert.doesNotMatch(html, /id="lockerRecommendation"/);
  assert.match(html, /id="detailLocation"/);
  assert.match(script, /function previewFoundPhoto\(/);
  assert.doesNotMatch(script, /function useDemoPhoto\(/);
  assert.doesNotMatch(script, /foundDemoBtn/);
  assert.doesNotMatch(script, /secretExampleBtn/);
  assert.doesNotMatch(script, /lockerRecommendation/);
  // Seeded catalog bottle still uses the photo, so the asset stays.
  assert.match(script, /photo: 'assets\/botol-hijau\.jpg'/);
});

test('locker reservation opens a persistent sheet with countdown and open flow', () => {
  const html = read('src/index.html');
  const script = read('src/script.js');
  const css = read('src/style.css');
  assert.match(script, /pinTtl: 15 \* 60 \* 1000/);
  assert.match(script, /lockerSignal: 3500/);
  assert.match(script, /doorClose: 2500/);
  assert.match(script, /toast: 4000/);
  assert.match(script, /function renderLockerRecommendation\(payload\)/);
  assert.match(script, /function openLockerSignal\(/);
  assert.match(script, /PIN penitipan berlaku 15 menit/);
  assert.match(script, /Buka loker/);
  assert.match(script, /persistent: true/);
  assert.match(script, /PIN kedaluwarsa\. Reservasi loker dilepas\./);
  assert.match(script, /Buat PIN baru/);
  assert.match(script, /Lihat di katalog/);
  assert.match(script, /Date\.now\(\)/);
  assert.doesNotMatch(script, /toast\('Barang masuk ke katalog\.'\)/);
  assert.match(css, /\.locker-sheet/);
  assert.match(css, /\.locker-time/);
  assert.match(css, /tabular-nums/);
  assert.match(css, /z-index: 80/);
  assert.match(css, /\.photo-actions \.button \{ min-width: 0; min-height: 48px/);
  assert.match(html, /Temuin/);
  assert.doesNotMatch(html, />Temukan</);
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
