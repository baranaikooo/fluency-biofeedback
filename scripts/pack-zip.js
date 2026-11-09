const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoPath = path.resolve(__dirname, '..');
const parentDir = path.dirname(repoPath);
const stagingBase = path.join(parentDir, '_zip_staging');
const tempStaging = path.join(stagingBase, 'stutter_biofeedback_antigravity');
const zipOutput = path.join(parentDir, 'stutter_biofeedback_antigravity.zip');

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
console.log('Archive created successfully! Size: ' + (size / 1024 / 1024).toFixed(2) + ' MB (' + size + ' bytes)');

// Cleanup
fs.rmSync(stagingBase, { recursive: true, force: true });

// Copy to user storage targets if present
const targets = [
  'C:\\Users\\HP\\Downloads\\stutter_biofeedback_antigravity.zip',
  'C:\\Users\\HP\\Downloads\\fluency-biofeedback.zip',
  'G:\\Môj disk\\stutter_biofeedback_antigravity.zip',
  'G:\\Môj disk\\fluency-biofeedback.zip'
];

targets.forEach(t => {
  try {
    fs.copyFileSync(zipOutput, t);
    console.log('Synced ZIP to: ' + t);
  } catch (e) {
    // optional location
  }
});
