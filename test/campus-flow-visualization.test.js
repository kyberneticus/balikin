const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('student prototype visualizes each primary service flow', () => {
  const html = read('src/index.html');
  for (const id of ['tab-temukan', 'tab-cari', 'tab-lokasi', 'tab-bantuan']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /FISIP, FTI, dan Masjid/);
  assert.match(html, /Kondisi khusus/);
});

test('finder flow uses a real camera input and manual location detail', () => {
  const html = read('src/index.html');
  const script = read('src/script.js');
  assert.match(html, /id="foundCamera"[^>]*accept="image\/\*"[^>]*capture="environment"/);
  assert.match(html, /id="foundGallery"[^>]*accept="image\/\*"/);
  assert.match(html, /id="foundGalleryBtn"/);
  assert.match(html, /id="detailLocation"/);
  assert.doesNotMatch(html, /Simulasikan deteksi kartu identitas/);
  assert.match(script, /function previewFoundPhoto\(/);
});

test('student prototype restores the fixed mobile flow menu', () => {
  const html = read('src/index.html');
  assert.match(html, /id="mobileNav"/);
  for (const tab of ['temukan', 'cari', 'lokasi', 'bantuan']) {
    assert.match(html, new RegExp(`mobile-nav-item[^>]*data-tab="${tab}"`));
  }
});

test('visualization models campus locations, exceptions, and admin queues', () => {
  const script = read('src/script.js');
  for (const marker of ['renderLocations', 'renderExceptions', 'renderLockerRecommendation', 'renderAdminDashboard']) {
    assert.match(script, new RegExp(`function ${marker}\\(`));
  }
  assert.match(script, /PIN penitipan berlaku 15 menit/);
  assert.match(script, /Klaim perlu review/);
});
