// Reproduce .brand-soundwave: three pill bars, 3.5px wide, gap 3px,
// heights 12/22/15px, using the actual app theme's purple and cream.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(root, 'web/package.json'))('@playwright/test');
const theme = fs.readFileSync(path.join(root, 'web/src/glide/theme.css'), 'utf8');
const purple = theme.match(/--purple-bright:\s*(#[0-9a-f]+)/i)[1];
const background = theme.match(/--bg:\s*(#[0-9a-f]+)/i)[1];
const bars = [
  { x: 124, y: 160, height: 192 },
  { x: 228, y: 80, height: 352 },
  { x: 332, y: 136, height: 240 },
];
function svg({ foreground = false, radius = 0 } = {}) {
  const view = foreground ? 768 : 512;
  const offset = foreground ? 128 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${view}" height="${view}" viewBox="0 0 ${view} ${view}"><title>Glide – fialová zvuková vlna</title>${foreground ? '' : `<rect width="512" height="512" rx="${radius}" fill="${background}"/>`}${bars.map(bar => `<rect x="${bar.x + offset}" y="${bar.y + offset}" width="56" height="${bar.height}" rx="28" fill="${purple}"/>`).join('')}</svg>\n`;
}
function write(relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
async function png(page, markup, size, target) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${markup}`);
  await page.screenshot({ path: path.join(root, target), omitBackground: true });
}
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    for (const folder of ['', 'www', 'web/public']) {
      write(path.join(folder, 'icon.svg'), svg());
      for (const size of [192, 512]) await png(page, svg(), size, path.join(folder, `icon-${size}.png`));
    }
    await png(page, svg(), 64, 'web/public/favicon.png');
    for (const [density, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
      const folder = `android/app/src/main/res/mipmap-${density}`;
      await png(page, svg({ radius: 112 }), size, `${folder}/ic_launcher.png`);
      await png(page, svg({ radius: 256 }), size, `${folder}/ic_launcher_round.png`);
      await png(page, svg({ foreground: true }), size * 2.25, `${folder}/ic_launcher_foreground.png`);
    }
  } finally {
    await browser.close();
  }
  write('android/app/src/main/res/values/ic_launcher_background.xml', `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">${background}</color></resources>\n`);
  write('android/app/src/main/res/drawable/ic_launcher_background.xml', `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="${background}" android:pathData="M0,0h108v108h-108z"/></vector>\n`);
  const foreground = `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="768" android:viewportHeight="768">\n${bars.map(bar => `  <path android:fillColor="@android:color/transparent" android:strokeColor="${purple}" android:strokeWidth="56" android:strokeLineCap="round" android:pathData="M${bar.x + 156},${bar.y + 156}L${bar.x + 156},${bar.y + bar.height + 100}"/>`).join('\n')}\n</vector>\n`;
  write('android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml', foreground);
  for (const api of [26, 33]) {
    const adaptive = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/ic_launcher_background"/>\n  <foreground android:drawable="@drawable/ic_launcher_foreground"/>\n${api === 33 ? '  <monochrome android:drawable="@drawable/ic_launcher_foreground"/>\n' : ''}</adaptive-icon>\n`;
    for (const name of ['ic_launcher', 'ic_launcher_round']) write(`android/app/src/main/res/mipmap-anydpi-v${api}/${name}.xml`, adaptive);
  }
  console.log(`Generated Glide icons from the app logo (${purple} on ${background}).`);
})().catch(error => { console.error(error); process.exitCode = 1; });
