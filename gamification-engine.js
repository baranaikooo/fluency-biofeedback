/**
 * FLUENCY BIOFEEDBACK - DUOLINGO GAMIFICATION ENGINE
 * Lineárny strom svetov (World Progression Path) s rotáciou chýb,
 * 3D Duolingo uzlami, zvukovými efektmi Web Audio a prepojením na dsp-core.js.
 */

// ============================================================================
// 1. DÁTOVÝ MODEL: 5 SVETOV A 25 ÚROVNÍ (CURRICULUM)
// ============================================================================
const WORLDS_DATA = [
  {
    id: 1,
    title: "Svet 1: Samohlásky (Vowel Flow)",
    subtitle: "Tréning mäkkého nábehu hlasiviek (VRT 45–160 ms)",
    color: "#58cc02",
    lipColor: "#46a302",
    icon: "🌱",
    levels: [
      {
        id: "1.1",
        title: "Úvod do A a O",
        desc: "Jemný nábeh samohlások A a O bez tvrdého glotálneho úderu.",
        mode: "standard",
        words: ["Auto", "Otec", "Áno", "Oko"],
        xp: 30,
        icon: "⭐"
      },
      {
        id: "1.2",
        title: "Predné samohlásky E a I",
        desc: "Uvoľnenie koreňa jazyka a mäkký začiatok na hláskach E a I.",
        mode: "standard",
        words: ["Isto", "Echo", "Iba", "Ešte"],
        xp: 35,
        icon: "💬"
      },
      {
        id: "1.3",
        title: "Zaokrúhlené samohlásky U a Ô",
        desc: "Kontrola pier a uvoľnený výdychový prúd na hláskach U a Ô.",
        mode: "standard",
        words: ["Ulica", "Úrad", "Ôsmy", "Úsmev"],
        xp: 35,
        icon: "🎯"
      },
      {
        id: "1.4",
        title: "Mená a dychový únik",
        desc: "Prevencia pred fúknutím do mikrofónu pred začiatkom reči.",
        mode: "standard",
        words: ["Alain", "Andrea", "Oliver", "Igor"],
        xp: 40,
        icon: "⚡"
      },
      {
        id: "1.5",
        title: "Majster samohlások (Checkpoint)",
        desc: "Skúška plynulosti: zmes dlhších slov so samohláskovým nábehom.",
        mode: "standard",
        words: ["Autobus", "Inštitút", "Ekonomika", "Úspešný"],
        xp: 50,
        isBoss: true,
        icon: "👑"
      }
    ]
  },
  {
    id: 2,
    title: "Svet 2: Znelé spoluhlásky (Resonance & Voicing)",
    subtitle: "Kontinuita kmitania hlasiviek a orofaryngeálna rezonancia",
    color: "#1cb0f6",
    lipColor: "#1899d6",
    icon: "🌊",
    levels: [
      {
        id: "2.1",
        title: "Nosové znelé: M a N",
        desc: "Využitie nazálnej rezonancie ako bezpečného štartu fonácie.",
        mode: "standard",
        words: ["Mama", "Noviny", "Mesto", "Noc"],
        xp: 35,
        icon: "⭐"
      },
      {
        id: "2.2",
        title: "Znelé frikatívy: V a Z",
        desc: "Plynulý prechod z trenia do samohlásky bez zárazu v hrdle.",
        mode: "standard",
        words: ["Voda", "Zima", "Včera", "Zelená"],
        xp: 35,
        icon: "💬"
      },
      {
        id: "2.3",
        title: "Likvidy a slabikotvorné R a L",
        desc: "Správna koartikulácia a znelosť pri slovenských slabikách.",
        mode: "standard",
        words: ["Lampa", "Ruka", "Krk", "Vlk"],
        xp: 40,
        icon: "🎯"
      },
      {
        id: "2.4",
        title: "Znelé explozívy: B, D, G",
        desc: "Ľahký kontakt pier a jazyka pred uvoľnením vzduchu.",
        mode: "standard",
        words: ["Brat", "Dom", "Gombík", "Dobrý"],
        xp: 40,
        icon: "⚡"
      },
      {
        id: "2.5",
        title: "Resonančný majster (Checkpoint)",
        desc: "Zložité znelé slová s viacnásobnými prechodmi fonácie.",
        mode: "standard",
        words: ["Bratislava", "Vynikajúci", "Medicína", "Dovolenka"],
        xp: 60,
        isBoss: true,
        icon: "👑"
      }
    ]
  },
  {
    id: 3,
    title: "Svet 3: Plozívy a zhluky (Plosive Armor)",
    subtitle: "Tlmenie artikulačného nárazu a zákaz barličky 'Eee...'",
    color: "#ff9600",
    lipColor: "#d97e00",
    icon: "🛡️",
    levels: [
      {
        id: "3.1",
        title: "Neznelé plozívy: P a T",
        desc: "Zákaz znelého 'Eee' pred výbuchom hlásky. Čistý štart.",
        mode: "standard",
        words: ["Pivo", "Topánka", "Peter", "Ticho"],
        xp: 40,
        icon: "⭐"
      },
      {
        id: "3.2",
        title: "Tvrdá velára K a digraf CH",
        desc: "Najčastejšie spúšťače laryngeálneho kŕča – ľahký dotyk.",
        mode: "standard",
        words: ["Káva", "Chlieb", "Kľúč", "Chlapec"],
        xp: 40,
        icon: "💬"
      },
      {
        id: "3.3",
        title: "Sykavkové zhluky: S, Š, C, Č",
        desc: "Dlhá neznelá frikcia bez predčasného zovretia hlasiviek.",
        mode: "standard",
        words: ["Škola", "Stôl", "Spolu", "Cesta"],
        xp: 45,
        icon: "🎯"
      },
      {
        id: "3.4",
        title: "Náročné zhluky (Štvrtok, Kto)",
        desc: "Zvládnutie troch spoluhlások za sebou s adaptívnym limitom.",
        mode: "standard",
        words: ["Štvrtok", "Kto", "Pstruh", "Vstup"],
        xp: 45,
        icon: "⚡"
      },
      {
        id: "3.5",
        title: "Plozívny majster (Checkpoint)",
        desc: "Komplexné slová s plozívami bez jediného zárazu sánky.",
        mode: "standard",
        words: ["Knižnica", "Prezident", "Trenčín", "Čokoláda"],
        xp: 70,
        isBoss: true,
        icon: "👑"
      }
    ]
  },
  {
    id: 4,
    title: "Svet 4: Pokladňa & Rýchlosť (Temporal Stress)",
    subtitle: "Odpovede pod časovým limitom 550 ms (reálne audio predavačky)",
    color: "#ce82ff",
    lipColor: "#a559d9",
    icon: "🛒",
    levels: [
      {
        id: "4.1",
        title: "'Hotovosť alebo karta?'",
        desc: "Odpovedz okamžite po skončení vety predavačky bez bloku.",
        mode: "guillotine",
        scenarioIndex: 1, // Cashier
        words: ["Kartou, prosím"],
        xp: 45,
        icon: "💳"
      },
      {
        id: "4.2",
        title: "'Máte zákaznícku kartu?'",
        desc: "Rýchla odpoveď na nečakanú otázku v rade pri pokladni.",
        mode: "guillotine",
        scenarioIndex: 1,
        words: ["Nemám, ďakujem"],
        xp: 45,
        icon: "💬"
      },
      {
        id: "4.3",
        title: "'Bloček si prosíte?'",
        desc: "Prirodzená odpoveď so zachovaním mäkkého nábehu samohlásky Á.",
        mode: "guillotine",
        scenarioIndex: 1,
        words: ["Áno, poprosím"],
        xp: 50,
        icon: "🧾"
      },
      {
        id: "4.4",
        title: "'Budete chcieť aj tašku?'",
        desc: "Jasné 'Nie' bez zaseknutia jazyka na podnebí.",
        mode: "guillotine",
        scenarioIndex: 1,
        words: ["Nie, mám vlastnú"],
        xp: 50,
        icon: "🛍️"
      },
      {
        id: "4.5",
        title: "Rýchla pokladňa Master (Boss)",
        desc: "Kompletný dialóg v obchode pod časovým stresom.",
        mode: "guillotine",
        scenarioIndex: 1,
        words: ["Kartou", "Nemám kartu", "Bloček netreba", "Dovidenia"],
        xp: 80,
        isBoss: true,
        icon: "👑"
      }
    ]
  },
  {
    id: 5,
    title: "Svet 5: Boss Fights (Real Life Ambush Calls)",
    subtitle: "Prepadové hovory s oponentmi + zrkadlo očného kontaktu",
    color: "#ff4b4b",
    lipColor: "#d92525",
    icon: "📞",
    levels: [
      {
        id: "5.1",
        title: "Boss 1: Kuriér s balíkom",
        desc: "Telefón zazvoní. Zdvihni a predstav sa kuriérovi s mäkkým nábehom.",
        mode: "ambush",
        scenarioIndex: 0, // Courier
        words: ["Dobrý deň, pri telefóne"],
        xp: 60,
        icon: "📦"
      },
      {
        id: "5.2",
        title: "Boss 2: Zdravotná sestra / Ambulancia",
        desc: "Hovor do ambulancie: povedz svoje meno a požiadavku bez kŕča.",
        mode: "ambush",
        scenarioIndex: 2, // Doctor
        words: ["Peter Novák, volám kvôli termínu"],
        xp: 70,
        icon: "🩺"
      },
      {
        id: "5.3",
        title: "Boss 3: Automechanik v servise",
        desc: "Hlučný hovor z dielne: vysvetli problém s autom uvoľnene.",
        mode: "ambush",
        scenarioIndex: 3, // Automechanik
        words: ["Dobrý deň, volám ohľadom auta"],
        xp: 80,
        icon: "🔧"
      },
      {
        id: "5.4",
        title: "Mega Boss: Očný kontakt + Zvonenie",
        desc: "Zapnuté zrkadlo kamery! Hovor s kuriérom pri pohľade do objektívu.",
        mode: "ambush",
        scenarioIndex: 0,
        words: ["Áno, čakám balík, ďakujem"],
        xp: 100,
        forceCam: true,
        icon: "👁️"
      },
      {
        id: "5.5",
        title: "Finálny šampión: Unblockable Flow",
        desc: "Záverečná certifikácia plynulosti reči pod maximálnym tlakom.",
        mode: "ambush",
        scenarioIndex: 2,
        words: ["Ďakujem pekne za pomoc, prajem pekný deň"],
        xp: 150,
        isBoss: true,
        icon: "🏆"
      }
    ]
  }
];

// ============================================================================
// 2. DUOLINGO WEB AUDIO SYNTHESIZER (Zvukové efekty v reálnom čase)
// ============================================================================
class DuoAudioFx {
  constructor() {
    this.ctx = null;
  }

  ensureContext() {
    if (!this.ctx && typeof audioCtx !== 'undefined' && audioCtx) {
      this.ctx = audioCtx;
    } else if (!this.ctx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) this.ctx = new AudioClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.12, gainLevel = 0.15, delay = 0) {
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
        console.warn('Audio FX error:', e);
      }
    }, delay * 1000);
  }

  playSuccess() {
    // Radostný akord C-dur (C5, E5, G5)
    this.playTone(523.25, 'triangle', 0.14, 0.18, 0.0);
    this.playTone(659.25, 'triangle', 0.16, 0.20, 0.08);
    this.playTone(783.99, 'sine', 0.28, 0.22, 0.16);
  }

  playPerfect() {
    // Zlatý arpeggio fanfárový akord
    this.playTone(523.25, 'triangle', 0.12, 0.18, 0.0);
    this.playTone(659.25, 'triangle', 0.12, 0.20, 0.07);
    this.playTone(783.99, 'triangle', 0.14, 0.22, 0.14);
    this.playTone(1046.50, 'sine', 0.38, 0.25, 0.22);
  }

  playMistake() {
    // Jemný povzbudzujúci tón (žiadny drsný bzučiak)
    this.playTone(392.00, 'sine', 0.18, 0.14, 0.0);
    this.playTone(329.63, 'sine', 0.26, 0.16, 0.12);
  }

  playFanfare() {
    // Víťazná fanfára pri dokončení lekcie
    const notes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50];
    const times = [0.0, 0.10, 0.20, 0.32, 0.44, 0.60];
    const durs = [0.08, 0.08, 0.10, 0.12, 0.15, 0.55];

    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', durs[idx], 0.24, times[idx]);
    });
  }
}

const duoSfx = new DuoAudioFx();

// ============================================================================
// 3. SPRÁVCA STAVU HRÁČA (PERSISTENT STATE ENGINE)
// ============================================================================
const STORAGE_KEY = 'fluency_duo_save_v2';

class DuoStateManager {
  constructor() {
    this.state = this.loadState();
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
      userName: localStorage.getItem('fl_custom_name') || "Peter Novák"
    };
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultState();
      const parsed = JSON.parse(raw);
      // Overenie a aktualizácia streaku
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.lastPlayedDate !== today) {
        // Kontrola, či hral včera
        const last = new Date(parsed.lastPlayedDate);
        const now = new Date(today);
        const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          // Pokračovanie streaku
        } else if (diffDays > 1) {
          // Streak vypršal
          parsed.streak = 1;
        }
      }
      return { ...this.getDefaultState(), ...parsed };
    } catch (e) {
      console.warn('Chyba načítania stavu, resetujem:', e);
      return this.getDefaultState();
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      localStorage.setItem('fl_custom_name', this.state.userName);
    } catch (e) {
      console.warn('Chyba ukladania:', e);
    }
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

    const stars = accuracy >= 95 ? 3 : (accuracy >= 75 ? 2 : 1);
    this.state.completedLevels[levelId] = {
      stars,
      score: accuracy,
      completedAt: new Date().toISOString()
    };

    // Odomknutie ďalšieho levelu
    const nextId = this.findNextLevelId(levelId);
    if (nextId && !this.state.unlockedLevels.includes(nextId)) {
      this.state.unlockedLevels.push(nextId);
    }

    this.save();
    this.renderHud();
  }

  findNextLevelId(currentId) {
    let allLevels = [];
    WORLDS_DATA.forEach(w => {
      w.levels.forEach(l => allLevels.push(l.id));
    });
    const idx = allLevels.indexOf(currentId);
    if (idx !== -1 && idx + 1 < allLevels.length) {
      return allLevels[idx + 1];
    }
    return null;
  }

  getRank() {
    const xp = this.state.xp;
    if (xp < 250) return { title: "Novice", level: 1, icon: "🌱" };
    if (xp < 750) return { title: "Resonator", level: 2, icon: "🌊" };
    if (xp < 1600) return { title: "Flow Shaper", level: 3, icon: "⚡" };
    if (xp < 3000) return { title: "Pacemaker", level: 4, icon: "🎯" };
    return { title: "Unblockable", level: 5, icon: "👑" };
  }

  renderHud() {
    const streakEl = document.getElementById('streakVal');
    const xpEl = document.getElementById('xpVal');
    const heartsEl = document.getElementById('heartsVal');
    const rankEl = document.getElementById('rankTitle');

    if (streakEl) streakEl.textContent = this.state.streak;
    if (xpEl) xpEl.textContent = this.state.xp;
    if (heartsEl) heartsEl.textContent = this.state.lives;

    const rank = this.getRank();
    if (rankEl) rankEl.textContent = rank.title;

    // Aktualizácia profilového okna
    const pName = document.getElementById('profileNameDisplay');
    const pRank = document.getElementById('profileRankDisplay');
    const pXp = document.getElementById('pStatXp');
    const pStreak = document.getElementById('pStatStreak');
    const pWorlds = document.getElementById('pStatWorlds');
    const pCompleted = document.getElementById('pStatCompleted');

    if (pName) pName.textContent = this.state.userName;
    if (pRank) pRank.textContent = `Rank ${rank.level}: ${rank.title}`;
    if (pXp) pXp.textContent = `${this.state.xp} XP`;
    if (pStreak) pStreak.textContent = `${this.state.streak} dní 🔥`;
    
    // Počet odomknutých svetov
    let highestWorld = 1;
    this.state.unlockedLevels.forEach(lvlId => {
      const wNum = parseInt(lvlId.split('.')[0], 10);
      if (wNum > highestWorld) highestWorld = wNum;
    });
    if (pWorlds) pWorlds.textContent = `${highestWorld} / 5`;

    const completedCount = Object.keys(this.state.completedLevels).length;
    if (pCompleted) pCompleted.textContent = `${completedCount} / 25`;
  }
}

const duoState = new DuoStateManager();

// ============================================================================
// 4. RENDEROVANIE LINEÁRNEHO STROMU ÚROVNÍ (WINDING PATH)
// ============================================================================
class DuoPathRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    WORLDS_DATA.forEach((world) => {
      const worldEl = document.createElement('div');
      worldEl.className = 'world-section';
      worldEl.style.setProperty('--world-theme', world.color);
      worldEl.style.setProperty('--world-theme-lip', world.lipColor);

      // Hlavička sveta (Duolingo Unit Banner)
      const headerEl = document.createElement('div');
      headerEl.className = 'world-header-banner';
      headerEl.innerHTML = `
        <div class="world-banner-content">
          <div class="world-banner-tag">KAPITOLA ${world.id}</div>
          <h2 class="world-banner-title">${world.title}</h2>
          <p class="world-banner-sub">${world.subtitle}</p>
        </div>
        <div class="world-banner-icon">${world.icon}</div>
      `;
      worldEl.appendChild(headerEl);

      // Kľukatá trasa pre uzly sveta (Winding Node Track)
      const trackEl = document.createElement('div');
      trackEl.className = 'world-nodes-track';

      // Sínusoidné rozostavenie (stred, vpravo, stred, vľavo, stred)
      const offsets = [0, 48, 0, -48, 0];

      world.levels.forEach((level, idx) => {
        const isUnlocked = duoState.isUnlocked(level.id);
        const isCompleted = duoState.isCompleted(level.id);
        const isCurrent = isUnlocked && !isCompleted;
        const offsetX = offsets[idx % offsets.length];

        const nodeWrap = document.createElement('div');
        nodeWrap.className = 'path-node-wrapper';
        nodeWrap.style.transform = `translateX(${offsetX}px)`;

        // Samotný 3D kruhový uzol
        const btn = document.createElement('button');
        btn.className = `path-node-btn ${isUnlocked ? 'unlocked' : 'locked'} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${level.isBoss ? 'boss-node' : ''}`;
        btn.dataset.levelId = level.id;

        // Vnútro uzla
        let iconHtml = level.icon;
        if (!isUnlocked) {
          iconHtml = '🔒';
        } else if (isCompleted) {
          iconHtml = '⭐';
        }

        btn.innerHTML = `
          <div class="node-icon-inner">${iconHtml}</div>
          ${isCompleted ? '<div class="node-stars-badge">★★★</div>' : ''}
          ${isCurrent ? '<div class="node-current-beacon">TU SI TY</div>' : ''}
        `;

        btn.addEventListener('click', () => {
          this.handleNodeClick(level, world, btn);
        });

        nodeWrap.appendChild(btn);

        // Názov úrovne pod uzlom
        const labelEl = document.createElement('div');
        labelEl.className = 'node-label-sub';
        labelEl.textContent = level.title;
        nodeWrap.appendChild(labelEl);

        trackEl.appendChild(nodeWrap);
      });

      worldEl.appendChild(trackEl);
      this.container.appendChild(worldEl);
    });
  }

  handleNodeClick(level, world, btnElement) {
    const isUnlocked = duoState.isUnlocked(level.id);
    if (!isUnlocked) {
      duoSfx.playMistake();
      if (typeof statusAlert !== 'undefined' && statusAlert) {
        statusAlert.textContent = `Tento level je zamknutý. Najprv dokonči predchádzajúce úrovne!`;
      }
      return;
    }

    duoSfx.playTone(600, 'triangle', 0.08, 0.12);
    duoLesson.openLevelPopover(level, world, btnElement);
  }
}

// ============================================================================
// 5. OVLÁDAČ LEKCIÍ A ROTÁCIA CHÝB (LESSON CONTROLLER)
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
    this.currentWordItem = null;

    this.initDomBindings();
  }

  initDomBindings() {
    // Popover ovládače
    const closeBtn = document.getElementById('popoverCloseBtn');
    const backdrop = document.getElementById('nodePopoverBackdrop');
    const startBtn = document.getElementById('startLessonBtn');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closePopover());
    if (backdrop) backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closePopover();
    });
    if (startBtn) startBtn.addEventListener('click', () => this.launchLesson());

    // Exit lekcie
    const exitBtn = document.getElementById('exitLessonBtn');
    if (exitBtn) exitBtn.addEventListener('click', () => this.confirmExitLesson());

    // Pokračovanie z feedback draweru
    const drawerBtn = document.getElementById('drawerContinueBtn');
    if (drawerBtn) drawerBtn.addEventListener('click', () => this.handleDrawerContinue());

    // Klávesnica: Enter aktivuje tlačidlo v draweri
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const drawer = document.getElementById('feedbackDrawer');
        if (drawer && drawer.classList.contains('active')) {
          this.handleDrawerContinue();
        }
      }
    });

    // Toggle matice v draweri
    const toggleMatrixBtn = document.getElementById('toggleMatrixBtn');
    if (toggleMatrixBtn) {
      toggleMatrixBtn.addEventListener('click', () => {
        const matrix = document.getElementById('matrixPanel');
        if (matrix) {
          const isVis = matrix.style.display === 'block';
          matrix.style.display = isVis ? 'none' : 'block';
          toggleMatrixBtn.querySelector('.chevron').textContent = isVis ? '▼' : '▲';
        }
      });
    }

    // Oslavný modal Späť
    const celebBtn = document.getElementById('celebrationBackBtn');
    if (celebBtn) celebBtn.addEventListener('click', () => this.finishCelebration());

    // Profilový modal
    const profBtn = document.getElementById('profileBtn');
    const profModal = document.getElementById('profileModal');
    const profClose = document.getElementById('profileCloseBtn');
    const saveNameBtn = document.getElementById('saveNameBtn');
    const customNameInput = document.getElementById('customNameInput');
    const resetProgressBtn = document.getElementById('resetProgressBtn');

    if (profBtn && profModal) {
      profBtn.addEventListener('click', () => {
        if (customNameInput) customNameInput.value = duoState.state.userName;
        profModal.classList.add('active');
      });
    }
    if (profClose && profModal) {
      profClose.addEventListener('click', () => profModal.classList.remove('active'));
    }
    if (saveNameBtn && customNameInput) {
      saveNameBtn.addEventListener('click', () => {
        const newName = customNameInput.value.trim() || 'Peter Novák';
        duoState.state.userName = newName;
        duoState.save();
        duoState.renderHud();
        alert('Meno úspešne uložené!');
        if (profModal) profModal.classList.remove('active');
      });
    }
    if (resetProgressBtn) {
      resetProgressBtn.addEventListener('click', () => {
        if (confirm('Naozaj chceš zmazať celý herný postup a začať odznova?')) {
          localStorage.removeItem(STORAGE_KEY);
          location.reload();
        }
      });
    }

    // Tlačidlo Trénovať na dennom queste
    const continuePathBtn = document.getElementById('continuePathBtn');
    if (continuePathBtn) {
      continuePathBtn.addEventListener('click', () => {
        const activeNode = document.querySelector('.path-node-btn.current');
        if (activeNode) {
          activeNode.click();
        } else {
          const firstUnlocked = document.querySelector('.path-node-btn.unlocked');
          if (firstUnlocked) firstUnlocked.click();
        }
      });
    }
  }

  openLevelPopover(level, world, btnElement) {
    this.currentLevel = level;
    this.currentWorld = world;

    const popover = document.getElementById('nodePopover');
    const backdrop = document.getElementById('nodePopoverBackdrop');
    const tag = document.getElementById('popoverWorldTag');
    const title = document.getElementById('popoverTitle');
    const desc = document.getElementById('popoverDesc');
    const count = document.getElementById('popoverWordCount');

    if (tag) tag.textContent = `${world.title.toUpperCase()}`;
    if (title) title.textContent = `Lekcia ${level.id}: ${level.title}`;
    if (desc) desc.textContent = level.desc;
    if (count) count.textContent = `${level.words.length} cvičenia`;

    if (backdrop) backdrop.classList.add('active');
    if (popover) {
      popover.style.setProperty('--popover-color', world.color);
      popover.style.setProperty('--popover-lip', world.lipColor);
    }
  }

  closePopover() {
    const backdrop = document.getElementById('nodePopoverBackdrop');
    if (backdrop) backdrop.classList.remove('active');
  }

  launchLesson() {
    this.closePopover();
    if (!this.currentLevel) return;

    this.isLessonActive = true;
    this.completedItemsCount = 0;
    this.mistakesCount = 0;
    this.totalAttemptsCount = 0;

    // Inicializácia fronty slov (Duolingo Queue)
    this.lessonQueue = this.currentLevel.words.map(w => ({
      word: w,
      attempts: 0
    }));
    this.initialWordCount = this.lessonQueue.length;

    // Otvorenie fullscreen obrazovky
    const screen = document.getElementById('lessonScreen');
    if (screen) screen.classList.add('active');

    // Nastavenie režimu a kamery
    if (typeof currentMode !== 'undefined') {
      currentMode = this.currentLevel.mode || 'standard';
    }

    if (this.currentLevel.forceCam && typeof camToggle !== 'undefined' && camToggle) {
      camToggle.checked = true;
      camToggle.dispatchEvent(new Event('change'));
    }

    this.updateLessonProgress();
    this.loadNextItem();
  }

  updateLessonProgress() {
    const fill = document.getElementById('lessonProgressFill');
    const hearts = document.getElementById('lessonHeartsVal');
    const context = document.getElementById('lessonContextBadge');

    if (hearts) hearts.textContent = duoState.state.lives;

    const progressPct = Math.min(100, (this.completedItemsCount / this.initialWordCount) * 100);
    if (fill) fill.style.width = `${progressPct}%`;

    if (context && this.currentLevel) {
      const remaining = this.lessonQueue.length;
      context.textContent = `${this.currentLevel.title} • Zostáva: ${remaining}`;
    }
  }

  loadNextItem() {
    if (this.lessonQueue.length === 0) {
      this.completeCurrentLesson();
      return;
    }

    this.currentWordItem = this.lessonQueue[0];
    const word = this.currentWordItem.word;

    // Prepojenie s dsp-core.js prvkami
    const wordInputEl = document.getElementById('wordInput');
    const targetWordEl = document.getElementById('targetWord');
    const targetMetaEl = document.getElementById('targetMeta');
    const pacerEl = document.getElementById('pacerCircle');
    const statusAlertEl = document.getElementById('statusAlert');
    const matrixPanel = document.getElementById('matrixPanel');
    const drawer = document.getElementById('feedbackDrawer');

    if (drawer) drawer.classList.remove('active');
    if (matrixPanel) matrixPanel.style.display = 'none';

    if (wordInputEl) {
      wordInputEl.value = word;
      if (typeof refreshMeta === 'function') refreshMeta();
    }
    if (targetWordEl) targetWordEl.textContent = word.toUpperCase();

    if (pacerEl) {
      pacerEl.style.transform = 'scale(1)';
      pacerEl.style.borderColor = '#334155';
      pacerEl.innerHTML = '<span class="pacer-text">Priprav sa</span>';
    }

    if (statusAlertEl) {
      if (typeof isCalibrated !== 'undefined' && !isCalibrated) {
        statusAlertEl.textContent = 'Najprv kalibruj mikrofón (1 sekunda ticha).';
      } else {
        statusAlertEl.textContent = 'Stlač "Spustiť slovo" a nasleduj dychový kruh.';
      }
    }

    this.updateLessonProgress();

    // Automatický štart, ak je mikrofón už kalibrovaný
    if (typeof isCalibrated !== 'undefined' && isCalibrated) {
      const startBtn = document.getElementById('startBtn');
      if (startBtn) startBtn.disabled = false;
    }
  }

  handleAttemptResult(result) {
    this.totalAttemptsCount++;
    const { passed, isPerfect, vrt, latency } = result;

    const drawer = document.getElementById('feedbackDrawer');
    const iconEl = document.getElementById('drawerStatusIcon');
    const headEl = document.getElementById('drawerHeadline');
    const subEl = document.getElementById('drawerSubtext');
    const xpBadge = document.getElementById('drawerXpBadge');
    const continueBtn = document.getElementById('drawerContinueBtn');

    if (passed) {
      // Úspešný pokus
      if (isPerfect) {
        duoSfx.playPerfect();
        if (headEl) headEl.textContent = '🌟 Dokonalý nábeh (PERFECT)!';
        if (subEl) subEl.textContent = `Hlasivky naskočili uvoľnene v sweet-spote (VRT ${vrt.toFixed(1)} ms).`;
        if (xpBadge) xpBadge.textContent = '+50 XP';
        duoState.addXp(50);
      } else {
        duoSfx.playSuccess();
        if (headEl) headEl.textContent = '✅ Úspešný pokus!';
        if (subEl) subEl.textContent = `Plynulý štart reči bez tonického kŕča (VRT ${vrt.toFixed(1)} ms).`;
        if (xpBadge) xpBadge.textContent = '+30 XP';
        duoState.addXp(30);
      }

      if (drawer) {
        drawer.className = 'feedback-drawer active success';
      }
      if (iconEl) iconEl.textContent = '✓';
      if (continueBtn) {
        continueBtn.className = 'btn-3d green full';
        continueBtn.innerHTML = '<span>POKRAČOVAŤ (Enter)</span>';
      }

      // Odstránenie úspešného slova z fronty
      this.lessonQueue.shift();
      this.completedItemsCount++;
    } else {
      // Zaznamenaný kŕč / blok / tvrdý úder
      duoSfx.playMistake();
      this.mistakesCount++;

      if (headEl) headEl.textContent = '⚡ Zaznamenaný tvrdý úder alebo blok';
      if (subEl) subEl.textContent = 'Nevadí! Uvoľni sánku, zopakujeme si toto slovo na konci lekcie. ❤️';
      if (xpBadge) xpBadge.textContent = '+0 XP';

      if (drawer) {
        drawer.className = 'feedback-drawer active fail';
      }
      if (iconEl) iconEl.textContent = '!';
      if (continueBtn) {
        continueBtn.className = 'btn-3d amber full';
        continueBtn.innerHTML = '<span>ROZUMIEM, SKÚSIM ĎALEJ</span>';
      }

      // ROTÁCIA CHÝB V ŠTÝLE DUOLINGO:
      // Presunúť neúspešné slovo na koniec fronty, aby sa zopakovalo!
      const failed = this.lessonQueue.shift();
      failed.attempts = (failed.attempts || 0) + 1;
      this.lessonQueue.push(failed);

      // Zníženie životov
      if (duoState.state.lives > 0) {
        duoState.state.lives = Math.max(1, duoState.state.lives - 1);
        duoState.save();
        duoState.renderHud();
      }
    }

    this.updateLessonProgress();
  }

  handleDrawerContinue() {
    const drawer = document.getElementById('feedbackDrawer');
    if (drawer) drawer.classList.remove('active');

    this.loadNextItem();
  }

  completeCurrentLesson() {
    this.isLessonActive = false;
    duoSfx.playFanfare();

    const accuracy = Math.max(50, Math.round(((this.totalAttemptsCount - this.mistakesCount) / Math.max(1, this.totalAttemptsCount)) * 100));
    const baseReward = this.currentLevel.xp || 40;
    const finalXp = baseReward + (accuracy >= 90 ? 20 : 0);

    // Zápis do stavu
    duoState.completeLevel(this.currentLevel.id, finalXp, accuracy);

    // Zobrazenie oslavného modalu
    const modal = document.getElementById('celebrationModal');
    const xpRecap = document.getElementById('recapXpVal');
    const accRecap = document.getElementById('recapAccuracyVal');
    const streakRecap = document.getElementById('recapStreakVal');

    if (xpRecap) xpRecap.textContent = `+${finalXp} XP`;
    if (accRecap) accRecap.textContent = `${accuracy}%`;
    if (streakRecap) streakRecap.textContent = `🔥 ${duoState.state.streak} dní`;

    if (modal) modal.classList.add('active');
  }

  finishCelebration() {
    const modal = document.getElementById('celebrationModal');
    const screen = document.getElementById('lessonScreen');

    if (modal) modal.classList.remove('active');
    if (screen) screen.classList.remove('active');

    // Vypnutie kamery, ak bola vynútená
    if (typeof camToggle !== 'undefined' && camToggle && camToggle.checked) {
      camToggle.checked = false;
      camToggle.dispatchEvent(new Event('change'));
    }

    // Prekreslenie mapy s novým odomknutým uzlom
    duoPath.render();
  }

  confirmExitLesson() {
    if (confirm('Naozaj chceš opustiť prebiehajúcu lekciu? Stratíš rozpracovaný postup.')) {
      this.isLessonActive = false;
      const screen = document.getElementById('lessonScreen');
      if (screen) screen.classList.remove('active');

      if (typeof camToggle !== 'undefined' && camToggle && camToggle.checked) {
        camToggle.checked = false;
        camToggle.dispatchEvent(new Event('change'));
      }
    }
  }
}

const duoLesson = new DuoLessonController();
const duoPath = new DuoPathRenderer('worldsWrapper');

// ============================================================================
// 6. PREPOJENIE NA EVALUAČNÉ UDALOSTI Z dsp-core.js
// ============================================================================
// Zachytenie vyhodnotenia z dsp-core.js
window.addEventListener('dsp-evaluation-complete', (e) => {
  if (duoLesson.isLessonActive) {
    duoLesson.handleAttemptResult(e.detail);
  }
});

// Inicializácia pri načítaní stránky
document.addEventListener('DOMContentLoaded', () => {
  duoState.renderHud();
  duoPath.render();
});
