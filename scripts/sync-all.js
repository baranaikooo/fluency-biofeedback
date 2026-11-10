const fs = require('fs');
const path = require('path');

const rootDir = 'C:/Users/HP/Downloads/stutter/stutter_biofeedback_antigravity';
const wwwDir = path.join(rootDir, 'www');
const androidPublicDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');

const filesToSync = [
  'index.html',
  'style.css',
  'dsp-core.js',
  'daf-assistant.js',
  'gamification-engine.js',
  'supabase-auth.js',
  'questions-and-voices.js',
  'sw.js',
  'manifest.json',
  'icon.svg',
  'icon-192.png',
  'icon-512.png'
];

function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const targetDirs = [wwwDir, androidPublicDir];

for (const targetDir of targetDirs) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const file of filesToSync) {
    const src = path.join(rootDir, file);
    const dest = path.join(targetDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${file} -> ${path.relative(rootDir, dest)}`);
    } else {
      console.warn(`File ${file} does not exist in root!`);
    }
  }

  // Copy audio directory
  const audioSrc = path.join(rootDir, 'audio');
  const audioDest = path.join(targetDir, 'audio');
  copyFolderRecursive(audioSrc, audioDest);
  console.log(`Copied audio/ -> ${path.relative(rootDir, audioDest)}`);
}

console.log('ALL DIRECTORIES SYNCHRONIZED SUCCESSFULLY!');
