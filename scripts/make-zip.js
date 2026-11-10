const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = 'C:/Users/HP/Downloads/stutter/stutter_biofeedback_antigravity';
const zipName = 'Glide_App_Komplet.zip';
const desktopPath = 'C:/Users/HP/Desktop/' + zipName;
const downloadsPath = 'C:/Users/HP/Downloads/' + zipName;
const rootZipPath = path.join(rootDir, zipName);

console.log('Archiving project...');
const exclude = ['node_modules', '.git', 'extracted_dizajn', zipName];
const items = fs.readdirSync(rootDir).filter(f => !exclude.includes(f));

const itemsList = items.map(f => `'${path.join(rootDir, f)}'`).join(',');
const psCommand = `Compress-Archive -Path ${itemsList} -DestinationPath '${rootZipPath}' -Force`;

execSync(`powershell.exe -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });

if (fs.existsSync(rootZipPath)) {
  fs.copyFileSync(rootZipPath, desktopPath);
  fs.copyFileSync(rootZipPath, downloadsPath);
  console.log('Successfully created and distributed:', zipName);
  console.log('Desktop size:', fs.statSync(desktopPath).size, 'bytes');
  console.log('Downloads size:', fs.statSync(downloadsPath).size, 'bytes');
}
