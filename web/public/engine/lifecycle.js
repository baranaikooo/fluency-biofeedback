/* Keep microphone/camera ownership aligned with the visible training screen. */
(function () {
  // Optional overlays must always have a way back to browsing.
  const dismiss = () => {
    for (const id of ["welcomeAuthOverlay", "figmaQuestionnaireModal"]) {
      const overlay = document.getElementById(id);
      if (overlay) overlay.style.display = "none";
    }
    document.body.style.overflow = "";
  };
  document.getElementById("closeAuthBtn")?.addEventListener("click", dismiss);
  document.getElementById("closeQuestionnaireBtn")?.addEventListener("click", dismiss);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dismiss();
  });
  for (const id of ["welcomeAuthOverlay", "figmaQuestionnaireModal"]) {
    document.getElementById(id)?.addEventListener("click", (event) => {
      if (event.target.id === id) dismiss();
    });
  }

  // The first name is asked once, right after the questionnaire is completed (never on entry).
  window.askFirstName = function () {
    if (localStorage.getItem("fl_custom_name")?.trim()) return;
    if (document.getElementById("firstNameDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "firstNameDialog";
    dialog.className = "first-name-dialog";
    dialog.setAttribute("aria-labelledby", "firstNameTitle");
    const form = document.createElement("form");
    form.innerHTML =
      '<span class="section-kicker">VITAJ V GLIDE</span><h1 id="firstNameTitle">Ako ťa môžem osloviť?</h1><p>Stačí tvoje krstné meno.</p><label for="personalName">Krstné meno</label><input id="personalName" placeholder="Tvoje meno" autocomplete="given-name" maxlength="32" required /><button class="btn-primary" type="submit">Pokračovať</button><button class="first-name-skip" id="firstNameSkipBtn" type="button">Teraz nie</button>';
    const close = () => {
      if (dialog.open) dialog.close();
      dialog.remove();
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("input");
      const name = input.value.trim().split(/\s+/)[0];
      if (!name) {
        input.focus();
        return;
      }
      window.duoState.state.userName = name;
      window.duoState.save();
      window.duoState.renderTelemetry();
      window.fluencyAuth.refreshUI();
      close();
    });
    form.querySelector("#firstNameSkipBtn").addEventListener("click", close);
    dialog.addEventListener("cancel", close);
    dialog.appendChild(form);
    document.body.appendChild(dialog);
    try {
      dialog.showModal();
      form.querySelector("input").focus();
    } catch (_) {
      dialog.setAttribute("open", "");
    }
  };
  // Keep deeper explanations available, without making every screen an essay.
  const researchPoints = document.querySelector('.research-points');
  if (researchPoints) {
    const details = document.createElement('details');
    details.className = 'questionnaire-extra';
    const summary = document.createElement('summary');
    summary.textContent = 'Viac o dotazníku a odpovediach';
    researchPoints.before(details);
    details.append(summary, researchPoints);
  }
  document.querySelectorAll('input[name="sandboxMode"]').forEach((input) => {
    input.addEventListener('change', () => {
      const summary = document.getElementById('drillModeSummary');
      const title = input.closest('label')?.querySelector('.mode-card-title');
      if (summary && input.checked && title) summary.textContent = 'Režim: ' + title.textContent.trim();
    });
  });
  // Optional material stays one tap away, while the primary controls stay near the top.
  for (const [selector, title] of [
    ['.sandbox-input-card .preset-chips', 'Príklady slov a viet'],
    ['.questionnaire-note', 'Doplniť poznámku (nepovinné)'],
    ['#scienceEntryCard', 'Ako funguje tréning'],
    ['#telemetryDiagnosticCard', 'Tréningový profil'],
  ]) {
    const content = document.querySelector(selector);
    if (!content) continue;
    const details = document.createElement('details');
    details.className = 'compact-extra';
    const summary = document.createElement('summary');
    summary.textContent = title;
    content.before(details);
    details.append(summary, content);
  }
  document.querySelectorAll(".tab-pane p").forEach((paragraph) => {
    if (paragraph.textContent.trim().length < 180) return;
    const detail = document.createElement("details");
    detail.className = "quiet-detail";
    const summary = document.createElement("summary");
    summary.textContent = "Viac o tomto cvičení";
    paragraph.before(detail);
    detail.append(summary, paragraph);
  });
  const context = document.getElementById("qStep4");
  if (context) {
    const profile = document.createElement("details");
    profile.className = "motor-profile";
    const summary = document.createElement("summary");
    summary.textContent = "Dobrovoľné prispôsobenie tréningu";
    profile.appendChild(summary);
    const hint = document.createElement("p");
    hint.textContent =
      "Ak chceš odporučenie štartovacieho sveta, vyplň všetkých päť oblastí (1 = vôbec, 5 = veľmi). Je to sebareflexia, nie diagnóza. Profil sa uloží lokálne; po prihlásení je súčasťou synchronizácie.";
    profile.appendChild(hint);
    for (const [key, text] of [
      ["laryngeal", "Ťažký začiatok hlasu pri samohláskach"],
      ["plosives", "Napätie pri P, B, T alebo K"],
      ["prolongation", "Predlžovanie hlások"],
      ["clonic", "Opakovanie hlások alebo slabík"],
      ["social", "Obava z rozprávania s inými ľuďmi"],
    ]) {
      const label = document.createElement("label");
      const span = document.createElement("span");
      span.textContent = text;
      const select = document.createElement("select");
      select.dataset.profileScore = key;
      select.appendChild(new Option("Preskočiť", ""));
      for (let score = 1; score <= 5; score++)
        select.appendChild(new Option(String(score), String(score)));
      label.append(span, select);
      profile.appendChild(label);
    }
    context.insertBefore(profile, context.querySelector(".questionnaire-note").closest('details'));
  }
  const release = () => window.releaseGlideAudio?.();
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.addEventListener("click", release);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) release();
  });
  window.addEventListener("pagehide", release);
  const assistant = document.getElementById("assistantToggle");
  assistant?.addEventListener("click", () => {
    if (!window.dafAssistant.isActive && !window.dafAssistant.starting) release();
  });
  document.getElementById("btnLogout")?.addEventListener("click", release);
  let installation;
  const installButton = document.getElementById("pwaInstallBtn");
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installation = event;
    if (installButton) installButton.style.display = "";
  });
  installButton?.addEventListener("click", async () => {
    if (!installation) return;
    await installation.prompt();
    await installation.userChoice;
    installation = null;
    installButton.style.display = "none";
  });
  window.addEventListener("appinstalled", () => {
    if (installButton) installButton.style.display = "none";
  });

  const renderAudioMode = () => {
    const mode = document.getElementById("tStatDafMode");
    if (mode)
      mode.textContent = window.dafAssistant.isActive
        ? `${window.dafAssistant.delayMs} ms / ${window.dafAssistant.pitchSemitones} st`
        : "Vypnuté";
  };
  document.getElementById("sidebarTabTelemetria")?.addEventListener("click", renderAudioMode);
  document.getElementById("navTabTelemetria")?.addEventListener("click", renderAudioMode);

  if (!localStorage.getItem("fl_diagnostic")) {
    for (const id of [
      "telemetryDiagTension",
      "telemetryDiagWorld",
      "telemetryDiagSituation",
      "telemetryDiagGoal",
    ]) {
      const element = document.getElementById(id);
      if (element) element.textContent = "Zatiaľ bez vyplneného profilu";
    }
    const pill = document.getElementById("diagProfileStatusPill");
    if (pill) pill.textContent = "Nevyplnené";
  }
})();
