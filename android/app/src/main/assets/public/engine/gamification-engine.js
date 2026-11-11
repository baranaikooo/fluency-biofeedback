/**
 * FLUENCY BIOFEEDBACK - DUOLINGO & STAMURAI GAMIFICATION ENGINE v2.0
 * 1. Spodná navigácia s 3 záložkami (Cesta, Rýchly Dril, Telemetria)
 * 2. Dva striktne oddelené stavy (Prieskum vs. Celoobrazovkový Full-Screen Focus Mode)
 * 3. Rotácia chýb (Mistake Rotation), Web Audio syntetizér radostných zvukov
 * 4. Plná integrácia s dsp-core.js a telemetria VRT
 */

// ============================================================================
// 1. DÁTOVÝ MODEL: 5 SVETOV A 25 ÚROVNÍ (BOSS FIGHTY VÝLUČNE TU!)
// ============================================================================
const WORLDS_DATA = [
  {
    id: 1,
    title: "Jemný začiatok",
    subtitle: "Daj prvým slovám trochu priestoru.",
    color: "#10b981", // Emerald
    lipColor: "#059669",
    icon: "🌱",
    levels: [
      {
        id: "1.1",
        title: "Úvod do A a O",
        desc: "Voliteľne si vyskúšaj jemný začiatok samohlások A a O.",
        mode: "standard",
        words: ["Auto", "Otec", "Áno", "Oko"],
        xp: 30,
        icon: "⭐",
      },
      {
        id: "1.2",
        title: "Predné samohlásky E a I",
        desc: "Uvoľnenie koreňa jazyka a mäkký začiatok na hláskach E a I.",
        mode: "standard",
        words: ["Isto", "Echo", "Iba", "Ešte"],
        xp: 35,
        icon: "💬",
      },
      {
        id: "1.3",
        title: "Zaokrúhlené samohlásky U a Ô",
        desc: "Kontrola pier a uvoľnený výdychový prúd na hláskach U a Ô.",
        mode: "standard",
        words: ["Ulica", "Úrad", "Ôsmy", "Úsmev"],
        xp: 35,
        icon: "🎯",
      },
      {
        id: "1.4",
        title: "Mená a dychový únik",
        desc: "Prevencia pred fúknutím do mikrofónu pred začiatkom reči.",
        mode: "standard",
        words: ["Alain", "Andrea", "Oliver", "Igor"],
        xp: 40,
        icon: "⚡",
      },
      {
        id: "1.5",
        title: "Boss 1: Samohláskový Majster",
        desc: "Vyvrcholenie 1. sveta: zmes náročných slov so samohláskovým nábehom.",
        mode: "standard",
        words: ["Autobus", "Inštitút", "Ekonomika", "Úspešný"],
        xp: 55,
        isBoss: true,
        icon: "👑",
      },
    ],
  },
  {
    id: 2,
    title: "Nájdi svoj rytmus",
    subtitle: "Spájaj hlásky bez náhlenia.",
    color: "#0ea5e9", // Sky Blue
    lipColor: "#0284c7",
    icon: "🌊",
    levels: [
      {
        id: "2.1",
        title: "Nosové znelé: M a N",
        desc: "Využitie nazálnej rezonancie ako bezpečného štartu fonácie.",
        mode: "standard",
        words: ["Mama", "Noviny", "Mesto", "Noc"],
        xp: 35,
        icon: "⭐",
      },
      {
        id: "2.2",
        title: "Znelé frikatívy: V a Z",
        desc: "Plynulý prechod z trenia do samohlásky bez zárazu v hrdle.",
        mode: "standard",
        words: ["Voda", "Zima", "Včera", "Zelená"],
        xp: 35,
        icon: "💬",
      },
      {
        id: "2.3",
        title: "Likvidy a slabikotvorné R a L",
        desc: "Správna koartikulácia a znelosť pri slovenských slabikách.",
        mode: "standard",
        words: ["Lampa", "Ruka", "Krk", "Vlk"],
        xp: 40,
        icon: "🎯",
      },
      {
        id: "2.4",
        title: "Znelé explozívy: B, D, G",
        desc: "Ľahký kontakt pier a jazyka pred uvoľnením vzduchu.",
        mode: "standard",
        words: ["Brat", "Dom", "Gombík", "Dobrý"],
        xp: 40,
        icon: "⚡",
      },
      {
        id: "2.5",
        title: "Boss 2: Resonančný Majster",
        desc: "Zložité znelé slová s viacnásobnými prechodmi fonácie.",
        mode: "standard",
        words: ["Bratislava", "Vynikajúci", "Medicína", "Dovolenka"],
        xp: 65,
        isBoss: true,
        icon: "👑",
      },
    ],
  },
  {
    id: 3,
    title: "S menším napätím",
    subtitle: "Aj náročné slová môžu začať jemne.",
    color: "#f59e0b", // Amber
    lipColor: "#d97706",
    icon: "🛡️",
    levels: [
      {
        id: "3.1",
        title: "Neznelé plozívy: P a T",
        desc: "Zákaz znelého 'Eee' pred výbuchom hlásky. Čistý štart.",
        mode: "standard",
        words: ["Pivo", "Topánka", "Peter", "Ticho"],
        xp: 40,
        icon: "⭐",
      },
      {
        id: "3.2",
        title: "Tvrdá velára K a digraf CH",
        desc: "Vyskúšaj ľahký kontakt pri tvorení spoluhlások.",
        mode: "standard",
        words: ["Káva", "Chlieb", "Kľúč", "Chlapec"],
        xp: 40,
        icon: "💬",
      },
      {
        id: "3.3",
        title: "Sykavkové zhluky: S, Š, C, Č",
        desc: "Dlhá neznelá frikcia bez predčasného zovretia hlasiviek.",
        mode: "standard",
        words: ["Škola", "Stôl", "Spolu", "Cesta"],
        xp: 45,
        icon: "🎯",
      },
      {
        id: "3.4",
        title: "Náročné zhluky (Štvrtok, Kto)",
        desc: "Zvládnutie troch spoluhlások za sebou s adaptívnym limitom.",
        mode: "standard",
        words: ["Štvrtok", "Kto", "Pstruh", "Vstup"],
        xp: 45,
        icon: "⚡",
      },
      {
        id: "3.5",
        title: "Boss 3: Plozívny Majster",
        desc: "Komplexné slová s plozívami bez jediného zárazu sánky.",
        mode: "standard",
        words: ["Knižnica", "Prezident", "Trenčín", "Čokoláda"],
        xp: 75,
        isBoss: true,
        icon: "👑",
      },
    ],
  },
  {
    id: 4,
    title: "Malé rozhovory",
    subtitle: "Nacvič si bežný deň.",
    color: "#8b5cf6", // Purple
    lipColor: "#7c3aed",
    icon: "🛒",
    levels: [
      {
        id: "4.1",
        title: "'Hotovosť alebo karta?'",
        desc: "Vypočuj si otázku a odpovedz vlastnými slovami.",
        mode: "guillotine",
        scenarioIndex: 1, // Cashier
        ambushCategory: "pokladna",
        words: ["Kartou, prosím"],
        xp: 45,
        icon: "💳",
      },
      {
        id: "4.2",
        title: "'Máte zákaznícku kartu?'",
        desc: "Rýchla odpoveď na nečakanú otázku v rade pri pokladni.",
        mode: "guillotine",
        scenarioIndex: 1,
        ambushCategory: "pokladna",
        words: ["Nemám, ďakujem"],
        xp: 45,
        icon: "💬",
      },
      {
        id: "4.3",
        title: "'Bloček si prosíte?'",
        desc: "Na otázku o bločku odpovedz podľa seba.",
        mode: "guillotine",
        scenarioIndex: 1,
        ambushCategory: "pokladna",
        words: ["Áno, poprosím"],
        xp: 50,
        icon: "🧾",
      },
      {
        id: "4.4",
        title: "'Budete chcieť aj tašku?'",
        desc: "Rozhodni sa podľa seba a odpovedz vlastnými slovami.",
        mode: "guillotine",
        scenarioIndex: 1,
        ambushCategory: "pokladna",
        words: ["Nie, mám vlastnú"],
        xp: 50,
        icon: "🛍️",
      },
      {
        id: "4.5",
        title: "Boss 4: Rýchla pokladňa Dialóg",
        desc: "Kompletný dialóg v obchode pod časovým stresom radu ľudí za tebou.",
        mode: "guillotine",
        scenarioIndex: 1,
        ambushCategory: "pokladna",
        words: ["Kartou", "Nemám kartu", "Bloček netreba", "Dovidenia"],
        xp: 85,
        isBoss: true,
        icon: "👑",
      },
    ],
  },
  {
    id: 5,
    title: "Odváž sa ozvať",
    subtitle: "Telefonáty aj nové stretnutia. Po svojom.",
    color: "#f43f5e", // Rose / Red
    lipColor: "#e11d48",
    icon: "📞",
    levels: [
      {
        id: "5.1",
        title: "Boss 1: Kuriér s balíkom",
        desc: "Telefón zazvoní. Zdvihni a predstav sa kuriérovi s mäkkým nábehom.",
        mode: "ambush",
        scenarioIndex: 0, // Courier
        ambushCategory: "kurier",
        words: ["Dobrý deň, pri telefóne"],
        xp: 65,
        icon: "📦",
      },
      {
        id: "5.2",
        title: "Boss 2: Zdravotná sestra / Ambulancia",
        desc: "Hovor do ambulancie: povedz podľa seba, čo potrebuješ.",
        mode: "ambush",
        scenarioIndex: 2, // Doctor
        ambushCategory: "lekar",
        words: ["Peter Novák, volám kvôli termínu"],
        xp: 75,
        icon: "🩺",
      },
      {
        id: "5.3",
        title: "Boss 3: Automechanik v servise",
        desc: "Hlučný hovor z dielne: vysvetli problém s autom uvoľnene.",
        mode: "ambush",
        scenarioIndex: 3, // Automechanik
        ambushCategory: "servis",
        words: ["Dobrý deň, volám ohľadom auta"],
        xp: 85,
        icon: "🔧",
      },
      {
        id: "5.4",
        title: "Boss 4: Zvonenie od kuriéra",
        desc: "Záverečný hovor s kuriérom bez prípravy.",
        mode: "ambush",
        scenarioIndex: 0,
        ambushCategory: "kurier",
        words: ["Áno, čakám balík, ďakujem"],
        xp: 100,
        icon: "👁️",
      },
      {
        id: "5.5",
        title: "Finálny šampión: Unblockable Champion",
        desc: "Záverečná certifikácia plynulosti reči pod maximálnym sociálnym tlakom.",
        mode: "ambush",
        scenarioIndex: 2,
        ambushCategory: "all",
        words: ["Ďakujem pekne za pomoc, prajem pekný deň"],
        xp: 150,
        isBoss: true,
        icon: "🏆",
      },
    ],
  },
];

// ============================================================================
// 2. SYNTHESIZER ZVUKOVÝCH EFEKTOV (WEB AUDIO CHIMES)
// ============================================================================
class DuoAudioFx {
  constructor() {
    this.ctx = null;
  }

  ensureContext() {
    if (!this.ctx && typeof audioCtx !== "undefined" && audioCtx) {
      this.ctx = audioCtx;
    } else if (!this.ctx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) this.ctx = new AudioClass();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, type = "sine", duration = 0.12, gainLevel = 0.15, delay = 0) {
    this.ensureContext();
    if (!this.ctx) return;

    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        console.warn("Audio FX error:", e);
      }
    }, delay * 1000);
  }

  playSuccess() {
    // Radostný akord C-dur (C5, E5, G5)
    this.playTone(523.25, "triangle", 0.14, 0.18, 0.0);
    this.playTone(659.25, "triangle", 0.16, 0.2, 0.08);
    this.playTone(783.99, "sine", 0.28, 0.22, 0.16);
  }

  playPerfect() {
    // Zlatý arpeggio fanfárový akord
    this.playTone(523.25, "triangle", 0.12, 0.18, 0.0);
    this.playTone(659.25, "triangle", 0.12, 0.2, 0.07);
    this.playTone(783.99, "triangle", 0.14, 0.22, 0.14);
    this.playTone(1046.5, "sine", 0.38, 0.25, 0.22);
  }

  playMistake() {
    // Jemný povzbudzujúci tón (žiadny drsný bzučiak)
    this.playTone(392.0, "sine", 0.18, 0.14, 0.0);
    this.playTone(329.63, "sine", 0.26, 0.16, 0.12);
  }

  playFanfare() {
    // Víťazná fanfára pri dokončení lekcie
    const notes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5];
    const times = [0.0, 0.1, 0.2, 0.32, 0.44, 0.6];
    const durs = [0.08, 0.08, 0.1, 0.12, 0.15, 0.55];

    notes.forEach((freq, idx) => {
      this.playTone(freq, "triangle", durs[idx], 0.24, times[idx]);
    });
  }
}

const duoSfx = new DuoAudioFx();

// ============================================================================
// 3. SPRÁVCA STAVU, TELEMETRIE A POKROKU (STATE & TELEMETRY)
// ============================================================================
const STORAGE_KEY = "fluency_duo_save_v3";
const HISTORY_KEY = "fluency_telemetry_history_v1";
const VAULT_KEY = "fluency_feared_words_v1";

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

class DuoStateManager {
  constructor() {
    this.state = this.loadState();
    this.history = this.loadHistory();
  }

  loadVaultWords() {
    try {
      const raw = localStorage.getItem(VAULT_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [
      {
        id: "fw_1",
        word: "Peter Novák",
        category: "Meno",
        successes: 0,
        attempts: 0,
        isMastered: false,
        date: new Date().toISOString().slice(0, 10),
      },
      {
        id: "fw_2",
        word: "Dve veľké kávy",
        category: "Kaviareň",
        successes: 0,
        attempts: 0,
        isMastered: false,
        date: new Date().toISOString().slice(0, 10),
      },
      {
        id: "fw_3",
        word: "Bratislava hlavná stanica",
        category: "Cestovanie",
        successes: 0,
        attempts: 0,
        isMastered: false,
        date: new Date().toISOString().slice(0, 10),
      },
    ];
  }

  saveVaultWords(words) {
    try {
      localStorage.setItem(VAULT_KEY, JSON.stringify(words));
    } catch (e) {
      console.warn("Chyba ukladania trezoru:", e);
    }
  }

  getDefaultState() {
    return {
      xp: 0,
      streak: 1,
      lives: 5,
      maxLives: 5,
      lastPlayedDate: new Date().toISOString().slice(0, 10),
      unlockedLevels: ["1.1"],
      completedLevels: {}, // { "1.1": { stars: 3, score: 100 } }
      userName: localStorage.getItem("fl_custom_name") || "Tvoj profil",
    };
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultState();
      const parsed = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.lastPlayedDate !== today) {
        const last = new Date(parsed.lastPlayedDate);
        const now = new Date(today);
        const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
          parsed.streak = 1;
        }
      }
      return { ...this.getDefaultState(), ...parsed };
    } catch (e) {
      console.warn("Chyba načítania stavu:", e);
      return this.getDefaultState();
    }
  }

  loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      localStorage.setItem("fl_custom_name", this.state.userName);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
      // Okamžitá synchronizácia s cloudom ak je používateľ prihlásený
      if (typeof window.fluencyAuth !== "undefined" && window.fluencyAuth.syncCloudProgress) {
        window.fluencyAuth.syncCloudProgress(this.state);
      }
    } catch (e) {
      console.warn("Chyba ukladania:", e);
    }
  }

  applyCloudState(cloudProfile) {
    if (!cloudProfile) return;
    let changed = false;

    // Synchronizácia XP (berieme vyššiu hodnotu)
    if (typeof cloudProfile.xp === "number" && cloudProfile.xp > this.state.xp) {
      this.state.xp = cloudProfile.xp;
      changed = true;
    }
    // Synchronizácia série dní (streak)
    if (typeof cloudProfile.streak === "number" && cloudProfile.streak > this.state.streak) {
      this.state.streak = cloudProfile.streak;
      changed = true;
    }
    // Meno používateľa
    const profileName = cloudProfile.preferred_name || cloudProfile.full_name;
    if (profileName && profileName !== this.state.userName) {
      this.state.userName = profileName;
      changed = true;
    }
    // Úrovne a postup
    if (cloudProfile.progress && typeof cloudProfile.progress === "object") {
      const p = cloudProfile.progress;
      if (Array.isArray(p.unlockedLevels) && p.unlockedLevels.length > 0) {
        const mergedUnlocked = Array.from(
          new Set([...this.state.unlockedLevels, ...p.unlockedLevels]),
        );
        if (mergedUnlocked.length > this.state.unlockedLevels.length) {
          this.state.unlockedLevels = mergedUnlocked;
          changed = true;
        }
      }
      if (p.completedLevels && typeof p.completedLevels === "object") {
        this.state.completedLevels = { ...this.state.completedLevels, ...p.completedLevels };
        changed = true;
      }
      if (typeof p.lives === "number") {
        this.state.lives = p.lives;
      }
    }

    if (changed) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        localStorage.setItem("fl_custom_name", this.state.userName);
      } catch (_) {}
      this.renderHud();
      if (typeof duoPath !== "undefined") duoPath.render();
      this.renderTelemetry();
      console.log("[Gamification] Cloud progres úspešne aplikovaný do lokálneho stavu");
    }
  }

  addAttemptRecord(record) {
    // Uložiť záznam do histórie telemetrie
    this.history.unshift(record);
    if (this.history.length > 50) this.history.pop();
    this.save();
    this.renderTelemetry();
  }

  addXp(points) {
    this.state.xp += points;
    this.save();
    this.renderHud();
  }

  isUnlocked(levelId) {
    return this.state.unlockedLevels.includes(levelId);
  }

  isCompleted(levelId) {
    return !!this.state.completedLevels[levelId];
  }

  completeLevel(levelId, xpGained, accuracy) {
    const today = new Date().toISOString().slice(0, 10);
    if (this.state.lastPlayedDate !== today) {
      this.state.streak += 1;
      this.state.lastPlayedDate = today;
    }

    this.state.xp += xpGained;

    const stars = accuracy >= 95 ? 3 : accuracy >= 75 ? 2 : 1;
    this.state.completedLevels[levelId] = {
      stars,
      score: accuracy,
      completedAt: new Date().toISOString(),
    };

    // Odomknutie ďalšieho levelu
    const nextId = this.findNextLevelId(levelId);
    if (nextId && !this.state.unlockedLevels.includes(nextId)) {
      this.state.unlockedLevels.push(nextId);
    }

    this.save();
    this.renderHud();
    this.renderTelemetry();
  }

  startAtRecommendedWorld(recWorldId) {
    const wNum = parseInt(recWorldId, 10) || 1;
    WORLDS_DATA.forEach((w) => {
      if (w.id < wNum) {
        w.levels.forEach((lvl) => {
          if (!this.state.unlockedLevels.includes(lvl.id)) {
            this.state.unlockedLevels.push(lvl.id);
          }
        });
      } else if (w.id === wNum) {
        const firstLevelId = `${wNum}.1`;
        if (!this.state.unlockedLevels.includes(firstLevelId)) {
          this.state.unlockedLevels.push(firstLevelId);
        }
      }
    });

    this.save();
    this.renderHud();
    this.renderTelemetry();

    if (typeof duoPath !== "undefined") {
      duoPath.render();
      setTimeout(() => {
        duoPath.scrollToWorld(wNum);
      }, 350);
    }
  }

  findNextLevelId(currentId) {
    let allLevels = [];
    WORLDS_DATA.forEach((w) => {
      w.levels.forEach((l) => allLevels.push(l.id));
    });
    const idx = allLevels.indexOf(currentId);
    if (idx !== -1 && idx + 1 < allLevels.length) {
      return allLevels[idx + 1];
    }
    return null;
  }

  getRank() {
    const xp = this.state.xp;
    if (xp < 250) return { title: "Začiatočník", level: 1 };
    if (xp < 750) return { title: "Rezonátor", level: 2 };
    if (xp < 1600) return { title: "Rečník plynulosti", level: 3 };
    if (xp < 3000) return { title: "Majster rytmu", level: 4 };
    return { title: "Nezastaviteľný rečník", level: 5 };
  }

  renderHud() {
    const streakEl = document.getElementById("streakVal");
    const xpEl = document.getElementById("xpVal");
    const heartsEl = document.getElementById("heartsVal");
    const rankEl = document.getElementById("rankTitle");

    if (streakEl) streakEl.textContent = this.state.streak;
    if (xpEl) xpEl.textContent = this.state.xp;
    if (heartsEl) heartsEl.textContent = this.state.lives;

    const rank = this.getRank();
    if (rankEl) rankEl.textContent = rank.title;
  }

  renderTelemetry() {
    // Meno a profil
    const nameInput = document.getElementById("telemetryNameInput");
    const rankTitle = document.getElementById("telemetryRankTitle");
    const xpVal = document.getElementById("telemetryXpVal");
    const streakVal = document.getElementById("telemetryStreakVal");
    const worldsVal = document.getElementById("telemetryWorldsVal");

    if (nameInput) nameInput.value = this.state.userName;
    const displayName = document.getElementById("telemetryDisplayName");
    if (displayName) displayName.textContent = this.state.userName;
    const rank = this.getRank();
    if (rankTitle) rankTitle.textContent = `Úroveň ${rank.level}: ${rank.title}`;
    if (xpVal) xpVal.textContent = `${this.state.xp}`;
    if (streakVal) streakVal.textContent = `${this.state.streak} dní 🔥`;

    let highestWorld = 1;
    this.state.unlockedLevels.forEach((lvlId) => {
      const wNum = parseInt(lvlId.split(".")[0], 10);
      if (wNum > highestWorld) highestWorld = wNum;
    });
    if (worldsVal) worldsVal.textContent = `${highestWorld} / 5`;

    // Štatistiky pokusov
    const totalAttempts = this.history.length;
    const successfulAttempts = this.history.filter((h) => h.passed).length;
    const successRate =
      totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : null;

    const tTotal = document.getElementById("tStatTotalAttempts");
    const tSuccess = document.getElementById("tStatSuccessRate");
    const tLessons = document.getElementById("tStatCompletedLessons");
    const tLatency = document.getElementById("tStatAvgLatency");

    if (tTotal) tTotal.textContent = totalAttempts;
    if (tSuccess) tSuccess.textContent = successRate === null ? "—" : `${successRate}%`;
    if (tLessons) tLessons.textContent = `${Object.keys(this.state.completedLevels).length} / 25`;

    // Štatistika trezoru v telemetrii
    const vWords = this.loadVaultWords();
    const vMastered = vWords.filter((w) => w.isMastered).length;
    const tVault = document.getElementById("tStatVaultMastered");
    if (tVault) tVault.textContent = `${vMastered} / ${vWords.length} 🏆`;

    // Výpočet priemerného VRT a latencie
    const vrts = this.history.filter((h) => h.vrt > 0).map((h) => h.vrt);
    const avgVrt = vrts.length > 0 ? vrts.reduce((a, b) => a + b, 0) / vrts.length : null;
    const avgVrtEl = document.getElementById("avgVrtVal");
    if (avgVrtEl) avgVrtEl.textContent = avgVrt === null ? "—" : avgVrt.toFixed(1);

    const latencies = this.history.filter((h) => h.latency > 0).map((h) => h.latency);
    const avgLat =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null;
    if (tLatency) tLatency.textContent = avgLat === null ? "—" : `${avgLat} ms`;

    // História posledných pokusov
    const historyList = document.getElementById("telemetryHistoryList");
    if (historyList) {
      if (this.history.length === 0) {
        historyList.innerHTML = `<div class="history-empty">Zatiaľ žiadne záznamy. Spusti prvú lekciu alebo SOS dril!</div>`;
      } else {
        const topRecent = this.history.slice(0, 8);
        historyList.innerHTML = topRecent
          .map(
            (item) => `
          <div class="history-row">
            <div class="h-word-col">
              <span class="h-word">${escapeHtml(item.word)}</span>
              <span class="h-time">${escapeHtml(item.time || "Dnes")}</span>
            </div>
            <div class="h-vrt-col">
              <span class="h-vrt">${item.vrt ? item.vrt.toFixed(1) + " ms" : "-"}</span>
              <span class="h-vrt-sub">VRT</span>
            </div>
            <div class="h-badge-col">
              <span class="h-status-badge ${item.passed ? (item.isPerfect ? "perfect" : "ok") : "err"}">
                ${item.passed ? (item.isPerfect ? "ZAZNAMENANÉ" : "ZAZNAMENANÉ") : "NEISTÝ SIGNÁL"}
              </span>
            </div>
          </div>
        `,
          )
          .join("");
      }
    }
  }
}

const duoState = new DuoStateManager();
window.duoState = duoState;

// ============================================================================
// 4. RENDEROVANIE LINEÁRNEHO STROMU ÚROVNÍ (WINDING PATH)
// ============================================================================
class DuoPathRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.selectedWorld = null;
  }

  selectWorld(worldId) {
    this.selectedWorld = Number(worldId);
    this.container.querySelectorAll('.world-section').forEach((section) => {
      section.hidden = section.id !== `world-section-${this.selectedWorld}`;
    });
    document.querySelectorAll('#worldChaptersNav button').forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.world) === this.selectedWorld));
    });
  }

  scrollToWorld(worldId) {
    const id = String(worldId).replace(/^world-section-/, "");
    const el =
      document.getElementById(`world-section-${id}`) ||
      document.getElementById(`world-section-${worldId}`);
    if (el) {
      this.selectWorld(id);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = "";
    let navigation = document.getElementById('worldChaptersNav');
    if (!navigation) {
      navigation = document.createElement('nav');
      navigation.id = 'worldChaptersNav';
      navigation.className = 'world-chapters-nav';
      navigation.setAttribute('aria-label', 'Kapitoly tréningu');
      this.container.before(navigation);
    }
    navigation.replaceChildren();
    if (!this.selectedWorld) {
      const next = WORLDS_DATA.find((world) => world.levels.some((level) => duoState.isUnlocked(level.id) && !duoState.isCompleted(level.id)));
      this.selectedWorld = next?.id || 1;
    }

    WORLDS_DATA.forEach((world) => {
      const chapter = document.createElement('button');
      chapter.type = 'button';
      chapter.dataset.world = world.id;
      chapter.textContent = String(world.id);
      chapter.setAttribute('aria-label', `Kapitola ${world.id}: ${world.title}`);
      chapter.addEventListener('click', () => this.selectWorld(world.id));
      navigation.appendChild(chapter);
      const worldEl = document.createElement("div");
      worldEl.id = `world-section-${world.id}`;
      worldEl.className = "world-section";
      worldEl.style.setProperty("--world-theme", world.color);
      worldEl.style.setProperty("--world-theme-lip", world.lipColor);

      // Hlavička sveta (Duolingo Unit Banner)
      let diagBadge = "";
      try {
        const rawDiag = localStorage.getItem("fl_diagnostic");
        if (rawDiag) {
          const d = JSON.parse(rawDiag);
          const recWorldId =
            d.recWorldId ||
            (d.tension === "laryngeal"
              ? 1
              : d.tension === "plosives"
                ? 3
                : d.tension === "clonic"
                  ? 4
                  : 2);
          if (world.id === recWorldId) {
            diagBadge =
              '<div class="world-recommended-badge">🎯 Návrh štartu podľa tvojho dotazníka</div>';
          }
        }
      } catch (_) {}

      const headerEl = document.createElement("div");
      headerEl.className = "world-header-banner";
      headerEl.innerHTML = `
        <div class="world-banner-content">
          <div class="world-banner-tag">KAPITOLA ${world.id}</div>
          ${diagBadge}
          <h2 class="world-banner-title">${world.title}</h2>
          <p class="world-banner-sub">${world.subtitle}</p>
        </div>
        <div class="world-banner-icon">${world.id}</div>
      `;
      worldEl.appendChild(headerEl);

      // Kľukatá trasa pre uzly sveta (Winding Node Track)
      const trackEl = document.createElement("div");
      trackEl.className = "world-nodes-track";

      // Sínusoidné rozostavenie (stred, vpravo, stred, vľavo, stred)
      const offsets = [0, 48, 0, -48, 0];

      world.levels.forEach((level, idx) => {
        const isUnlocked = duoState.isUnlocked(level.id);
        const isCompleted = duoState.isCompleted(level.id);
        const isCurrent = isUnlocked && !isCompleted;
        const offsetX = offsets[idx % offsets.length];

        const nodeWrap = document.createElement("div");
        nodeWrap.className = "path-node-wrapper";
        nodeWrap.style.transform = `translateX(${offsetX}px)`;

        // Samotný 3D kruhový uzol
        const btn = document.createElement("button");
        btn.className = `path-node-btn ${isUnlocked ? "unlocked" : "locked"} ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""} ${level.isBoss ? "boss-node" : ""}`;
        btn.dataset.levelId = level.id;

        // Vnútro uzla
        let iconHtml = level.icon;
        if (!isUnlocked) {
          iconHtml = "🔒";
        } else if (isCompleted) {
          iconHtml = "⭐";
        }

        btn.innerHTML = `
          <div class="node-icon-inner">${isCompleted ? "✓" : String(idx + 1).padStart(2, "0")}</div>
          ${isCompleted ? '<div class="node-stars-badge">★★★</div>' : ""}
          ${isCurrent ? '<div class="node-current-beacon">TU SI TY</div>' : ""}
        `;

        btn.addEventListener("click", () => {
          this.handleNodeClick(level, world, btn);
        });

        nodeWrap.appendChild(btn);

        // Názov úrovne pod uzlom
        const labelEl = document.createElement("div");
        labelEl.className = "node-label-sub";
        labelEl.textContent = level.title;
        nodeWrap.appendChild(labelEl);

        trackEl.appendChild(nodeWrap);
      });

      worldEl.appendChild(trackEl);
      this.container.appendChild(worldEl);
    });
    this.selectWorld(this.selectedWorld);
  }

  handleNodeClick(level, world, btnElement) {
    const isUnlocked = duoState.isUnlocked(level.id);
    if (!isUnlocked) {
      // Capture errors are retriable and never penalized.
      alert("Tento level je zatiaľ zamknutý. Najprv dokonči predchádzajúce úrovne v príbehu!");
      return;
    }

    duoSfx.playTone(600, "triangle", 0.08, 0.12);
    duoLesson.openLevelPopover(level, world, btnElement);
  }
}

// ============================================================================
// 5. OVLÁDAČ LEKCIÍ, STAVU ZOBRAZENIA A ROTÁCIE CHÝB
// ============================================================================
class DuoLessonController {
  constructor() {
    this.currentLevel = null;
    this.currentWorld = null;
    this.lessonQueue = [];
    this.initialWordCount = 0;
    this.completedItemsCount = 0;
    this.mistakesCount = 0;
    this.totalAttemptsCount = 0;
    this.isLessonActive = false;
    this.isSosDrill = false;
    this.currentWordItem = null;
    this.vaultFilter = "all";

    this.initDomBindings();
  }

  initDomBindings() {
    // Spodná navigácia – prepínanie 3 záložiek (Cesta, Rýchly Dril, Telemetria)
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const targetId = tab.dataset.tab;
        document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
        const activePane = document.getElementById(targetId);
        if (activePane) activePane.classList.add("active");

        duoSfx.playTone(520, "sine", 0.05, 0.08);

        if (targetId === "tabTelemetria") {
          duoState.renderTelemetry();
        }
      });
    });

    // Popover ovládače
    const closeBtn = document.getElementById("popoverCloseBtn");
    const backdrop = document.getElementById("nodePopoverBackdrop");
    const startBtn = document.getElementById("startLessonBtn");

    if (closeBtn) closeBtn.addEventListener("click", () => this.closePopover());
    if (backdrop)
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) this.closePopover();
      });
    if (startBtn) startBtn.addEventListener("click", () => this.launchLesson());

    // Exit lekcie (Návrat do Prieskumu a obnovenie spodného menu)
    const exitBtn = document.getElementById("exitLessonBtn");
    if (exitBtn) exitBtn.addEventListener("click", () => this.confirmExitLesson());

    // Pokračovanie z feedback draweru
    const drawerBtn = document.getElementById("drawerContinueBtn");
    if (drawerBtn) drawerBtn.addEventListener("click", () => this.handleDrawerContinue());

    // Enter & Escape klávesové skratky
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const drawer = document.getElementById("feedbackDrawer");
        if (drawer && drawer.classList.contains("active")) {
          this.handleDrawerContinue();
        }
      } else if (e.key === "Escape") {
        const sciModal = document.getElementById("scienceModalBackdrop");
        if (sciModal && sciModal.classList.contains("active")) {
          this.closeScienceModal();
        }
        const popover = document.getElementById("nodePopoverBackdrop");
        if (popover && popover.classList.contains("active")) {
          this.closePopover();
        }
      }
    });

    // Toggle matice v draweri
    const toggleMatrixBtn = document.getElementById("toggleMatrixBtn");
    if (toggleMatrixBtn) {
      toggleMatrixBtn.addEventListener("click", () => {
        const matrix = document.getElementById("matrixPanel");
        if (matrix) {
          const isVis = matrix.style.display === "block";
          matrix.style.display = isVis ? "none" : "block";
          toggleMatrixBtn.querySelector(".chevron").textContent = isVis ? "▼" : "▲";
        }
      });
    }

    // Oslavný modal Späť
    const celebBtn = document.getElementById("celebrationBackBtn");
    if (celebBtn) celebBtn.addEventListener("click", () => this.finishCelebration());

    // SOS Dril: Spustenie terénnej prípravy
    const launchSosBtn = document.getElementById("launchSosDrillBtn");
    if (launchSosBtn) {
      launchSosBtn.addEventListener("click", () => this.launchSosDrill());
    }

    // Vyčistenie slova v SOS drilu
    const clearWordBtn = document.getElementById("clearWordBtn");
    const wordInputEl = document.getElementById("wordInput");
    if (clearWordBtn && wordInputEl) {
      clearWordBtn.addEventListener("click", () => {
        wordInputEl.value = "";
        wordInputEl.focus();
      });
    }

    // SOS Rýchle frázové čipy
    document.querySelectorAll(".preset-chips .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (wordInputEl) {
          wordInputEl.value = chip.dataset.word;
          if (typeof refreshMeta === "function") refreshMeta();
        }
      });
    });

    // Uloženie mena v Telemetrii
    const saveTelNameBtn = document.getElementById("saveTelemetryNameBtn");
    const telNameInput = document.getElementById("telemetryNameInput");
    if (saveTelNameBtn && telNameInput) {
      saveTelNameBtn.addEventListener("click", () => {
        const newName = telNameInput.value.trim() || "Peter Novák";
        duoState.state.userName = newName;
        duoState.save();
        duoState.renderHud();
        duoState.renderTelemetry();
        window.fluencyAuth?.refreshUI();
        const personalName = document.getElementById("personalName");
        if (personalName) personalName.value = newName;
        saveTelNameBtn.textContent = "Uložené";
      });
    }

    // Kalibrácia a reset z Telemetrie
    const calTelBtn = document.getElementById("calibrateFromTelemetryBtn");
    if (calTelBtn) {
      calTelBtn.addEventListener("click", async () => {
        calTelBtn.disabled = true;
        calTelBtn.textContent = "⏳ Meriam šum miestnosti (1s)...";
        try {
          if (typeof window.runNoiseCalibration === "function") {
            const noise = await window.runNoiseCalibration();
            calTelBtn.textContent = `✅ Nakalibrované (Šum: ${noise.toFixed(1)} dB)`;
          } else {
            const cBtn = document.getElementById("calibrateBtn");
            if (cBtn) cBtn.click();
            calTelBtn.textContent = "✅ Kalibrácia spustená";
          }
        } catch (err) {
          calTelBtn.textContent = "❌ Chyba kalibrácie";
        }
        setTimeout(() => {
          calTelBtn.disabled = false;
          calTelBtn.textContent = "🎙️ Rýchla re-kalibrácia mikrofónu (1s)";
        }, 3500);
      });
    }

    const resetTelBtn = document.getElementById("resetTelemetryProgressBtn");
    if (resetTelBtn) {
      resetTelBtn.addEventListener("click", () => {
        if (confirm("Naozaj chceš zmazať celý herný postup a začať odznova?")) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(HISTORY_KEY);
          location.reload();
        }
      });
    }

    // Denná výzva tlačidlo
    const continuePathBtn = document.getElementById("continuePathBtn");
    if (continuePathBtn) {
      continuePathBtn.addEventListener("click", () => {
        const activeNode = document.querySelector(".path-node-btn.current");
        if (activeNode) {
          duoPath.selectWorld(activeNode.dataset.levelId.split('.')[0]);
          activeNode.click();
        } else {
          const firstUnlocked = document.querySelector(".path-node-btn.unlocked");
          if (firstUnlocked) firstUnlocked.click();
        }
      });
    }

    // ======================================================================
    // VEDECKÝ ZÁKLAD & KLINICKÉ MODELY MODAL A AKORDEÓN
    // ======================================================================
    const openSciBtn = document.getElementById("openScienceModalBtn");
    if (openSciBtn) {
      openSciBtn.addEventListener("click", () => this.openScienceModal());
    }

    const brandBtn = document.getElementById("brandLogoBtn");
    if (brandBtn) {
      brandBtn.style.cursor = "pointer";
      brandBtn.addEventListener("click", () => this.openScienceModal());
    }

    const closeSciBtn = document.getElementById("scienceModalCloseBtn");
    if (closeSciBtn) {
      closeSciBtn.addEventListener("click", () => this.closeScienceModal());
    }

    const closeSciFootBtn = document.getElementById("closeScienceModalBtn");
    if (closeSciFootBtn) {
      closeSciFootBtn.addEventListener("click", () => this.closeScienceModal());
    }

    const sciBackdrop = document.getElementById("scienceModalBackdrop");
    if (sciBackdrop) {
      sciBackdrop.addEventListener("click", (e) => {
        if (e.target === sciBackdrop) {
          this.closeScienceModal();
        }
      });
    }

    // Interaktívny akordeón (rozklikávanie pilierov)
    const sciHeaders = document.querySelectorAll(".sc-header");
    sciHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const card = header.closest(".science-card");
        if (!card) return;
        const wasActive = card.classList.contains("active");
        card.classList.toggle("active");
        header.setAttribute("aria-expanded", String(!wasActive));
        duoSfx.playTone(wasActive ? 350 : 500, "sine", 0.04, 0.06);
      });

      header.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          header.click();
        }
      });
    });

    // ======================================================================
    // TREZOR OBÁVANÝCH SLOV (FEARED WORDS VAULT)
    // ======================================================================
    const vaultAddBtn = document.getElementById("vaultAddBtn");
    const vaultInput = document.getElementById("vaultWordInput");
    if (vaultAddBtn) {
      vaultAddBtn.addEventListener("click", () => this.addVaultWord());
    }
    if (vaultInput) {
      vaultInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.addVaultWord();
        }
      });
    }

    const vaultRandomBtn = document.getElementById("vaultRandomChallengeBtn");
    if (vaultRandomBtn) {
      vaultRandomBtn.addEventListener("click", () => this.randomVaultChallenge());
    }

    const filterPills = document.querySelectorAll(".vault-pill");
    filterPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        filterPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        this.vaultFilter = pill.dataset.filter || "all";
        this.renderVaultList();
        duoSfx.playTone(480, "sine", 0.04, 0.05);
      });
    });

    // Počiatočné vykreslenie trezoru
    this.renderVaultList();
  }

  // ========================================================================
  // OBSLUHA MODÁLU VEDECKÝ ZÁKLAD
  // ========================================================================
  openScienceModal() {
    const modal = document.getElementById("scienceModalBackdrop");
    if (!modal) return;
    modal.classList.add("active");
    duoSfx.playTone(540, "triangle", 0.08, 0.08);
  }

  closeScienceModal() {
    const modal = document.getElementById("scienceModalBackdrop");
    if (!modal) return;
    modal.classList.remove("active");
    duoSfx.playTone(380, "sine", 0.05, 0.05);
  }

  // ========================================================================
  // METÓDY PRE TREZOR OBÁVANÝCH SLOV (FEARED WORDS VAULT)
  // ========================================================================
  renderVaultList() {
    const listEl = document.getElementById("vaultList");
    const badgeEl = document.getElementById("vaultMasteryBadge");
    const countAllEl = document.getElementById("vCountAll");
    const countTrainEl = document.getElementById("vCountTraining");
    const countMastEl = document.getElementById("vCountMastered");

    const words = duoState.loadVaultWords();
    const total = words.length;
    const mastered = words.filter((w) => w.isMastered).length;
    const unmastered = total - mastered;

    if (badgeEl) badgeEl.textContent = `${mastered} / ${total} Odblokované 🏆`;
    if (countAllEl) countAllEl.textContent = total;
    if (countTrainEl) countTrainEl.textContent = unmastered;
    if (countMastEl) countMastEl.textContent = mastered;

    const tVaultStat = document.getElementById("tStatVaultMastered");
    if (tVaultStat) tVaultStat.textContent = `${mastered} / ${total} 🏆`;

    if (!listEl) return;

    let filtered = words;
    if (this.vaultFilter === "mastered") {
      filtered = words.filter((w) => w.isMastered);
    } else if (this.vaultFilter === "unmastered") {
      filtered = words.filter((w) => !w.isMastered);
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="vault-empty">
          ${
            this.vaultFilter === "mastered"
              ? "Zatiaľ žiadne odblokované slová. Zvládni 3 úspešné nábehy a získaj trofej 🏆!"
              : "Trezor je prázdny. Zadaj vyššie slovo, ktoré v tebe vyvoláva blok, a pridaj ho do tréningu."
          }
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered
      .map(
        (item) => `
      <div class="vault-item ${item.isMastered ? "mastered" : ""}" data-id="${escapeHtml(item.id)}">
        <div class="vault-item-left">
          <div class="vault-item-word">${escapeHtml(item.word)}</div>
          <div class="vault-item-meta">
            <span class="vault-item-cat">${escapeHtml(item.category || "Všeobecné")}</span>
            <span class="vault-item-score ${item.isMastered ? "mastered" : ""}">
              ${item.isMastered ? "🏆 PRECVIČENÉ" : `${item.successes || 0}/3 absolvovaných pokusov`}
            </span>
          </div>
        </div>
        <div class="vault-item-actions">
          <button class="btn-3d ${item.isMastered ? "neutral" : "amber"} sm vault-train-btn" data-id="${escapeHtml(item.id)}">
            <span>${item.isMastered ? "Zopakovať" : "⚡ Trénovať"}</span>
          </button>
          <button class="vault-del-btn" data-id="${escapeHtml(item.id)}" title="Zmazať slovo">✕</button>
        </div>
      </div>
    `,
      )
      .join("");

    // Event listenery na tlačidlá v zozname
    if (listEl.querySelectorAll) {
      const trainBtns = listEl.querySelectorAll(".vault-train-btn");
      if (trainBtns && trainBtns.forEach) {
        trainBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset ? btn.dataset.id : btn.getAttribute("data-id");
            this.trainVaultWord(id);
          });
        });
      }

      const delBtns = listEl.querySelectorAll(".vault-del-btn");
      if (delBtns && delBtns.forEach) {
        delBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset ? btn.dataset.id : btn.getAttribute("data-id");
            this.deleteVaultWord(id);
          });
        });
      }
    }
  }

  addVaultWord() {
    const input = document.getElementById("vaultWordInput");
    const select = document.getElementById("vaultCategorySelect");
    if (!input) return;

    const word = input.value.trim();
    if (!word) {
      alert("Zadaj prosím slovo alebo frázu.");
      input.focus();
      return;
    }

    const category = select ? select.value : "Iné";
    const words = duoState.loadVaultWords();

    if (words.some((w) => w.word.toLowerCase() === word.toLowerCase())) {
      alert("Toto slovo už v trezore máš!");
      return;
    }

    const newItem = {
      id: "fw_" + Date.now(),
      word,
      category,
      successes: 0,
      attempts: 0,
      isMastered: false,
      date: new Date().toISOString().slice(0, 10),
    };

    words.unshift(newItem);
    duoState.saveVaultWords(words);
    input.value = "";
    this.renderVaultList();
    duoSfx.playTone(660, "triangle", 0.06, 0.08);
  }

  deleteVaultWord(id) {
    if (!confirm("Naozaj chceš zmazať toto slovo z trezoru?")) return;
    let words = duoState.loadVaultWords();
    words = words.filter((w) => w.id !== id);
    duoState.saveVaultWords(words);
    this.renderVaultList();
    duoSfx.playTone(350, "sine", 0.04, 0.05);
  }

  trainVaultWord(id) {
    const words = duoState.loadVaultWords();
    const item = words.find((w) => w.id === id);
    if (!item) return;

    const wordInputEl = document.getElementById("wordInput");
    if (wordInputEl) {
      wordInputEl.value = item.word;
    }

    duoSfx.playTone(550, "sine", 0.05, 0.08);
    this.launchSosDrill();
  }

  randomVaultChallenge() {
    const words = duoState.loadVaultWords();
    if (words.length === 0) {
      alert("V trezore zatiaľ nemáš žiadne slová. Pridaj si prvé slovo vyššie.");
      return;
    }

    const unmastered = words.filter((w) => !w.isMastered);
    const pool = unmastered.length > 0 ? unmastered : words;
    const randomItem = pool[Math.floor(Math.random() * pool.length)];

    this.trainVaultWord(randomItem.id);
  }

  updateVaultProgress(wordText, success) {
    if (!wordText) return;
    const cleanTrained = wordText.trim().toLowerCase();
    const words = duoState.loadVaultWords();
    let updated = false;

    words.forEach((item) => {
      if (item.word.trim().toLowerCase() === cleanTrained) {
        item.attempts = (item.attempts || 0) + 1;
        if (success) {
          item.successes = (item.successes || 0) + 1;
          if (item.successes >= 3) {
            item.isMastered = true;
          }
        }
        updated = true;
      }
    });

    if (updated) {
      duoState.saveVaultWords(words);
      this.renderVaultList();
      duoState.renderTelemetry();
    }
  }

  // ========================================================================
  // ZOBRAZENIE DIALÓGOVEJ BUBLINY V LEKCII
  // ========================================================================
  showDialogueBubble(scenario) {
    const bubble = document.getElementById("lessonDialogueCard");
    if (!bubble) return;
    const avatarEl = document.getElementById("ldAvatar");
    const speakerEl = document.getElementById("ldSpeaker");
    const textEl = document.getElementById("ldText");

    if (avatarEl) avatarEl.textContent = scenario.avatar || "🗣️";
    if (speakerEl) speakerEl.textContent = scenario.caller || "Oponent";
    if (textEl)
      textEl.textContent = scenario.promptText || scenario.fallbackPrompt || "Počúvaj otázku...";

    bubble.style.display = "flex";
    bubble.classList.add("active");
  }

  hideDialogueBubble() {
    const bubble = document.getElementById("lessonDialogueCard");
    if (!bubble) return;
    bubble.classList.remove("active");
    setTimeout(() => {
      if (bubble && !bubble.classList.contains("active")) {
        bubble.style.display = "none";
      }
    }, 400);
  }

  // ========================================================================
  // PRECHOD MEDZI STAVOM 1 (PRIESKUM) A STAVOM 2 (AKTÍVNA LEKCIA)
  // ========================================================================
  enterFocusMode() {
    // Menu a horný prieskumný HUD kompletne ZMIZNÚ
    document.body.classList.add("in-lesson");
    const screen = document.getElementById("lessonScreen");
    if (screen) screen.classList.add("active");
  }

  exitFocusMode() {
    window.releaseGlideAudio?.();
    // Obnovenie prieskumu a zobrazenie spodného menu
    document.body.classList.remove("in-lesson");
    const screen = document.getElementById("lessonScreen");
    if (screen) screen.classList.remove("active");
  }

  openLevelPopover(level, world, btnElement) {
    this.currentLevel = level;
    this.currentWorld = world;

    const popover = document.getElementById("nodePopover");
    const backdrop = document.getElementById("nodePopoverBackdrop");
    const tag = document.getElementById("popoverWorldTag");
    const title = document.getElementById("popoverTitle");
    const desc = document.getElementById("popoverDesc");
    const count = document.getElementById("popoverWordCount");

    if (tag) tag.textContent = `${world.title.toUpperCase()}`;
    if (title) title.textContent = `Lekcia ${level.id}: ${level.title}`;
    if (desc) desc.textContent = level.desc;
    if (count) count.textContent = `${level.words.length} cvičenia`;

    if (backdrop) backdrop.classList.add("active");
    if (popover) {
      popover.style.setProperty("--popover-color", world.color);
      popover.style.setProperty("--popover-lip", world.lipColor);
    }
  }

  closePopover() {
    const backdrop = document.getElementById("nodePopoverBackdrop");
    if (backdrop) backdrop.classList.remove("active");
  }

  launchLesson() {
    this.closePopover();
    if (!this.currentLevel) return;

    this.isLessonActive = true;
    this.voiceIntroPlayed = false;
    this.isSosDrill = false;
    if (typeof window.setDspMode === "function") {
      window.setDspMode(this.currentLevel.mode || "standard");
    }
    this.completedItemsCount = 0;
    this.mistakesCount = 0;
    this.totalAttemptsCount = 0;

    // Inicializácia fronty slov (Duolingo Queue)
    this.lessonQueue = this.currentLevel.words.map((w) => ({
      word: w,
      attempts: 0,
    }));
    this.initialWordCount = this.lessonQueue.length;

    // Prepnúť do Celoobrazovkového sústredenia (Stav 2)
    this.enterFocusMode();

    // DAF/FAF slúchadlový odposluch predvolene stíšený (prevencia spätnej väzby bez slúchadiel)
    if (window.dafFafPipeline) {
      window.dafFafPipeline.setEnabled(false);
    }
    const hpInd = document.getElementById("headphoneLiveIndicator");
    if (hpInd) hpInd.classList.add("off");
    const hpTxt = document.getElementById("headphoneStatusText");
    if (hpTxt) hpTxt.textContent = "DAF & FAF Slúchadlá: Vypnuté (Klikni pre zapnutie)";

    if (typeof setupAudio === "function") {
      setupAudio()
        .then(() => window.ensureNoiseCalibration?.())
        .catch((e) => console.warn("Audio auto-init error:", e));
    }

    // Nastavenie režimu a kamery
    if (typeof currentMode !== "undefined") {
      currentMode = this.currentLevel.mode || "standard";
    }

    this.updateLessonProgress();
    this.loadNextItem();
  }

  launchSosDrill() {
    const wordInputEl = document.getElementById("wordInput");
    const chosenWord =
      wordInputEl && wordInputEl.value.trim() ? wordInputEl.value.trim() : "Peter Novák";

    // Voľba režimu zo sandboxu
    const selectedMode =
      document.querySelector('input[name="sandboxMode"]:checked')?.value || "standard";

    this.isLessonActive = true;
    this.voiceIntroPlayed = false;
    this.isSosDrill = true;
    if (typeof window.setDspMode === "function") {
      window.setDspMode(selectedMode);
    }
    this.currentLevel = {
      id: "sos",
      title: "Rýchly SOS Dril",
      mode: selectedMode,
      words: [chosenWord, chosenWord, chosenWord], // 3 pokusy
      xp: 25,
    };

    this.completedItemsCount = 0;
    this.mistakesCount = 0;
    this.totalAttemptsCount = 0;

    this.lessonQueue = [
      { word: chosenWord, attempts: 0 },
      { word: chosenWord, attempts: 0 },
      { word: chosenWord, attempts: 0 },
    ];
    this.initialWordCount = 3;

    // Prepnúť do Celoobrazovkového sústredenia (Stav 2)
    this.enterFocusMode();

    // Okamžitá aktivácia audio potrubia s DAF/FAF odposluchom do slúchadiel
    if (typeof setupAudio === "function") {
      setupAudio()
        .then(() => window.ensureNoiseCalibration?.())
        .catch((e) => console.warn("Audio auto-init error:", e));
    }

    if (typeof currentMode !== "undefined") {
      currentMode = selectedMode;
    }

    this.updateLessonProgress();
    this.loadNextItem();
  }

  updateLessonProgress() {
    const fill = document.getElementById("lessonProgressFill");
    const hearts = document.getElementById("lessonHeartsVal");
    const context = document.getElementById("lessonContextBadge");

    if (hearts) hearts.textContent = duoState.state.lives;

    const progressPct = Math.min(100, (this.completedItemsCount / this.initialWordCount) * 100);
    if (fill) fill.style.width = `${progressPct}%`;

    if (context && this.currentLevel) {
      const remaining = this.lessonQueue.length;
      context.textContent = this.isSosDrill
        ? `⚡ SOS Dril • Zostáva pokusov: ${remaining}`
        : `${this.currentLevel.title} • Zostáva: ${remaining}`;
    }
  }

  loadNextItem() {
    if (this.lessonQueue.length === 0) {
      this.completeCurrentLesson();
      return;
    }

    this.currentWordItem = this.lessonQueue[0];
    const word = this.currentWordItem.word;

    const wordInputEl = document.getElementById("wordInput");
    const targetWordEl = document.getElementById("targetWord");
    const pacerEl = document.getElementById("pacerCircle");
    const statusAlertEl = document.getElementById("statusAlert");
    const matrixPanel = document.getElementById("matrixPanel");
    const drawer = document.getElementById("feedbackDrawer");

    if (drawer) drawer.classList.remove("active");
    if (matrixPanel) matrixPanel.style.display = "none";

    if (wordInputEl) {
      wordInputEl.value = word;
      if (typeof refreshMeta === "function") refreshMeta();
    }
    if (targetWordEl) targetWordEl.textContent = ["guillotine", "ambush"].includes(this.currentLevel?.mode) ? "ODPOVEDZ VLASTNÝMI SLOVAMI" : word.toUpperCase();

    if (pacerEl) {
      pacerEl.style.transform = "scale(1)";
      pacerEl.style.borderColor = "#334155";
      pacerEl.innerHTML = '<span class="pacer-text">Priprav sa</span>';
    }

    if (statusAlertEl) {
      if (typeof isCalibrated !== "undefined" && !isCalibrated) {
        statusAlertEl.textContent = "Ticho miestnosti sa zmeria automaticky pri prvom štarte.";
      } else {
        statusAlertEl.textContent = 'Stlač "Spustiť slovo" a nasleduj dychový pacer.';
      }
    }

    this.updateLessonProgress();

    const startBtn = document.getElementById("startBtn");
    if (startBtn) startBtn.disabled = false;
  }

  handleAttemptResult(result) {
    this.totalAttemptsCount++;
    const { passed, vrt, latency } = result;
    const isPerfect = false;

    const word = this.currentWordItem ? this.currentWordItem.word : "Slovo";

    // Zápis telemetrického záznamu
    duoState.addAttemptRecord({
      word,
      passed,
      isPerfect,
      vrt: vrt || 0,
      latency: latency || 0,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    if (!result.freeReply) this.updateVaultProgress(word, passed);

    const drawer = document.getElementById("feedbackDrawer");
    const iconEl = document.getElementById("drawerStatusIcon");
    const headEl = document.getElementById("drawerHeadline");
    const subEl = document.getElementById("drawerSubtext");
    const xpBadge = document.getElementById("drawerXpBadge");
    const continueBtn = document.getElementById("drawerContinueBtn");

    if (passed) {
      duoSfx.playSuccess();
      if (headEl) headEl.textContent = "Rečový pokus zaznamenaný";
      if (subEl) subEl.textContent = "Odmena je za absolvovanie pokusu, nie za plynulosť.";
      if (xpBadge) xpBadge.textContent = "+30 XP";
      duoState.addXp(30);

      if (drawer) {
        drawer.className = "feedback-drawer active success";
      }
      if (iconEl) iconEl.textContent = "✓";
      if (continueBtn) {
        continueBtn.className = "btn-3d green full";
        continueBtn.innerHTML = "<span>POKRAČOVAŤ (Enter)</span>";
      }

      if (result.freeReply) {
        if (headEl) headEl.textContent = "✅ Odpoveď zaznamenaná";
        if (subEl) subEl.textContent = "Odpovedal/a si vlastnými slovami. Pokračuj, keď budeš pripravený/á.";
      }
      this.lessonQueue.shift();
      this.completedItemsCount++;

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    } else {
      duoSfx.playMistake();
      // Keep completion rewards independent of fluency.

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }

      if (headEl) headEl.textContent = "Signál sa nepodarilo zachytiť";
      if (subEl) subEl.textContent = "Môžeš skúsiť mikrofón znova alebo opraviť hodnotenie.";
      if (xpBadge) xpBadge.textContent = "+0 XP";

      if (drawer) {
        drawer.className = "feedback-drawer active fail";
      }
      if (iconEl) iconEl.textContent = "!";
      if (continueBtn) {
        continueBtn.className = "btn-3d amber full";
        continueBtn.innerHTML = "<span>ROZUMIEM, SKÚSIM ĎALEJ</span>";
      }

      if (result.meta?.freeReply) {
        if (headEl) headEl.textContent = "Odpoveď sa nepodarilo zachytiť";
        if (subEl) subEl.textContent = "Skús prehovoriť do mikrofónu. Obsah odpovede je na tebe.";
      }

      // ROTÁCIA CHÝB (Duolingo Mistake Rotation)
      const failed = this.lessonQueue.shift();
      failed.attempts = (failed.attempts || 0) + 1;
      this.lessonQueue.push(failed);

      // No loss of lives for speech differences or capture errors.
    }

    this.updateLessonProgress();
  }

  handleDrawerContinue() {
    const drawer = document.getElementById("feedbackDrawer");
    if (drawer) drawer.classList.remove("active");

    this.loadNextItem();
  }

  completeCurrentLesson() {
    this.isLessonActive = false;
    window.dispatchEvent(new CustomEvent("glide-practice-complete"));
    if (typeof duoSfx !== "undefined" && duoSfx.playFanfare) {
      duoSfx.playFanfare();
    }

    const accuracy = Math.max(
      0,
      Math.round(
        ((this.totalAttemptsCount - this.mistakesCount) / Math.max(1, this.totalAttemptsCount)) *
          100,
      ),
    );
    const baseReward = this.currentLevel.xp || 40;
    const finalXp = baseReward;

    // Ak ide o úroveň v príbehu, zapíš do kampane
    if (!this.isSosDrill && this.currentLevel.id !== "sos") {
      duoState.completeLevel(this.currentLevel.id, finalXp, accuracy);
    } else {
      duoState.addXp(finalXp);
    }

    // Aktualizácia Trezoru obávaných slov a haptická fanfára
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }

    const modal = document.getElementById("celebrationModal");
    const title = document.getElementById("celebrationTitle");
    const sub = document.getElementById("celebrationSub");
    const xpRecap = document.getElementById("recapXpVal");
    const accRecap = document.getElementById("recapAccuracyVal");
    const streakRecap = document.getElementById("recapStreakVal");

    if (title) title.textContent = this.isSosDrill ? "SOS Dril Dokončený!" : "Lekcia Dokončená!";
    if (sub)
      sub.textContent = this.isSosDrill
        ? "Tréning je dokončený. Ako sa ti dnes hovorilo?"
        : "Dokončil/a si tréning. Pokrok zahŕňa aj ochotu komunikovať.";

    if (xpRecap) xpRecap.textContent = `+${finalXp} XP`;
    if (accRecap) accRecap.textContent = "Hotovo";
    if (streakRecap) streakRecap.textContent = `🔥 ${duoState.state.streak} dní`;

    if (modal) modal.classList.add("active");
  }

  finishCelebration() {
    const modal = document.getElementById("celebrationModal");
    if (modal) modal.classList.remove("active");

    if (typeof window.abortActiveDspSession === "function") {
      window.abortActiveDspSession();
    }

    // Návrat z celoobrazovkového režimu
    this.exitFocusMode();

    duoPath.render();
    duoState.renderTelemetry();
  }

  confirmExitLesson() {
    if (confirm("Naozaj chceš opustiť tréning? Stratíš rozpracovaný postup.")) {
      this.isLessonActive = false;
      if (typeof window.abortActiveDspSession === "function") {
        window.abortActiveDspSession();
      }
      this.exitFocusMode();
    }
  }
}

const duoLesson = new DuoLessonController();
const duoPath = new DuoPathRenderer("worldsWrapper");
window.duoPath = duoPath;

// ============================================================================
// 6. EVENT LISTENER PRE DSP VÝSLEDKY
// ============================================================================
window.addEventListener("dsp-evaluation-complete", (e) => {
  if (duoLesson.isLessonActive) {
    duoLesson.handleAttemptResult(e.detail);
  }
});

// Inicializácia aplikácie
(() => {
  duoState.renderHud();
  duoPath.render();
  duoState.renderTelemetry();

  // Vela Breathing Capsule Interactive Cycle (Box Breathing pre Domov aj Onboarding)
  const breathLabel = document.getElementById("stageBreathLabel");
  const breathNum = document.getElementById("stageBreathNum");
  const wbLabel = document.getElementById("wbBreathLabel");
  const wbNum = document.getElementById("wbBreathNum");

  if (breathLabel || wbLabel) {
    let phase = 0;
    let count = 4;
    const phases = [
      { label: "Nádych", max: 4 },
      { label: "Zadrž", max: 4 },
      { label: "Výdych", max: 4 },
      { label: "Pauza", max: 4 },
    ];
    setInterval(() => {
      count--;
      if (count <= 0) {
        phase = (phase + 1) % phases.length;
        count = phases[phase].max;
        if (breathLabel) breathLabel.textContent = phases[phase].label;
        if (wbLabel) wbLabel.textContent = phases[phase].label;
      }
      if (breathNum) breathNum.textContent = count;
      if (wbNum) wbNum.textContent = count;
    }, 1000);
  }
})();
