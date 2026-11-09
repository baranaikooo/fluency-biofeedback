const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoPath = path.resolve(__dirname, '..');
const downloadsDir = 'C:\\Users\\HP\\Downloads';
const zipOutput = path.join(downloadsDir, 'stutter_biofeedback_antigravity.zip');
const stagingBase = path.join(downloadsDir, '_zip_staging');
const tempStaging = path.join(stagingBase, 'stutter_biofeedback_antigravity');

if (fs.existsSync(stagingBase)) {
  fs.rmSync(stagingBase, { recursive: true, force: true });
}
fs.mkdirSync(tempStaging, { recursive: true });

function copyDir(src, dest) {
  const items = fs.readdirSync(src);
  for (const item of items) {
    if (
      item === 'node_modules' ||
      item === '.gradle' ||
      item === 'build' ||
      item === '.vercel' ||
      item.endsWith('.apk') ||
      item.endsWith('.aab') ||
      item.endsWith('.zip')
    ) {
      continue;
    }
    const s = path.join(src, item);
    const d = path.join(dest, item);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

console.log('Staging files for ZIP packaging...');
copyDir(repoPath, tempStaging);

console.log('Compressing to ' + zipOutput + '...');
if (fs.existsSync(zipOutput)) fs.unlinkSync(zipOutput);

const psCmd = `powershell -Command "Compress-Archive -Path '${tempStaging}' -DestinationPath '${zipOutput}' -CompressionLevel Optimal"`;
execSync(psCmd);

const size = fs.statSync(zipOutput).size;
console.log('Archive created in Downloads! Size: ' + (size / 1024 / 1024).toFixed(2) + ' MB (' + size + ' bytes)');

// Cleanup staging
fs.rmSync(stagingBase, { recursive: true, force: true });

// Copy single backup to Google Drive
const gDriveTarget = 'G:\\Môj disk\\stutter_biofeedback_antigravity.zip';
try {
  fs.copyFileSync(zipOutput, gDriveTarget);
  console.log('Synced ZIP to Google Drive: ' + gDriveTarget);
} catch (e) {
  // Google Drive not mounted or unavailable
}
