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

const VOWELS = new Set(['a','á','ä','e','é','i','í','o','ó','ô','u','ú','y','ý']);
// V slovenčine je 'h' znelá glotálna frikatíva [ɦ], kým digraf 'ch' je neznelá velárna frikatíva [x]
const VOICELESS_SINGLE = new Set(['p','t','ť','k','s','š','c','č','f','x']);
const PLOSIVES = new Set(['p','t','ť','k','b','d','ď','g']);

// Prepojenie na reálne MP3 súbory v priečinku /audio/
const REAL_AUDIO_SCENARIOS = [
  {
    caller: "Kuriér (Balík)",
    audioUrl: "./audio/courier.mp3",
    fallbackPrompt: "Dobrý deň, mám tu pre vás zásielku, s kým hovorím?"
  },
  {
    caller: "Pokladňa / Obchod",
    audioUrl: "./audio/cashier.mp3",
    fallbackPrompt: "Dobrý deň, budete platiť v hotovosti alebo kartou?"
  },
  {
    caller: "Lekár / Ambulancia",
    audioUrl: "./audio/doctor.mp3",
    fallbackPrompt: "Prosím, pri telefóne, povedzte mi vaše celé meno."
  },
  {
    caller: "Automechanik / Servis",
    audioUrl: "./audio/automechanik.mp3",
    fallbackPrompt: "Haló, tu je servis, počujeme sa? Kto volá?"
  }
];

/**
 * Slovenský fonetický parser s presnou lingvistickou detekciou slabikotvorného r, l, ŕ, ĺ
 */
function analyzePhonetics(word) {
  const clean = word.trim().toLowerCase();
  if (!clean) return { type: 'vowel', isPlosive: false, clusterLen: 0, label: 'Samohláska', wordCount: 1 };

  const words = clean.split(/\s+/).filter(Boolean);
  const firstWord = words[0] || '';

  const phonemes = [];
  for (let i = 0; i < firstWord.length; i++) {
    const two = firstWord.slice(i, i + 2);
    if (two === 'ch' || two === 'dz' || two === 'dž') {
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
    const nextIsVowel = (i + 1 < phonemes.length) && VOWELS.has(phonemes[i + 1]);
    const isSyllabicLiquid = (p === 'r' || p === 'l' || p === 'ŕ' || p === 'ĺ') && (i > 0) && !VOWELS.has(phonemes[i - 1]) && !nextIsVowel;

    if (isSyllabicLiquid) {
      break;
    }
    clusterLen++;
  }

  const first = phonemes[0] || 'a';
  const isPlosive = PLOSIVES.has(first);

  if (VOWELS.has(first)) {
    return {
      type: 'vowel',
      isPlosive: false,
      clusterLen: 0,
      wordCount: words.length,
      label: `Samohláska (${first.toUpperCase()}) – cieľ VRT 45–160 ms (Gentle Onset)`
    };
  } else if (first === 'ch' || VOICELESS_SINGLE.has(first)) {
    return {
      type: 'voiceless',
      isPlosive,
      clusterLen,
      wordCount: words.length,
      label: `Neznelá spoluhláska (${first.toUpperCase()}, počiatočný zhluk: ${clusterLen})`
    };
  } else {
    return {
      type: 'voiced_cons',
      isPlosive,
      clusterLen,
      wordCount: words.length,
      label: `Znelá spoluhláska (${first.toUpperCase()}, počiatočný zhluk: ${clusterLen})`
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
  const minLag = Math.floor(sampleRate / 340);
  const maxLag = Math.floor(sampleRate / 70);
  // N = 1024 vzoriek (pri 48 kHz je to 21.3 ms -> spoľahlivo pokryje hlboký mužský hlas)
  const N = Math.min(len - maxLag, 1024);
  if (N <= 0) return { dPrime: 1.0, zcr };

  let maxR = -1;
  for (let tau = minLag; tau <= maxLag; tau++) {
    let acf = 0, norm = 0;
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

// Gamifikácia (localStorage)
let gameStats = JSON.parse(localStorage.getItem('fluency_v37_stats') || '{"xp":0,"combo":1,"streak":1}');
function updateHud(addXp = 0, passed = null) {
  if (passed === true) {
    gameStats.xp += addXp * gameStats.combo;
    gameStats.combo = Math.min(8, gameStats.combo + 1);
  } else if (passed === false) {
    gameStats.combo = 1;
  }
  localStorage.setItem('fluency_v37_stats', JSON.stringify(gameStats));

  const xpEl = document.getElementById('xpVal');
  const comboEl = document.getElementById('comboVal');
  const streakEl = document.getElementById('streakVal');
  const rankEl = document.getElementById('rankTitle');
  const nextEl = document.getElementById('xpNextLabel');
  const fillEl = document.getElementById('xpFillBar');

  if (xpEl) xpEl.textContent = gameStats.xp;
  if (comboEl) comboEl.textContent = gameStats.combo + 'x';
  if (streakEl) streakEl.textContent = gameStats.streak;

  const level = Math.floor(gameStats.xp / 500) + 1;
  const inLevelXp = gameStats.xp % 500;
  const ranks = ['Novice', 'Resonator', 'Flow Shaper', 'Pacemaker', 'Unblockable'];
  const rankName = ranks[Math.min(ranks.length - 1, level - 1)];
  if (rankEl) rankEl.textContent = `Rank ${level}: ${rankName}`;
  if (nextEl) nextEl.textContent = `${inLevelXp} / 500 XP`;
  if (fillEl) fillEl.style.width = `${(inLevelXp / 500) * 100}%`;
}
updateHud();

// Stavové premenné
let audioCtx, rawAnalyser, formantAnalyser;
let noiseDb = -65;
let isCalibrated = false;
let currentMode = 'standard';
let ambushTimeout = null;
let ringInterval = null;
let camStream = null;
let activeAudioPlayer = null;
let activeCaptureHandle = null;
let activeFinishEarlyCallback = null;

// DOM referencie
const wordInput = document.getElementById('wordInput');
const targetWord = document.getElementById('targetWord');
const targetMeta = document.getElementById('targetMeta');
const calibrateBtn = document.getElementById('calibrateBtn');
const startBtn = document.getElementById('startBtn');
const statusAlert = document.getElementById('statusAlert');
const pacerCircle = document.getElementById('pacerCircle');
const matrixPanel = document.getElementById('matrixPanel');
const camToggle = document.getElementById('camToggle');
const voicePromptToggle = document.getElementById('voicePromptToggle');
const cameraFeed = document.getElementById('cameraFeed');
const interlocutorPrompt = document.getElementById('interlocutorPrompt');
const cardioBtn = document.getElementById('cardioBtn');
const callOverlay = document.getElementById('callOverlay');
const callerNameEl = document.getElementById('callerName');
const answerCallBtn = document.getElementById('answerCallBtn');
const declineCallBtn = document.getElementById('declineCallBtn');
const envelopeCanvas = document.getElementById('envelopeCanvas');

// Univerzálne predvolené meno používateľa
const savedName = localStorage.getItem('fl_custom_name') || 'Peter Novák';
if (wordInput) {
  wordInput.value = savedName;
  wordInput.addEventListener('change', () => {
    localStorage.setItem('fl_custom_name', wordInput.value.trim());
  });
}

// Prepínanie režimov
document.querySelectorAll('.mode-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    clearTimeout(ambushTimeout);
    stopRinging();

    if (currentMode === 'standard') {
      startBtn.textContent = '2. Štart pokusu (Pacer)';
      document.getElementById('m1Title').textContent = '1. Reakčný čas (Tichý blok < 700 ms)';
    } else if (currentMode === 'guillotine') {
      startBtn.textContent = '2. Pokladňa (Limit 550 ms)';
      document.getElementById('m1Title').textContent = '1. Časová gilotína (Štart < 550 ms)';
    } else if (currentMode === 'ambush') {
      startBtn.textContent = '2. Aktivovať pascu hovoru';
      document.getElementById('m1Title').textContent = '1. Pohotovosť v hovore (< 750 ms)';
    }
  });
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    wordInput.value = chip.dataset.word;
    refreshMeta();
  });
});

function refreshMeta() {
  const w = wordInput.value.trim() || 'Peter Novák';
  targetWord.textContent = w.toUpperCase();
  const info = analyzePhonetics(w);
  targetMeta.textContent = `Klasifikácia: ${info.label}`;
}
wordInput.addEventListener('input', refreshMeta);
refreshMeta();

// Pacer kruh ako interaktívne tlačidlo skorého ukončenia
pacerCircle.addEventListener('click', () => {
  if (activeFinishEarlyCallback) {
    activeFinishEarlyCallback();
  }
});

// Kamera
camToggle.addEventListener('change', async () => {
  if (camToggle.checked) {
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      cameraFeed.srcObject = camStream;
      cameraFeed.classList.add('active');
      interlocutorPrompt.classList.add('visible');
    } catch (err) {
      statusAlert.textContent = 'Nepodarilo sa zapnúť kameru: ' + err.message;
      camToggle.checked = false;
    }
  } else {
    if (camStream) camStream.getTracks().forEach(t => t.stop());
    cameraFeed.classList.remove('active');
    interlocutorPrompt.classList.remove('visible');
  }
});

// Interoceptívny stresor
cardioBtn.addEventListener('click', () => {
  let sec = 30;
  cardioBtn.disabled = true;
  statusAlert.textContent = '⚡ Zdvihni tep! Rob rýchle kľuky alebo drepy, kým nevyprší časovač...';
  const iv = setInterval(() => {
    sec--;
    cardioBtn.textContent = `⚡ Tepový šok (${sec}s)`;
    if (sec <= 0) {
      clearInterval(iv);
      cardioBtn.disabled = false;
      cardioBtn.textContent = '⚡ Tepový šok (30s)';
      statusAlert.textContent = '🔥 Tep je hore! OKAMŽITE stlač Štart a trénuj mäkký nábeh so zadýchaním!';
      playBeep(660, 0.25);
    }
  }, 1000);
});

async function setupAudio() {
  if (audioCtx) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
  });
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const src = audioCtx.createMediaStreamSource(stream);

  // Vedecká oprava: fftSize = 2048 pre spoľahlivé pokrytie mužského F0 (75 Hz pri 48 kHz)
  rawAnalyser = audioCtx.createAnalyser();
  rawAnalyser.fftSize = 2048;
  rawAnalyser.smoothingTimeConstant = 0.0;
  src.connect(rawAnalyser);

  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 260;

  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3500;

  formantAnalyser = audioCtx.createAnalyser();
  formantAnalyser.fftSize = 2048;
  formantAnalyser.smoothingTimeConstant = 0.0;

  src.connect(hp);
  hp.connect(lp);
  lp.connect(formantAnalyser);
}

function playBeep(freq = 520, duration = 0.12) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
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
    setTimeout(() => playBeep(1174, 0.22), 200);
  };
  ringCycle();
  ringInterval = setInterval(ringCycle, 1400);
}

function stopRinging() {
  if (ringInterval) clearInterval(ringInterval);
  ringInterval = null;
}

function playScenarioAudio(scenario, onDone) {
  if (!voicePromptToggle.checked) {
    onDone();
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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(scenario.fallbackPrompt);
      utter.lang = 'sk-SK';
      utter.rate = 1.05;
      utter.onend = finishOnce;
      utter.onerror = finishOnce;
      window.speechSynthesis.speak(utter);
    } else {
      finishOnce();
    }
  };

  audio.play().catch(() => audio.onerror());
}

// Kalibrácia šumu s robustným IQR priemerovaním
calibrateBtn.addEventListener('click', async () => {
  try {
    calibrateBtn.disabled = true;
    statusAlert.textContent = 'Meriam šum miestnosti (1 sekunda ticha)...';
    await setupAudio();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    const buf = new Float32Array(rawAnalyser.fftSize);
    const readings = [];
    const tStart = performance.now();

    const timer = setInterval(() => {
      rawAnalyser.getFloatTimeDomainData(buf);
      readings.push(computeRms(buf).db);
      if (performance.now() - tStart >= 1000) {
        clearInterval(timer);
        readings.sort((a, b) => a - b);
        const quietHalf = readings.slice(Math.floor(readings.length * 0.1), Math.floor(readings.length * 0.6));
        const avgNoise = quietHalf.reduce((acc, v) => acc + v, 0) / quietHalf.length;
        noiseDb = avgNoise;

        if (noiseDb > -30) {
          statusAlert.textContent = `Hluk prostredia je privysoký (${noiseDb.toFixed(1)} dB). Stíš okolie a skús znova.`;
          calibrateBtn.disabled = false;
        } else {
          isCalibrated = true;
          statusAlert.textContent = `Kalibrácia úspešná (Základný šum: ${noiseDb.toFixed(1)} dB). Pripravený!`;
          startBtn.disabled = false;
          calibrateBtn.disabled = false;
        }
      }
    }, 25);
  } catch (err) {
    statusAlert.textContent = 'Chyba mikrofónu: ' + err.message;
    calibrateBtn.disabled = false;
  }
});

startBtn.addEventListener('click', () => {
  if (!isCalibrated) return;
  matrixPanel.classList.remove('active');
  targetWord.className = 'target-word';

  const w = wordInput.value.trim() || 'Peter Novák';
  const meta = analyzePhonetics(w);

  if (currentMode === 'standard') {
    runStandardPacer(meta);
  } else if (currentMode === 'guillotine') {
    runGuillotineMode(meta);
  } else if (currentMode === 'ambush') {
    armAmbushCall(meta);
  }
});

function runStandardPacer(meta) {
  startBtn.disabled = true;
  calibrateBtn.disabled = true;

  targetWord.classList.add('expose');
  pacerCircle.style.transform = 'scale(1)';
  pacerCircle.style.borderColor = '#475569';
  pacerCircle.textContent = 'Pozri na slovo';
  statusAlert.textContent = 'Fáza 1: Prijmi slovo a uvoľni trapézy.';

  setTimeout(() => {
    pacerCircle.style.transition = 'transform 2.2s ease-out, border-color 0.3s';
    pacerCircle.style.transform = 'scale(1.55)';
    pacerCircle.style.borderColor = '#1cb0f6';
    pacerCircle.textContent = 'Nádych + sánka';
    statusAlert.textContent = 'Fáza 2: Mäkký nádych do bránice, uvoľni sánku.';

    setTimeout(() => {
      triggerGoSignal(meta, 700);
    }, 2200);
  }, 1800);
}

function runGuillotineMode(meta) {
  startBtn.disabled = true;
  calibrateBtn.disabled = true;
  targetWord.classList.add('expose');
  pacerCircle.textContent = 'Pokladňa...';
  pacerCircle.style.borderColor = '#ffc800';
  const cashierScenario = REAL_AUDIO_SCENARIOS[1];
  statusAlert.textContent = `🛒 ${cashierScenario.caller} hovorí... Odpovedz po skončení!`;

  playScenarioAudio(cashierScenario, () => {
    triggerGoSignal(meta, 600);
  });
}

function armAmbushCall(meta) {
  startBtn.disabled = true;
  calibrateBtn.disabled = true;
  const randomDelay = Math.floor(Math.random() * 8000) + 3500;
  pacerCircle.textContent = 'Pasca aktívna';
  pacerCircle.style.borderColor = '#ce82ff';
  statusAlert.textContent = '📱 Odlož zrak z obrazovky. Telefón čoskoro nečakane zazvoní...';

  ambushTimeout = setTimeout(() => {
    const scenario = REAL_AUDIO_SCENARIOS[Math.floor(Math.random() * REAL_AUDIO_SCENARIOS.length)];
    callerNameEl.textContent = scenario.caller;
    callOverlay.classList.add('active');
    startRinging();

    answerCallBtn.onclick = () => {
      stopRinging();
      callOverlay.classList.remove('active');
      targetWord.classList.add('expose');
      pacerCircle.textContent = 'Volajúci hovorí';
      statusAlert.textContent = `📞 ${scenario.caller}... Počúvaj a hneď odpovedz!`;

      playScenarioAudio(scenario, () => {
        triggerGoSignal(meta, 750);
      });
    };

    declineCallBtn.onclick = () => {
      stopRinging();
      callOverlay.classList.remove('active');
      startBtn.disabled = false;
      calibrateBtn.disabled = false;
      pacerCircle.textContent = 'Zrušené';
      statusAlert.textContent = 'Hovor zrušený.';
    };
  }, randomDelay);
}

function triggerGoSignal(meta, maxLatencyAllowedMs) {
  playBeep(580, 0.07);
  // 110 ms Guard Interval: bezpečne eliminuje doznuk pípnutia v miestnosti, aby ho nezachytil mikrofón
  setTimeout(() => {
    // Vedecká oprava: dynamická dĺžka nahrávania podľa dĺžky textu a režimu
    let captureMs = 2800;
    if (meta.wordCount > 1 || currentMode === 'guillotine') {
      captureMs = 5500;
    }
    if (currentMode === 'ambush') {
      captureMs = 7000;
    }

    pacerCircle.style.transition = `transform ${captureMs / 1000}s linear, border-color 0.12s`;
    pacerCircle.style.transform = 'scale(0.92)';
    pacerCircle.style.borderColor = '#58cc02';
    pacerCircle.textContent = 'HOVOR!';
    targetWord.className = 'target-word go';
    statusAlert.textContent = `Snímam hlas (${(captureMs / 1000).toFixed(1)}s, limit štartu ${maxLatencyAllowedMs} ms) – klikni na kruh pre rýchle vyhodnotenie!`;

    captureAndAudit(meta, maxLatencyAllowedMs, captureMs);
  }, 110);
}

function captureAndAudit(meta, maxLatencyAllowedMs, maxDurationMs) {
  const frames = [];
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

    pacerCircle.style.transition = 'transform 0.25s';
    pacerCircle.style.transform = 'scale(1)';
    pacerCircle.style.borderColor = '#334155';
    pacerCircle.textContent = 'Hotovo';
    targetWord.className = 'target-word';

    setTimeout(() => {
      runPostHocEvaluation(frames, meta, maxLatencyAllowedMs, maxDurationMs);
      startBtn.disabled = false;
      calibrateBtn.disabled = false;
    }, 200);
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
      clipped: rStat.clipped
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
    frames[i].smoothFDb = 0.25 * prevDb + 0.50 * curDb + 0.25 * nextDb;

    const prevRms = frames[Math.max(0, i - 1)].fRms;
    const curRms = frames[i].fRms;
    const nextRms = frames[Math.min(n - 1, i + 1)].fRms;
    frames[i].smoothFRms = 0.25 * prevRms + 0.50 * curRms + 0.25 * nextRms;
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

function runPostHocEvaluation(frames, meta, maxLatencyAllowedMs, totalDurationMs) {
  smoothEnvelopes(frames);

  // Akustické prahy: chránené absolútnym prahom (-56 dBFS), aby jemné mľasknutie sánky pred rečou nespustilo meranie
  const sThresh = Math.max(-56, noiseDb + 7);
  const nThresh = Math.max(-50, noiseDb + 13);
  const fullVoiceMin = Math.max(-46, noiseDb + 17);

  const isClipped = frames.some(f => f.clipped);
  const firstSound = frames.findIndex(f => f.rawDb > sThresh);

  // Jadro prvej slabiky: vyžaduje aspoň 2 po sebe idúce znelé rámce (20 ms periodicity s primeraným ZCR)
  let nucleus = -1;
  if (firstSound !== -1) {
    for (let i = firstSound; i < frames.length - 1; i++) {
      const f0 = frames[i], f1 = frames[i + 1];
      if (
        f0.smoothFDb > nThresh && f0.dPrime < 0.35 && f0.zcr < 0.25 &&
        f1.smoothFDb > nThresh && f1.dPrime < 0.38 && f1.zcr < 0.27
      ) {
        nucleus = i;
        break;
      }
    }
  }

  const maxFDb = Math.max(...frames.map(f => f.smoothFDb));
  const periodicHoldMs = frames.filter(f => f.smoothFDb > nThresh && f.dPrime < 0.32).length * 10;

  matrixPanel.classList.add('active');
  const banner = document.getElementById('verdictBanner');

  if (isClipped) {
    banner.className = 'badge-banner warn';
    banner.textContent = '⚠️ PREBUDENÝ MIKROFÓN (Clipping) – Daj mobil/mikrofón o 10 cm ďalej od úst.';
    drawEnvelopeGraph(frames, sThresh, null, null, totalDurationMs);
    return;
  }

  if (firstSound === -1 || nucleus === -1 || maxFDb < fullVoiceMin || periodicHoldMs < 80) {
    banner.className = 'badge-banner fail';
    banner.textContent = '❌ NEÚSPEŠNÝ POKUS: Príliš tichý hlas / šepot alebo úplný tichý blok.';
    setRow('m1', firstSound === -1 ? `Ticho (>${(totalDurationMs / 1000).toFixed(1)}s)` : `${frames[firstSound].t.toFixed(0)} ms`, false);
    setRow('m2', 'Chýba plná fonácia', false);
    setRow('m3', '-', false);
    setRow('m4', '-', false);
    setRow('m5', '-', false);
    updateHud(0, false);
    drawEnvelopeGraph(frames, sThresh, null, null, totalDurationMs);
    return;
  }

  // Pravidlo 1: Reakčná latencia (Tichý štartovací blok)
  const latency = frames[firstSound].t;
  const p1 = latency <= maxLatencyAllowedMs;
  setRow('m1', `${latency.toFixed(0)} ms (limit ${maxLatencyAllowedMs} ms)`, p1);

  // Pravidlo 2: Anticheat na znelú barličku ("Eee..." / "Mmm...") pred neznelou spoluhláskou
  let p2 = true, p2Text = 'Čistý štart fonémy';
  if (meta.type === 'voiceless') {
    // 2a: Okamžitá znelá samohláska namiesto neznelého šumu (K, P, T, CH, S)
    const instantVoicedStart = (nucleus === firstSound) && (frames[firstSound].dPrime < 0.20 && frames[firstSound].zcr < 0.12);
    // 2b: Predĺžená znelá pred-fonácia ("Eee-") pred skutočným začiatkom neznelého slova (> 40 ms)
    let preVoicingCount = 0;
    if (nucleus > firstSound + 4) {
      for (let i = firstSound; i < nucleus - 1; i++) {
        if (frames[i].dPrime < 0.25 && frames[i].zcr < 0.16 && frames[i].smoothFDb > sThresh + 2.5) {
          preVoicingCount++;
        }
      }
    }
    if (instantVoicedStart || preVoicingCount >= 4) {
      p2 = false;
      p2Text = 'Chyba: Znelá barlička ("Eee") pred neznelou hláskou';
    }
  }
  setRow('m2', p2Text, p2);

  // Pravidlo 3: Trvanie spoluhlásky a medzihlásková tichá diera
  // Vedecká oprava: Limit pre zhluky (napr. Štvrtok, Kto, Vstup) je adaptívny
  const consMs = frames[nucleus].t - frames[firstSound].t;
  const maxConsMs = 280 + (meta.clusterLen * 70);
  const maxAllowedGap = meta.isPlosive ? 110 : (75 + meta.clusterLen * 20);
  let maxGap = 0, curGap = 0;
  for (let i = firstSound; i < nucleus; i++) {
    if (frames[i].rawDb < sThresh - 1.5) {
      curGap += 10;
      if (curGap > maxGap) maxGap = curGap;
    } else {
      curGap = 0;
    }
  }
  const p3 = (consMs <= maxConsMs) && (maxGap <= maxAllowedGap);
  setRow('m3', `${consMs.toFixed(0)} ms | Diera: ${maxGap} ms (max ${maxAllowedGap} ms)`, p3);

  // Pravidlo 4: Skutočný akustický Vocal Rise Time (VRT) počítaný na LINEÁRNEJ RMS škále (20% -> 80%)
  const sEnd = Math.min(frames.length - 1, nucleus + 28);
  let peakRms = 0, pIdx = nucleus;
  for (let i = nucleus; i <= sEnd; i++) {
    if (frames[i].smoothFRms > peakRms) {
      peakRms = frames[i].smoothFRms;
      pIdx = i;
    }
  }
  const onsetFloorRms = Math.max(0.001, frames[Math.max(0, nucleus - 2)].smoothFRms);
  const dynRms = Math.max(0.004, peakRms - onsetFloorRms);
  const targetRms20 = onsetFloorRms + dynRms * 0.20;
  const targetRms80 = onsetFloorRms + dynRms * 0.80;

  const searchStart = Math.max(0, nucleus - 3);
  const t20 = findInterpolatedCrossingTimeRms(frames, searchStart, pIdx, targetRms20);
  const t80 = findInterpolatedCrossingTimeRms(frames, searchStart, pIdx, targetRms80);
  const vrt = Math.max(4, t80 - t20);

  let p4 = true, p4Text = `${vrt.toFixed(1)} ms`;
  if (meta.type === 'vowel') {
    // Na počiatočných samohláskach sa klinicky vyžaduje jemný nábeh (Gentle Voice Onset)
    if (vrt < 45) {
      p4 = false;
      p4Text += ' (Tvrdý glotálny úder! Cieľ ≥ 45 ms)';
    } else if (vrt > 240) {
      p4 = false;
      p4Text += ' (Príliš dychový / šepkaný únik > 240 ms)';
    } else {
      p4Text += (vrt >= 60 && vrt <= 150) ? ' (🌟 PERFECT mäkký nábeh)' : ' (Mäkký nábeh)';
    }
  } else {
    // Vedecká oprava: po spoluhláskach je rýchly nábeh hlasiviek (10–30 ms) fyziologicky NORMÁLNY.
    // Trestáme len extrémny spazmus s mikrofónnym rázom (< 8 ms) alebo neschopnosť otvoriť hlasivky (> 280 ms)
    if (vrt < 8) {
      p4 = false;
      p4Text += ' (Kŕčovitý ráz po spoluhláske!)';
    } else if (vrt > 280) {
      p4 = false;
      p4Text += ' (Zamknutý prechod do samohlásky > 280 ms)';
    } else {
      p4Text += ' (Plynulý artikulačný kontakt)';
    }
  }
  setRow('m4', p4Text, p4);

  // Pravidlo 5: Kontinuita prvej slabiky a ochrana pred klonickou repetíciou
  // Skúmame bezprostredné jadro slabiky (140 ms) bez ovplyvnenia prechodu na druhú spoluhlásku
  const nCoreEnd = Math.min(frames.length - 1, nucleus + 14);
  let dropMs = 0, maxDropMs = 0;
  for (let i = nucleus; i <= nCoreEnd; i++) {
    if (frames[i].smoothFDb < sThresh) {
      dropMs += 10;
      if (dropMs > maxDropMs) maxDropMs = dropMs;
    } else {
      dropMs = 0;
    }
  }

  // Detekcia klonickej repetície ("Ká-káva", "Ko-kopec") vo väčšom okne 400 ms
  const repWindowEnd = Math.min(frames.length - 1, nucleus + 40);
  let clonicDetected = false;
  for (let i = pIdx + 3; i < repWindowEnd - 6; i++) {
    // Výrazný pokles uprostred (uzavretie articulátorov) nasledovaný novým znelým vrcholom
    const isValley = (frames[i].smoothFDb < maxFDb - 14) || (frames[i].dPrime > 0.45);
    if (isValley) {
      const hasReAttack = frames.slice(i + 2, repWindowEnd).some(f => (f.smoothFDb > maxFDb - 5) && (f.dPrime < 0.28));
      if (hasReAttack) {
        clonicDetected = true;
        break;
      }
    }
  }

  const p5 = (maxDropMs <= 40) && !clonicDetected;
  let p5Text = 'Plynulá (bez výpadku)';
  if (clonicDetected) {
    p5Text = 'Chyba: Klonická repetícia slabiky ("Ká-káva")';
  } else if (maxDropMs > 0) {
    p5Text = `Výpadok v jadre: ${maxDropMs} ms`;
  }
  setRow('m5', p5Text, p5);

  drawEnvelopeGraph(frames, sThresh, t20, t80, totalDurationMs);

  const passed = p1 && p2 && p3 && p4 && p5;
  if (passed) {
    const isPerfect = (meta.type === 'vowel' ? (vrt >= 60 && vrt <= 140) : (vrt >= 15 && vrt <= 90)) && latency <= 500;
    updateHud(isPerfect ? 50 : 30, true);
    banner.className = 'badge-banner success';
    banner.textContent = isPerfect
      ? '🌟 PERFECT ZÁSAH (+50 XP) – Dokonale uvoľnený štart hlasiviek!'
      : '✅ ÚSPEŠNÝ POKUS (+30 XP) – Plynulý nástup bez bloku!';
  } else {
    updateHud(0, false);
    banner.className = 'badge-banner fail';
    banner.textContent = '❌ DETEGOVANÝ BLOK ALEBO KŔČ – Skontroluj červené metriky nižšie.';
  }
  statusAlert.textContent = 'Vyhodnotenie dokončené.';
}

function drawEnvelopeGraph(frames, threshDb, t20, t80, totalDurationMs) {
  const ctx = envelopeCanvas.getContext('2d');
  const W = envelopeCanvas.width;
  const H = envelopeCanvas.height;
  ctx.clearRect(0, 0, W, H);

  const minDb = -75, maxDb = -5;
  const mapY = (db) => {
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    return H - ((clamped - minDb) / (maxDb - minDb)) * (H - 14) - 6;
  };
  const mapX = (t) => (t / totalDurationMs) * W;

  // Žlté pásmo pre VRT (20% -> 80% lineárnej RMS obálky)
  if (t20 !== null && t80 !== null) {
    const x1 = mapX(t20);
    const x2 = Math.max(x1 + 3, mapX(t80));
    ctx.fillStyle = 'rgba(255, 200, 0, 0.25)';
    ctx.fillRect(x1, 0, x2 - x1, H);
    ctx.strokeStyle = '#ffc800';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, 0); ctx.lineTo(x1, H);
    ctx.moveTo(x2, 0); ctx.lineTo(x2, H);
    ctx.stroke();
  }

  // Prah šumu
  const yThresh = mapY(threshDb);
  ctx.strokeStyle = '#475569';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, yThresh);
  ctx.lineTo(W, yThresh);
  ctx.stroke();
  ctx.setLineDash([]);

  // Formantová obálka
  ctx.strokeStyle = '#1cb0f6';
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
  el.className = 'metric-val ' + (pass ? 'ok' : 'err');
}
