/* Android updates use the installed package version, never cached web assets. */
(function () {
  const capacitor = window.Capacitor;
  if (capacitor?.getPlatform?.() !== "android") return;
  const native = capacitor.Plugins?.GlideUpdates;
  if (!native || window.glideUpdates) return;

  let latest = null;
  let inFlight = null;
  let lastCheck = 0;
  let dismissedCode = 0;
  const panel = document.createElement("section");
  panel.id = "appUpdatePanel";
  panel.className = "telemetry-card app-update-panel";
  panel.innerHTML = '<h3>Verzia aplikácie</h3><p id="installedAppVersion"></p><p id="appUpdateStatus" role="status" aria-live="polite">Kontrolujem aktualizácie…</p><button id="checkAppUpdate" type="button" class="btn-3d blue">Skontrolovať aktualizácie</button>';
  document.getElementById("tabTelemetria")?.appendChild(panel);
  const status = panel.querySelector("#appUpdateStatus");
  const checkButton = panel.querySelector("#checkAppUpdate");

  const notice = document.createElement("aside");
  notice.id = "appUpdateNotice";
  notice.className = "app-update-notice";
  notice.hidden = true;
  notice.setAttribute("aria-labelledby", "appUpdateTitle");
  notice.innerHTML = '<strong id="appUpdateTitle">Je dostupná nová verzia Glide</strong><p id="appUpdateVersion" role="status"></p><p id="appUpdateHelp">Stiahni APK a otvor ho. Aktualizáciu potvrdíš v Androide; tvoj postup zostane zachovaný.</p><div class="app-update-actions"><button id="downloadAppUpdate" type="button" class="btn-3d green">Stiahnuť aktualizáciu</button><button id="dismissAppUpdate" type="button" class="btn-3d">Neskôr</button></div>';
  document.body.appendChild(notice);
  const downloadButton = notice.querySelector("#downloadAppUpdate");
  const help = notice.querySelector("#appUpdateHelp");

  function showNotice() {
    notice.querySelector("#appUpdateVersion").textContent = `Verzia ${latest.versionName}`;
    notice.hidden = false;
  }

  async function check(manual = false) {
    if (inFlight) return inFlight;
    if (!manual && Date.now() - lastCheck < 15000) return;
    lastCheck = Date.now();
    checkButton.disabled = true;
    inFlight = (async () => {
      try {
        const current = await native.getVersion();
        panel.querySelector("#installedAppVersion").textContent = `Nainštalovaná verzia: ${current.versionName}`;
        const result = await native.checkForUpdate();
        // Recheck the native response before showing any remote text or URL.
        if (result.available && Number.isSafeInteger(result.versionCode) &&
            result.versionCode > Number(current.versionCode) &&
            /^https:\/\/github\.com\/baranaikooo\/glide\/releases\/download\/v1\.0\.\d+\/glide-native\.apk$/.test(result.downloadUrl)) {
          latest = result;
          status.textContent = `Dostupná aktualizácia ${result.versionName}.`;
          if (manual || dismissedCode !== result.versionCode) showNotice();
        } else {
          latest = null;
          notice.hidden = true;
          status.textContent = "Máš najnovšiu verziu aplikácie.";
        }
      } catch (_) {
        // Offline use and release-server outages must never block training.
        status.textContent = "Aktualizáciu teraz nemožno skontrolovať. Skús to s pripojením na internet.";
      } finally {
        checkButton.disabled = false;
        inFlight = null;
      }
    })();
    return inFlight;
  }

  downloadButton.addEventListener("click", async () => {
    if (!latest) return;
    downloadButton.disabled = true;
    try {
      // Release active microphone sessions before leaving for the download.
      window.releaseGlideAudio?.();
      await native.downloadUpdate({ url: latest.downloadUrl });
      help.textContent = "Stiahnutie sa otvorilo v prehliadači. Po stiahnutí otvor APK a potvrď aktualizáciu.";
    } catch (_) {
      help.textContent = "Stiahnutie sa nepodarilo otvoriť. Skús tlačidlo znova.";
    } finally {
      downloadButton.disabled = false;
    }
  });
  notice.querySelector("#dismissAppUpdate").addEventListener("click", () => {
    dismissedCode = latest?.versionCode || 0;
    notice.hidden = true;
  });
  checkButton.addEventListener("click", () => check(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void check();
  });
  window.addEventListener("online", () => check(true));
  native.addListener("resume", () => check());
  window.glideUpdates = { check };
  void check();
})();
