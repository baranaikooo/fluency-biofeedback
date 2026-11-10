// Material 3 Compact Player Wire-up
(function initM3CompactPlayer() {
  var playerBtn = document.getElementById("m3PlayerActionBtn");
  var playerTitle = document.getElementById("m3PlayerTitle");
  var playerSub = document.getElementById("m3PlayerSub");
  var playerAvatar = document.getElementById("m3PlayerAvatar");

  if (playerBtn) {
    playerBtn.addEventListener("click", function () {
      var continueBtn = document.getElementById("continuePathBtn");
      var startLessonBtn = document.getElementById("startLessonBtn");
      if (continueBtn && continueBtn.offsetParent !== null) {
        continueBtn.click();
      } else if (startLessonBtn && startLessonBtn.offsetParent !== null) {
        startLessonBtn.click();
      } else {
        var navCesta = document.getElementById("navTabCesta");
        if (navCesta) navCesta.click();
      }
    });
  }

  var assistantBtn = document.getElementById("assistantToggle");
  if (assistantBtn) {
    assistantBtn.addEventListener("click", function () {
      setTimeout(function () {
        var isRunning =
          assistantBtn.classList.contains("active") ||
          assistantBtn.textContent.indexOf("Zastaviť") !== -1;
        if (isRunning) {
          if (playerTitle) playerTitle.textContent = "DAF Asistent Beží";
          if (playerSub) playerSub.textContent = "Choral Speech Effect • Slúchadlá pripojené";
          if (playerAvatar) playerAvatar.textContent = "🎧";
        } else {
          if (playerTitle) playerTitle.textContent = "Tréning Plynulosti";
          if (playerSub) playerSub.textContent = "Glide Biofeedback Engine • Pripravený";
          if (playerAvatar) playerAvatar.textContent = "🎙️";
        }
      }, 100);
    });
  }
})();

// Synchronizácia Desktop Sidebaru s Mobilným Bottom Nav
(function initDesktopSidebarSync() {
  const sCesta = document.getElementById("sidebarTabCesta");
  const sDril = document.getElementById("sidebarTabDril");
  const sAsistent = document.getElementById("sidebarTabAsistent");
  const sTelemetria = document.getElementById("sidebarTabTelemetria");
  const sScience = document.getElementById("sidebarScienceBtn");
  const sProfile = document.getElementById("sidebarProfileBtn");

  const nCesta = document.getElementById("navTabCesta");
  const nDril = document.getElementById("navTabDril");
  const nAsistent = document.getElementById("navTabAsistent");
  const nTelemetria = document.getElementById("navTabTelemetria");
  const openScienceBtn = document.getElementById("openScienceModalBtn");
  const headerProfileBtn = document.getElementById("headerProfileBtn");

  if (sCesta && nCesta) sCesta.addEventListener("click", () => nCesta.click());
  if (sDril && nDril) sDril.addEventListener("click", () => nDril.click());
  if (sAsistent && nAsistent) sAsistent.addEventListener("click", () => nAsistent.click());
  if (sTelemetria && nTelemetria) sTelemetria.addEventListener("click", () => nTelemetria.click());
  if (sScience && openScienceBtn) sScience.addEventListener("click", () => openScienceBtn.click());
  if (sProfile && headerProfileBtn)
    sProfile.addEventListener("click", () => headerProfileBtn.click());

  const navItems = [
    { tab: "tabCesta", side: sCesta },
    { tab: "tabDril", side: sDril },
    { tab: "tabAsistent", side: sAsistent },
    { tab: "tabTelemetria", side: sTelemetria },
  ];

  function updateSidebarActive() {
    navItems.forEach((item) => {
      const pane = document.getElementById(item.tab);
      if (pane && pane.classList.contains("active")) {
        if (item.side) item.side.classList.add("active");
      } else {
        if (item.side) item.side.classList.remove("active");
      }
    });
  }

  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.addEventListener("click", () => setTimeout(updateSidebarActive, 50));
  });

  setInterval(() => {
    const hAvatar = document.getElementById("headerAvatarCircle");
    const sAvatar = document.getElementById("sidebarAvatarCircle");
    const hName = document.getElementById("headerProfileName");
    const sName = document.getElementById("sidebarUserName");
    if (hAvatar && sAvatar && hAvatar.textContent) sAvatar.textContent = hAvatar.textContent;
    if (hName && sName && hName.textContent && hName.textContent !== "Profil")
      sName.textContent = hName.textContent;
  }, 1000);
})();

// ==========================================================================
// OVLÁDANIE FIGMA VÝSKUMNÉHO DOTAZNÍKA (KROKY 0 AŽ 5)
// ==========================================================================
(function initFigmaQuestionnaireStepper() {
  let qStep = 0;
  const qModal = document.getElementById("figmaQuestionnaireModal");
  const qAdultCheck = document.getElementById("qAdultCheck");
  const qConsentCheck = document.getElementById("qConsentCheck");
  const qNextBtn = document.getElementById("qNextBtn");
  const qBackBtn = document.getElementById("qBackBtn");
  const qNextBtnText = document.getElementById("qNextBtnText");
  const qCountText = document.getElementById("qCountText");
  const qProgressBar = document.getElementById("qProgressBar");
  const qNoteInput = document.getElementById("qNoteInput");
  const qNoteCount = document.getElementById("qNoteCount");
  const qActionsFooter = document.getElementById("qActionsFooter");
  const qFinishEnterBtn = document.getElementById("qFinishEnterBtn");

  const answers = {};
  const situations = new Set();

  let displayedStep = -1;
  function updateQuestionnaireUI() {
    for (let i = 0; i <= 5; i++) {
      const el = document.getElementById("qStep" + i);
      if (el) el.style.display = i === qStep ? "block" : "none";
    }

    if (qStep === 0) {
      if (qCountText) qCountText.style.display = "none";
      if (qProgressBar) qProgressBar.style.width = "0%";
      if (qBackBtn) qBackBtn.style.visibility = "hidden";
      if (qNextBtnText) qNextBtnText.textContent = "Začať dotazník";
      if (qNextBtn)
        qNextBtn.disabled = !(
          qAdultCheck &&
          qAdultCheck.checked &&
          qConsentCheck &&
          qConsentCheck.checked
        );
      if (qActionsFooter) qActionsFooter.style.display = "flex";
    } else if (qStep >= 1 && qStep <= 3) {
      if (qCountText) {
        qCountText.style.display = "block";
        qCountText.textContent = qStep + " / 3";
      }
      if (qProgressBar) qProgressBar.style.width = (qStep / 4) * 100 + "%";
      if (qBackBtn) qBackBtn.style.visibility = "visible";
      if (qNextBtnText) qNextBtnText.textContent = "Pokračovať";
      if (qActionsFooter) qActionsFooter.style.display = "flex";

      // Overenie, či sú zodpovedané otázky
      let secAnswers = 0;
      const currentStepEl = document.getElementById("qStep" + qStep);
      if (currentStepEl) {
        const scales = currentStepEl.querySelectorAll(".answer-scale");
        scales.forEach((scale) => {
          const qid = scale.dataset.qid;
          if (answers[qid] !== undefined) secAnswers++;
        });
        if (qNextBtn) qNextBtn.disabled = secAnswers < scales.length;
      }
    } else if (qStep === 4) {
      if (qCountText) {
        qCountText.style.display = "block";
        qCountText.textContent = "Kontext";
      }
      if (qProgressBar) qProgressBar.style.width = "90%";
      if (qBackBtn) qBackBtn.style.visibility = "visible";
      if (qNextBtnText) qNextBtnText.textContent = "Zobraziť zhrnutie";
      if (qNextBtn) qNextBtn.disabled = false;
      if (qActionsFooter) qActionsFooter.style.display = "flex";
    } else if (qStep === 5) {
      if (qCountText) qCountText.style.display = "none";
      if (qProgressBar) qProgressBar.style.width = "100%";
      if (qActionsFooter) qActionsFooter.style.display = "none";
      calculateResults();
    }
    const modalCard = document.querySelector(".questionnaire-modal-card");
    if (modalCard && displayedStep !== qStep) modalCard.scrollTop = 0;
    displayedStep = qStep;
  }

  if (qAdultCheck) qAdultCheck.addEventListener("change", updateQuestionnaireUI);
  if (qConsentCheck) qConsentCheck.addEventListener("change", updateQuestionnaireUI);

  document.querySelectorAll('.answer-scale input[type="radio"]').forEach((r) => {
    r.addEventListener("change", () => {
      answers[r.name] = parseInt(r.value, 10);
      updateQuestionnaireUI();
    });
  });

  document.querySelectorAll("#qSituationGrid .situation-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sit = btn.dataset.sit;
      if (situations.has(sit)) {
        situations.delete(sit);
        btn.classList.remove("selected");
        const iconSpan = btn.querySelector("span");
        if (iconSpan) iconSpan.innerHTML = "";
      } else {
        situations.add(sit);
        btn.classList.add("selected");
        const iconSpan = btn.querySelector("span");
        if (iconSpan)
          iconSpan.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12 4 4 8-9" /></svg>';
      }
    });
  });

  if (qNoteInput && qNoteCount) {
    qNoteInput.addEventListener("input", () => {
      qNoteCount.textContent = qNoteInput.value.length + " / 500";
    });
  }

  if (qNextBtn) {
    qNextBtn.addEventListener("click", () => {
      if (qStep < 5) {
        qStep++;
        updateQuestionnaireUI();
      }
    });
  }

  if (qBackBtn) {
    qBackBtn.addEventListener("click", () => {
      if (qStep > 0) {
        qStep--;
        updateQuestionnaireUI();
      }
    });
  }

  function getDesc(avg) {
    if (avg < 1.35) return "nižšia záťaž";
    if (avg < 2.7) return "stredná záťaž";
    return "vyššia záťaž";
  }

  function calculateResults() {
    const q1 = [
      answers["speech-control"] || 0,
      answers["speech-effort"] || 0,
      answers["speech-unpredictable"] || 0,
    ];
    const q2 = [
      answers["feeling-worry"] || 0,
      answers["feeling-avoid"] || 0,
      answers["feeling-after"] || 0,
    ];
    const q3 = [
      answers["impact-work"] || 0,
      answers["impact-social"] || 0,
      answers["impact-tasks"] || 0,
    ];

    const avg1 = (q1[0] + q1[1] + q1[2]) / 3;
    const avg2 = (q2[0] + q2[1] + q2[2]) / 3;
    const avg3 = (q3[0] + q3[1] + q3[2]) / 3;

    const res0 = document.getElementById("domainRes0");
    const res1 = document.getElementById("domainRes1");
    const res2 = document.getElementById("domainRes2");
    const bar0 = document.getElementById("domainBar0");
    const bar1 = document.getElementById("domainBar1");
    const bar2 = document.getElementById("domainBar2");

    if (res0) res0.textContent = getDesc(avg1);
    if (res1) res1.textContent = getDesc(avg2);
    if (res2) res2.textContent = getDesc(avg3);

    if (bar0) bar0.style.width = Math.round((avg1 / 4) * 100) + "%";
    if (bar1) bar1.style.width = Math.round((avg2 / 4) * 100) + "%";
    if (bar2) bar2.style.width = Math.round((avg3 / 4) * 100) + "%";

    const sitWrap = document.getElementById("qResultContext");
    const sitChips = document.getElementById("qResultSituationChips");
    if (sitWrap && sitChips) {
      if (situations.size > 0) {
        sitWrap.style.display = "block";
        sitChips.innerHTML = "";
        situations.forEach((s) => {
          const sp = document.createElement("span");
          sp.className = "sit-pill";
          sp.textContent = s;
          sitChips.appendChild(sp);
        });
      } else {
        sitWrap.style.display = "none";
      }
    }
  }

  // Dokončenie dotazníka a vstup do aplikácie
  if (qFinishEnterBtn) {
    qFinishEnterBtn.addEventListener("click", () => {
      localStorage.setItem("fl_onboarding_completed", "1");
      localStorage.setItem(
        "fl_figma_answers",
        JSON.stringify({
          answers,
          situations: Array.from(situations),
          note: qNoteInput?.value || "",
          completedAt: new Date().toISOString(),
        }),
      );
      const scores = {};
      document.querySelectorAll("[data-profile-score]").forEach((select) => {
        if (select.value) scores[select.dataset.profileScore] = Number(select.value);
      });
      if (Object.keys(scores).length === 5) {
        const situation = situations.has("Objednávanie jedla a nákupy")
          ? "ordering"
          : situations.has("Predstavovanie sa vlastným menom")
            ? "name"
            : situations.has("Práca, porady a prezentácie")
              ? "authorities"
              : "phone";
        window.fluencyAuth.saveTrainingProfile({ ...scores, situation, goal: "easy_onset" });
      }
      if (qModal) qModal.style.display = "none";
      if (typeof duoSfx !== "undefined" && duoSfx.playLevelComplete) {
        duoSfx.playLevelComplete();
      }
      window.askFirstName?.();
    });
  }

  // Export globálnej funkcie na otvorenie dotazníka
  window.openFigmaQuestionnaire = function (reset = false) {
    if (reset) {
      qStep = 0;
      Object.keys(answers).forEach((key) => delete answers[key]);
      situations.clear();
      document
        .querySelectorAll("#figmaQuestionnaireModal input")
        .forEach((input) => (input.checked = false));
      document.querySelectorAll("[data-profile-score]").forEach((select) => (select.value = ""));
      document.querySelectorAll("#qSituationGrid .situation-btn").forEach((button) => {
        button.classList.remove("selected");
        const icon = button.querySelector("span");
        if (icon) icon.textContent = "";
      });
      if (qNoteInput) qNoteInput.value = "";
      if (qNoteCount) qNoteCount.textContent = "0 / 500";
      updateQuestionnaireUI();
    }
    if (qModal) qModal.style.display = "flex";
  };

  updateQuestionnaireUI();
})();
