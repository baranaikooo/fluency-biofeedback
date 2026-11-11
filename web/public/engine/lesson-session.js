/* Local account-scoped checkpoints and optional round breaks for Path lessons. */
(function (root) {
  "use strict";
  const key = () => "glide_path_sessions_v1_" + (root.fluencyAuth?.getCurrentUser()?.id || "guest");
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key()) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  };
  let owner = null;
  function valid(s, level) {
    return (
      s?.version === 1 &&
      s.levelId === level.id &&
      ["short", "full"].includes(s.size) &&
      Array.isArray(s.queue) &&
      s.queue.length <= 64 &&
      s.queue.every(
        (t) =>
          t &&
          typeof t.word === "string" &&
          typeof t.id === "string" &&
          Number.isInteger(t.round) &&
          t.round >= 0 &&
          t.round <= 2,
      ) &&
      Number.isInteger(s.total) &&
      s.total >= 6 &&
      s.total <= 64 &&
      Number.isInteger(s.completed) &&
      s.completed >= 0 &&
      s.completed + s.queue.length === s.total &&
      Number.isInteger(s.attempts) &&
      s.attempts >= 0 &&
      Array.isArray(s.seenRounds) &&
      s.seenRounds.every((r) => r === 1 || r === 2)
    );
  }
  function saved(level, size) {
    const candidates = Object.values(read()).filter(
      (s) => valid(s, level) && (!size || s.size === size),
    );
    return candidates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
  }
  function prepare(level) {
    owner = key();
    const size = document.getElementById("lessonLength")?.value === "short" ? "short" : "full";
    const checkpoint = saved(level, size);
    if (checkpoint) return checkpoint;
    const plan = root.GlideLessonPlan.build(level, size === "short", root.QUESTION_BANK || []);
    return {
      version: 1,
      levelId: level.id,
      size,
      queue: plan.tasks,
      total: plan.tasks.length,
      completed: 0,
      attempts: 0,
      seenRounds: [],
      voiceIntroPlayed: false,
    };
  }
  function save(c) {
    if (!c.isLessonActive || c.isSosDrill || !c.pathSession) return true;
    if (owner !== key()) return false;
    const all = read();
    all[c.currentLevel.id + ":" + c.pathSession.size] = {
      version: 1,
      updatedAt: Date.now(),
      levelId: c.currentLevel.id,
      size: c.pathSession.size,
      queue: c.lessonQueue,
      total: c.initialWordCount,
      completed: c.completedItemsCount,
      attempts: c.totalAttemptsCount,
      seenRounds: c.seenRounds || [],
      voiceIntroPlayed: c.voiceIntroPlayed,
    };
    try {
      localStorage.setItem(key(), JSON.stringify(all));
      return true;
    } catch {
      const status = document.getElementById("statusAlert");
      if (status)
        status.textContent = "Pokrok sa nepodarilo uložiť. Úložisko zariadenia môže byť plné.";
      return false;
    }
  }
  function clear(c) {
    if (owner !== key()) return;
    const all = read();
    delete all[c.currentLevel.id + ":" + c.pathSession.size];
    try {
      localStorage.setItem(key(), JSON.stringify(all));
    } catch {}
  }
  function pause(c) {
    if (!save(c)) {
      if (!confirm("Pokrok sa nepodarilo uložiť. Odísť aj tak?")) return;
    }
    roundDialog.close();
    c.isLessonActive = false;
    root.abortActiveDspSession?.();
    c.exitFocusMode();
  }
  function describe(level) {
    const select = document.getElementById("lessonLength"),
      count = document.getElementById("popoverWordCount"),
      start = document.getElementById("startLessonBtn");
    const size = select.value;
    const s = saved(level, size);
    const total = size === "short" ? 6 : root.GlideLessonPlan.isBoss(level) ? 16 : 12;
    count.textContent =
      s && s.size === size
        ? `${s.completed} / ${s.total} hotovo · uložené`
        : `${total} úloh · 3 kolá`;
    start.querySelector("span").textContent =
      s && s.size === size ? "POKRAČOVAŤ V LEKCII" : "SPUSTIŤ TRÉNING";
  }
  const roundDialog = document.createElement("dialog");
  roundDialog.id = "lessonRoundDialog";
  roundDialog.className = "lesson-round-dialog";
  roundDialog.setAttribute("aria-labelledby", "lessonRoundTitle");
  roundDialog.setAttribute("aria-describedby", "lessonRoundDescription");
  roundDialog.innerHTML =
    '<div class="round-celebration" aria-hidden="true">✦</div><p class="lesson-eyebrow">MALÝ MÍĽNIK</p><h2 id="lessonRoundTitle">Prvé kolo je za tebou</h2><p id="lessonRoundDescription"></p><button class="btn-3d green full" id="lessonRoundContinue" type="button">Ďalšie kolo</button><button class="lesson-quiet-action" id="lessonRoundPause" type="button">Odložiť na neskôr</button>';
  document.body.append(roundDialog);
  const repeat = document.createElement("button");
  repeat.id = "lessonRepeat";
  repeat.type = "button";
  repeat.className = "lesson-quiet-action";
  repeat.textContent = "Zopakovať pre seba (+1 úloha)";
  document.getElementById("drawerContinueBtn")?.insertAdjacentElement("beforebegin", repeat);
  repeat.hidden = true;
  const select = document.createElement("select");
  select.id = "lessonLength";
  select.setAttribute("aria-label", "Dĺžka lekcie");
  select.innerHTML =
    '<option value="full">Celá lekcia · 12 úloh</option><option value="short">Krátka verzia · 6 úloh</option>';
  document
    .getElementById("popoverWordCount")
    ?.parentElement.insertAdjacentElement("afterend", select);
  select.addEventListener("change", () => {
    if (duoLesson.currentLevel) describe(duoLesson.currentLevel);
  });
  const pauseButton = document.createElement("button");
  pauseButton.id = "lessonPause";
  pauseButton.type = "button";
  pauseButton.className = "lesson-quiet-action";
  pauseButton.textContent = "Odložiť lekciu";
  document.querySelector(".lesson-toggles")?.insertAdjacentElement("afterend", pauseButton);
  pauseButton.onclick = () => pause(duoLesson);
  const model = duoLesson;
  document.getElementById("continuePathBtn")?.addEventListener(
    "click",
    (e) => {
      const entries = Object.values(read()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      for (const snapshot of entries) {
        const world = WORLDS_DATA.find((w) => w.levels.some((l) => l.id === snapshot.levelId));
        const level = world?.levels.find((l) => l.id === snapshot.levelId);
        if (level && valid(snapshot, level)) {
          e.stopImmediatePropagation();
          model.openLevelPopover(level, world);
          return;
        }
      }
    },
    true,
  );
  const open = model.openLevelPopover.bind(model);
  model.openLevelPopover = function (...args) {
    open(...args);
    const level = args[0],
      s = saved(level);
    select.options[0].textContent = `Celá lekcia · ${level.isBoss ? 16 : 12} úloh`;
    select.value = s?.size || "full";
    describe(level);
  };
  const next = model.loadNextItem.bind(model);
  model.loadNextItem = function () {
    next();
    if (!this.isSosDrill && this.pathSession && this.isLessonActive) {
      save(this);
      const item = this.currentWordItem;
      const eyebrow = document.querySelector(".lesson-eyebrow");
      if (eyebrow)
        eyebrow.textContent = `${item.round + 1}. KOLO · ${root.GlideLessonPlan.roundNames[item.round].toUpperCase()}`;
      if (pauseButton) pauseButton.hidden = false;
      const stage = document.getElementById("lessonScreen");
      stage.dataset.taskKind = item.kind;
      if (item.freeReply && item.kind === "sentence")
        document.getElementById("targetWord").textContent = item.word;
      repeat.hidden = true;
    } else {
      pauseButton.hidden = true;
      repeat.hidden = true;
      document.getElementById("lessonScreen").removeAttribute("data-task-kind");
      const eyebrow = document.querySelector(".lesson-eyebrow");
      if (eyebrow) eyebrow.textContent = "VLASTNÝM TEMPOM";
    }
  };
  const result = model.handleAttemptResult.bind(model);
  model.handleAttemptResult = function (data) {
    result(data);
    save(this);
    repeat.hidden = this.isSosDrill || !data.passed || this.initialWordCount >= 64;
  };
  const advance = model.handleDrawerContinue.bind(model);
  model.handleDrawerContinue = function () {
    if (!document.getElementById("feedbackDrawer")?.classList.contains("active")) return;
    const current = this.currentWordItem,
      next = this.lessonQueue[0];
    if (
      !this.isSosDrill &&
      this.pathSession &&
      next &&
      current &&
      next.round > current.round &&
      !(this.seenRounds || []).includes(next.round)
    ) {
      document.getElementById("feedbackDrawer").classList.remove("active");
      this.seenRounds.push(next.round);
      const stored = save(this);
      document.getElementById("lessonRoundTitle").textContent =
        next.round === 1 ? "Rozohriatie je za tebou!" : "Hlavná výzva zvládnutá!";
      document.getElementById("lessonRoundDescription").textContent =
        `Ďalej: ${root.GlideLessonPlan.roundNames[next.round].toLowerCase()}. Pokračuj, keď budeš chcieť. ${stored ? "Pokrok je priebežne uložený na tomto zariadení." : "Pokrok sa nepodarilo uložiť. Skús uvoľniť úložisko zariadenia."}`;
      roundDialog.showModal();
      return;
    }
    advance();
  };
  document.getElementById("lessonRoundContinue").onclick = () => {
    roundDialog.close();
    model.loadNextItem();
  };
  document.getElementById("lessonRoundPause").onclick = () => pause(model);
  roundDialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    pause(model);
  });
  repeat.onclick = () => {
    if (repeat.hidden || !model.currentWordItem) return;
    const clone = {
      ...model.currentWordItem,
      id: model.currentWordItem.id + "-repeat-" + crypto.randomUUID(),
      attempts: 0,
    };
    model.lessonQueue.unshift(clone);
    model.initialWordCount++;
    save(model);
    repeat.hidden = true;
    model.updateLessonProgress();
    document.getElementById("drawerSubtext").textContent = "Pridaná jedna dobrovoľná úloha.";
  };
  const exit = model.confirmExitLesson.bind(model);
  model.confirmExitLesson = function () {
    if (!this.isSosDrill && this.pathSession) pause(this);
    else exit();
  };
  root.addEventListener("pagehide", () => save(model));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save(model);
  });
  root.addEventListener("dsp-evaluation-complete", () => save(model));
  // New scenario text uses on-device speech if no bundled recording exists.
  for (const question of root.GlideLessonPlan.questions()) {
    if (!root.QUESTION_BANK.some((q) => q.id === question.id)) root.QUESTION_BANK.push(question);
  }
  root.GlideLessons = { prepare, save, clear, pause, saved };
})(window);
