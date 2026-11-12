const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

for (const file of ['index.html', 'src/index.html']) {
  test(`${file} includes the admin monitoring view`, () => {
    const html = read(file);
    assert.match(html, /id="adminView"/);
    assert.match(html, /id="adminSummary"/);
    assert.match(html, /id="adminLockerList"/);
  });
}

for (const file of ['index.html', 'src/script.js']) {
  test(`${file} contains the hardcoded admin login and dashboard renderer`, () => {
    const source = read(file);
    assert.match(source, /ADMIN_USERNAME\s*=\s*["']admin["']/);
    assert.match(source, /ADMIN_PASSWORD\s*=\s*["']admin123["']/);
    assert.match(source, /function renderAdminDashboard\(/);
  });
}
