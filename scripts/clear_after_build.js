const fs = require('fs/promises');
const path = require('path');
const packageJson = require('../package.json');

const removedFiles = [
  'builder-debug.yml',
  'builder-effective-config.yaml',
  'win-ia32-unpacked',
  'win-unpacked',
  'linux-unpacked',
  'latest-linux.yml',
  `RUM-${packageJson.version}.exe.blockmap`,
  `RUM-${packageJson.version}.dmg.blockmap`,
];

(async () => {
  for (const file of removedFiles) {
    try {
      await fs.unlink(path.join(__dirname, `../release/${file}`));
    } catch (err) {}
  }
})();
