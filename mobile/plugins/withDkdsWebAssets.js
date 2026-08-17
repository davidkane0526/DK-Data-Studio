const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withDkdsWebAssets(config) {
  return withDangerousMod(config, [
    'android',
    async mod => {
      const projectRoot = mod.modRequest.projectRoot;
      const source = path.join(projectRoot, 'assets', 'web');
      const target = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets', 'dkds');

      if (!fs.existsSync(source)) {
        throw new Error(`Prepared web assets are missing: ${source}. Run npm run sync:web first.`);
      }

      fs.rmSync(target, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.cpSync(source, target, { recursive: true });
      console.log(`[withDkdsWebAssets] copied ${source} -> ${target}`);
      return mod;
    },
  ]);
};
