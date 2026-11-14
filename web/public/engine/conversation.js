(() => {
  "use strict";

  const scenes = {
    cafe: {
      title: "V kaviarni",
      caller: "Baristka",
      avatar: "☕",
      voiceGender: "female",
      goal: "Objednaj si dve kávy a povedz, či ich chceš tu alebo so sebou.",
      opening: "Dobrý deň, vitajte v kaviarni. Čo vám môžem pripraviť?",
      audioUrl: "/audio/scenarios/glide-cafe-opening.mp3",
      branches: [
        [
          "So sebou",
          /\bso sebou\b|\bzabalit\b/,
          "Pripravím vám objednávku so sebou. Prajete si k nej aj niečo malé?",
        ],
        [
          "Na mieste",
          /\bna mieste\b|\btu pri stole\b|\bna stol\b/,
          "Dobre, donesiem vám ju k stolu. Prajete si k tomu vodu?",
        ],
        [
          "Dve kávy",
          /\b(?:dve|2) (?:velke |male )?kavy\b/,
          "Dve kávy. Dáte si ich tu alebo so sebou?",
        ],
        [
          "Upresniť objednávku",
          null,
          "Prepáčte, čo vám mám pripraviť? Pokojne mi objednávku povedzte ešte raz.",
        ],
      ],
      closing: "Ďakujem. Je to všetko, čo si prajete?",
    },
    doctor: {
      title: "Telefonát do ambulancie",
      caller: "Recepcia ambulancie",
      avatar: "📞",
      voiceGender: "female",
      goal: "Spýtaj sa na termín návštevy a dohodni čas, ktorý ti vyhovuje.",
      opening: "Ambulancia, prosím.",
      openingVoices: [
        "/audio/scenarios/glide-ambulancia-leda.mp3",
        "/audio/scenarios/glide-ambulancia-despina.mp3",
      ],
      branches: [
        [
          "Dohodnúť termín",
          /\btermin\w*\b|\bobjednat\w*\b/,
          "Najbližší voľný termín máme v piatok popoludní. Vyhovuje vám?",
        ],
        [
          "Zmeniť termín",
          /\bzmenit\w*\b|\bpresunut\w*\b/,
          "Na ktorý deň chcete návštevu presunúť?",
        ],
        ["Upresniť požiadavku", null, "Môžete mi povedať, kvôli čomu voláte?"],
      ],
      closing: "Rozumiem. Chcete si pred skončením hovoru ešte niečo overiť?",
    },
    shop: {
      title: "V predajni",
      caller: "Predavač",
      avatar: "🛍️",
      voiceGender: "male",
      goal: "Vysvetli, s čím potrebuješ pomôcť pri nákupe alebo reklamácii.",
      opening: "Predajňa, prosím.",
      audioUrl: "/audio/scenarios/glide-shop-opening.mp3",
      branches: [
        [
          "Reklamácia alebo výmena",
          /\breklam\w*\b|\bvymen\w*\b|\bvratit\b/,
          "Rozumiem. Môžete mi opísať, čo sa s výrobkom stalo?",
        ],
        [
          "Hľadanie výrobku",
          /\bhladam\b|\bkde\b|\bmáte\b|\bmate\b/,
          "Môžete mi povedať, aký typ alebo veľkosť hľadáte?",
        ],
        ["Upresniť požiadavku", null, "Môžete mi povedať trochu viac o tom, čo potrebujete?"],
      ],
      closing: "Chcete ešte niečo doplniť, kým to uzavrieme?",
    },
    own: {
      title: "Vlastná situácia",
      caller: "Partner v rozhovore",
      avatar: "💬",
      voiceGender: "male",
      goal: "",
      opening: "Haló, prosím?",
      audioUrl: "/audio/scenarios/glide-own-opening.mp3",
      branches: [
        [
          "Doplniť podrobnosti",
          /\bpotrebujem\b|\bchcel\w*\b|\bprosim\b/,
          "Rozumiem. Čo je pre vás v tejto situácii najdôležitejšie?",
        ],
        [
          "Skúsiť inú možnosť",
          /\binak\b|\bina\b|\biny\b|\binou\b/,
          "Aká iná možnosť by vám vyhovovala?",
        ],
        ["Upresniť povedané", null, "Môžete mi vlastnými slovami upresniť, čo potrebujete?"],
      ],
      closing: "Ďakujem. Ako by sme to mohli uzavrieť?",
    },
  };

  function normalize(text) {
    return String(text || "")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase("sk")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function interpret(sceneId, transcript) {
    const text = normalize(transcript);
    if (!text || /\b(?:nie|nechcem|nepotrebujem|nevyhovuje)\b/.test(text)) return null;
    const found =
      scenes[sceneId]?.branches.flatMap(([, pattern], index) =>
        pattern?.test(text) ? [index] : [],
      ) || [];
    if (sceneId === "cafe" && text === "tu") return 1;
    if (sceneId === "cafe" && found.length === 2 && found.includes(2)) {
      return found.find((index) => index !== 2);
    }
    if (sceneId === "doctor" && found.includes(1)) return 1;
    return found.length === 1 ? found[0] : null;
  }

  let nextDoctorVoice = 0;
  function takeDoctorVoice(voices) {
    const key = "glide_doctor_opening_voice";
    let index = nextDoctorVoice;
    try {
      const stored = localStorage.getItem(key);
      if (stored === "0" || stored === "1") index = Number(stored);
      localStorage.setItem(key, String(1 - index));
    } catch {
      // Keep alternating in this session when browser storage is unavailable.
    }
    nextDoctorVoice = 1 - index;
    return voices[index];
  }

  function create(sceneId, goal) {
    const scene = scenes[sceneId];
    const openingAudio = scene.openingVoices ? takeDoctorVoice(scene.openingVoices) : scene.audioUrl;
    const question = (promptText, audioUrl = null) => ({
      category: "conversation",
      caller: scene.caller,
      avatar: scene.avatar,
      voiceGender: scene.voiceGender,
      promptText,
      audioUrl,
    });
    return {
      sceneId,
      title: scene.title,
      goal,
      waitingForChoice: false,
      tasks: [
        { word: "Začni rozhovor", question: question(scene.opening, openingAudio) },
        { word: "Reaguj vlastnými slovami", question: question(scene.branches.at(-1)[2]) },
        { word: "Ukonči rozhovor", question: question(scene.closing) },
      ].map((task) => ({ ...task, freeReply: true, attempts: 0 })),
    };
  }

  const dialog = document.createElement("div");
  dialog.id = "conversationDialog";
  dialog.className = "conversation-dialog conversation-surface";
  dialog.setAttribute("aria-labelledby", "conversationTitle");
  dialog.innerHTML = `
    <p class="conversation-eyebrow">TVOJ PRIESTOR NA ROZHOVOR</p>
    <h1 id="conversationTitle">Nácvik rozhovoru</h1>
    <p class="conversation-intro">Vyber si situáciu a trénuj vlastným tempom.</p>
    <div class="conversation-mode" role="group" aria-label="Typ rozhovoru">
      <button type="button" id="conversationPracticeMode" aria-pressed="true">Precvičiť v aplikácii</button>
      <button type="button" id="conversationLifeMode" aria-pressed="false">Môj skutočný rozhovor</button>
    </div>
    <p class="conversation-mode-help" id="conversationModeHelp">Aplikácia prehrá repliky a ty odpovedáš vlastnými slovami.</p>
    <form id="conversationForm">
      <span class="conversation-scene-label" id="conversationSceneLabel">Vyber situáciu</span>
      <div id="conversationSceneCards" class="conversation-scene-cards" role="group" aria-labelledby="conversationSceneLabel"></div>
      <select id="conversationScene" data-glide-select="scene-cards" aria-label="Situácia" aria-hidden="true" tabindex="-1" class="conversation-scene-select"></select>
      <label for="conversationGoal">Čo chceš povedať alebo vybaviť?</label>
      <textarea id="conversationGoal" maxlength="140" rows="2" required></textarea>
      <button class="btn-3d green full" id="conversationStart">Začať rozhovor</button>
    </form>
    <button type="button" id="conversationPending" class="conversation-pending" hidden><span>Rozpracovaný rozhovor</span><strong id="conversationPendingTitle"></strong><span>Vrátiť sa k rozhovoru →</span></button>
    <section id="conversationCheckin" hidden>
      <form id="conversationBeforeForm">
        <h3>Pred rozhovorom</h3>
        <fieldset class="conversation-rating" id="conversationBeforeRating"></fieldset>
        <button type="submit" class="btn-3d green full">Uložiť plán</button>
        <button type="button" id="conversationAlreadyDone" class="lesson-quiet-action">Rozhovor už prebehol</button>
      </form>
      <form id="conversationCheckinForm">
        <h3>Po rozhovore</h3>
        <fieldset class="conversation-rating">
          <legend>Podarilo sa ti povedať, čo si chcel/a?</legend>
          <label><input type="radio" name="conversationOutcome" value="yes" required><span>Áno</span></label>
          <label><input type="radio" name="conversationOutcome" value="partly"><span>Čiastočne</span></label>
          <label><input type="radio" name="conversationOutcome" value="no"><span>Ešte nie</span></label>
        </fieldset>
        <fieldset class="conversation-rating">
          <legend>Ako náročný bol rozhovor?</legend>
          <label><input type="radio" name="conversationEffort" value="1" required><span>Zvládnuteľný</span></label>
          <label><input type="radio" name="conversationEffort" value="2"><span>Stredný</span></label>
          <label><input type="radio" name="conversationEffort" value="3"><span>Náročný</span></label>
        </fieldset>
        <fieldset class="conversation-rating" id="conversationAfterRating"></fieldset>
        <fieldset class="conversation-rating">
          <legend>Čo ti pomohlo? (voliteľné)</legend>
          <label><input type="checkbox" name="conversationHelp" value="pause"><span>Krátka pauza</span></label>
          <label><input type="checkbox" name="conversationHelp" value="onset"><span>Jemný začiatok</span></label>
          <label><input type="checkbox" name="conversationHelp" value="practice"><span>Príprava vopred</span></label>
          <label><input type="checkbox" name="conversationHelp" value="pace"><span>Vlastné tempo</span></label>
        </fieldset>
        <button class="btn-3d green full">Uložiť záznam</button>
      </form>
    </section>
    <p id="conversationRecommendation" role="status"></p>
  `;
  document.getElementById("conversationPage").append(dialog);

  const byId = (id) => document.getElementById(id);
  const sceneSelect = byId("conversationScene");
  const goalInput = byId("conversationGoal");
  const status = byId("conversationRecommendation");
  const checkin = byId("conversationCheckin");
  const beforeForm = byId("conversationBeforeForm");
  const afterForm = byId("conversationCheckinForm");
  const practiceMode = byId("conversationPracticeMode");
  const lifeMode = byId("conversationLifeMode");
  let openedFor;
  let pending;
  const key = () =>
    "glide_conversations_v1_" + (window.fluencyAuth?.getCurrentUser()?.id || "guest");
  const draftKey = () => key() + ":plan";
  for (const [id, label] of [
    ["Before", "Ako sa cítiš pred rozhovorom?"],
    ["After", "Ako sa cítiš po rozhovore?"],
  ]) {
    byId(`conversation${id}Rating`).innerHTML = `
      <legend>${label} (voliteľné)</legend>
      <label><input type="radio" name="feeling" value="calm"><span>Pokojne</span></label>
      <label><input type="radio" name="feeling" value="neutral"><span>Neutrálne</span></label>
      <label><input type="radio" name="feeling" value="tense"><span>Napäto</span></label>`;
  }
  const choiceBox = document.createElement("div");
  choiceBox.id = "conversationChoices";
  choiceBox.tabIndex = -1;
  choiceBox.className = "conversation-branches";
  choiceBox.hidden = true;
  byId("drawerContinueBtn").before(choiceBox);

  for (const [id, scene] of Object.entries(scenes)) {
    sceneSelect.add(new Option(scene.title, id));
    const card = document.createElement("button");
    card.type = "button";
    card.className = "conversation-scene-card";
    card.dataset.scene = id;
    card.setAttribute("aria-pressed", "false");
    const icon = document.createElement("span");
    icon.className = "conversation-scene-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = scene.avatar;
    const title = document.createElement("span");
    title.textContent = scene.title;
    card.append(icon, title);
    card.addEventListener("click", () => select(id));
    byId("conversationSceneCards").append(card);
  }
  function records() {
    try {
      const stored = JSON.parse(localStorage.getItem(key()) || "[]");
      return Array.isArray(stored)
        ? stored.filter((entry) => Object.hasOwn(scenes, entry?.sceneId))
        : [];
    } catch {
      return [];
    }
  }
  function recommend(entry) {
    if (entry.outcome !== "yes" || entry.effort >= 2 || entry.sceneId === "own")
      return entry.sceneId;
    const ids = ["cafe", "doctor", "shop"];
    return ids[(ids.indexOf(entry.sceneId) + 1) % ids.length];
  }
  function select(sceneId, goal) {
    sceneSelect.value = sceneId;
    dialog.querySelectorAll(".conversation-scene-card").forEach((card) => card.setAttribute("aria-pressed", String(card.dataset.scene === sceneId)));
    goalInput.value = goal ?? scenes[sceneId].goal;
    goalInput.placeholder = "Napríklad dohodnúť si nový termín";
    window.GlideSelect?.refresh();
  }
  function showMode(life, after = false) {
    byId("conversationModeHelp").textContent = life
      ? "Naplánuj si skutočný rozhovor a po ňom si zaznamenaj svoju skúsenosť."
      : "Aplikácia prehrá repliky a ty odpovedáš vlastnými slovami.";
    practiceMode.setAttribute("aria-pressed", String(!life));
    lifeMode.setAttribute("aria-pressed", String(life));
    checkin.hidden = !life;
    byId("conversationPending").hidden = !pending || life;
    byId("conversationStart").hidden = life;
    beforeForm.hidden = after;
    afterForm.hidden = !after;
    if (life && pending) select(pending.sceneId, pending.goal);
  }

  function selectedSituation() {
    const sceneId = sceneSelect.value;
    const goal = goalInput.value.trim();
    if (openedFor !== key()) {
      status.textContent = "Účet sa zmenil. Otvor rozhovor znova.";
      return null;
    }
    if (!scenes[sceneId] || !goal) {
      status.textContent = "Doplň, čo chceš povedať alebo vybaviť.";
      goalInput.focus();
      return null;
    }
    return { sceneId, goal };
  }

  function open(plan) {
    openedFor = key();
    beforeForm.reset();
    afterForm.reset();
    try {
      pending = JSON.parse(localStorage.getItem(draftKey()));
      if (!scenes[pending?.sceneId] || !pending.goal) pending = null;
    } catch { pending = null; }
    const entries = records();
    const last = entries.at(-1);
    const next = plan?.sceneId || (last ? recommend(last) : "cafe");
    select(next, plan?.goal ?? (last?.sceneId === next ? last.goal : undefined));
    byId("conversationPendingTitle").textContent = pending ? scenes[pending.sceneId].title : "";
    showMode(!!plan, !!plan || !!pending);
    const successes = entries.filter((entry) => entry.outcome === "yes").length;
    status.textContent = last
      ? `Zaznamenané rozhovory: ${entries.length}. Cieľ splnený: ${successes}. Návrh na nácvik: ${scenes[recommend(last)].title}.`
      : "";

  }
  byId("conversationPending").onclick = () => showMode(true, true);
  practiceMode.onclick = () => showMode(false);
  lifeMode.onclick = () => showMode(true, !!pending);
  byId("conversationAlreadyDone").onclick = () => {
    showMode(true, true);
    afterForm.querySelector("button").focus({ preventScroll: true });
  };
  beforeForm.onsubmit = (event) => {
    event.preventDefault();
    const situation = selectedSituation();
    if (!situation) return;
    const draft = { ...situation, beforeFeeling: new FormData(beforeForm).get("feeling") };
    try {
      localStorage.setItem(draftKey(), JSON.stringify(draft));
      pending = draft;
      byId("conversationPendingTitle").textContent = scenes[draft.sceneId].title;
      showMode(true, true);
      status.textContent = "Plán je uložený. Po rozhovore sa môžeš vrátiť k záznamu.";
    } catch {
      status.textContent = "Plán sa nepodarilo uložiť na tomto zariadení.";
    }
  };
  sceneSelect.onchange = () => select(sceneSelect.value);

  byId("conversationForm").onsubmit = (event) => {
    event.preventDefault();
    const situation = selectedSituation();
    if (!situation || !checkin.hidden) return;
    duoLesson.launchSosDrill(create(situation.sceneId, situation.goal));
    byId("startBtn").focus({preventScroll:true});
  };
  byId("conversationCheckinForm").onsubmit = (event) => {
    event.preventDefault();
    const situation = selectedSituation();
    if (!situation) return;
    const form = new FormData(event.currentTarget);
    const entry = {
      ...situation,
      beforeFeeling: pending?.sceneId === situation.sceneId && pending.goal === situation.goal
        ? pending.beforeFeeling : null,
      afterFeeling: form.get("feeling"),
      helpedBy: form.getAll("conversationHelp"),
      outcome: form.get("conversationOutcome"),
      effort: Number(form.get("conversationEffort")),
      date: Date.now(),
    };
    try {
      const entries = [...records(), entry];
      localStorage.setItem(key(), JSON.stringify(entries));
      if (pending?.sceneId === entry.sceneId && pending.goal === entry.goal) {
        localStorage.removeItem(draftKey());
        pending = null;
      }
      beforeForm.reset();
      afterForm.reset();
      showMode(true, !!pending);
      const next = recommend(entry);
      select(next, next === entry.sceneId ? entry.goal : undefined);
      status.textContent = `Záznam uložený. Nabudúce skús: ${scenes[next].title}.`;
    } catch {
      status.textContent = "Záznam sa nepodarilo uložiť na tomto zariadení.";
    }
  };

  byId("navTabRozhovory").addEventListener("click", () => open());

  const recap = document.createElement("button");
  recap.type = "button";
  recap.id = "conversationRecap";
  recap.className = "practice-button";
  recap.textContent = "Zaznamenať rozhovor v živote";
  recap.hidden = true;
  recap.onclick = () => {
    const plan = duoLesson.conversation;
    duoLesson.finishCelebration();
    byId("navTabRozhovory").click();
    open(plan);
    byId("conversationCheckin").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  byId("celebrationSub").after(recap);

  function reset() {
    choiceBox.hidden = true;
    choiceBox.replaceChildren();
    byId("drawerContinueBtn").disabled = false;
    recap.hidden = true;
  }

  function afterAttempt(lesson, result) {
    const plan = lesson.conversation;
    if (!plan || !result.passed) return;
    if (lesson.completedItemsCount === 2 && plan.sceneId === "cafe") {
      const closing = lesson.lessonQueue[0]?.question;
      if (closing && result.conversationChoice === 0)
        closing.promptText = "Zabalím vám objednávku so sebou. Je to všetko?";
      if (closing && result.conversationChoice === 1)
        closing.promptText = "Prinesiem vám objednávku k stolu. Je to všetko?";
    }
    if (lesson.completedItemsCount !== 1) return;
    const scene = scenes[plan.sceneId];
    const next = lesson.lessonQueue[0];
    const continueButton = byId("drawerContinueBtn");
    function apply(index) {
      const branch = scene.branches[index];
      if (!branch || !next) return;
      next.question.promptText = branch[2];
      plan.waitingForChoice = false;
      continueButton.disabled = false;
      choiceBox.hidden = true;
      byId("drawerSubtext").textContent = "Nasleduje doplňujúca otázka.";
    }
    if (Number.isInteger(result.conversationChoice) && scene.branches[result.conversationChoice]) {
      apply(result.conversationChoice);
      return;
    }
    plan.waitingForChoice = true;
    continueButton.disabled = true;
    choiceBox.replaceChildren();
    const prompt = document.createElement("p");
    prompt.textContent = "Ako má rozhovor pokračovať?";
    choiceBox.append(prompt);
    scene.branches.forEach(([label], index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.textContent = label;
      option.onclick = () => apply(index);
      choiceBox.append(option);
    });
    choiceBox.hidden = false;
    choiceBox.focus({preventScroll:true});
  }

  window.GlideConversation = {
    interpret,
    afterAttempt,
    reset,
    showRecap(plan) {
      recap.hidden = !plan;
    },
  };
})();
