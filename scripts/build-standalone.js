const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('src/index.html');
const css = read('src/style.css');
const script = read('src/script.js');

const output = html
  .replace('<link rel="stylesheet" href="style.css" />', `<style>\n${css}\n</style>`)
  .replace('<script src="script.js" defer></script>', `<script>\n${script}\n</script>`)
  .replaceAll('assets/', 'src/assets/');

fs.writeFileSync(path.join(root, 'index.html'), output);
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'index.html'), output);
