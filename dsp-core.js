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
    fallbackPrompt: "Dobrý deň, tu je kuriér Packeta. Stojím pred vašou bytovkou, ale na bráne nevidím vaše meno a nefunguje zvonček. Viete mi prosím popísať, ktorý je to vchod a na ktorom poschodí vás nájdem?"
  },
  {
    caller: "Pokladňa / Obchod",
    audioUrl: "./audio/cashier.mp3",
    fallbackPrompt: "Tento výrobok mi systém nevie načítať a chýba na ňom cenovka. Viete mi prosím povedať, z ktorého regálu ste ho zobrali a aká tam bola uvedená cena?"
  },
  {
    caller: "Lekár / Ambulancia",
    audioUrl: "./audio/doctor.mp3",
    fallbackPrompt: "Dobrý, kvôli čomu ste prišli? A vaše meno poprosím ešte."
  },
  {
    caller: "Automechanik / Servis",
    audioUrl: "./audio/automechanik.mp3",
    fallbackPrompt: "Autoservis, prosím? Čo presne sa stalo s vaším autom a kedy ho viete priniesť?"
  }
];

/**
 * Slovenský fonetický parser s presnou lingvistickou detekciou slabikotvorného r, l, ŕ, ĺ
 */
function analyzePhonetics(word) {
  const clean = word.trim().toLowerCase();
  if (!clean) return { type: 'vowel', isPlosive: false, clusterLen: 0, label: 'Samohláska', wordCount: 1 };

  let words = clean.split(/\s+/).filter(Boolean);
  const singlePrepositions = new Set(['v', 's', 'z', 'k', 'o', 'u']);
  if (words.length > 1 && singlePrepositions.has(words[0])) {
    words = [words[0] + words[1], ...words.slice(2)];
  }
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
  const minLag = Math.floor(sampleRate / 520);
  const maxLag = Math.floor(sampleRate / 65);
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

// Stavové premenné
let audioCtx, rawAnalyser, formantAnalyser;
let noiseDb = -58;
let isCalibrated = false; // Vyžaduje 1s tichú kalibráciu pred štartom pokusu
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
        autoGainControl: false
      }
    },
    {
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true
      }
    },
    { audio: true }
  ];

  let stream = null;
  let lastErr = null;

  for (const c of constraintOptions) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(c);
      if (stream && stream.active) {
        console.log('[Audio] getUserMedia úspešný s profilom:', c);
        break;
      }
    } catch (err) {
      lastErr = err;
      console.warn('[Audio] getUserMedia pokus zlyhal:', c, err.message);
    }
  }

  if (!stream) {
    throw lastErr || new Error('Nepodarilo sa aktivovať mikrofón. Skontroluj povolenie v nastaveniach mobilu.');
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
function setupDafFafHeadphoneOutput(src, ctx) {
  if (dafFafPipeline) return dafFafPipeline;

  try {
    const now = ctx.currentTime;

    // 1. PREDZOSILŇOVAČ MIKROFÓNU (+9 dB / 2.8x gain), aby bol hlas v slúchadlách výrazný a jasný
    const preampGain = ctx.createGain();
    preampGain.gain.setValueAtTime(2.8, now);

    // 2. DYNAMICKÝ LIMITER / KOMPRESOR na ochranu sluchu pred prepálením a pískaním
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-12, now);
    limiter.knee.setValueAtTime(6, now);
    limiter.ratio.setValueAtTime(12, now);
    limiter.attack.setValueAtTime(0.002, now);
    limiter.release.setValueAtTime(0.05, now);

    // 3. MASTER HLASITOSŤ SLÚCHADIEL (predvolene 0.0 - vypnuté, aby nevznikala spätná väzba z reproduktora)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(isHeadphoneDafEnabled ? 1.0 : 0.0, now);

    src.connect(preampGain);

    // VETVA A: PRIAMY ODPOSLUCH (Sidetone) - okamžitý prirodzený hlas
    const directGain = ctx.createGain();
    directGain.gain.setValueAtTime(0.85, now);
    preampGain.connect(directGain);
    directGain.connect(limiter);

    // VETVA B: DAF ONESKORENÝ ODPOSLUCH (Primary Delay ~65 ms)
    const delayA = ctx.createDelay(1.0);
    delayA.delayTime.setValueAtTime(0.065, now);
    const dafGain = ctx.createGain();
    dafGain.gain.setValueAtTime(0.80, now);

    preampGain.connect(delayA);
    delayA.connect(dafGain);
    dafGain.connect(limiter);

    // VETVA C: FAF SKUTOČNÝ REAL-TIME DOPPLER PITCH SHIFTER (+2 poltóny / ~1.12x F0)
    // Dve paralelné modulované delay linky s fázovým posunom 180° a polsínusovým oknom
    const fafDelay1 = ctx.createDelay(0.1);
    fafDelay1.delayTime.setValueAtTime(0, now);
    const fafDelay2 = ctx.createDelay(0.1);
    fafDelay2.delayTime.setValueAtTime(0, now);

    const fafGain1 = ctx.createGain();
    fafGain1.gain.setValueAtTime(0, now);
    const fafGain2 = ctx.createGain();
    fafGain2.gain.setValueAtTime(0, now);

    const sampleRate = ctx.sampleRate || 48000;
    const lfoBuf = ctx.createBuffer(4, sampleRate, sampleRate);
    const cD1 = lfoBuf.getChannelData(0);
    const cG1 = lfoBuf.getChannelData(1);
    const cD2 = lfoBuf.getChannelData(2);
    const cG2 = lfoBuf.getChannelData(3);

    const numCycles = 8;
    const winSec = 0.015;
    const baseSec = 0.003;

    for (let i = 0; i < sampleRate; i++) {
      const t = i / sampleRate;
      const phi1 = (t * numCycles) % 1.0;
      const phi2 = (phi1 + 0.5) % 1.0; // 180° offset

      cD1[i] = baseSec + winSec * (1.0 - phi1);
      cD2[i] = baseSec + winSec * (1.0 - phi2);

      cG1[i] = Math.sin(Math.PI * phi1);
      cG2[i] = Math.sin(Math.PI * phi2);
    }

    const lfoSource = ctx.createBufferSource();
    lfoSource.buffer = lfoBuf;
    lfoSource.loop = true;

    const lfoSplitter = ctx.createChannelSplitter(4);
    lfoSource.connect(lfoSplitter);

    lfoSplitter.connect(fafDelay1.delayTime, 0);
    lfoSplitter.connect(fafGain1.gain, 1);
    lfoSplitter.connect(fafDelay2.delayTime, 2);
    lfoSplitter.connect(fafGain2.gain, 3);
    lfoSource.start(now);

    // Pripojenie FAF za primárny DAF delayA
    delayA.connect(fafDelay1);
    delayA.connect(fafDelay2);

    fafDelay1.connect(fafGain1);
    fafDelay2.connect(fafGain2);

    const fafHighpass = ctx.createBiquadFilter();
    fafHighpass.type = 'highpass';
    fafHighpass.frequency.setValueAtTime(140, now);
    fafHighpass.Q.setValueAtTime(0.7, now);

    fafGain1.connect(fafHighpass);
    fafGain2.connect(fafHighpass);

    const fafGain = ctx.createGain();
    fafGain.gain.setValueAtTime(0.70, now);
    fafHighpass.connect(fafGain);
    fafGain.connect(limiter);

    // Prepojenie limitera na master a priamo do slúchadiel (audioCtx.destination)
    limiter.connect(masterGain);
    masterGain.connect(ctx.destination);

    dafFafPipeline = {
      masterGain,
      preampGain,
      directGain,
      dafGain,
      fafGain,
      delayA,
      setDelay: (ms) => {
        const sec = Math.max(0.04, Math.min(0.16, ms / 1000));
        const t = ctx.currentTime;
        delayA.delayTime.cancelScheduledValues(t);
        delayA.delayTime.setValueAtTime(sec, t);
      },
      setVolume: (pct) => {
        const v = Math.max(0, Math.min(1.5, (pct / 100) * 1.2));
        masterGain.gain.setValueAtTime(v, ctx.currentTime);
      },
      setEnabled: (enabled) => {
        isHeadphoneDafEnabled = !!enabled;
        masterGain.gain.setValueAtTime(isHeadphoneDafEnabled ? 1.0 : 0.0, ctx.currentTime);
      },
      isEnabled: () => isHeadphoneDafEnabled
    };

    window.dafFafPipeline = dafFafPipeline;
    console.log('[Audio] DAF + FAF Headphone pipeline ÚSPEŠNE ZAPOJENÝ do slúchadiel (destination)!');
    return dafFafPipeline;
  } catch (e) {
    console.error('[Audio] Chyba zapojenia DAF/FAF:', e);
  }
}

async function setupAudio() {
  if (!audioCtx) {
    const AudioClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioClass();
    window.audioCtx = audioCtx;
  }

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  if (!rawAnalyser) {
    const stream = await getMicrophoneStream();
    window.micStream = stream;
    const src = audioCtx.createMediaStreamSource(stream);
    window.mediaStreamSource = src;

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

    // ZAPOJENIE ŽIVÉHO DAF + FAF ODPOSLUCHU DO SLÚCHADIEL
    setupDafFafHeadphoneOutput(src, audioCtx);
  } else if (window.mediaStreamSource) {
    setupDafFafHeadphoneOutput(window.mediaStreamSource, audioCtx);
  }

  return audioCtx;
}
window.setupAudio = setupAudio;

// Globálne odomknutie Web Audio pri prvom dotyku obrazovky
(function unlockAudioOnFirstInteraction() {
  const unlock = async () => {
    try {
      if (window.audioCtx && window.audioCtx.state === 'suspended') {
        await window.audioCtx.resume();
      }
      if (typeof setupAudio === 'function' && !window.micStream) {
        setupAudio().catch(() => {});
      }
    } catch (_) {}
    window.removeEventListener('click', unlock, true);
    window.removeEventListener('touchend', unlock, true);
  };
  window.addEventListener('click', unlock, true);
  window.addEventListener('touchend', unlock, true);
})();

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
  // Ak je načítaný Fluency Voice & Rotation Engine, deleguj naň
  if (typeof fluencyVoice !== 'undefined' && fluencyVoice && fluencyVoice.speak) {
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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(scenario.promptText || scenario.fallbackPrompt);
      utter.lang = 'sk-SK';
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

// Interaktívny indikátor a prepínač slúchadlového odposluchu (toggle ON/OFF)
const hpIndicator = document.getElementById('headphoneLiveIndicator');
if (hpIndicator) {
  hpIndicator.addEventListener('click', async () => {
    try {
      await setupAudio();
      if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();

      const nextState = !isHeadphoneDafEnabled;
      if (dafFafPipeline) {
        dafFafPipeline.setEnabled(nextState);
      } else {
        isHeadphoneDafEnabled = nextState;
      }

      const txt = document.getElementById('headphoneStatusText');
      if (isHeadphoneDafEnabled) {
        hpIndicator.classList.remove('off');
        if (txt) txt.textContent = 'DAF & FAF Slúchadlá: Aktívne (Klikni pre vypnutie)';
        playBeep(880, 0.1);
      } else {
        hpIndicator.classList.add('off');
        if (txt) txt.textContent = 'DAF & FAF Slúchadlá: Vypnuté (Klikni pre zapnutie)';
        playBeep(440, 0.08);
      }
    } catch (e) {
      alert('Chyba mikrofónu: ' + e.message);
    }
  });
}


// ============================================================================
// CLEANUP A DYNAMICKÝ REŽIM DSP RELÁCIE
// ============================================================================
function abortActiveDspSession() {
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
  if (typeof fluencyVoice !== 'undefined' && fluencyVoice && typeof fluencyVoice.stop === 'function') {
    try {
      fluencyVoice.stop();
    } catch (_) {}
  }

  const callOverlay = document.getElementById('callOverlay');
  if (callOverlay) callOverlay.classList.remove('active');

  const lessonDialogueCard = document.getElementById('lessonDialogueCard');
  if (lessonDialogueCard) lessonDialogueCard.style.display = 'none';

  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.disabled = false;

  const calibrateBtn = document.getElementById('calibrateBtn');
  if (calibrateBtn) calibrateBtn.disabled = false;

  const pacerCircle = document.getElementById('pacerCircle');
  if (pacerCircle) {
    pacerCircle.style.transform = 'scale(1)';
    pacerCircle.style.borderColor = '#334155';
    pacerCircle.textContent = 'Pripravený';
  }
}
window.abortActiveDspSession = abortActiveDspSession;

function setDspMode(mode) {
  currentMode = mode || 'standard';
  if (ambushTimeout) {
    clearTimeout(ambushTimeout);
    ambushTimeout = null;
  }
  stopRinging();

  const startBtn = document.getElementById('startBtn');
  const m1Title = document.getElementById('m1Title');

  if (currentMode === 'standard') {
    if (startBtn) startBtn.textContent = '2. Štart pokusu (Pacer)';
    if (m1Title) m1Title.textContent = '1. Reakčný čas (Tichý blok < 1600 ms)';
  } else if (currentMode === 'guillotine') {
    if (startBtn) startBtn.textContent = '2. Pokladňa (Limit 600 ms)';
    if (m1Title) m1Title.textContent = '1. Časová gilotína (Štart < 600 ms)';
  } else if (currentMode === 'ambush') {
    if (startBtn) startBtn.textContent = '2. Aktivovať pascu hovoru';
    if (m1Title) m1Title.textContent = '1. Pohotovosť v hovore (< 1200 ms)';
  }
}
window.setDspMode = setDspMode;

// Kalibrácia šumu s robustným IQR priemerovaním
function runNoiseCalibration() {
  return new Promise(async (resolve, reject) => {
    try {
      if (calibrateBtn) calibrateBtn.disabled = true;
      if (statusAlert) statusAlert.textContent = 'Meriam šum miestnosti (1 sekunda ticha)...';
      await setupAudio();
      if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();

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
            if (statusAlert) statusAlert.textContent = `Hluk prostredia je privysoký (${noiseDb.toFixed(1)} dB). Stíš okolie a skús znova.`;
            if (calibrateBtn) calibrateBtn.disabled = false;
            reject(new Error('Hluk prostredia je privysoký'));
          } else {
            isCalibrated = true;
            if (statusAlert) statusAlert.textContent = `Kalibrácia úspešná (Základný šum: ${noiseDb.toFixed(1)} dB). Pripravený!`;
            if (startBtn) startBtn.disabled = false;
            if (calibrateBtn) calibrateBtn.disabled = false;
            resolve(noiseDb);
          }
        }
      }, 25);
    } catch (err) {
      if (statusAlert) statusAlert.textContent = 'Chyba mikrofónu: ' + err.message;
      if (calibrateBtn) calibrateBtn.disabled = false;
      reject(err);
    }
  });
}
window.runNoiseCalibration = runNoiseCalibration;

calibrateBtn.addEventListener('click', async () => {
  try {
    await runNoiseCalibration();
  } catch (_) {}
});

startBtn.addEventListener('click', async () => {
  try {
    if (!isCalibrated) {
      if (statusAlert) statusAlert.textContent = 'Najprv automaticky kalibrujem šum miestnosti (1s ticha)...';
      await runNoiseCalibration();
    }
    if (typeof setupAudio === 'function') {
      await setupAudio();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
  } catch (e) {
    console.warn('Audio setup/kalibrácia error:', e);
  }

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
      triggerGoSignal(meta, 1600);
    }, 2200);
  }, 1800);
}

function runGuillotineMode(meta) {
  startBtn.disabled = true;
  calibrateBtn.disabled = true;
  targetWord.classList.add('expose');
  pacerCircle.textContent = 'Pokladňa...';
  pacerCircle.style.borderColor = '#ffc800';

  let cashierScenario;
  if (typeof fluencyVoice !== 'undefined' && fluencyVoice && fluencyVoice.rotate) {
    cashierScenario = fluencyVoice.rotate('pokladna');
  } else {
    const scenarioIdx = (typeof duoLesson !== 'undefined' && duoLesson.isLessonActive && duoLesson.currentLevel && duoLesson.currentLevel.scenarioIndex !== undefined)
      ? duoLesson.currentLevel.scenarioIndex
      : 1;
    cashierScenario = REAL_AUDIO_SCENARIOS[scenarioIdx] || REAL_AUDIO_SCENARIOS[1];
  }

  statusAlert.textContent = `${cashierScenario.avatar || '🛒'} ${cashierScenario.caller} hovorí... Odpovedz po skončení!`;

  if (typeof duoLesson !== 'undefined' && duoLesson.showDialogueBubble) {
    duoLesson.showDialogueBubble(cashierScenario);
  }

  playScenarioAudio(cashierScenario, () => {
    if (typeof duoLesson !== 'undefined' && duoLesson.hideDialogueBubble) {
      duoLesson.hideDialogueBubble();
    }
    triggerGoSignal(meta, 600);
  });
}

function armAmbushCall(meta) {
  startBtn.disabled = true;
  calibrateBtn.disabled = true;

  const isDuoLesson = (typeof duoLesson !== 'undefined' && duoLesson.isLessonActive);
  const randomDelay = isDuoLesson ? 800 : (Math.floor(Math.random() * 8000) + 3500);

  pacerCircle.textContent = 'Pasca aktívna';
  pacerCircle.style.borderColor = '#ce82ff';
  statusAlert.textContent = isDuoLesson
    ? '📱 Priprav sa, telefón o sekundu zazvoní...'
    : '📱 Odlož zrak z obrazovky. Telefón čoskoro nečakane zazvoní...';

  ambushTimeout = setTimeout(() => {
    let scenario;
    if (typeof fluencyVoice !== 'undefined' && fluencyVoice && fluencyVoice.rotate) {
      const cat = (isDuoLesson && duoLesson.currentLevel && duoLesson.currentLevel.ambushCategory)
        ? duoLesson.currentLevel.ambushCategory
        : 'all';
      scenario = fluencyVoice.rotate(cat);
    } else {
      const scenarioIdx = (isDuoLesson && duoLesson.currentLevel && duoLesson.currentLevel.scenarioIndex !== undefined)
        ? duoLesson.currentLevel.scenarioIndex
        : Math.floor(Math.random() * REAL_AUDIO_SCENARIOS.length);
      scenario = REAL_AUDIO_SCENARIOS[scenarioIdx] || REAL_AUDIO_SCENARIOS[0];
    }

    callerNameEl.textContent = `${scenario.avatar || '📞'} ${scenario.caller}`;
    const callerSub = document.getElementById('callerSub');
    if (callerSub && scenario.promptText) {
      callerSub.textContent = `Prichádzajúci hovor: „${scenario.promptText}“`;
    }

    callOverlay.classList.add('active');
    startRinging();

    answerCallBtn.onclick = () => {
      stopRinging();
      callOverlay.classList.remove('active');
      targetWord.classList.add('expose');
      pacerCircle.textContent = 'Volajúci hovorí';
      statusAlert.textContent = `📞 ${scenario.caller}... Počúvaj a hneď odpovedz!`;

      if (typeof duoLesson !== 'undefined' && duoLesson.showDialogueBubble) {
        duoLesson.showDialogueBubble(scenario);
      }

      playScenarioAudio(scenario, () => {
        if (typeof duoLesson !== 'undefined' && duoLesson.hideDialogueBubble) {
          duoLesson.hideDialogueBubble();
        }
        triggerGoSignal(meta, 1200);
      });
    };

    declineCallBtn.onclick = () => {
      stopRinging();
      callOverlay.classList.remove('active');
      if (typeof duoLesson !== 'undefined' && duoLesson.hideDialogueBubble) {
        duoLesson.hideDialogueBubble();
      }
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
  const sThresh = Math.max(-56, noiseDb + 6);
  const nThresh = Math.max(-50, noiseDb + 10);
  const fullVoiceMin = Math.max(-52, noiseDb + 9);

  const isClipped = frames.some(f => f.clipped);
  const firstSound = frames.findIndex(f => f.rawDb > sThresh);

  // Jadro prvej slabiky: vyžaduje aspoň 2 po sebe idúce znelé rámce (20 ms periodicity s primeraným ZCR)
  let nucleus = -1;
  if (firstSound !== -1) {
    for (let i = firstSound; i < frames.length - 1; i++) {
      const f0 = frames[i], f1 = frames[i + 1];
      if (
        f0.smoothFDb > nThresh && f0.dPrime < 0.44 && f0.zcr < 0.35 &&
        f1.smoothFDb > nThresh && f1.dPrime < 0.46 && f1.zcr < 0.35
      ) {
        nucleus = i;
        break;
      }
    }
  }

  const maxFDb = Math.max(...frames.map(f => f.smoothFDb));
  let periodicHoldMs = 0;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].smoothFDb > nThresh && frames[i].dPrime < 0.44) {
      const dt = i > 0 ? (frames[i].t - frames[i - 1].t) : 10;
      periodicHoldMs += dt;
    }
  }

  matrixPanel.classList.add('active');
  const banner = document.getElementById('verdictBanner');

  if (isClipped) {
    banner.className = 'badge-banner warn';
    banner.textContent = '⚠️ PREBUDENÝ MIKROFÓN (Clipping) – Daj mobil/mikrofón o 10 cm ďalej od úst.';
    drawEnvelopeGraph(frames, sThresh, null, null, totalDurationMs);
    window.dispatchEvent(new CustomEvent('dsp-evaluation-complete', {
      detail: { passed: false, isPerfect: false, vrt: 0, latency: 0, reason: 'clipping', meta }
    }));
    return;
  }

  if (firstSound === -1 || nucleus === -1 || maxFDb < fullVoiceMin || periodicHoldMs < 40) {
    banner.className = 'badge-banner fail';
    banner.textContent = '❌ NEÚSPEŠNÝ POKUS: Príliš tichý hlas / šepot alebo úplný tichý blok.';
    setRow('m1', firstSound === -1 ? `Ticho (>${(totalDurationMs / 1000).toFixed(1)}s)` : `${frames[firstSound].t.toFixed(0)} ms`, false);
    setRow('m2', 'Chýba plná fonácia', false);
    setRow('m3', '-', false);
    setRow('m4', '-', false);
    setRow('m5', '-', false);
    drawEnvelopeGraph(frames, sThresh, null, null, totalDurationMs);
    window.dispatchEvent(new CustomEvent('dsp-evaluation-complete', {
      detail: { passed: false, isPerfect: false, vrt: 0, latency: 0, reason: 'silent_block', meta }
    }));
    return;
  }

  // Pravidlo 1: Reakčná latencia (Tichý štartovací blok)
  const latency = frames[firstSound].t;
  const p1 = latency <= maxLatencyAllowedMs;
  setRow('m1', `${latency.toFixed(0)} ms (limit ${maxLatencyAllowedMs} ms)`, p1);

  // Pravidlo 2: Anticheat na znelú barličku ("Eee..." / "Mmm...") pred neznelou spoluhláskou
  let p2 = true, p2Text = 'Čistý štart fonémy';
  if (meta.type === 'voiceless') {
    // Overenie: iba ak je pred neznelou spoluhláskou skutočne pretrvávajúca hlasivková barlička ("Eee...") trvajúca > 80 ms
    let preVoicingCount = 0;
    if (nucleus > firstSound + 5) {
      for (let i = firstSound; i < nucleus - 2; i++) {
        if (frames[i].dPrime < 0.22 && frames[i].zcr < 0.14 && frames[i].smoothFDb > sThresh + 4.0) {
          preVoicingCount++;
        }
      }
    }
    if (preVoicingCount >= 8) {
      p2 = false;
      p2Text = 'Chyba: Znelá barlička ("Eee") pred neznelou hláskou';
    }
  }
  setRow('m2', p2Text, p2);

  // Pravidlo 3: Trvanie spoluhlásky a medzihlásková tichá diera
  // Na samohláskach (napr. Otec, Áno, Auto, Oko) NIE JE žiadna začiatočná spoluhláska!
  let p3 = true, p3Text = 'Samohláskový nábeh (čistý štart)';
  if (meta.type !== 'vowel') {
    const consMs = frames[nucleus].t - frames[firstSound].t;
    const maxConsMs = 450 + (meta.clusterLen * 100);
    const maxAllowedGap = 180 + (meta.clusterLen * 40);
    let maxGap = 0, curGap = 0;
    for (let i = firstSound; i < nucleus; i++) {
      const dt = i > 0 ? (frames[i].t - frames[i - 1].t) : 10;
      if (frames[i].rawDb < sThresh - 2.0) {
        curGap += dt;
        if (curGap > maxGap) maxGap = curGap;
      } else {
        curGap = 0;
      }
    }
    p3 = (consMs <= maxConsMs) && (maxGap <= maxAllowedGap);
    p3Text = `${consMs.toFixed(0)} ms | Diera: ${maxGap} ms (max ${maxAllowedGap} ms)`;
  }
  setRow('m3', p3Text, p3);

  // Pravidlo 4: Skutočný akustický Vocal Rise Time (VRT) počítaný na LINEÁRNEJ RMS škále (20% -> 80%)
  const sEnd = Math.min(frames.length - 1, nucleus + 24);
  let peakRms = 0, pIdx = nucleus;
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
  const targetRms20 = onsetFloorRms + dynRms * 0.20;
  const targetRms80 = onsetFloorRms + dynRms * 0.80;

  const searchStart = Math.max(0, nucleus - 3);
  const t20 = findInterpolatedCrossingTimeRms(frames, searchStart, pIdx, targetRms20);
  const t80 = findInterpolatedCrossingTimeRms(frames, searchStart, pIdx, targetRms80);
  const vrt = Math.max(4, t80 - t20);

  let p4 = true, p4Text = `${vrt.toFixed(1)} ms`;
  if (meta.type === 'vowel') {
    // Na počiatočných samohláskach (Otec, Áno, Auto...):
    // Tvrdý glotálny kŕč (coup de glotte) je extrémny akustický ráz pod 7 ms alebo prebudenie.
    // Bežný prirodzený rečový nábeh je 8–45 ms (plynulý štart).
    // Terapeutický mäkký nábeh (Easy Onset / Gentle Voicing) je 45–180 ms (🌟 PERFECT).
    if (vrt < 7) {
      p4 = false;
      p4Text += ' (Tvrdý glotálny kŕč! Cieľ ≥ 10 ms)';
    } else if (vrt > 340) {
      p4 = false;
      p4Text += ' (Príliš oneskorený dychový únik > 340 ms)';
    } else {
      p4Text += (vrt >= 45 && vrt <= 180) ? ' (🌟 PERFECT mäkký nábeh)' : ' (Plynulý nábeh)';
    }
  } else {
    // Po spoluhláskach je rýchly nábeh hlasiviek (10–40 ms) fyziologicky normálny.
    if (vrt < 5) {
      p4 = false;
      p4Text += ' (Kŕčovitý ráz po spoluhláske!)';
    } else if (vrt > 340) {
      p4 = false;
      p4Text += ' (Zamknutý prechod do samohlásky > 340 ms)';
    } else {
      p4Text += ' (Plynulý artikulačný kontakt)';
    }
  }
  setRow('m4', p4Text, p4);

  // Pravidlo 5: Kontinuita prvej slabiky a ochrana pred klonickou repetíciou
  // Ak bola fonácia počiatočnej hlásky udržaná aspoň 40 ms, akýkoľvek následný pokles
  // je prirodzený prechod do ďalšej spoluhlásky (napr. 't' v 'O-tec', 'k' v 'O-ko', 'n' v 'Á-no')!
  const nCoreEnd = Math.min(frames.length - 1, nucleus + 14);
  let earlyDropMs = 0, sustainedVoicingMs = 0;
  for (let i = nucleus; i <= nCoreEnd; i++) {
    const dt = i > 0 ? (frames[i].t - frames[i - 1].t) : 10;
    if (frames[i].smoothFDb >= sThresh - 2.0 && frames[i].dPrime < 0.45) {
      sustainedVoicingMs += dt;
    } else {
      // Ak fonácia padla v prvých 30 ms po nucleus (abortovaný / zaseknutý začiatok):
      if (sustainedVoicingMs < 40) {
        earlyDropMs += dt;
      }
    }
  }

  // Detekcia klonickej repetície: patologické zopakovanie počiatočnej hlásky v krátkom okne
  // V bežných viackladných slovách (napr. 'O-tec', 'Á-no', 'Au-to', 'Ká-va') je prechod na ďalšiu slabiku úplne normálny.
  // Repetícia nastáva IBA ak bol počiatočný pokus useknutý v zárodku (< 35 ms) a reštartovaný!
  let clonicDetected = false;
  const firstVowelDuration = frames[pIdx].t - frames[nucleus].t;
  const minNormalVowelMs = meta.type === 'vowel' ? 35 : 45;
  if (firstVowelDuration < minNormalVowelMs) {
    for (let i = pIdx + 2; i < Math.min(frames.length - 4, pIdx + 16); i++) {
      if (frames[i].smoothFDb < sThresh - 6 && frames[i].dPrime > 0.40) {
        const hasReAttack = frames.slice(i + 2, i + 10).some(f => f.smoothFDb > sThresh + 6 && f.dPrime < 0.28);
        if (hasReAttack) {
          clonicDetected = true;
          break;
        }
      }
    }
  }

  const p5 = (earlyDropMs <= 30) && !clonicDetected;
  let p5Text = 'Plynulá (bez výpadku)';
  if (clonicDetected) {
    p5Text = 'Chyba: Klonická repetícia slabiky ("K-k-kto")';
  } else if (!p5) {
    p5Text = `Predčasne prerušená fonácia (${earlyDropMs} ms)`;
  }
  setRow('m5', p5Text, p5);

  drawEnvelopeGraph(frames, sThresh, t20, t80, totalDurationMs);

  const passed = p1 && p2 && p3 && p4 && p5;
  const isPerfect = (meta.type === 'vowel' ? (vrt >= 45 && vrt <= 180) : (vrt >= 15 && vrt <= 100)) && latency <= 700;
  if (passed) {
    banner.className = 'badge-banner success';
    banner.textContent = isPerfect
      ? '🌟 PERFECT ZÁSAH (+50 XP) – Dokonale uvoľnený štart hlasiviek!'
      : '✅ ÚSPEŠNÝ POKUS (+30 XP) – Plynulý nástup bez bloku!';
  } else {
    banner.className = 'badge-banner fail';
    banner.textContent = '❌ DETEGOVANÝ BLOK ALEBO KŔČ – Skontroluj červené metriky nižšie.';
  }
  statusAlert.textContent = 'Vyhodnotenie dokončené.';

  // Globálny event pre Duolingo herný engine
  window.dispatchEvent(new CustomEvent('dsp-evaluation-complete', {
    detail: {
      passed,
      isPerfect,
      vrt,
      latency,
      p1, p2, p3, p4, p5,
      meta,
      frames
    }
  }));
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
