/**
 * ============================================================================
 * SUPABASE AUTH & BALBUTOLOGY DIAGNOSTIC ONBOARDING v4.0
 * Projekt: Fluency Biofeedback (valdfrjvcvxosjtxhqqb)
 * Funkcie: Tiché auto-prihlásenie, Google 1-klik, Email registrácia,
 *          Vedecký dotazník balbutizmu & personalizácia cesty do cloudu.
 * ============================================================================
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://valdfrjvcvxosjtxhqqb.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbGRmcmp2Y3Z4b3NqdHhocXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxNjA0NzYsImV4cCI6MjEwOTczNjQ3Nn0.nYDrMWPJWoZnkYHklKWWE568qCWwCQZ6s_JW_9stxhQ';

  let client = null;
  let currentUser = null;
  let currentProfile = null;
  let syncDebounceTimer = null;

  // Stav odpovedí dotazníka
  const diagnosticAnswers = {
    laryngeal: 0,
    plosives: 0,
    prolongation: 0,
    clonic: 0,
    social: 0,
    situation: 'phone',
    goal: 'easy_onset',
    recWorldId: 1,
    tension: 'plosives'
  };

  function evaluateDiagnosticScores(answers) {
    const scores = {
      laryngeal: parseInt(answers.laryngeal, 10) || 1,
      plosives: parseInt(answers.plosives, 10) || 1,
      prolongation: parseInt(answers.prolongation, 10) || 1,
      clonic: parseInt(answers.clonic, 10) || 1,
      social: parseInt(answers.social, 10) || 1
    };

    const motor = [
      { key: 'plosives', worldId: 3, name: 'Plozívny artikulačný pretlak (Pery & Jazyk)', val: scores.plosives },
      { key: 'clonic', worldId: 4, name: 'Klonické opakovania & Rýchle tempo', val: scores.clonic },
      { key: 'laryngeal', worldId: 1, name: 'Glotálno-laryngeálny kŕč (Hlasivky)', val: scores.laryngeal },
      { key: 'prolongation', worldId: 2, name: 'Prolungácie & Ťahanie hlások', val: scores.prolongation }
    ];

    motor.sort((a, b) => b.val - a.val);

    let recWorldId = motor[0].worldId;
    let dominantName = motor[0].name;
    let dominantKey = motor[0].key;
    let dominantVal = motor[0].val;

    if (scores.social >= 4 && motor[0].val <= 2) {
      recWorldId = 5;
      dominantName = 'Sociálna a anticipačná rečová úzkosť';
      dominantKey = 'social';
      dominantVal = scores.social;
    }

    const totalSeverity = scores.laryngeal + scores.prolongation + scores.plosives + scores.clonic + scores.social;

    return {
      scores,
      recWorldId,
      dominantName,
      dominantKey,
      dominantVal,
      totalSeverity
    };
  }

  function initSupabase() {
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.warn('[Supabase] Knihovna supabase-js zatiaľ nie je načítaná.');
      return false;
    }
    if (!client) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });
      window.fluencySupabase = client;
    }
    return true;
  }

  // Zobrazenie spätnej väzby
  function setFeedback(msg, isSuccess = false, targetId = 'welcomeAuthFeedback') {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.className = isSuccess ? 'auth-feedback-msg success' : 'auth-feedback-msg error';
  }

  function clearFeedback(targetId = 'welcomeAuthFeedback') {
    const el = document.getElementById(targetId);
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  // Ovládanie overlayu
  function showWelcomeOverlay() {
    const overlay = document.getElementById('welcomeAuthOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function hideWelcomeOverlay() {
    const overlay = document.getElementById('welcomeAuthOverlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  // Prepínanie medzi prihlásením a dotazníkom
  function showAuthScreen() {
    const authBox = document.getElementById('welcomeAuthBox');
    const diagBox = document.getElementById('welcomeDiagnosticBox');
    if (authBox) authBox.style.display = 'block';
    if (diagBox) diagBox.style.display = 'none';
    showWelcomeOverlay();
  }

  function showDiagnosticScreen(reset = false) {
    const authBox = document.getElementById('welcomeAuthBox');
    const diagBox = document.getElementById('welcomeDiagnosticBox');
    if (authBox) authBox.style.display = 'none';
    if (diagBox) diagBox.style.display = 'block';

    if (reset) {
      goToDiagStep(1);
    }
    showWelcomeOverlay();
  }

  // 1. Prihlásenie cez Google OAuth
  async function signInWithGoogle() {
    if (!initSupabase()) return;
    setFeedback('Pripravujem overenie cez Google...', true);
    try {
      const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
      // V natívnej aplikácii posielame na Vercel relay, ktorý nás cez Deep Link okamžite prepne späť do APK
      const redirectUrl = isNative
        ? 'https://stutterbiofeedbackantigravity.vercel.app/'
        : (window.location.origin + window.location.pathname);

      console.log('[Supabase Auth] signInWithGoogle redirectUrl:', redirectUrl, 'isNative:', isNative);

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Supabase Auth] Chyba pri Google prihlásení:', err);
      setFeedback('Chyba Google prihlásenia: ' + (err.message || err));
    }
  }

  // Spracovanie natívneho Deep Linku (návrat z Google OAuth z externého prehliadača do natívnej APK)
  window.handleNativeDeepLink = async function (urlStr) {
    console.log('[Supabase Auth] Prijatý natívny Deep Link:', urlStr);
    if (!initSupabase()) return;
    if (!urlStr) return;

    try {
      setFeedback('Spracovávam overený Google účet...', true);
      
      var hash = '';
      if (urlStr.indexOf('#') !== -1) {
        hash = urlStr.substring(urlStr.indexOf('#') + 1);
      } else if (urlStr.indexOf('?') !== -1) {
        hash = urlStr.substring(urlStr.indexOf('?') + 1);
      }

      if (!hash) {
        console.warn('[Supabase Auth] Deep Link neobsahuje parametre tokenu.');
        return;
      }

      var params = new URLSearchParams(hash);
      var accessToken = params.get('access_token');
      var refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        console.log('[Supabase Auth] Ukladám session z Deep Linku do natívneho úložiska...');
        var res = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (res.error) throw res.error;

        if (res.data && res.data.user) {
          currentUser = res.data.user;
          sessionStorage.removeItem('fl_guest_mode');
          setFeedback('Úspešne prihlásený!', true);
          await onAuthSuccess(currentUser);
        }
      } else {
        var errDesc = params.get('error_description') || params.get('error');
        if (errDesc) {
          setFeedback('Google overenie: ' + decodeURIComponent(errDesc));
        }
      }
    } catch (err) {
      console.error('[Supabase Auth] Chyba pri spracovaní Deep Linku:', err);
      setFeedback('Chyba Google prihlásenia: ' + (err.message || err));
    }
  };

  // 2. Inteligentné prihlásenie / registrácia cez email
  async function handleEmailAuth(email, password, name, targetFeedbackId = 'welcomeAuthFeedback') {
    if (!initSupabase()) return;
    if (!email || !email.includes('@')) {
      setFeedback('Zadaj prosím platnú emailovú adresu.', false, targetFeedbackId);
      return;
    }
    if (!password || password.length < 6) {
      setFeedback('Heslo musí mať aspoň 6 znakov.', false, targetFeedbackId);
      return;
    }

    setFeedback('Overujem prihlasovacie údaje...', true, targetFeedbackId);

    try {
      // 1. Skúsime sa prihlásiť
      const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (!signInErr && signInData.user) {
        currentUser = signInData.user;
        sessionStorage.removeItem('fl_guest_mode');
        setFeedback('Úspešne prihlásený!', true, targetFeedbackId);
        await onAuthSuccess(currentUser);
        return;
      }

      // 2. Ak používateľ neexistuje, zaregistrujeme ho
      if (signInErr && (signInErr.message.includes('Invalid login credentials') || signInErr.status === 400 || signInErr.message.includes('Email not confirmed'))) {
        const cleanName = (name && name.trim()) || email.split('@')[0];
        console.log('[Supabase Auth] Registrujem nový účet pre:', email);
        setFeedback('Vytváram tvoj profil v cloude...', true, targetFeedbackId);

        const { data: signUpData, error: signUpErr } = await client.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: cleanName,
              preferred_name: cleanName
            }
          }
        });

        if (signUpErr) throw signUpErr;

        if (signUpData.user) {
          currentUser = signUpData.user;
          sessionStorage.removeItem('fl_guest_mode');
          setFeedback('Účet úspešne vytvorený!', true, targetFeedbackId);
          await onAuthSuccess(currentUser);
        } else {
          setFeedback('Registrácia odoslaná! Skontroluj si schránku a potvrď email.', true, targetFeedbackId);
        }
      } else if (signInErr) {
        throw signInErr;
      }
    } catch (err) {
      console.error('[Supabase Auth] Chyba autentifikácie:', err);
      setFeedback('Chyba: ' + (err.message || err), false, targetFeedbackId);
    }
  }

  // Po úspešnom overení používateľa
  async function onAuthSuccess(user) {
    await fetchProfile(user);

    // Skontrolujeme, či používateľ už vyplnil diagnostický dotazník
    const hasDiag = isDiagnosticCompleted();
    if (!hasDiag) {
      setTimeout(() => {
        showDiagnosticScreen(true);
      }, 350);
    } else {
      setTimeout(() => {
        hideWelcomeOverlay();
        updateUI();
      }, 400);
    }
  }

  function isDiagnosticCompleted() {
    if (localStorage.getItem('fl_onboarding_completed') === '1') return true;
    if (currentProfile && currentProfile.progress && currentProfile.progress.diagnostic) return true;
    return false;
  }

  // 3. Odhlásenie
  async function signOut() {
    if (!initSupabase()) return;
    try {
      await client.auth.signOut();
      currentUser = null;
      currentProfile = null;
      sessionStorage.removeItem('fl_guest_mode');
      updateUI();
      showAuthScreen();
      setFeedback('Bol si úspešne odhlásený.', true);
      if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
        duoSfx.playTone(340, 'sine', 0.05, 0.1);
      }
    } catch (err) {
      console.error('[Supabase Auth] Chyba pri odhlásení:', err);
    }
  }

  // 4. Načítanie profilu a aplikovanie progresu
  async function fetchProfile(user) {
    if (!client || !user) return;
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Auth] Profil sa nepodarilo načítať:', error);
        return;
      }

      currentProfile = data;
      console.log('[Supabase Auth] Profil úspešne načítaný z cloudu:', currentProfile);

      // Aplikovanie progresu do gamifikačného enginu
      if (currentProfile && window.duoState) {
        if (typeof currentProfile.xp === 'number') {
          window.duoState.state.xp = Math.max(window.duoState.state.xp || 0, currentProfile.xp);
        }
        if (typeof currentProfile.streak === 'number') {
          window.duoState.state.streak = Math.max(window.duoState.state.streak || 1, currentProfile.streak);
        }

        if (currentProfile.progress && Object.keys(currentProfile.progress).length > 0) {
          window.duoState.applyCloudState(currentProfile);

          // Ak profil v cloude obsahuje diagnostiku, načítame ju lokálne
          if (currentProfile.progress.diagnostic) {
            localStorage.setItem('fl_diagnostic', JSON.stringify(currentProfile.progress.diagnostic));
            localStorage.setItem('fl_onboarding_completed', '1');
            applyDiagnosticPersonalization(currentProfile.progress.diagnostic, false);
          }
        } else {
          // Čerstvý profil, synchronizujeme aktuálny lokálny stav
          syncCloudProgress(window.duoState.state);
        }

        window.duoState.save();
        window.duoState.renderHud();
        window.duoState.renderTelemetry();
      }

      updateUI();
    } catch (err) {
      console.error('[Supabase Auth] Výnimka pri načítaní profilu:', err);
    }
  }

  // 5. Automatická synchronizácia progresu do Supabase cloudu
  async function syncCloudProgress(state) {
    if (!client || !currentUser || !state) return;

    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(async () => {
      try {
        const savedDiag = getSavedDiagnostic();
        const payload = {
          xp: typeof state.xp === 'number' ? state.xp : 0,
          streak: typeof state.streak === 'number' ? state.streak : 1,
          progress: {
            unlockedLevels: state.unlockedLevels || ["1.1"],
            completedLevels: state.completedLevels || {},
            userName: state.userName || "Používateľ",
            lastPlayedDate: state.lastPlayedDate || new Date().toISOString().slice(0, 10),
            lives: typeof state.lives === 'number' ? state.lives : 5,
            diagnostic: savedDiag,
            syncedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        };

        const { error } = await client
          .from('profiles')
          .update(payload)
          .eq('id', currentUser.id);

        if (!error) {
          console.log('[Supabase Sync] Progres uložený v cloude:', payload.progress);
          const syncBadge = document.getElementById('profileSyncText');
          if (syncBadge) {
            syncBadge.textContent = 'Cloud synchronizácia aktívna (uložené)';
          }
        }
      } catch (err) {
        console.warn('[Supabase Sync] Výnimka pri synchronizácii:', err);
      }
    }, 400);
  }

  function getSavedDiagnostic() {
    try {
      const raw = localStorage.getItem('fl_diagnostic');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  // 6. Obsluha a kroky vedeckého dotazníka balbutizmu
  function goToDiagStep(step) {
    const s1 = document.getElementById('diagStep1');
    const s2 = document.getElementById('diagStep2');
    const s3 = document.getElementById('diagStep3');
    const sRes = document.getElementById('diagStepResult');
    const bar = document.getElementById('diagProgressBar');
    const counter = document.getElementById('diagStepCounter');

    if (s1) s1.style.display = step === 1 ? 'block' : 'none';
    if (s2) s2.style.display = step === 2 ? 'block' : 'none';
    if (s3) s3.style.display = step === 3 ? 'block' : 'none';
    if (sRes) sRes.style.display = step === 4 ? 'block' : 'none';

    if (step === 1) {
      if (bar) bar.style.width = '33%';
      if (counter) counter.textContent = 'Krok 1 z 3: Motorika & Kŕče';
    } else if (step === 2) {
      if (bar) bar.style.width = '66%';
      if (counter) counter.textContent = 'Krok 2 z 3: Sociálny stres & Situácie';
    } else if (step === 3) {
      if (bar) bar.style.width = '100%';
      if (counter) counter.textContent = 'Osobný Neuro-profil reči';
    }
  }

  // Aplikovanie diagnostiky na prispôsobenie cesty
  function applyDiagnosticPersonalization(diag, doSync = true) {
    if (!diag) return;

    const evalRes = evaluateDiagnosticScores(diag);
    diag.recWorldId = evalRes.recWorldId;
    diag.tension = evalRes.dominantKey;

    const worldNames = {
      1: 'Svet 1: Samohlásky & Easy Onset',
      2: 'Svet 2: Znelé spoluhlásky & Rezonancia',
      3: 'Svet 3: Plozívy a zhluky',
      4: 'Svet 4: Rytmizácia, Tempo & Vety',
      5: 'Svet 5: Sociálna expozícia & Dialógy'
    };

    const situationMap = {
      phone: 'Telefonovanie & Nečakané hovory',
      name: 'Predstavenie sa vlastným menom',
      ordering: 'Objednávanie v kaviarni/obchode',
      authorities: 'Pracovné porady & Prezentácie'
    };

    const dafMap = {
      1: 'Delay 85 ms • Formant Harmonics ON',
      2: 'Delay 75 ms • Rezonančná slučka',
      3: 'Delay 90 ms • Pitch Shift +1.5 st',
      4: 'Delay 115 ms • Spomalenie tempa ON',
      5: 'Delay 95 ms • Choral Effect'
    };

    const tensionText = `${evalRes.dominantName} (Závažnosť: ${evalRes.dominantVal}/5)`;
    const worldText = worldNames[evalRes.recWorldId] || 'Svet 3: Plozívy a zhluky';
    const situationText = situationMap[diag.situation] || 'Telefonovanie & Hovory';
    const dafText = dafMap[evalRes.recWorldId] || 'Delay 90 ms • Choral Effect';

    const elTension = document.getElementById('diagSummaryTension');
    const elWorld = document.getElementById('diagSummaryWorld');
    const elSituation = document.getElementById('diagSummarySituation');
    const elDaf = document.getElementById('diagSummaryDaf');
    const elSeverity = document.getElementById('diagSummarySeverity');
    const elEnterBtn = document.getElementById('diagEnterAppBtn');

    if (elTension) elTension.textContent = tensionText;
    if (elWorld) elWorld.textContent = worldText;
    if (elSituation) elSituation.textContent = situationText;
    if (elDaf) elDaf.textContent = dafText;
    if (elSeverity) elSeverity.textContent = `${evalRes.totalSeverity} / 25 bodov`;

    if (elEnterBtn) {
      elEnterBtn.innerHTML = `<span>🚀 Začať odporúčaným Svetom ${evalRes.recWorldId}</span>`;
    }

    // Aktualizácia karty v Telemetrii
    const tTension = document.getElementById('telemetryDiagTension');
    const tWorld = document.getElementById('telemetryDiagWorld');
    const tSituation = document.getElementById('telemetryDiagSituation');
    const tGoal = document.getElementById('telemetryDiagGoal');

    if (tTension) tTension.textContent = tensionText;
    if (tWorld) tWorld.textContent = worldText;
    if (tSituation) tSituation.textContent = situationText;
    if (tGoal) tGoal.textContent = diag.goal === 'easy_onset' ? 'Jemný mäkký nábeh hlasiviek' : (diag.goal === 'daf_choral' ? 'DAF/FAF zborový efekt' : 'Desenzitizácia a odbúranie strachu');

    // Personalizácia Trezoru slov a viet podľa situácie
    if (window.duoState) {
      const words = window.duoState.loadVaultWords();
      const userName = (currentProfile && currentProfile.full_name) || window.duoState.state.userName || 'Používateľ';

      const customItems = [
        { id: 'diag_1', word: `Moje meno je ${userName}`, category: 'Predstavenie', successes: 0, attempts: 0, isMastered: false, date: new Date().toISOString().slice(0, 10) }
      ];

      if (diag.situation === 'phone') {
        customItems.push({ id: 'diag_phone', word: 'Dobrý deň, volám ohľadom balíka', category: 'Telefón', successes: 0, attempts: 0, isMastered: false, date: new Date().toISOString().slice(0, 10) });
      } else if (diag.situation === 'ordering') {
        customItems.push({ id: 'diag_order', word: 'Dobrý deň, jedno espresso a minerálku poprosím', category: 'Kaviareň', successes: 0, attempts: 0, isMastered: false, date: new Date().toISOString().slice(0, 10) });
      } else {
        customItems.push({ id: 'diag_auth', word: 'Rád by som sa vyjadril k tomuto bodu', category: 'Práca', successes: 0, attempts: 0, isMastered: false, date: new Date().toISOString().slice(0, 10) });
      }

      customItems.forEach(item => {
        if (!words.some(w => w.word === item.word)) {
          words.unshift(item);
        }
      });
      window.duoState.saveVaultWords(words);
    }

    // Kalibrácia DAF Asistenta
    if (evalRes.recWorldId === 4) {
      const delaySlider = document.getElementById('assistantDelaySlider') || document.getElementById('dafDelaySlider');
      if (delaySlider) {
        delaySlider.value = 115;
        delaySlider.dispatchEvent(new Event('input'));
      }
    } else if (evalRes.recWorldId === 1) {
      const delaySlider = document.getElementById('assistantDelaySlider') || document.getElementById('dafDelaySlider');
      if (delaySlider) {
        delaySlider.value = 85;
        delaySlider.dispatchEvent(new Event('input'));
      }
    } else if (evalRes.recWorldId === 3) {
      const delaySlider = document.getElementById('assistantDelaySlider') || document.getElementById('dafDelaySlider');
      if (delaySlider) {
        delaySlider.value = 90;
        delaySlider.dispatchEvent(new Event('input'));
      }
    }

    if (doSync && window.duoState) {
      syncCloudProgress(window.duoState.state);
    }
  }

  // 7. Aktualizácia DOM prvkov podľa stavu prihlásenia
  function updateUI() {
    const authStatusBadge = document.getElementById('authStatusBadge');
    const authLoggedOutView = document.getElementById('authLoggedOutView');
    const authLoggedInView = document.getElementById('authLoggedInView');
    const userAvatarEl = document.getElementById('userAvatarEl');
    const userNameEl = document.getElementById('userNameEl');
    const userEmailEl = document.getElementById('userEmailEl');
    const headerProfileBtn = document.getElementById('headerProfileBtn');
    const headerProfileName = document.getElementById('headerProfileName');

    if (currentUser) {
      const name = (currentProfile && (currentProfile.full_name || currentProfile.preferred_name)) ||
                   currentUser.user_metadata?.full_name ||
                   currentUser.user_metadata?.name ||
                   currentUser.email?.split('@')[0] ||
                   'Používateľ';

      const avatar = (currentProfile && currentProfile.avatar_url) ||
                     currentUser.user_metadata?.avatar_url ||
                     currentUser.user_metadata?.picture ||
                     '';

      if (authStatusBadge) {
        authStatusBadge.textContent = 'Prihlásený (Cloud)';
        authStatusBadge.className = 'auth-status-badge online';
      }
      if (authLoggedOutView) authLoggedOutView.style.display = 'none';
      if (authLoggedInView) authLoggedInView.style.display = 'block';

      if (userNameEl) userNameEl.textContent = name;
      if (userEmailEl) userEmailEl.textContent = currentUser.email || '';

      if (userAvatarEl) {
        if (avatar) {
          userAvatarEl.src = avatar;
          userAvatarEl.style.display = 'block';
        } else {
          userAvatarEl.style.display = 'none';
        }
      }

      if (headerProfileBtn) {
        headerProfileBtn.classList.add('logged-in');
      }
      if (headerProfileName) {
        headerProfileName.textContent = name.split(' ')[0];
      }

      const dailyGreetingHeading = document.getElementById('dailyGreetingHeading');
      const headerAvatarCircle = document.getElementById('headerAvatarCircle');
      if (headerAvatarCircle) {
        const parts = name.trim().split(/\s+/);
        const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
        headerAvatarCircle.textContent = initials || 'AB';
      }
      if (dailyGreetingHeading) {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Dobré ráno' : (hour < 18 ? 'Dobrý deň' : 'Dobrý večer');
        dailyGreetingHeading.textContent = `${timeGreeting}, ${name.split(' ')[0]}.`;
      }
    } else {
      if (authStatusBadge) {
        authStatusBadge.textContent = 'Hosť (Lokálny režim)';
        authStatusBadge.className = 'auth-status-badge offline';
      }
      if (authLoggedOutView) authLoggedOutView.style.display = 'block';
      if (authLoggedInView) authLoggedInView.style.display = 'none';

      if (headerProfileBtn) {
        headerProfileBtn.classList.remove('logged-in');
      }
      if (headerProfileName) {
        headerProfileName.textContent = 'Prihlásiť';
      }

      const dailyGreetingHeading = document.getElementById('dailyGreetingHeading');
      const headerAvatarCircle = document.getElementById('headerAvatarCircle');
      if (headerAvatarCircle) headerAvatarCircle.textContent = 'AB';
      if (dailyGreetingHeading) {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Dobré ráno' : (hour < 18 ? 'Dobrý deň' : 'Dobrý večer');
        dailyGreetingHeading.textContent = `${timeGreeting}.`;
      }
    }

    // Aktualizácia diagnostickej karty v telemetrii
    const savedDiag = getSavedDiagnostic();
    if (savedDiag) {
      applyDiagnosticPersonalization(savedDiag, false);
    }
  }

  // 8. Nastavenie obslužných udalostí
  function setupAuthEvents() {
    const welcomeBtnGoogle = document.getElementById('welcomeBtnGoogle');
    const welcomeSubmitBtn = document.getElementById('welcomeSubmitBtn');
    const welcomeGuestBtn = document.getElementById('welcomeGuestBtn');
    const welcomeStartDiagBtn = document.getElementById('welcomeStartDiagBtn');
    const welcomeToggleAuthBtn = document.getElementById('welcomeToggleAuthBtn');
    const welcomeAuthCardCollapse = document.getElementById('welcomeAuthCardCollapse');
    const headerProfileBtn = document.getElementById('headerProfileBtn');
    const btnLogout = document.getElementById('btnLogout');
    const reopenDiagnosticBtn = document.getElementById('reopenDiagnosticBtn');
    const openAuthModalFromTelemetryBtn = document.getElementById('openAuthModalFromTelemetryBtn');

    // Štart diagnostiky z Onboardingu
    if (welcomeStartDiagBtn) {
      welcomeStartDiagBtn.addEventListener('click', () => {
        sessionStorage.setItem('fl_guest_mode', '1');
        showDiagnosticScreen(true);
        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(520, 'sine', 0.08, 0.12);
        }
      });
    }

    // Prepínanie prihlasovacieho formulára
    if (welcomeToggleAuthBtn && welcomeAuthCardCollapse) {
      welcomeToggleAuthBtn.addEventListener('click', () => {
        const isHidden = welcomeAuthCardCollapse.style.display === 'none';
        welcomeAuthCardCollapse.style.display = isHidden ? 'block' : 'none';
        welcomeToggleAuthBtn.innerHTML = isHidden
          ? '<span>✕ Skryť prihlasovací formulár</span>'
          : '<span>🔑 Už máš účet? Prihlásiť sa</span>';
        if (isHidden) {
          welcomeAuthCardCollapse.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    // Google Sign-In
    if (welcomeBtnGoogle) {
      welcomeBtnGoogle.addEventListener('click', () => signInWithGoogle());
    }

    // Email Submit (Prihlásiť / Zaregistrovať)
    if (welcomeSubmitBtn) {
      welcomeSubmitBtn.addEventListener('click', () => {
        const emailEl = document.getElementById('welcomeEmailInput');
        const passEl = document.getElementById('welcomePasswordInput');
        const nameEl = document.getElementById('welcomeNameInput');
        const email = emailEl ? emailEl.value : '';
        const pass = passEl ? passEl.value : '';
        const name = nameEl ? nameEl.value : '';
        handleEmailAuth(email, pass, name);
      });
    }

    // Hosťovský vstup
    if (welcomeGuestBtn) {
      welcomeGuestBtn.addEventListener('click', () => {
        sessionStorage.setItem('fl_guest_mode', '1');
        const hasDiag = isDiagnosticCompleted();
        if (!hasDiag) {
          showDiagnosticScreen(true);
        } else {
          hideWelcomeOverlay();
          updateUI();
        }
        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(440, 'triangle', 0.06, 0.1);
        }
      });
    }

    // Profil tlačidlo v hlavičke
    if (headerProfileBtn) {
      headerProfileBtn.addEventListener('click', () => {
        if (!currentUser) {
          showAuthScreen();
        } else {
          const navTabTelemetria = document.getElementById('navTabTelemetria');
          if (navTabTelemetria) navTabTelemetria.click();
          const profileCard = document.getElementById('telemetryProfileCard');
          if (profileCard) {
            profileCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => signOut());
    }

    if (reopenDiagnosticBtn) {
      reopenDiagnosticBtn.addEventListener('click', () => {
        showDiagnosticScreen(true);
      });
    }

    if (openAuthModalFromTelemetryBtn) {
      openAuthModalFromTelemetryBtn.addEventListener('click', () => {
        showAuthScreen();
      });
    }

    // Priame prihlásenie z karty Telemetrie (#authLoggedOutView)
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    if (btnGoogleLogin) {
      btnGoogleLogin.addEventListener('click', () => signInWithGoogle());
    }

    const btnEmailLogin = document.getElementById('btnEmailLogin');
    if (btnEmailLogin) {
      btnEmailLogin.addEventListener('click', () => {
        const emailEl = document.getElementById('authEmailInput');
        const passEl = document.getElementById('authPasswordInput');
        const email = emailEl ? emailEl.value : '';
        const pass = passEl ? passEl.value : '';
        handleEmailAuth(email, pass, '', 'authFeedbackMsg');
      });
    }

    const authPassInput = document.getElementById('authPasswordInput');
    if (authPassInput) {
      authPassInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (btnEmailLogin) btnEmailLogin.click();
        }
      });
    }

    const btnMagicLink = document.getElementById('btnMagicLink');
    if (btnMagicLink) {
      btnMagicLink.addEventListener('click', async () => {
        if (!initSupabase()) return;
        const emailEl = document.getElementById('authEmailInput');
        const email = emailEl ? emailEl.value.trim() : '';
        if (!email || !email.includes('@')) {
          setFeedback('Zadaj prosím platnú emailovú adresu pre odoslanie odkazu.', false, 'authFeedbackMsg');
          return;
        }
        setFeedback('Odosielam prihlasovací link do emailu...', true, 'authFeedbackMsg');
        try {
          const { error } = await client.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: window.location.origin
            }
          });
          if (error) throw error;
          setFeedback('Prihlasovací link bol odoslaný! Skontroluj si schránku.', true, 'authFeedbackMsg');
        } catch (err) {
          console.error('[Supabase Auth] Magic Link chyba:', err);
          setFeedback('Chyba: ' + (err.message || err), false, 'authFeedbackMsg');
        }
      });
    }

    // Enter kláves v prihlasovacích poliach
    const welcomePassInput = document.getElementById('welcomePasswordInput');
    if (welcomePassInput) {
      welcomePassInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (welcomeSubmitBtn) welcomeSubmitBtn.click();
        }
      });
    }

    // ===== OBSLUHA KROKOV DOTAZNÍKA =====
    setupDiagnosticSteps();
  }

  function setupDiagnosticSteps() {
    // 1. Obsluha 1-5 škály pre Krok 1 (Motorické prejavy)
    const step1Points = document.querySelectorAll('#diagStep1 .diag-scale-point');
    const diagNext1 = document.getElementById('diagNext1');

    function checkStep1Complete() {
      const isDone = diagnosticAnswers.laryngeal > 0 &&
                     diagnosticAnswers.plosives > 0 &&
                     diagnosticAnswers.prolongation > 0 &&
                     diagnosticAnswers.clonic > 0;
      if (diagNext1) diagNext1.disabled = !isDone;
    }

    step1Points.forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.getAttribute('data-domain');
        const val = parseInt(btn.getAttribute('data-val'), 10);
        diagnosticAnswers[domain] = val;

        const parentCard = btn.closest('.diag-scale-card');
        if (parentCard) {
          parentCard.classList.add('has-val');
          parentCard.querySelectorAll('.diag-scale-point').forEach(p => p.classList.remove('selected'));
        }
        btn.classList.add('selected');

        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(400 + val * 55, 'sine', 0.04, 0.08);
        }
        checkStep1Complete();
      });
    });

    if (diagNext1) {
      diagNext1.addEventListener('click', () => goToDiagStep(2));
    }

    // 2. Obsluha Kroku 2 (Sociálny stres, situácie a cieľ)
    const step2Points = document.querySelectorAll('#diagStep2 .diag-scale-point');
    const diagFinishBtn = document.getElementById('diagFinishBtn');
    const diagBack2 = document.getElementById('diagBack2');

    function checkStep2Complete() {
      const isDone = diagnosticAnswers.social > 0 && !!diagnosticAnswers.situation;
      if (diagFinishBtn) diagFinishBtn.disabled = !isDone;
    }

    step2Points.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        diagnosticAnswers.social = val;

        const parentCard = btn.closest('.diag-scale-card');
        if (parentCard) {
          parentCard.classList.add('has-val');
          parentCard.querySelectorAll('.diag-scale-point').forEach(p => p.classList.remove('selected'));
        }
        btn.classList.add('selected');

        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(480 + val * 60, 'sine', 0.04, 0.08);
        }
        checkStep2Complete();
      });
    });

    const situationCards = document.querySelectorAll('#diagSituationGrid .diag-option-card');
    situationCards.forEach(card => {
      card.addEventListener('click', () => {
        situationCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        diagnosticAnswers.situation = card.getAttribute('data-val');
        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(560, 'sine', 0.04, 0.08);
        }
        checkStep2Complete();
      });
    });

    if (diagBack2) {
      diagBack2.addEventListener('click', () => goToDiagStep(1));
    }

    if (diagFinishBtn) {
      diagFinishBtn.addEventListener('click', () => {
        applyDiagnosticPersonalization(diagnosticAnswers, true);
        goToDiagStep(3);
        if (typeof duoSfx !== 'undefined' && duoSfx.playLevelComplete) {
          duoSfx.playLevelComplete();
        }
      });
    }

    const diagBack3 = document.getElementById('diagBack3');
    if (diagBack3) {
      diagBack3.addEventListener('click', () => goToDiagStep(2));
    }

    // 3. Vstup do aplikácie a okamžitý štart odporúčaným svetom
    const diagEnterAppBtn = document.getElementById('diagEnterAppBtn');
    if (diagEnterAppBtn) {
      diagEnterAppBtn.addEventListener('click', () => {
        const evalRes = evaluateDiagnosticScores(diagnosticAnswers);
        diagnosticAnswers.recWorldId = evalRes.recWorldId;
        diagnosticAnswers.tension = evalRes.dominantKey;

        localStorage.setItem('fl_diagnostic', JSON.stringify(diagnosticAnswers));
        localStorage.setItem('fl_onboarding_completed', '1');

        if (window.duoState && window.duoState.startAtRecommendedWorld) {
          window.duoState.startAtRecommendedWorld(evalRes.recWorldId);
        }

        hideWelcomeOverlay();
        updateUI();

        const navTabCesta = document.getElementById('navTabCesta');
        if (navTabCesta) navTabCesta.click();
      });
    }
  }

  // 9. Inicializácia pri štarte aplikácie (Tiché auto-prihlásenie)
  async function init() {
    if (!initSupabase()) {
      setTimeout(init, 300);
      return;
    }

    setupAuthEvents();

    // Kontrola prijatého natívneho Deep Linku pri štarte
    if (window.__pendingDeepLink) {
      const pending = window.__pendingDeepLink;
      window.__pendingDeepLink = null;
      console.log('[Supabase Auth] Spracúvam čakajúci Deep Link:', pending);
      window.handleNativeDeepLink(pending);
      return;
    }

    if (window.location.hash && window.location.hash.indexOf('access_token=') !== -1) {
      console.log('[Supabase Auth] Nájdený access_token v URL hash:', window.location.hash);
      window.handleNativeDeepLink(window.location.href);
      return;
    }

    const isGuest = sessionStorage.getItem('fl_guest_mode') === '1';

    // Overenie existujúceho session (tiché auto-prihlásenie)
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        currentUser = session.user;
        sessionStorage.removeItem('fl_guest_mode');
        await fetchProfile(currentUser);

        const hasDiag = isDiagnosticCompleted();
        if (hasDiag) {
          hideWelcomeOverlay();
          updateUI();
        } else {
          showDiagnosticScreen(true);
        }
      } else if (isGuest) {
        const hasDiag = isDiagnosticCompleted();
        if (hasDiag) {
          hideWelcomeOverlay();
          updateUI();
        } else {
          showDiagnosticScreen(true);
        }
      } else {
        // Používateľ nie je prihlásený, zobrazíme prihlasovaciu obrazovku
        showAuthScreen();
        updateUI();
      }
    } catch (err) {
      console.warn('[Supabase Auth] Chyba pri overení session:', err);
      showAuthScreen();
      updateUI();
    }

    // Reagovanie na zmeny stavu autentifikácie (napr. návrat z Google OAuth)
    client.auth.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth] Auth state change:', event);
      if (session && session.user) {
        currentUser = session.user;
        sessionStorage.removeItem('fl_guest_mode');
        await fetchProfile(currentUser);

        const hasDiag = isDiagnosticCompleted();
        if (hasDiag) {
          hideWelcomeOverlay();
          updateUI();
        } else {
          showDiagnosticScreen(true);
        }
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentProfile = null;
        updateUI();
        showAuthScreen();
      }
    });
  }

  window.fluencyAuth = {
    signInWithGoogle,
    handleEmailAuth,
    signOut,
    showWelcomeOverlay,
    hideWelcomeOverlay,
    showDiagnosticScreen,
    syncCloudProgress,
    getCurrentUser: () => currentUser,
    getCurrentProfile: () => currentProfile
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
