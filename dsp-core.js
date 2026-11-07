/**
 * ============================================================================
 * Fluency – Modern Clean Speech Biofeedback Engine
 * Univerzálne pre všetkých ľudí: Vlastné meno, Zen Pacer a realistický hlas.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. MANAŽÉR MENA POUŽÍVATEĽA & FONETICKÁ DATABÁZA
// ----------------------------------------------------------------------------
function getUserName() {
  return localStorage.getItem('fl_user_name') || 'Peter Novák';
}

function getUserFirstName() {
  const full = getUserName().trim();
  const parts = full.split(/\s+/);
  return parts[0] || 'Peter';
}

function saveUserName(name) {
  const clean = name.trim();
  if (!clean) return;
  localStorage.setItem('fl_user_name', clean);
  updateNameCategoryWords();
  if (currentCategory === 'name') {
    setWord(clean, 'Uvoľni ramená, vydýchni a povedz svoje meno pokojným tónom.');
  }
}

const VOWELS = new Set(['a','á','ä','e','é','i','í','o','ó','ô','u','ú','y','ý']);
const VOICELESS = new Set(['p','t','ť','k','s','š','c','č','f','h','x']);

const CATEGORY_WORDS = {
  vowels: [
    { word: 'Auto', hint: 'Pomalé a mäkké otvorenie úst bez zovretia hrtanu.' },
    { word: 'Autobus', hint: 'Plynulý výdychový štart, žiadny tvrdý glotálny náraz.' },
    { word: 'Okná', hint: 'Mäkký samohláskový nábeh, zníž napätie v krku.' },
    { word: 'Eva', hint: 'Plynulý prechod vzduchu pred rozochvením hlasiviek.' },
    { word: 'Ihla', hint: 'Jemný prúd vzduchu cez uvoľnené pery.' },
    { word: 'Ulica', hint: 'Pomalé otvorenie úst, uvoľnené pery a sánka.' }
  ],
  plosives: [
    { word: 'Káva', hint: 'Ľahký dotyk zadnej časti jazyka – spoj K a Á jedným plynulým dychom.' },
    { word: 'Kartou', hint: 'Zákaz pomocnej barličky „Eee...“. Začni priamo z ticha.' },
    { word: 'Pes', hint: 'Pery sa dotknú ako pierko, bez tlaku nahromadeného vzduchu.' },
    { word: 'Peter', hint: 'Mäkký uvoľnený odtrh pier priamo do samohlásky E.' },
    { word: 'Topánka', hint: 'Špička jazyka sa jemne dotkne podnebia bez zovretia.' },
    { word: 'Tato', hint: 'Voľná sánka, žiadne napätie v spodnej čeľusti.' }
  ],
  voiced: [
    { word: 'Bicykel', hint: 'Včasné rozochvenie pier ešte pred ich úplným otvorením.' },
    { word: 'Banka', hint: 'Plynulá rezonancia na znelom B bez trhnutia.' },
    { word: 'Dom', hint: 'Mäkký znelý štart, pocíť jemné chvenie v hrudníku.' },
    { word: 'Dvere', hint: 'Plynulý prechod z D do V jedným neprerušovaným tónom.' },
    { word: 'Gombík', hint: 'Hlboká znelá rezonancia v hrdle bez kŕčovitého stiahnutia.' }
  ],
  name: []
};

function updateNameCategoryWords() {
  const full = getUserName();
  CATEGORY_WORDS.name = [
    { word: `Dobrý deň, pri telefóne ${full}, som doma, môžete mi zazvoniť na zvonček.`, hint: 'Uvoľni hrdlo na začiatku vety a udržuj plynulý dych.' },
    { word: 'Dobrý deň, budem platiť kartou a poprosím vás ešte jednu papierovú tašku, ďakujem.', hint: 'Mäkký prechod na slove kartou bez zovretia pier.' },
    { word: `Dobrý deň, moje meno je ${full} a prišiel som na dnešné dohodnuté stretnutie.`, hint: 'Prirodzený hovor celou vetou bez ponáhľania sa.' },
    { word: 'Prepáčte, prosím vás, neviete mi poradiť, ako sa dostanem k najbližšej lekárni?', hint: 'Dychová opora na začiatku otázky.' },
    { word: full, hint: 'Uvoľni ramená, vydýchni a povedz svoje celé meno pokojným tónom.' }
  ];
}

const PHONEMES_MAP = [
  'A', 'B', 'C', 'Č', 'D', 'E', 'F', 'G', 'H', 'CH',
  'I', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'Š',
  'T', 'U', 'V', 'Z', 'Ž'
];

function analyzePhonetics(word) {
  if (!word || typeof word !== 'string') {
    return { type: 'vowel', label: 'Samohláska • Mäkký nábeh', initial: 'A' };
  }
  const clean = word.trim().toLowerCase().replace(/^[^\p{L}]+/u, '');
  if (!clean) return { type: 'vowel', label: 'Samohláska • Mäkký nábeh', initial: 'A' };

  const isCh = clean.startsWith('ch');
  const initial = isCh ? 'CH' : clean[0].toUpperCase();
  const first = clean[0];

  if (VOWELS.has(first)) {
    return { type: 'vowel', label: 'Samohláska • Mäkký nábeh', initial };
  } else if (isCh || VOICELESS.has(first)) {
    return { type: 'voiceless', label: `Plozíva (${initial}) • Ľahký kontakt`, initial };
  } else {
    return { type: 'voiced_cons', label: `Znelá (${initial}) • Plynulý prúd`, initial };
  }
}

// ----------------------------------------------------------------------------
// 2. DSP AKUSTICKÝ ENGINE (2048 FFT BUFFER)
// ----------------------------------------------------------------------------
function computePeriodicity(buffer, sampleRate) {
  const minLag = Math.max(2, Math.floor(sampleRate / 350));
  const maxLag = Math.floor(sampleRate / 70);
  if (buffer.length <= maxLag) return 1.0;

  const N = Math.min(buffer.length - maxLag, 1024);
  if (N <= 32) return 1.0;

  let maxR = -1;
  for (let tau = minLag; tau <= maxLag; tau++) {
    let acf = 0, norm = 0;
    for (let i = 0; i < N; i++) {
      const x1 = buffer[i], x2 = buffer[i + tau];
      acf += x1 * x2;
      norm += x1 * x1 + x2 * x2;
    }
    if (norm > 1e-8) {
      const r = (2 * acf) / norm;
      if (r > maxR) maxR = r;
    }
  }
  return Math.max(0, Math.min(1.0, 1.0 - Math.max(0, maxR)));
}

function computeRms(buffer) {
  let sum = 0, clipped = false;
  for (let i = 0; i < buffer.length; i++) {
    const v = Math.abs(buffer[i]);
    if (v >= 0.985) clipped = true;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / buffer.length);
  const db = 20 * Math.log10(Math.max(rms, 1e-7));
  return { db, rms, clipped };
}

let audioCtx = null;
let rawAnalyser = null;
let formantAnalyser = null;
let micStream = null;
let noiseDb = -62;
let isCalibrated = false;

async function setupAudio() {
  if (audioCtx && audioCtx.state !== 'closed') {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    const AudioClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioClass();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    const src = audioCtx.createMediaStreamSource(micStream);
    rawAnalyser = audioCtx.createAnalyser();
    rawAnalyser.fftSize = 2048;
    rawAnalyser.smoothingTimeConstant = 0.08;
    src.connect(rawAnalyser);

    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 260;

    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3500;

    formantAnalyser = audioCtx.createAnalyser();
    formantAnalyser.fftSize = 2048;
    formantAnalyser.smoothingTimeConstant = 0.08;

    src.connect(hp);
    hp.connect(lp);
    lp.connect(formantAnalyser);
  } catch (err) {
    throw new Error('Povoľ mikrofón v prehliadači.');
  }
}

// ----------------------------------------------------------------------------
// 3. REÁLNY HLAS (PODPORA ŠTÚDIOVÉHO MP3 & NEURÓNOVÉHO HLASU EDGE)
// ----------------------------------------------------------------------------
function isSoundEnabled() {
  const toggle = document.getElementById('soundChimeToggle');
  return !toggle || toggle.checked;
}

// Prehrá buď skutočnú nahrávku zo zložky ./audio/, alebo Edge Neural hlas
function playRealisticVoice(text, audioKey, onDone, isPhoneEffect = false) {
  let finished = false;
  const finish = () => {
    if (!finished) {
      finished = true;
      if (onDone) onDone();
    }
  };

  // 1. Skúsime prehrať reálny štúdiový MP3 súbor, ak existuje v ./audio/
  if (audioKey) {
    const localAudio = new Audio(`./audio/${audioKey}.mp3`);
    localAudio.onended = finish;
    localAudio.onerror = () => {
      // Ak MP3 nie je stiahnuté, použijeme najlepší neurónový hlas v prehliadači
      speakWithBestNeuralVoice(text, finish, isPhoneEffect);
    };

    const promise = localAudio.play();
    if (promise !== undefined) {
      promise.catch(() => {
        speakWithBestNeuralVoice(text, finish, isPhoneEffect);
      });
      return;
    }
  }

  // 2. Fallback: Edge Neural Voice
  speakWithBestNeuralVoice(text, finish, isPhoneEffect);
}

function speakWithBestNeuralVoice(text, onDone, isPhoneEffect = false) {
  if (!('speechSynthesis' in window)) { if (onDone) onDone(); return; }
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  // Priorita: Microsoft Lukas Online (Natural) alebo Microsoft Viktoria Online
  const lukas = voices.find(v => v.name.includes('Lukas') || (v.lang.startsWith('sk') && v.name.includes('Natural')));
  const viktoria = voices.find(v => v.name.includes('Viktoria') || (v.lang.startsWith('sk') && v.name.includes('Online')));
  const anySk = voices.find(v => v.lang.startsWith('sk') || v.lang.includes('SK'));

  if (lukas) {
    utter.voice = lukas;
  } else if (viktoria) {
    utter.voice = viktoria;
  } else if (anySk) {
    utter.voice = anySk;
  }

  utter.rate = 1.12;
  utter.pitch = 1.0;

  let ended = false;
  const finish = () => { if (!ended) { ended = true; if (onDone) onDone(); } };
  utter.onend = finish;
  utter.onerror = finish;
  setTimeout(finish, 6000);

  window.speechSynthesis.speak(utter);
}

// Autentický európsky tón telefónu (425 Hz)
let phoneRingTimer = null;
function startPhoneRinging() {
  stopPhoneRinging();
  if (!isSoundEnabled()) return;

  const ringTone = () => {
    if (!audioCtx || !isSoundEnabled()) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.setValueAtTime(0.18, now + 0.95);
      gain.gain.linearRampToValueAtTime(0.001, now + 1.0);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 1.05);
    } catch (e) {}
  };

  ringTone();
  phoneRingTimer = setInterval(ringTone, 3000); // 1s zvonenie, 2s ticho
}

function stopPhoneRinging() {
  if (phoneRingTimer) {
    clearInterval(phoneRingTimer);
    phoneRingTimer = null;
  }
}

// Jemný meditatívny gong pri nádychu / výdychu
function playZenChime(isHigh = false) {
  if (!audioCtx || !isSoundEnabled()) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHigh ? 587.33 : 440, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.95);
  } catch (e) {}
}

// ----------------------------------------------------------------------------
// 4. DÁTA POKROKU (LOCALSTORAGE)
// ----------------------------------------------------------------------------
let currentCategory = 'vowels';
let currentWordIndex = 0;
let userStreak = 1;
let todayCompleted = 0;
let todaySoftOnsets = 0;
let phonemeStats = {};

function loadProgress() {
  try {
    const savedStreak = localStorage.getItem('fl_streak');
    if (savedStreak) userStreak = parseInt(savedStreak, 10);
    const savedToday = localStorage.getItem('fl_today');
    if (savedToday) todayCompleted = parseInt(savedToday, 10);
    const savedSoft = localStorage.getItem('fl_soft');
    if (savedSoft) todaySoftOnsets = parseInt(savedSoft, 10);
    const savedPhonemes = localStorage.getItem('fl_phonemes');
    if (savedPhonemes) phonemeStats = JSON.parse(savedPhonemes);
  } catch (e) {}

  PHONEMES_MAP.forEach(p => {
    if (!phonemeStats[p]) phonemeStats[p] = { attempts: 0, soft: 0 };
  });

  updateProgressUi();
}

function saveProgress() {
  try {
    localStorage.setItem('fl_streak', String(userStreak));
    localStorage.setItem('fl_today', String(todayCompleted));
    localStorage.setItem('fl_soft', String(todaySoftOnsets));
    localStorage.setItem('fl_phonemes', JSON.stringify(phonemeStats));
  } catch (e) {}
  updateProgressUi();
}

function updateProgressUi() {
  document.getElementById('streakCountText').textContent = `${userStreak} ${userStreak === 1 ? 'deň' : (userStreak < 5 ? 'dni' : 'dní')}`;
  document.getElementById('statCompletedToday').textContent = todayCompleted;
  document.getElementById('statSoftOnsets').textContent = todaySoftOnsets;

  const rate = todayCompleted > 0 ? Math.round((todaySoftOnsets / todayCompleted) * 100) : 100;
  document.getElementById('statSuccessRate').textContent = `${rate}%`;

  renderPhonemeGrid();
}

function renderPhonemeGrid() {
  const grid = document.getElementById('phonemeChipsGrid');
  if (!grid) return;

  grid.innerHTML = PHONEMES_MAP.map(p => {
    const data = phonemeStats[p] || { attempts: 0, soft: 0 };
    let statusClass = '';
    let pctText = '-';

    if (data.attempts > 0) {
      const pct = Math.round((data.soft / data.attempts) * 100);
      pctText = `${pct}%`;
      if (pct >= 80 && data.attempts >= 4) statusClass = 'mastered';
      else if (pct >= 50) statusClass = 'good';
      else statusClass = 'warn';
    }

    return `
      <div class="phoneme-chip ${statusClass}" data-phoneme="${p}" title="Trénovať hlásku ${p}">
        <div class="phoneme-chip-letter">${p}</div>
        <div class="phoneme-chip-pct">${pctText}</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.phoneme-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const letter = chip.dataset.phoneme;
      setCustomWordByLetter(letter);
      switchTab('training');
    });
  });
}

function setCustomWordByLetter(letter) {
  for (const cat of Object.keys(CATEGORY_WORDS)) {
    const found = CATEGORY_WORDS[cat].find(item => item.word.toUpperCase().startsWith(letter));
    if (found) {
      setWord(found.word, found.hint);
      return;
    }
  }
  setWord(letter + 'auto', `Tréning mäkkého nábehu na hlásku ${letter}.`);
}

// ----------------------------------------------------------------------------
// 5. TRÉNING: SLOVÁ & ZEN PACER
// ----------------------------------------------------------------------------
const exerciseWordEl = document.getElementById('exerciseWord');
const exerciseTipEl = document.getElementById('exerciseTip');
const wordMetaBadgeEl = document.getElementById('wordMetaBadge');

const pacerStage = document.getElementById('pacerStage');
const pacerLabel = document.getElementById('pacerLabel');
const pacerSub = document.getElementById('pacerSub');
const pacerIcon = document.getElementById('pacerIcon');

const startExerciseBtn = document.getElementById('startExerciseBtn');
const startBtnText = document.getElementById('startBtnText');
const cancelExerciseBtn = document.getElementById('cancelExerciseBtn');

const prevWordBtn = document.getElementById('prevWordBtn');
const nextWordBtn = document.getElementById('nextWordBtn');
const shuffleWordBtn = document.getElementById('shuffleWordBtn');

const resultCard = document.getElementById('resultCard');
const resultNextBtn = document.getElementById('resultNextBtn');

const userNameBar = document.getElementById('userNameBar');
const userNameInput = document.getElementById('userNameInput');
const saveUserNameBtn = document.getElementById('saveUserNameBtn');

let activeWord = 'Auto';
let exerciseState = 'idle';
let sessionTimer = null;
let captureInterval = null;
let activeRecordedFrames = [];
let activeRecordT0 = 0;

const finishEarlyBtn = document.getElementById('finishEarlyBtn');

function setWord(word, hint = '') {
  activeWord = word;
  exerciseWordEl.textContent = word.toUpperCase();
  const meta = analyzePhonetics(word);
  wordMetaBadgeEl.textContent = meta.label;
  exerciseTipEl.textContent = hint || 'Uvoľni sánku a pred prvou hláskou jemne vydýchni.';
  resultCard.classList.remove('active');
  resetPacerState();
}

function resetPacerState() {
  if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
  if (captureInterval) { clearInterval(captureInterval); captureInterval = null; }
  exerciseState = 'idle';
  pacerStage.className = 'pacer-stage';
  pacerIcon.textContent = '🌬️';
  pacerLabel.textContent = 'Ťukni pre štart';
  const isSentence = activeWord && activeWord.trim().includes(' ') && activeWord.trim().length > 15;
  pacerSub.textContent = isSentence ? '2.2s nádych • 8.5s celá odpoveď' : '2.2s nádych • 2.5s hovor';
  startBtnText.textContent = 'Začať pokus';
  startExerciseBtn.disabled = false;
  cancelExerciseBtn.style.display = 'none';
  if (finishEarlyBtn) finishEarlyBtn.style.display = 'none';
}

// Spustenie dychového cyklu (Zen Pacer)
async function startTrainingAttempt() {
  if (exerciseState !== 'idle') return;

  try {
    if (!isCalibrated) await runCalibration();
    await setupAudio();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  } catch (e) {
    alert(e.message);
    return;
  }

  const isSentence = activeWord && activeWord.trim().includes(' ') && activeWord.trim().length > 15;
  const captureMs = isSentence ? 8500 : 2500;

  resultCard.classList.remove('active');
  exerciseState = 'inhale';
  startExerciseBtn.disabled = true;
  cancelExerciseBtn.style.display = 'inline-flex';
  if (finishEarlyBtn) finishEarlyBtn.style.display = 'none';

  // FÁZA 1: NÁDYCH (2.2 sekundy)
  pacerStage.className = 'pacer-stage inhale';
  pacerIcon.textContent = '🫁';
  pacerLabel.textContent = 'Hlboký nádych...';
  pacerSub.textContent = 'Uvoľni dolnú sánku a ramená';
  playZenChime(false);

  sessionTimer = setTimeout(() => {
    // FÁZA 2: VÝDYCH & HOVOR (dynamická dĺžka podľa dĺžky textu)
    exerciseState = 'speak';
    pacerStage.className = 'pacer-stage speak';
    pacerIcon.textContent = '🗣️';
    pacerLabel.textContent = 'Hovor uvoľnene!';
    pacerSub.textContent = isSentence ? 'Hovor celú odpoveď plynulým pokojným tempom' : 'Plynulý mäkký tón bez kŕča';
    if (finishEarlyBtn) finishEarlyBtn.style.display = 'inline-flex';
    playZenChime(true);

    const meta = analyzePhonetics(activeWord);
    recordAndEvaluateSpeech(meta, captureMs);
  }, 2200);
}

pacerStage.addEventListener('click', () => {
  if (exerciseState === 'idle') startTrainingAttempt();
});

startExerciseBtn.addEventListener('click', startTrainingAttempt);

cancelExerciseBtn.addEventListener('click', () => {
  resetPacerState();
  resultCard.classList.remove('active');
});

if (finishEarlyBtn) {
  finishEarlyBtn.addEventListener('click', () => {
    if (captureInterval) {
      clearInterval(captureInterval);
      captureInterval = null;
      const elapsed = performance.now() - activeRecordT0;
      resetPacerState();
      const meta = analyzePhonetics(activeWord);
      evaluateAttempt(activeRecordedFrames, meta, elapsed);
    }
  });
}

// Zber a vyhodnotenie zvuku
function recordAndEvaluateSpeech(meta, captureMs = 2500) {
  activeRecordedFrames = [];
  const rawBuf = new Float32Array(rawAnalyser.fftSize);
  const formantBuf = new Float32Array(formantAnalyser.fftSize);
  activeRecordT0 = performance.now();

  captureInterval = setInterval(() => {
    const elapsed = performance.now() - activeRecordT0;
    rawAnalyser.getFloatTimeDomainData(rawBuf);
    formantAnalyser.getFloatTimeDomainData(formantBuf);

    const rStat = computeRms(rawBuf);

    activeRecordedFrames.push({
      t: elapsed,
      rawDb: rStat.db,
      rawRms: rStat.rms,
      fDb: computeRms(formantBuf).db,
      fRms: computeRms(formantBuf).rms,
      dPrime: computePeriodicity(rawBuf, audioCtx.sampleRate)
    });

    if (elapsed >= captureMs) {
      clearInterval(captureInterval);
      captureInterval = null;
      resetPacerState();
      evaluateAttempt(activeRecordedFrames, meta, captureMs);
    }
  }, 12);
}

// Klinické vyhodnotenie pokusu
function evaluateAttempt(frames, meta, captureMs = 2500) {
  const sThresh = noiseDb + 8;
  const nThresh = noiseDb + 14;
  const firstSound = frames.findIndex(f => f.rawDb > sThresh);

  const initialLetter = meta.initial || 'A';
  if (!phonemeStats[initialLetter]) phonemeStats[initialLetter] = { attempts: 0, soft: 0 };
  phonemeStats[initialLetter].attempts += 1;
  todayCompleted += 1;

  if (firstSound === -1) {
    showResultCard(
      'fail',
      '⚠️ Tichý blok (zaseknutie)',
      'Hrdlo sa na začiatku zovrelo a nepustilo vzduch. Pred slovom si predstav tiché vydýchnutie (ako písmeno H).',
      '> 2000 ms',
      '-',
      'Ticho'
    );
    saveProgress();
    return;
  }

  const nucleus = frames.findIndex((f, i) => i >= firstSound && f.fDb > nThresh && f.dPrime < 0.28);
  if (nucleus === -1) {
    showResultCard(
      'warn',
      '⚠️ Slabá rezonancia',
      'Zvuk bol príliš tichý alebo neistý. Skús slovo vysloviť s plnším, uvoľneným dychom.',
      '> 1500 ms',
      '-',
      'Neistý'
    );
    saveProgress();
    return;
  }

  const latency = frames[firstSound].t;

  const searchEndIdx = Math.min(frames.length - 1, nucleus + 28);
  let peakRms = 0, peakIdx = nucleus;
  for (let i = nucleus; i <= searchEndIdx; i++) {
    if (frames[i].fRms > peakRms) { peakRms = frames[i].fRms; peakIdx = i; }
  }
  const r20 = peakRms * 0.20, r80 = peakRms * 0.80;
  let t20 = frames[nucleus].t, t80 = frames[peakIdx].t;
  for (let i = Math.max(0, nucleus - 3); i <= peakIdx; i++) {
    if (frames[i].fRms >= r20) { t20 = frames[i].t; break; }
  }
  for (let i = Math.max(0, nucleus - 3); i <= peakIdx; i++) {
    if (frames[i].fRms >= r80) { t80 = frames[i].t; break; }
  }
  const vrt = Math.max(14, t80 - t20);

  let cleanStart = true;
  let plosiveBlocked = false;
  let vowelCheat = false;

  if (meta.type === 'voiceless') {
    const preNucleus = frames.slice(firstSound, Math.max(firstSound + 1, nucleus));
    vowelCheat = preNucleus.some(f => f.dPrime < 0.22 && f.fDb > nThresh);
    const burstDuration = frames[nucleus].t - frames[firstSound].t;

    if (burstDuration > 170) {
      plosiveBlocked = true;
      cleanStart = false;
    }
    if (vowelCheat || (burstDuration < 20 && frames[firstSound].dPrime < 0.25)) {
      cleanStart = false;
    }
  }

  const isVrtSoft = (meta.type === 'vowel') ? (vrt >= 55 && vrt <= 150) : true;
  const isLatencyGood = (latency <= 550);

  if (isVrtSoft && isLatencyGood && cleanStart) {
    todaySoftOnsets += 1;
    phonemeStats[initialLetter].soft += 1;

    const successTitle = (captureMs > 3000) ? '✅ Krásna plynulá veta!' : '✅ Krásny mäkký nábeh!';
    const successAdvice = (captureMs > 3000)
      ? 'Zvládol si udržať uvoľnený hrtan a plynulý dych počas celej vety.'
      : 'Hlasivky nabehli plynulo a uvoľnene bez tvrdého úderu alebo kŕča.';

    showResultCard(
      'good',
      successTitle,
      successAdvice,
      `${latency.toFixed(0)} ms`,
      `${vrt.toFixed(0)} ms`,
      'Čistý'
    );
  } else {
    let advice = 'Hlasivky sa zopli trochu tvrdo. Pred prvou hláskou si predstav jemný výdych.';
    if (!isLatencyGood) {
      advice = 'Reakcia bola oneskorená (váhanie alebo tichý blok). Uvoľni dolnú sánku o niečo skôr.';
    } else if (vowelCheat) {
      advice = 'Zaznamenaná pomocná barlička („Eee...“). Skús začať slovo priamo z ticha.';
    } else if (plosiveBlocked) {
      advice = 'Tichá pauza po prvej hláske (kŕč). Spoj spoluhlásku a samohlásku do jedného dychu!';
    }

    const cleanLabel = !cleanStart ? (vowelCheat ? 'Barlička' : 'Tichá diera') : 'Tvrdší ráz';
    showResultCard(
      'warn',
      '💡 Skús ešte jemnejší štart',
      advice,
      `${latency.toFixed(0)} ms`,
      `${vrt.toFixed(0)} ms`,
      cleanLabel
    );
  }

  saveProgress();
}

function showResultCard(status, title, advice, latencyText, vrtText, cleanText) {
  resultCard.className = `result-card active ${status}`;
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultAdvice').textContent = advice;
  document.getElementById('resultBadgeIcon').textContent = (status === 'good') ? '✅' : (status === 'warn' ? '💡' : '⚠️');

  const vrtEl = document.getElementById('metricVrtVal');
  const vrtStatusEl = document.getElementById('metricVrtStatus');
  vrtEl.textContent = vrtText;
  vrtStatusEl.textContent = (status === 'good') ? 'Mäkký' : (status === 'warn' ? 'Tvrdší' : '-');
  vrtStatusEl.className = `metric-status ${status}`;

  const latEl = document.getElementById('metricLatencyVal');
  const latStatusEl = document.getElementById('metricLatencyStatus');
  latEl.textContent = latencyText;
  latStatusEl.textContent = (status === 'good') ? 'Plynulý' : 'Zdržanie';
  latStatusEl.className = `metric-status ${status}`;

  const cleanEl = document.getElementById('metricCleanVal');
  const cleanStatusEl = document.getElementById('metricCleanStatus');
  cleanEl.textContent = cleanText;
  cleanStatusEl.textContent = (cleanText === 'Čistý') ? 'Bez chyby' : 'Pozor';
  cleanStatusEl.className = `metric-status ${status}`;

  resultNextBtn.onclick = () => {
    cycleWord(1);
  };
}

// Prepínanie kategórií
document.querySelectorAll('.category-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentCategory = chip.dataset.cat;
    currentWordIndex = 0;

    if (currentCategory === 'name') {
      userNameBar.style.display = 'flex';
      userNameInput.value = getUserName();
      updateNameCategoryWords();
    } else {
      userNameBar.style.display = 'none';
    }

    const list = CATEGORY_WORDS[currentCategory] || CATEGORY_WORDS.vowels;
    const item = list[0];
    setWord(item.word, item.hint);
  });
});

if (saveUserNameBtn && userNameInput) {
  saveUserNameBtn.addEventListener('click', () => {
    const val = userNameInput.value.trim();
    if (val) {
      saveUserName(val);
      saveUserNameBtn.textContent = 'Uložené ✓';
      setTimeout(() => { saveUserNameBtn.textContent = 'Uložiť'; }, 1500);
    }
  });

  userNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveUserNameBtn.click();
  });
}

function cycleWord(direction = 1) {
  const list = CATEGORY_WORDS[currentCategory] || CATEGORY_WORDS.vowels;
  if (direction === 0) {
    currentWordIndex = Math.floor(Math.random() * list.length);
  } else {
    currentWordIndex = (currentWordIndex + direction + list.length) % list.length;
  }
  const item = list[currentWordIndex];
  setWord(item.word, item.hint);
}

prevWordBtn.addEventListener('click', () => cycleWord(-1));
nextWordBtn.addEventListener('click', () => cycleWord(1));
shuffleWordBtn.addEventListener('click', () => cycleWord(0));

// ----------------------------------------------------------------------------
// 6. SIMULÁCIE (REÁLNY ŽIVOT & PREPADOVÝ HOVOR)
// ----------------------------------------------------------------------------
const callModal = document.getElementById('callModal');
const simAvatar = document.getElementById('simAvatar');
const simCallerName = document.getElementById('simCallerName');
const simCallStatus = document.getElementById('simCallStatus');
const simTargetPrompt = document.getElementById('simTargetPrompt');
const simTargetWord = document.getElementById('simTargetWord');
const simAnswerBtn = document.getElementById('simAnswerBtn');
const simDeclineBtn = document.getElementById('simDeclineBtn');

let activeSimType = null;

const SIMULATION_DATA = {
  courier: {
    name: 'Kuriér Packeta',
    avatar: '📦',
    prompt: 'Kuriér sa pýta na vchod a poschodie. Odpovedz:',
    getTarget: () => '„Dobrý deň, je to ten druhý vchod vedľa potravín, bývam na treťom poschodí vpravo a hneď vám idem zbehnúť dole otvoriť.“',
    spokenQuestion: 'Dobrý deň, tu je kuriér Packeta, stojím pred vašou bytovkou, ale na bráne nevidím vaše meno a nefunguje zvonček. Viete mi prosím popísať, ktorý je to vchod a na ktorom poschodí vás nájdem?',
    audioKey: 'courier',
    getAnswerWord: () => 'Dobrý deň, je to ten druhý vchod vedľa potravín, bývam na treťom poschodí vpravo a hneď vám idem zbehnúť dole otvoriť.'
  },
  cashier: {
    name: 'Pokladňa v obchode',
    avatar: '🛒',
    prompt: 'Predavačka nemá kód. Vysvetli kde to bolo a cenu:',
    getTarget: () => '„Dobrý deň, zobral som to zo stredného regálu pri pečive a na cenovke bolo napísané dve eurá a päťdesiat centov.“',
    spokenQuestion: 'Dobrý deň, tento výrobok mi systém nevie načítať a chýba na ňom cenovka. Viete mi prosím povedať, z ktorého regálu ste ho zobrali a koľko tam bola uvedená cena?',
    audioKey: 'cashier',
    getAnswerWord: () => 'Dobrý deň, zobral som to zo stredného regálu pri pečive a na cenovke bolo napísané dve eurá a päťdesiat centov.'
  },
  doctor: {
    name: 'Recepcia u lekára',
    avatar: '💼',
    prompt: 'Povedz svoje meno a popíš konkrétne ťažkosti:',
    getTarget: () => `„Dobrý deň, moje meno je ${getUserName()} a prišiel som preto, lebo ma už tretí deň silno bolí hrdlo a mám zvýšenú teplotu.“`,
    spokenQuestion: 'Dobrý deň, posaďte sa. Povedzte mi prosím vaše celé meno a popíšte mi, aké konkrétne zdravotné ťažkosti vás k nám dnes privádzajú?',
    audioKey: 'interview',
    getAnswerWord: () => `Dobrý deň, moje meno je ${getUserName()} a prišiel som preto, lebo ma už tretí deň silno bolí hrdlo a mám zvýšenú teplotu.`
  },
  mechanic: {
    name: 'Autoservis',
    avatar: '🔧',
    prompt: 'Popíš poruchu na aute a kedy ho privezieš:',
    getTarget: () => '„Dobrý deň, pri štartovaní mi motor zvláštne klepe a svieti červená kontrolka, vedel by som auto pristaviť zajtra ráno okolo ôsmej.“',
    spokenQuestion: 'Dobrý deň, autoservis, počúvam vás. Viete mi prosím popísať, čo presne sa stalo s vaším autom a kedy by ste ho vedeli priniesť?',
    audioKey: 'mechanic',
    getAnswerWord: () => 'Dobrý deň, pri štartovaní mi motor zvláštne klepe a svieti červená kontrolka, vedel by som auto pristaviť zajtra ráno okolo ôsmej.'
  }
};

document.querySelectorAll('[data-start-sim]').forEach(btn => {
  btn.addEventListener('click', () => {
    const simKey = btn.dataset.startSim;
    startSimulation(simKey);
  });
});

function startSimulation(key) {
  const data = SIMULATION_DATA[key];
  if (!data) return;

  activeSimType = key;
  simAvatar.textContent = data.avatar;
  simCallerName.textContent = data.name;
  simCallStatus.textContent = 'Prichádzajúci hovor...';
  simTargetPrompt.textContent = data.prompt;
  simTargetWord.textContent = data.getTarget();

  callModal.classList.add('active');
  startPhoneRinging();

  simAnswerBtn.onclick = async () => {
    stopPhoneRinging();
    simCallStatus.textContent = 'Hovor prebieha... Počúvaj otázku.';
    simAnswerBtn.disabled = true;

    playRealisticVoice(data.spokenQuestion, data.audioKey, () => {
      simCallStatus.textContent = 'Odpovedz teraz s mäkkým nábehom!';
      setWord(data.getAnswerWord(), 'Odpovedz plynulo s uvoľneným hrdlom.');
      callModal.classList.remove('active');
      switchTab('training');
      startTrainingAttempt();
    }, true);
  };

  simDeclineBtn.onclick = () => {
    stopPhoneRinging();
    callModal.classList.remove('active');
  };
}

// ----------------------------------------------------------------------------
// 7. AKUSTICKÁ KALIBRÁCIA (MERANIE TICHA)
// ----------------------------------------------------------------------------
async function runCalibration() {
  const label = document.getElementById('noiseLevelLabel');
  try {
    if (label) label.textContent = 'Meriam hluk v miestnosti (1 sekunda)...';
    await setupAudio();
    const buf = new Float32Array(rawAnalyser.fftSize);
    const readings = [];
    const tStart = performance.now();

    await new Promise((resolve) => {
      const timer = setInterval(() => {
        rawAnalyser.getFloatTimeDomainData(buf);
        readings.push(computeRms(buf).db);
        if (performance.now() - tStart >= 1000) {
          clearInterval(timer);
          readings.sort((a, b) => a - b);
          noiseDb = readings[Math.floor(readings.length * 0.6)];
          resolve();
        }
      }, 25);
    });

    isCalibrated = true;
    const quality = noiseDb < -55 ? 'Výborné' : (noiseDb < -45 ? 'Dobré' : 'Hlučnejšie');
    if (label) label.textContent = `Hluk prostredia: ${noiseDb.toFixed(1)} dB (${quality})`;
  } catch (e) {
    if (label) label.textContent = 'Chyba mikrofónu: ' + e.message;
  }
}

const runCalibBtn = document.getElementById('runCalibrationBtn');
if (runCalibBtn) runCalibBtn.addEventListener('click', runCalibration);

const resetStatsBtn = document.getElementById('resetStatsBtn');
if (resetStatsBtn) {
  resetStatsBtn.addEventListener('click', () => {
    if (confirm('Naozaj chceš vymazať históriu cvičení a štatistiky?')) {
      localStorage.clear();
      userStreak = 1;
      todayCompleted = 0;
      todaySoftOnsets = 0;
      phonemeStats = {};
      saveProgress();
      alert('História bola resetovaná.');
    }
  });
}

// ----------------------------------------------------------------------------
// 8. NAVIGÁCIA (SPODNÉ MENU) & MOTÍV
// ----------------------------------------------------------------------------
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.dataset.tab === tabId) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
  const target = document.getElementById(`view-${tabId}`);
  if (target) target.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  themeIcon.textContent = next === 'dark' ? '🌓' : '☀️';
  try {
    localStorage.setItem('fl_theme', next);
  } catch (e) {}
});

// ----------------------------------------------------------------------------
// 9. ŠTART APLIKÁCIE
// ----------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('fl_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeIcon.textContent = savedTheme === 'dark' ? '🌓' : '☀️';

  updateNameCategoryWords();
  loadProgress();
  setWord('Auto', 'Pomalé a mäkké otvorenie úst bez zovretia hrtanu.');
});
