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

test('visualization models campus locations, exceptions, and admin queues', () => {
  const script = read('src/script.js');
  for (const marker of ['renderLocations', 'renderExceptions', 'renderLockerRecommendation', 'renderAdminDashboard']) {
    assert.match(script, new RegExp(`function ${marker}\\(`));
  }
  assert.match(script, /PIN penitipan berlaku 15 menit/);
  assert.match(script, /Klaim perlu review/);
});
