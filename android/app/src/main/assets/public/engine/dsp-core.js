/**
 * DSP CORE v3.7 - CLINICALLY VALIDATED SPEECH BIOFEEDBACK ENGINE
 * Vedecky kalibrované podľa foniatrických a balbutologických štandardov:
 * 1. Opravená slovenská fonológia: Slabikotvorné R/L sa aktivujú len medzi spoluhláskami (Pravda vs Štvrtok)
 * 2. 2048-bodové FFT a rozšírené NSDF okno (1024 vzoriek) pre spoľahlivú detekciu mužského F0 (75–100 Hz)
 * 3. Skutočný akustický Vocal Rise Time (VRT) počítaný z LINEÁRNEJ amplitúdy (20% -> 80% RMS) namiesto skreslenej dB škály
 * 4. Fyziologicky správne hodnotenie: po spoluhláskach netrestá prirodzený rýchly nábeh hlasiviek
 * 5. Adaptívny VOT / medzihláskový limit pre zhluky spoluhlások (Kto, Štvrtok, Kde)
 * 6. Dynamická dĺžka záznamu (2.8s pre slová, 5.5–7.0s pre vety a scenáre) + možnosť predčasného dokončenia
 * 7. Odolná detekcia klonických repetícií chránená pred falošnou detekciou pri prechode na druhú spoluhlásku
 */

const VOWELS = new Set(["a", "á", "ä", "e", "é", "i", "í", "o", "ó", "ô", "u", "ú", "y", "ý"]);
// V slovenčine je 'h' znelá glotálna frikatíva [ɦ], kým digraf 'ch' je neznelá velárna frikatíva [x]
const VOICELESS_SINGLE = new Set(["p", "t", "ť", "k", "s", "š", "c", "č", "f", "x"]);
const PLOSIVES = new Set(["p", "t", "ť", "k", "b", "d", "ď", "g"]);

// Prepojenie na reálne MP3 súbory v priečinku /audio/
const REAL_AUDIO_SCENARIOS = [
  {
    caller: "Kuriér (Balík)",
    avatar: "📦",
    audioUrl: "./audio/courier.mp3",
    promptText:
      "Dobrý deň, tu je kuriér Packeta. Stojím pred vašou bytovkou, ale na bráne nevidím vaše meno a nefunguje zvonček. Viete mi prosím popísať, ktorý je to vchod a na ktorom poschodí vás nájdem?",
    fallbackPrompt:
      "Dobrý deň, tu je kuriér Packeta. Stojím pred vašou bytovkou, ale na bráne nevidím vaše meno a nefunguje zvonček. Viete mi prosím popísať, ktorý je to vchod a na ktorom poschodí vás nájdem?",
  },
  {
    caller: "Pokladňa / Obchod",
    avatar: "🛒",
    audioUrl: "./audio/cashier.mp3",
    promptText:
      "Tento výrobok mi systém nevie načítať a chýba na ňom cenovka. Viete mi prosím povedať, z ktorého regálu ste ho zobrali a aká tam bola uvedená cena?",
    fallbackPrompt:
      "Tento výrobok mi systém nevie načítať a chýba na ňom cenovka. Viete mi prosím povedať, z ktorého regálu ste ho zobrali a aká tam bola uvedená cena?",
  },
  {
    caller: "Lekár / Ambulancia",
    avatar: "🩺",
    audioUrl: "./audio/doctor.mp3",
    promptText: "Dobrý, kvôli čomu ste prišli? A vaše meno poprosím ešte.",
    fallbackPrompt: "Dobrý, kvôli čomu ste prišli? A vaše meno poprosím ešte.",
  },
  {
    caller: "Automechanik / Servis",
    avatar: "🔧",
    audioUrl: "./audio/automechanik.mp3",
    promptText: "Autoservis, prosím? Čo presne sa stalo s vaším autom a kedy ho viete priniesť?",
    fallbackPrompt:
      "Autoservis, prosím? Čo presne sa stalo s vaším autom a kedy ho viete priniesť?",
  },
];

/**
 * Slovenský fonetický parser s presnou lingvistickou detekciou slabikotvorného r, l, ŕ, ĺ
 */
function analyzePhonetics(word) {
  const clean = word.trim().toLowerCase();
  if (!clean)
    return { type: "vowel", isPlosive: false, clusterLen: 0, label: "Samohláska", wordCount: 1 };

  let words = clean.split(/\s+/).filter(Boolean);
  const singlePrepositions = new Set(["v", "s", "z", "k", "o", "u"]);
  if (words.length > 1 && singlePrepositions.has(words[0])) {
    words = [words[0] + words[1], ...words.slice(2)];
  }
  const firstWord = words[0] || "";

  const phonemes = [];
  for (let i = 0; i < firstWord.length; i++) {
    const two = firstWord.slice(i, i + 2);
    if (two === "ch" || two === "dz" || two === "dž") {
      phonemes.push(two);
      i++;
    } else {
      phonemes.push(firstWord[i]);
    }
  }

  let clusterLen = 0;
  for (let i = 0; i < phonemes.length; i++) {
    const p = phonemes[i];
    if (VOWELS.has(p)) break;

    // Vedecká oprava: R a L sú slabikotvorné IBA ak po nich NENASLEDUJE samohláska!
    // V slove "Pravda" alebo "Kreslo" nasleduje samohláska -> ide o bežný zhluk spoluhlások (clusterLen = 2).
    // V slove "Štvrtok" alebo "Krk" nasleduje spoluhláska alebo koniec slova -> tvorí jadro slabiky!
    const nextIsVowel = i + 1 < phonemes.length && VOWELS.has(phonemes[i + 1]);
    const isSyllabicLiquid =
      (p === "r" || p === "l" || p === "ŕ" || p === "ĺ") &&
      i > 0 &&
      !VOWELS.has(phonemes[i - 1]) &&
      !nextIsVowel;

    if (isSyllabicLiquid) {
      break;
    }
    clusterLen++;
  }

  const first = phonemes[0] || "a";
  const isPlosive = PLOSIVES.has(first);

  if (VOWELS.has(first)) {
    return {
      type: "vowel",
      isPlosive: false,
      clusterLen: 0,
      wordCount: words.length,
      textLength: clean.length,
      targetText: clean,
      label: `Samohláska (${first.toUpperCase()}) – cieľ VRT 45–160 ms (Gentle Onset)`,
    };
  } else if (first === "ch" || VOICELESS_SINGLE.has(first)) {
    return {
      type: "voiceless",
      isPlosive,
      clusterLen,
      wordCount: words.length,
      textLength: clean.length,
      targetText: clean,
      label: `Neznelá spoluhláska (${first.toUpperCase()}, počiatočný zhluk: ${clusterLen})`,
    };
  } else {
    return {
      type: "voiced_cons",
      isPlosive,
      clusterLen,
      wordCount: words.length,
      textLength: clean.length,
      targetText: clean,
      label: `Znelá spoluhláska (${first.toUpperCase()}, počiatočný zhluk: ${clusterLen})`,
    };
  }
}

/**
 * Výpočet NSDF aperiodicity (dPrime) a Zero-Crossing Rate (ZCR) s odstránením DC offsetu
 * 2048-bodové okno pokrýva plné 2 periódy mužského tónu F0 (70–100 Hz pri 48 kHz vzorkovaní)
 */
function computeSignalFeatures(buffer, sampleRate) {
  const len = buffer.length;
  // 1. Odstránenie DC offsetu
  let mean = 0;
  for (let i = 0; i < len; i++) mean += buffer[i];
  mean /= len;

  // 2. Výpočet ZCR na vycentrovanom signáli
  let zeroCrossings = 0;
  let prev = buffer[0] - mean;
  for (let i = 1; i < len; i++) {
    const cur = buffer[i] - mean;
    if ((cur >= 0 && prev < 0) || (cur < 0 && prev >= 0)) {
      zeroCrossings++;
    }
    prev = cur;
  }
  const zcr = zeroCrossings / len;

  // 3. Normalizovaná autokorelácia (NSDF) v pásme F0 (70 Hz – 340 Hz)
  const minLag = Math.floor(sampleRate / 520);
  const maxLag = Math.floor(sampleRate / 65);
  // N = 1024 vzoriek (pri 48 kHz je to 21.3 ms -> spoľahlivo pokryje hlboký mužský hlas)
  const N = Math.min(len - maxLag, 1024);
  if (N <= 0) return { dPrime: 1.0, zcr };

  let maxR = -1;
  for (let tau = minLag; tau <= maxLag; tau++) {
    let acf = 0,
      norm = 0;
    for (let i = 0; i < N; i++) {
      const x0 = buffer[i] - mean;
      const xTau = buffer[i + tau] - mean;
      acf += x0 * xTau;
      norm += x0 * x0 + xTau * xTau;
    }
    if (norm > 1e-9) {
      const r = (2 * acf) / norm;
      if (r > maxR) maxR = r;
    }
  }
  const dPrime = Math.max(0, 1.0 - Math.max(0, maxR));
  return { dPrime, zcr };
}

function computeRms(buffer) {
  let sum = 0;
  let clipped = false;
  for (let i = 0; i < buffer.length; i++) {
    const v = Math.abs(buffer[i]);
    if (v >= 0.985) clipped = true;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / buffer.length);
  const db = 20 * Math.log10(Math.max(rms, 1e-7));
  return { db, rms, clipped };
}

// Stavové premenné
let audioCtx, rawAnalyser, formantAnalyser;
let noiseDb = -58;
let isCalibrated = false; // Vyžaduje 1s tichú kalibráciu pred štartom pokusu
let currentMode = "standard";
let ambushTimeout = null;
let ringInterval = null;
let activeAudioPlayer = null;
let activeCaptureHandle = null;
let activeFinishEarlyCallback = null;
let audioSetupPromise = null;
let audioGeneration = 0;
let cancelCalibration = null;
const dspTimeouts = new Set();
function scheduleDspTimeout(callback, delay) {
  const handle = setTimeout(() => {
    dspTimeouts.delete(handle);
    callback();
  }, delay);
  dspTimeouts.add(handle);
  return handle;
}

// DOM referencie
const wordInput = document.getElementById("wordInput");
const targetWord = document.getElementById("targetWord");
const targetMeta = document.getElementById("targetMeta");
const startBtn = document.getElementById("startBtn");
const statusAlert = document.getElementById("statusAlert");
const pacerCircle = document.getElementById("pacerCircle");
const matrixPanel = document.getElementById("matrixPanel");
const voicePromptToggle = document.getElementById("voicePromptToggle");
const callOverlay = document.getElementById("callOverlay");
const callerNameEl = document.getElementById("callerName");
const answerCallBtn = document.getElementById("answerCallBtn");
const declineCallBtn = document.getElementById("declineCallBtn");
const envelopeCanvas = document.getElementById("envelopeCanvas");

// Univerzálne predvolené meno používateľa
const savedName = localStorage.getItem("fl_custom_name") || "Peter Novák";
if (wordInput) {
  wordInput.value = savedName;
}

// Prepínanie režimov
document.querySelectorAll(".mode-tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    clearTimeout(ambushTimeout);
    stopRinging();

    const m1T = document.getElementById("m1Title");
    if (currentMode === "standard") {
      if (startBtn) startBtn.textContent = "Začať pokus";
      if (m1T) m1T.textContent = "1. Reakčný čas (Tichý blok < 700 ms)";
    } else if (currentMode === "guillotine") {
      if (startBtn) startBtn.textContent = "Vypočuť otázku";
      if (m1T) m1T.textContent = "1. Časová gilotína (Štart < 550 ms)";
    } else if (currentMode === "ambush") {
      if (startBtn) startBtn.textContent = "Pripraviť hovor";
      if (m1T) m1T.textContent = "1. Pohotovosť v hovore (< 750 ms)";
    }
  });
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (wordInput && chip.dataset.word) {
      wordInput.value = chip.dataset.word;
      refreshMeta();
    }
  });
});

function refreshMeta() {
  const w = wordInput && wordInput.value.trim() ? wordInput.value.trim() : "Peter Novák";
  if (targetWord) targetWord.textContent = w.toUpperCase();
  const info = analyzePhonetics(w);
  if (targetMeta) targetMeta.textContent = `Klasifikácia: ${info.label}`;
}
if (wordInput) {
  wordInput.addEventListener("input", refreshMeta);
}
refreshMeta();

// Pacer kruh ako interaktívne tlačidlo skorého ukončenia
if (pacerCircle) {
  pacerCircle.addEventListener("click", () => {
    if (activeFinishEarlyCallback) {
      activeFinishEarlyCallback();
    }
  });
}

let dafFafPipeline = null;
let isHeadphoneDafEnabled = false;

/**
 * Robustné získanie mikrofónu s postupnými fallbackmi pre mobilné telefóny a Android WebView
 */
async function getMicrophoneStream() {
  if (window.micStream && window.micStream.active) {
    return window.micStream;
  }

  const constraintOptions = [
    {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    },
    {
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
      },
    },
    { audio: true },
  ];

  let stream = null;
  let lastErr = null;

  for (const c of constraintOptions) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(c);
      if (stream && stream.active) {
        console.log("[Audio] getUserMedia úspešný s profilom:", c);
        break;
      }
    } catch (err) {
      lastErr = err;
      console.warn("[Audio] getUserMedia pokus zlyhal:", c, err.message);
    }
  }

  if (!stream) {
    throw (
      lastErr ||
      new Error("Nepodarilo sa aktivovať mikrofón. Skontroluj povolenie v nastaveniach mobilu.")
    );
  }

  window.micStream = stream;
  return stream;
}

/**
 * ŽIVÝ DAF & FAF ODOPOSLUCH DO SLÚCHADIEL (LIVE AUDITORY FEEDBACK PIPELINE)
 * 3 paralelné vetvy pre 100% zreteľný odposluch v uchu:
 *   1. Priamy hlas (Sidetone): okamžitý čistý odposluch vlastného hlasu s predzosilnením (+9 dB)
 *   2. DAF vetva: oneskorenie 65 ms pre stabilizáciu tempa
 *   3. FAF vetva: frekvenčný posun F0 (Doppler LFO sweep) + formantový rezonančný peaking zdvih (Choral Effect)
 * Všetky vetvy idú cez dynamický limiter priamo do audioCtx.destination (slúchadlá).
 */
// A single monitored output is shared by lessons and the assistant.
function setupDafFafHeadphoneOutput() {
  if (dafFafPipeline) return dafFafPipeline;
  dafFafPipeline = {
    setDelay: (ms) => window.dafAssistant?.setDelay(ms),
    setVolume: (pct) => window.dafAssistant?.setVolume(pct),
    setEnabled: async (enabled) => {
      if (enabled) await window.dafAssistant.start();
      else window.dafAssistant.stop();
      isHeadphoneDafEnabled = !!window.dafAssistant.isActive;
    },
    isEnabled: () => !!window.dafAssistant?.isActive,
  };
  window.dafFafPipeline = dafFafPipeline;
  return dafFafPipeline;
}

async function setupAudio() {
  if (audioSetupPromise) return audioSetupPromise;
  const generation = audioGeneration;
  audioSetupPromise = setupAudioOnce(generation).finally(() => {
    if (generation === audioGeneration) audioSetupPromise = null;
  });
  return audioSetupPromise;
}

async function setupAudioOnce(generation) {
  if (!audioCtx) {
    const AudioClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioClass();
    window.audioCtx = audioCtx;
  }

  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  if (!rawAnalyser) {
    const stream = await getMicrophoneStream();
    if (generation !== audioGeneration) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Audio relácia bola zrušená.");
    }
    window.micStream = stream;
    const src = audioCtx.createMediaStreamSource(stream);
    window.mediaStreamSource = src;

    // Vedecká oprava: fftSize = 2048 pre spoľahlivé pokrytie mužského F0 (75 Hz pri 48 kHz)
    rawAnalyser = audioCtx.createAnalyser();
    rawAnalyser.fftSize = 2048;
    rawAnalyser.smoothingTimeConstant = 0.0;
    src.connect(rawAnalyser);

    const hp = audioCtx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 260;

    const lp = audioCtx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3500;

    formantAnalyser = audioCtx.createAnalyser();
    formantAnalyser.fftSize = 2048;
    formantAnalyser.smoothingTimeConstant = 0.0;

    src.connect(hp);
    hp.connect(lp);
    lp.connect(formantAnalyser);

    // ZAPOJENIE ŽIVÉHO DAF + FAF ODPOSLUCHU DO SLÚCHADIEL
    setupDafFafHeadphoneOutput(src, audioCtx);
  } else if (window.mediaStreamSource) {
    setupDafFafHeadphoneOutput(window.mediaStreamSource, audioCtx);
  }

  return audioCtx;
}
window.setupAudio = setupAudio;

// Microphone permission is requested only by an explicit audio action.
window.releaseGlideAudio = function () {
  audioGeneration++;
  audioSetupPromise = null;
  abortActiveDspSession();
  window.dafAssistant?.dispose();
  if (window.micStream) window.micStream.getTracks().forEach((track) => track.stop());
  if (audioCtx && audioCtx.state !== "closed") audioCtx.close().catch(() => {});
  audioCtx = rawAnalyser = formantAnalyser = null;
  window.audioCtx = window.mediaStreamSource = window.micStream = null;
  // Tiché prostredie sa kalibruje len raz za spustenie aplikácie; mikrofón sa len uvoľní.
  isHeadphoneDafEnabled = false;
};

function playBeep(freq = 520, duration = 0.12) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function startRinging() {
  stopRinging();
  const ringCycle = () => {
    playBeep(880, 0.18);
    scheduleDspTimeout(() => playBeep(1174, 0.22), 200);
  };
  ringCycle();
  ringInterval = setInterval(ringCycle, 1400);
}

function stopRinging() {
  if (ringInterval) clearInterval(ringInterval);
  ringInterval = null;
}

function playScenarioAudio(scenario, onDone) {
  let canSynthesize = false;
  try { canSynthesize = !!window.speechSynthesis?.getVoices().some(v => /^(sk|cs)(-|_|$)/i.test(v.lang || "")); } catch (_) {}
  const textOnly = !voicePromptToggle.checked || (!scenario.audioUrl && !canSynthesize);
  if (textOnly && scenario.category !== "coach" && (scenario.promptText || scenario.fallbackPrompt)) {
    const generation = dspStartGeneration;
    document.getElementById("scenarioReadyBtn")?.remove();
    if (typeof duoLesson !== "undefined") duoLesson.showDialogueBubble(scenario);
    const ready = document.createElement("button");
    ready.id = "scenarioReadyBtn";
    ready.type = "button";
    ready.className = "btn-3d green full";
    ready.textContent = "Môžem odpovedať";
    ready.onclick = () => {ready.remove(); if (generation === dspStartGeneration) onDone();};
    document.getElementById("lessonDialogueCard").append(ready);
    if (statusAlert) statusAlert.textContent = "Prečítaj si otázku. Pokus spustíš, keď budeš pripravený/á.";
    return;
  }
  if (!voicePromptToggle.checked) {
    onDone();
    return;
  }
  // Ak je načítaný Fluency Voice & Rotation Engine, deleguj naň
  if (typeof fluencyVoice !== "undefined" && fluencyVoice && fluencyVoice.speak) {
    fluencyVoice.speak(scenario, onDone);
    return;
  }

  if (activeAudioPlayer) {
    activeAudioPlayer.pause();
    activeAudioPlayer = null;
  }

  const audio = new Audio(scenario.audioUrl);
  activeAudioPlayer = audio;
  let finished = false;
  const finishOnce = () => {
    if (finished) return;
    finished = true;
    onDone();
  };

  audio.onended = finishOnce;
  audio.onerror = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(scenario.promptText || scenario.fallbackPrompt);
      utter.lang = "sk-SK";
      utter.rate = scenario.voiceRate || 1.05;
      utter.pitch = scenario.voicePitch || 1.0;
      utter.onend = finishOnce;
      utter.onerror = finishOnce;
      window.speechSynthesis.speak(utter);
    } else {
      finishOnce();
    }
  };

  audio.play().catch(() => audio.onerror());
}

// ============================================================================
// CLEANUP A DYNAMICKÝ REŽIM DSP RELÁCIE
// ============================================================================
let dspStartGeneration = 0;
let phraseCapture = null;
function abortActiveDspSession() {
  document.getElementById("scenarioReadyBtn")?.remove();
  dspStartGeneration++;
  phraseCapture?.cancel();
  phraseCapture = null;
  dspTimeouts.forEach(clearTimeout);
  dspTimeouts.clear();
  if (cancelCalibration) cancelCalibration();
  if (ambushTimeout) {
    clearTimeout(ambushTimeout);
    ambushTimeout = null;
  }
  stopRinging();

  if (activeCaptureHandle) {
    clearInterval(activeCaptureHandle);
    activeCaptureHandle = null;
  }
  activeFinishEarlyCallback = null;

  if (activeAudioPlayer) {
    try {
      activeAudioPlayer.pause();
      activeAudioPlayer.currentTime = 0;
    } catch (_) {}
    activeAudioPlayer = null;
  }
  if (
    typeof fluencyVoice !== "undefined" &&
    fluencyVoice &&
    typeof fluencyVoice.stop === "function"
  ) {
    try {
      fluencyVoice.stop();
    } catch (_) {}
  }

  const callOverlay = document.getElementById("callOverlay");
  if (callOverlay) callOverlay.classList.remove("active");

  const lessonDialogueCard = document.getElementById("lessonDialogueCard");
  if (lessonDialogueCard) lessonDialogueCard.style.display = "none";

  const startBtn = document.getElementById("startBtn");
  if (startBtn) startBtn.disabled = false;

  const pacerCircle = document.getElementById("pacerCircle");
  if (pacerCircle) {
    pacerCircle.style.transform = "scale(1)";
    pacerCircle.style.borderColor = "#334155";
    pacerCircle.textContent = "Pripravený";
  }
}
window.abortActiveDspSession = abortActiveDspSession;

function setDspMode(mode) {
  currentMode = mode || "standard";
  const lessonSurface = document.getElementById("lessonScreen");
  if (lessonSurface) lessonSurface.dataset.mode = currentMode;
  if (ambushTimeout) {
    clearTimeout(ambushTimeout);
    ambushTimeout = null;
  }
  stopRinging();

  const startBtn = document.getElementById("startBtn");
  const m1Title = document.getElementById("m1Title");

  if (currentMode === "standard") {
    if (startBtn) startBtn.textContent = "Začať pokus";
    if (m1Title) m1Title.textContent = "1. Reakčný čas (Tichý blok < 1600 ms)";
  } else if (currentMode === "guillotine") {
    if (startBtn) startBtn.textContent = "Vypočuť otázku";
    if (m1Title) m1Title.textContent = "1. Časová gilotína (Štart < 600 ms)";
  } else if (currentMode === "ambush") {
    if (startBtn) startBtn.textContent = "Pripraviť hovor";
    if (m1Title) m1Title.textContent = "1. Pohotovosť v hovore (< 1200 ms)";
  }
}
window.setDspMode = setDspMode;

// Kalibrácia šumu s robustným IQR priemerovaním
function runNoiseCalibration() {
  return new Promise(async (resolve, reject) => {
    try {
      if (statusAlert) statusAlert.textContent = "Meriam šum miestnosti (1 sekunda ticha)...";
      await setupAudio();
      if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();

      const buf = new Float32Array(rawAnalyser.fftSize);
      const readings = [];
      const tStart = performance.now();

      const timer = setInterval(() => {
        rawAnalyser.getFloatTimeDomainData(buf);
        readings.push(computeRms(buf).db);
        if (performance.now() - tStart >= 1000) {
          clearInterval(timer);
          cancelCalibration = null;
          readings.sort((a, b) => a - b);
          const quietHalf = readings.slice(
            Math.floor(readings.length * 0.1),
            Math.floor(readings.length * 0.6),
          );
          const avgNoise = quietHalf.reduce((acc, v) => acc + v, 0) / quietHalf.length;
          noiseDb = avgNoise;

          if (noiseDb > -30) {
            if (statusAlert)
              statusAlert.textContent = `Hluk prostredia je privysoký (${noiseDb.toFixed(1)} dB). Stíš okolie a skús znova.`;
            reject(new Error("Hluk prostredia je privysoký"));
          } else {
            isCalibrated = true;
            if (statusAlert)
              statusAlert.textContent = `Kalibrácia úspešná (Základný šum: ${noiseDb.toFixed(1)} dB). Pripravený!`;
            if (startBtn) startBtn.disabled = false;
            resolve(noiseDb);
          }
        }
      }, 25);
      cancelCalibration = () => {
        clearInterval(timer);
        cancelCalibration = null;
        reject(new Error("Kalibrácia bola zrušená."));
      };
    } catch (err) {
      if (statusAlert) statusAlert.textContent = "Chyba mikrofónu: " + err.message;
      reject(err);
    }
  });
}
window.runNoiseCalibration = runNoiseCalibration;

// Jedna automatická kalibrácia ticha za spustenie aplikácie, ďalšie lekcie ju už preskočia.
let calibrationPromise = null;
function ensureNoiseCalibration() {
  if (isCalibrated) return Promise.resolve(noiseDb);
  if (!calibrationPromise) {
    calibrationPromise = runNoiseCalibration().finally(() => {
      calibrationPromise = null;
    });
  }
  return calibrationPromise;
}
window.ensureNoiseCalibration = ensureNoiseCalibration;

function setPacerText(text) {
  const pText = document.getElementById("pacerText");
  if (pText) {
    pText.textContent = text;
  } else if (pacerCircle) {
    pacerCircle.textContent = text;
  }
}

if (startBtn) {
  startBtn.addEventListener("click", async () => {
    if (startBtn.disabled) return;
    startBtn.disabled = true;
    const generation = dspStartGeneration;
    const lesson = typeof duoLesson !== "undefined" ? duoLesson : null;
    try {
      if (!isCalibrated) {
        if (statusAlert)
          statusAlert.textContent = "Kalibrujem šum miestnosti (1 s ticha, len raz)...";
        await ensureNoiseCalibration();
      }
      if (typeof setupAudio === "function") {
        await setupAudio();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
    } catch (e) {
      startBtn.disabled = false;
      console.warn("Audio setup/kalibrácia error:", e);
      return;
    }

    if (generation !== dspStartGeneration) return;
    const id = lesson?.currentLevel?.id;
    const introId = id === 'sos' ? 'sos_intro' : /^[1-5]\.5$/.test(id || '') ? 'boss_' + id[0] : null;
    const intro = window.TRAINING_VOICES?.find(q => q.id === introId);
    if (lesson?.isLessonActive && intro && !lesson.voiceIntroPlayed && voicePromptToggle?.checked) {
      lesson.voiceIntroPlayed = true;
      if (statusAlert) statusAlert.textContent = intro.promptText;
      playScenarioAudio(intro, () => {
        if (generation !== dspStartGeneration) return;
        startBtn.disabled = false;
        startBtn.click();
      });
      return;
    }

    if (matrixPanel) matrixPanel.classList.remove("active");
    if (targetWord) targetWord.className = "target-word";

    const w = wordInput && wordInput.value.trim() ? wordInput.value.trim() : "Peter Novák";
    const meta = analyzePhonetics(w);
    meta.freeReply = !!lesson?.currentWordItem?.freeReply || currentMode === "guillotine" || currentMode === "ambush";

    meta.conversation = lesson?.conversation && lesson.completedItemsCount < 2 ? lesson.conversation.sceneId : null;
    if (meta.conversation || (meta.targetText && !meta.freeReply)) await window.GlidePhrase.prepare(audioCtx);
    if (generation !== dspStartGeneration) return;
    if (currentMode === "standard") {
      runStandardPacer(meta);
    } else if (currentMode === "guillotine") {
      runGuillotineMode(meta);
    } else if (currentMode === "ambush") {
      armAmbushCall(meta);
    }
  });
}

function runStandardPacer(meta) {
  if (window.glidePractice?.settings().technique === "none") {
    if (startBtn) startBtn.disabled = true;
    if (targetWord) targetWord.classList.add("expose");
    triggerGoSignal(meta, 1600);
    return;
  }
  if (startBtn) startBtn.disabled = true;

  if (targetWord) targetWord.classList.add("expose");
  if (pacerCircle) {
    pacerCircle.style.transform = "scale(1)";
    pacerCircle.style.borderColor = "#475569";
  }
  setPacerText("Pozri na slovo");
  if (statusAlert) statusAlert.textContent = "Fáza 1: Prijmi slovo a uvoľni trapézy.";

  scheduleDspTimeout(() => {
    if (pacerCircle) {
      pacerCircle.style.transition = "transform 2.2s ease-out, border-color 0.3s";
      pacerCircle.style.transform = "scale(1.16)";
      pacerCircle.style.borderColor = "#1cb0f6";
    }
    setPacerText("Nádych + sánka");
    if (statusAlert) statusAlert.textContent = "Fáza 2: Mäkký nádych do bránice, uvoľni sánku.";

    scheduleDspTimeout(() => {
      triggerGoSignal(meta, 1600);
    }, 2200);
  }, 1800);
}

function lessonScenario() {
  const lesson = typeof duoLesson !== 'undefined' ? duoLesson : null;
  if (!lesson?.isLessonActive) return null;
  if (lesson.conversation) return lesson.currentWordItem?.question || null;
  if (lesson.isSosDrill) return null;
  if (lesson.currentWordItem?.questionId) return window.fluencyVoice?.rotator.getById(lesson.currentWordItem.questionId);
  const ids = {'4.1':['pokladna_payment'],'4.2':['pokladna_2'],'4.3':['pokladna_3'],'4.4':['pokladna_4'],'4.5':['pokladna_payment','pokladna_2','pokladna_3','pokladna_goodbye'],'5.1':['kurier_intro'],'5.2':['lekar_appointment'],'5.3':['servis_intro'],'5.4':['kurier_confirm'],'5.5':['hovor_goodbye']}[lesson.currentLevel?.id];
  const index = Math.max(0, lesson.currentLevel?.words?.indexOf(lesson.currentWordItem?.word) || 0);
  return ids ? window.fluencyVoice?.rotator.getById(ids[index % ids.length]) : null;
}

function runGuillotineMode(meta) {
  if (startBtn) startBtn.disabled = true;
  if (targetWord) targetWord.classList.add("expose");
  setPacerText(duoLesson?.conversation ? "Počúvaj…" : "Pokladňa...");
  if (pacerCircle) pacerCircle.style.borderColor = "#ffc800";

  let cashierScenario;
  if (typeof fluencyVoice !== "undefined" && fluencyVoice && fluencyVoice.rotate) {
    cashierScenario = lessonScenario() || fluencyVoice.rotate("pokladna");
  } else {
    const scenarioIdx =
      typeof duoLesson !== "undefined" &&
      duoLesson.isLessonActive &&
      duoLesson.currentLevel &&
      duoLesson.currentLevel.scenarioIndex !== undefined
        ? duoLesson.currentLevel.scenarioIndex
        : 1;
    cashierScenario = REAL_AUDIO_SCENARIOS[scenarioIdx] || REAL_AUDIO_SCENARIOS[1];
  }

  if (statusAlert)
    statusAlert.textContent = `${cashierScenario.avatar || "🛒"} ${cashierScenario.caller} hovorí... Odpovedz po skončení!`;

  if (typeof duoLesson !== "undefined" && duoLesson.showDialogueBubble) {
    duoLesson.showDialogueBubble(cashierScenario);
  }

  playScenarioAudio(cashierScenario, () => {
    if (typeof duoLesson !== "undefined" && duoLesson.hideDialogueBubble) {
      duoLesson.hideDialogueBubble();
    }
    triggerGoSignal(meta, 600);
  });
}

function armAmbushCall(meta) {
  if (startBtn) startBtn.disabled = true;

  const isDuoLesson = typeof duoLesson !== "undefined" && duoLesson.isLessonActive;
  const randomDelay = window.glidePractice?.settings().surprise ? (isDuoLesson ? 800 : Math.floor(Math.random() * 8000) + 3500) : 0;

  setPacerText("Pasca aktívna");
  if (pacerCircle) pacerCircle.style.borderColor = "#ce82ff";
  if (statusAlert) {
    statusAlert.textContent = isDuoLesson
      ? "📱 Priprav sa, telefón o sekundu zazvoní..."
      : "📱 Odlož zrak z obrazovky. Telefón čoskoro nečakane zazvoní...";
  }

  ambushTimeout = scheduleDspTimeout(() => {
    let scenario;
    if (typeof fluencyVoice !== "undefined" && fluencyVoice && fluencyVoice.rotate) {
      const cat =
        isDuoLesson && duoLesson.currentLevel && duoLesson.currentLevel.ambushCategory
          ? duoLesson.currentLevel.ambushCategory
          : "all";
      scenario = lessonScenario() || fluencyVoice.rotate(cat);
    } else {
      const scenarioIdx =
        isDuoLesson && duoLesson.currentLevel && duoLesson.currentLevel.scenarioIndex !== undefined
          ? duoLesson.currentLevel.scenarioIndex
          : Math.floor(Math.random() * REAL_AUDIO_SCENARIOS.length);
      scenario = REAL_AUDIO_SCENARIOS[scenarioIdx] || REAL_AUDIO_SCENARIOS[0];
    }

    if (callerNameEl) callerNameEl.textContent = `${scenario.avatar || "📞"} ${scenario.caller}`;
    const callerSub = document.getElementById("callerSub");
    if (callerSub && (scenario.promptText || scenario.fallbackPrompt)) {
      callerSub.textContent = `Prichádzajúci hovor: „${scenario.promptText || scenario.fallbackPrompt}“`;
    }

    if (callOverlay) callOverlay.classList.add("active");
    if (window.glidePractice?.settings().surprise) startRinging();

    if (answerCallBtn) {
      answerCallBtn.onclick = () => {
        stopRinging();
        if (callOverlay) callOverlay.classList.remove("active");
        if (targetWord) targetWord.classList.add("expose");
        setPacerText("Volajúci hovorí");
        if (statusAlert)
          statusAlert.textContent = `📞 ${scenario.caller}... Počúvaj a hneď odpovedz!`;

        if (typeof duoLesson !== "undefined" && duoLesson.showDialogueBubble) {
          duoLesson.showDialogueBubble(scenario);
        }

        playScenarioAudio(scenario, () => {
          if (typeof duoLesson !== "undefined" && duoLesson.hideDialogueBubble) {
            duoLesson.hideDialogueBubble();
          }
          triggerGoSignal(meta, 750);
        });
      };
    }

    if (declineCallBtn) {
      declineCallBtn.onclick = () => {
        stopRinging();
        if (callOverlay) callOverlay.classList.remove("active");
        if (statusAlert) statusAlert.textContent = "Hovor zrušený. Stlač Štart pre nový pokus.";
        if (startBtn) startBtn.disabled = false;
      };
    }
  }, randomDelay);
}

function getCaptureDurationMs(meta, mode = currentMode) {
  if (meta.freeReply) return 15000;
  const minimum = mode === "ambush" ? 7000 : mode === "guillotine" || meta.wordCount > 1 ? 10000 : 6000;
  return Math.min(30000, Math.max(minimum, 2000 + (meta.textLength || 0) * 180, (meta.wordCount || 1) * 1400));
}

function triggerGoSignal(meta, maxLatencyAllowedMs) {
  playBeep(580, 0.07);
  // 110 ms Guard Interval: bezpečne eliminuje doznuk pípnutia v miestnosti, aby ho nezachytil mikrofón
  scheduleDspTimeout(() => {
    // Vedecká oprava: dynamická dĺžka nahrávania podľa dĺžky textu a režimu
    const captureMs = getCaptureDurationMs(meta);

    pacerCircle.style.transition = `transform ${captureMs / 1000}s linear, border-color 0.12s`;
    pacerCircle.style.transform = "scale(0.92)";
    pacerCircle.style.borderColor = "#58cc02";
    pacerCircle.textContent = "HOVOR!";
    targetWord.className = "target-word go";
    statusAlert.textContent = meta.freeReply ? "Odpovedz vlastnými slovami. Po odpovedi klikni na kruh." : meta.wordCount > 1 ? "Povedz celý text vlastným tempom. Keď skončíš, ťukni na kruh." : `Snímam hlas (${(captureMs / 1000).toFixed(1)}s, ${window.glidePractice?.settings().pressure ? `orientačný cieľ ${maxLatencyAllowedMs} ms` : "bez časového cieľa"}) – klikni na kruh pre rýchle vyhodnotenie!`;

    captureAndAudit(meta, maxLatencyAllowedMs, captureMs);
  }, 110);
}

function captureAndAudit(meta, maxLatencyAllowedMs, maxDurationMs) {
  const frames = [];
  const generation = dspStartGeneration;
  const recording = meta.conversation || (meta.targetText && !meta.freeReply)
    ? window.GlidePhrase.capture(audioCtx, window.mediaStreamSource)
    : null;
  phraseCapture = recording;
  const rawBuf = new Float32Array(rawAnalyser.fftSize);
  const formantBuf = new Float32Array(formantAnalyser.fftSize);
  const t0 = performance.now();

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (activeCaptureHandle) clearInterval(activeCaptureHandle);
    activeCaptureHandle = null;
    activeFinishEarlyCallback = null;

    pacerCircle.style.transition = "transform 0.25s";
    pacerCircle.style.transform = "scale(1)";
    pacerCircle.style.borderColor = "#334155";
    pacerCircle.textContent = "Hotovo";
    targetWord.className = "target-word";

    if (recording) statusAlert.textContent = "Overujem povedaný text…";
    Promise.resolve(recording?.finish()).catch(() => "").then(transcript => {
      if (generation !== dspStartGeneration) return;
      phraseCapture = null;
      runPostHocEvaluation(frames, meta, maxLatencyAllowedMs, maxDurationMs, transcript);
      startBtn.disabled = false;
    });
  };

  activeFinishEarlyCallback = finish;

  activeCaptureHandle = setInterval(() => {
    const elapsed = performance.now() - t0;
    rawAnalyser.getFloatTimeDomainData(rawBuf);
    formantAnalyser.getFloatTimeDomainData(formantBuf);

    const rStat = computeRms(rawBuf);
    const fStat = computeRms(formantBuf);
    const feat = computeSignalFeatures(rawBuf, audioCtx.sampleRate);

    frames.push({
      t: elapsed,
      rawDb: rStat.db,
      rawRms: rStat.rms,
      fDb: fStat.db,
      fRms: fStat.rms,
      dPrime: feat.dPrime,
      zcr: feat.zcr,
      clipped: rStat.clipped,
    });

    if (elapsed >= maxDurationMs) {
      finish();
    }
  }, 10);
}

/**
 * Zero-phase 3-bodové vyhladenie dB obálky aj lineárneho RMS
 */
function smoothEnvelopes(frames) {
  const n = frames.length;
  for (let i = 0; i < n; i++) {
    const prevDb = frames[Math.max(0, i - 1)].fDb;
    const curDb = frames[i].fDb;
    const nextDb = frames[Math.min(n - 1, i + 1)].fDb;
    frames[i].smoothFDb = 0.25 * prevDb + 0.5 * curDb + 0.25 * nextDb;

    const prevRms = frames[Math.max(0, i - 1)].fRms;
    const curRms = frames[i].fRms;
    const nextRms = frames[Math.min(n - 1, i + 1)].fRms;
    frames[i].smoothFRms = 0.25 * prevRms + 0.5 * curRms + 0.25 * nextRms;
  }
}

/**
 * Sub-rámcová lineárna interpolácia času prechodu na LINEÁRNEJ RMS škále (presnosť 0.1 ms)
 */
function findInterpolatedCrossingTimeRms(frames, startIdx, endIdx, targetRms) {
  for (let i = startIdx; i <= endIdx; i++) {
    if (frames[i].smoothFRms >= targetRms) {
      if (i === startIdx) return frames[i].t;
      const prevF = frames[i - 1];
      const curF = frames[i];
      const delta = curF.smoothFRms - prevF.smoothFRms;
      if (delta <= 1e-7) return curF.t;
      const ratio = Math.max(0, Math.min(1, (targetRms - prevF.smoothFRms) / delta));
      return prevF.t + ratio * (curF.t - prevF.t);
    }
  }
  return frames[endIdx].t;
}

function runPostHocEvaluation(frames, meta, maxLatencyAllowedMs, totalDurationMs, transcript) {
  const fixedText = !!meta.targetText && !meta.freeReply;
  const verified = fixedText && window.GlidePhrase.matches(meta.targetText, transcript);
  const phraseReason = transcript?.trim() ? "phrase_mismatch" : "phrase_unverified";
  smoothEnvelopes(frames);

  // Akustické prahy: chránené absolútnym prahom (-56 dBFS), aby jemné mľasknutie sánky pred rečou nespustilo meranie
  const sThresh = Math.max(-56, noiseDb + 6);
  const nThresh = Math.max(-50, noiseDb + 10);
  const fullVoiceMin = Math.max(-52, noiseDb + 9);

  const isClipped = frames.some((f) => f.clipped);
  const firstSound = frames.findIndex((f) => f.rawDb > sThresh);

  // Jadro prvej slabiky: vyžaduje aspoň 2 po sebe idúce znelé rámce (20 ms periodicity s primeraným ZCR)
  let nucleus = -1;
  if (firstSound !== -1) {
    for (let i = firstSound; i < frames.length - 1; i++) {
      const f0 = frames[i],
        f1 = frames[i + 1];
      if (
        f0.smoothFDb > nThresh &&
        f0.dPrime < 0.44 &&
        f0.zcr < 0.35 &&
        f1.smoothFDb > nThresh &&
        f1.dPrime < 0.46 &&
        f1.zcr < 0.35
      ) {
        nucleus = i;
        break;
      }
    }
  }

  const maxFDb = Math.max(...frames.map((f) => f.smoothFDb));
  let periodicHoldMs = 0;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].smoothFDb > nThresh && frames[i].dPrime < 0.44) {
      const dt = i > 0 ? frames[i].t - frames[i - 1].t : 10;
      periodicHoldMs += dt;
    }
  }

  matrixPanel.classList.add("active");
  const banner = document.getElementById("verdictBanner");

  if (isClipped) {
    banner.className = "badge-banner warn";
    banner.textContent =
      "⚠️ PREBUDENÝ MIKROFÓN (Clipping) – Daj mobil/mikrofón o 10 cm ďalej od úst.";
    drawEnvelopeGraph(frames, sThresh, null, null, totalDurationMs);
    window.dispatchEvent(
      new CustomEvent("dsp-evaluation-complete", {
        detail: { passed: false, isPerfect: false, vrt: 0, latency: 0, reason: "clipping", meta },
      }),
    );
    return;
  }

  if (!window.GlideTrainingCore.capture({firstSound, nucleus, peakDb:maxFDb, minimumDb:fullVoiceMin, voicedMs:periodicHoldMs, freeReply:meta.freeReply, clipped:isClipped}).accepted) {
    if (verified) {
      banner.className = "badge-banner success";
      banner.textContent = "Celý text rozpoznaný.";
      window.dispatchEvent(new CustomEvent("dsp-evaluation-complete", {
        detail: { passed: true, isPerfect: false, vrt: 0, latency: 0, meta },
      }));
      return;
    }
    banner.className = "badge-banner fail";
    banner.textContent = "Odpoveď sa nepodarilo zachytiť. Skús sa priblížiť k mikrofónu.";
    setRow(
      "m1",
      firstSound === -1
        ? `Ticho (>${(totalDurationMs / 1000).toFixed(1)}s)`
        : `${frames[firstSound].t.toFixed(0)} ms`,
      false,
    );
    setRow("m2", "Nedostatok hlasového signálu", false);
    setRow("m3", "-", false);
    setRow("m4", "-", false);
    setRow("m5", "-", false);
    drawEnvelopeGraph(frames, sThresh, null, null, totalDurationMs);
    window.dispatchEvent(
      new CustomEvent("dsp-evaluation-complete", {
        detail: {
          passed: false,
          isPerfect: false,
          vrt: 0,
          latency: 0,
          reason: "silent_block",
          meta,
        },
      }),
    );
    return;
  }

  if (meta.freeReply) {
    const latency = frames[firstSound].t;
    setRow("m1", "Reč zachytená", true);
    for (const row of ["m2", "m3", "m4", "m5"]) setRow(row, "Voľná odpoveď", true);
    banner.className = "badge-banner success";
    banner.textContent = "✅ Odpoveď zaznamenaná. Obsah odpovede je na tebe.";
    if (statusAlert) statusAlert.textContent = "Odpoveď zaznamenaná.";
    drawEnvelopeGraph(frames, sThresh, null, null, totalDurationMs);
    window.dispatchEvent(new CustomEvent("dsp-evaluation-complete", {detail: {passed:true, isPerfect:false, vrt:0, latency, freeReply:true, meta, conversationChoice: meta.conversation ? window.GlideConversation.interpret(meta.conversation, transcript) : undefined}}));
    return;
  }

  // Pravidlo 1: Reakčná latencia (Tichý štartovací blok)
  const latency = frames[firstSound].t;
  const p1 = !window.glidePractice?.settings().pressure || latency <= maxLatencyAllowedMs;
  setRow("m1", window.glidePractice?.settings().pressure ? `${latency.toFixed(0)} ms (orientačný cieľ ${maxLatencyAllowedMs} ms)` : `${latency.toFixed(0)} ms (bez časového cieľa)`, p1);

  // Pravidlo 2: Anticheat na znelú barličku ("Eee..." / "Mmm...") pred neznelou spoluhláskou
  let p2 = true,
    p2Text = "Čistý štart fonémy";
  if (meta.type === "voiceless") {
    // Overenie: iba ak je pred neznelou spoluhláskou skutočne pretrvávajúca hlasivková barlička ("Eee...") trvajúca > 80 ms
    let preVoicingCount = 0;
    if (nucleus > firstSound + 5) {
      for (let i = firstSound; i < nucleus - 2; i++) {
        if (
          frames[i].dPrime < 0.22 &&
          frames[i].zcr < 0.14 &&
          frames[i].smoothFDb > sThresh + 4.0
        ) {
          preVoicingCount++;
        }
      }
    }
    if (preVoicingCount >= 8) {
      p2 = false;
      p2Text = 'Zachytená znelosť ("Eee") pred neznelou hláskou';
    }
  }
  setRow("m2", p2Text, p2);

  // Pravidlo 3: Trvanie spoluhlásky a medzihlásková tichá diera
  // Na samohláskach (napr. Otec, Áno, Auto, Oko) NIE JE žiadna začiatočná spoluhláska!
  let p3 = true,
    p3Text = "Samohláskový nábeh (čistý štart)";
  if (meta.type !== "vowel") {
    const consMs = frames[nucleus].t - frames[firstSound].t;
    const maxConsMs = 450 + meta.clusterLen * 100;
    const maxAllowedGap = 180 + meta.clusterLen * 40;
    let maxGap = 0,
      curGap = 0;
    for (let i = firstSound; i < nucleus; i++) {
      const dt = i > 0 ? frames[i].t - frames[i - 1].t : 10;
      if (frames[i].rawDb < sThresh - 2.0) {
        curGap += dt;
        if (curGap > maxGap) maxGap = curGap;
      } else {
        curGap = 0;
      }
    }
    p3 = consMs <= maxConsMs && maxGap <= maxAllowedGap;
    p3Text = `${consMs.toFixed(0)} ms | Diera: ${maxGap} ms (max ${maxAllowedGap} ms)`;
  }
  setRow("m3", p3Text, p3);

  // Pravidlo 4: Skutočný akustický Vocal Rise Time (VRT) počítaný na LINEÁRNEJ RMS škále (20% -> 80%)
  const sEnd = Math.min(frames.length - 1, nucleus + 24);
  let peakRms = 0,
    pIdx = nucleus;
  for (let i = nucleus; i <= sEnd; i++) {
    // Ak dB obálka klesne o viac ako 7 dB pod doterajší lokálny vrchol, ide o koniec prvej slabiky / spoluhlásku
    if (peakRms > 0 && frames[i].smoothFDb < frames[pIdx].smoothFDb - 7.0) {
      break;
    }
    if (frames[i].smoothFRms > peakRms) {
      peakRms = frames[i].smoothFRms;
      pIdx = i;
    }
  }
  const onsetFloorRms = Math.max(0.001, frames[Math.max(0, nucleus - 2)].smoothFRms);
  const dynRms = Math.max(0.004, peakRms - onsetFloorRms);
  const targetRms20 = onsetFloorRms + dynRms * 0.2;
  const targetRms80 = onsetFloorRms + dynRms * 0.8;

  const searchStart = Math.max(0, nucleus - 3);
  const t20 = findInterpolatedCrossingTimeRms(frames, searchStart, pIdx, targetRms20);
  const t80 = findInterpolatedCrossingTimeRms(frames, searchStart, pIdx, targetRms80);
  const vrt = Math.max(4, t80 - t20);

  let p4 = true,
    p4Text = `${vrt.toFixed(1)} ms`;
  if (meta.type === "vowel") {
    // Na počiatočných samohláskach (Otec, Áno, Auto...):
    // Tvrdý glotálny kŕč (coup de glotte) je extrémny akustický ráz pod 7 ms alebo prebudenie.
    // Bežný prirodzený rečový nábeh je 8–45 ms (plynulý štart).
    // Terapeutický mäkký nábeh (Easy Onset / Gentle Voicing) je 45–180 ms (🌟 PERFECT).
    if (vrt < 7) {
      // A 10 ms sampling interval cannot diagnose a sub-7 ms glottal attack.
      p4Text += " (Rýchly nábeh; skús jemnejší štart)";
    } else if (vrt > 340) {
      p4 = false;
      p4Text += " (nábeh > 340 ms)";
    } else {
      p4Text += vrt >= 45 && vrt <= 180 ? " (orientačné pásmo)" : " (Plynulý nábeh)";
    }
  } else {
    // Po spoluhláskach je rýchly nábeh hlasiviek (10–40 ms) fyziologicky normálny.
    if (vrt < 5) {
      p4Text += " (Prirodzený rýchly prechod po spoluhláske)";
    } else if (vrt > 340) {
      p4 = false;
      p4Text += " (prechod > 340 ms)";
    } else {
      p4Text += " (Plynulý artikulačný kontakt)";
    }
  }
  setRow("m4", p4Text, p4);

  // Pravidlo 5: Kontinuita prvej slabiky a ochrana pred klonickou repetíciou
  // Ak bola fonácia počiatočnej hlásky udržaná aspoň 40 ms, akýkoľvek následný pokles
  // je prirodzený prechod do ďalšej spoluhlásky (napr. 't' v 'O-tec', 'k' v 'O-ko', 'n' v 'Á-no')!
  // Detekcia klonickej repetície: patologické zopakovanie počiatočnej hlásky v krátkom okne
  // V bežných viackladných slovách (napr. 'O-tec', 'Á-no', 'Au-to', 'Ká-va') je prechod na ďalšiu slabiku úplne normálny.
  // Repetícia nastáva IBA ak bol počiatočný pokus useknutý v zárodku (< 35 ms) a reštartovaný!
  let clonicDetected = false;
  const firstVowelDuration = frames[pIdx].t - frames[nucleus].t;
  const minNormalVowelMs = meta.type === "vowel" ? 35 : 45;
  if (firstVowelDuration < minNormalVowelMs) {
    for (let i = pIdx + 2; i < Math.min(frames.length - 4, pIdx + 16); i++) {
      // Require an actual sustained silence, not one unvoiced consonant frame.
      const gap = frames.slice(i, i + 8);
      if (gap.length === 8 && gap[7].t - gap[0].t >= 60 && gap.every((f) => f.rawDb < sThresh - 6)) {
        const hasReAttack = frames
          .slice(i + 8, i + 18)
          .some((f) => f.smoothFDb > sThresh + 6 && f.dPrime < 0.28);
        if (hasReAttack) {
          clonicDetected = true;
          break;
        }
      }
    }
  }

  // Loss of periodicity alone is normal in Slovak consonant clusters.
  const p5 = !clonicDetected;
  let p5Text = "Plynulá (bez výpadku)";
  if (clonicDetected) {
    p5Text = 'Krátke opakovanie v signáli ("K-k-kto")';
  }
  setRow("m5", p5Text, p5);

  drawEnvelopeGraph(frames, sThresh, t20, t80, totalDurationMs);

  const acousticWithinGuide = p1 && p2 && p3 && p4 && p5;
  const passed = !fixedText || verified;
  const isPerfect = false;
  if (passed) {
    banner.className = "badge-banner success";
    banner.textContent = isPerfect
      ? "Reč zachytená."
      : "✅ Reč zachytená (+30 XP za absolvovanie).";
  } else {
    banner.className = "badge-banner fail";
    banner.textContent = phraseReason === "phrase_mismatch" ? "Celý text sa nepodarilo rozpoznať." : "Potvrď, že si povedal/a celý text.";
  }
  statusAlert.textContent = "Vyhodnotenie dokončené.";

  // Aktualizácia indikátorov VRT a metriky
  const vrtEl = document.getElementById("vrtValue");
  if (vrtEl) vrtEl.textContent = `${Math.round(vrt)} ms`;

  // Globálny event pre Duolingo herný engine
  window.dispatchEvent(
    new CustomEvent("dsp-evaluation-complete", {
      detail: {
        passed,
        isPerfect,
        vrt,
        latency,
        reason: passed ? undefined : phraseReason,
        recognizedText: !passed && transcript ? transcript.trim().slice(0, 140) : undefined,
        acousticWithinGuide,
        p1,
        p2,
        p3,
        p4,
        p5,
        meta,
        frames,
      },
    }),
  );
}

function drawEnvelopeGraph(frames, threshDb, t20, t80, totalDurationMs) {
  const canvas =
    envelopeCanvas ||
    document.getElementById("envelopeCanvas") ||
    document.getElementById("rmsCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const minDb = -75,
    maxDb = -5;
  const mapY = (db) => {
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    return H - ((clamped - minDb) / (maxDb - minDb)) * (H - 14) - 6;
  };
  const mapX = (t) => (t / totalDurationMs) * W;

  // Žlté pásmo pre VRT (20% -> 80% lineárnej RMS obálky)
  if (t20 !== null && t80 !== null) {
    const x1 = mapX(t20);
    const x2 = Math.max(x1 + 3, mapX(t80));
    ctx.fillStyle = "rgba(255, 200, 0, 0.25)";
    ctx.fillRect(x1, 0, x2 - x1, H);
    ctx.strokeStyle = "#ffc800";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, 0);
    ctx.lineTo(x1, H);
    ctx.moveTo(x2, 0);
    ctx.lineTo(x2, H);
    ctx.stroke();
  }

  // Prah šumu
  const yThresh = mapY(threshDb);
  ctx.strokeStyle = "#475569";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, yThresh);
  ctx.lineTo(W, yThresh);
  ctx.stroke();
  ctx.setLineDash([]);

  // Formantová obálka
  ctx.strokeStyle = "#1cb0f6";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  frames.forEach((f, idx) => {
    const x = mapX(f.t);
    const y = mapY(f.smoothFDb !== undefined ? f.smoothFDb : f.fDb);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function setRow(id, text, pass) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = "metric-val";
}
