/* eslint-disable */
const { execSync } = require('child_process');
const path = require('path');

const packages = ['bus', 'router', 'forms', 'http', 'i18n', 'core'];

console.log('Building Vydra packages in order...');

for (const pkg of packages) {
  const pkgPath = path.join(__dirname, '..', 'packages', pkg);
  console.log(`\nBuilding @vydra-js/${pkg}...`);
  try {
    execSync('npm run build', { cwd: pkgPath, stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to build @vydra-js/${pkg}`);
    process.exit(1);
  }
}

console.log('\n✓ All packages built successfully');
