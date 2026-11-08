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
    tension: null,
    situation: null,
    goal: null
  };

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
    setFeedback('Presmerovávam na overenie cez Google...', true);
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
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

  // 2. Inteligentné prihlásenie / registrácia cez email
  async function handleEmailAuth(email, password, name) {
    if (!initSupabase()) return;
    if (!email || !email.includes('@')) {
      setFeedback('Zadaj prosím platnú emailovú adresu.');
      return;
    }
    if (!password || password.length < 6) {
      setFeedback('Heslo musí mať aspoň 6 znakov.');
      return;
    }

    setFeedback('Overujem prihlasovacie údaje...', true);

    try {
      // 1. Skúsime sa prihlásiť
      const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (!signInErr && signInData.user) {
        currentUser = signInData.user;
        sessionStorage.removeItem('fl_guest_mode');
        setFeedback('Úspešne prihlásený!', true);
        await onAuthSuccess(currentUser);
        return;
      }

      // 2. Ak používateľ neexistuje, zaregistrujeme ho
      if (signInErr && (signInErr.message.includes('Invalid login credentials') || signInErr.status === 400 || signInErr.message.includes('Email not confirmed'))) {
        const cleanName = (name && name.trim()) || email.split('@')[0];
        console.log('[Supabase Auth] Registrujem nový účet pre:', email);
        setFeedback('Vytváram tvoj profil v cloude...', true);

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
          setFeedback('Účet úspešne vytvorený!', true);
          await onAuthSuccess(currentUser);
        } else {
          setFeedback('Registrácia odoslaná! Skontroluj si schránku a potvrď email.', true);
        }
      } else if (signInErr) {
        throw signInErr;
      }
    } catch (err) {
      console.error('[Supabase Auth] Chyba autentifikácie:', err);
      setFeedback('Chyba: ' + (err.message || err));
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
      if (counter) counter.textContent = 'Krok 1 z 3: Anatómia zárazu';
    } else if (step === 2) {
      if (bar) bar.style.width = '66%';
      if (counter) counter.textContent = 'Krok 2 z 3: Sociálny spúšťač';
    } else if (step === 3) {
      if (bar) bar.style.width = '100%';
      if (counter) counter.textContent = 'Krok 3 z 3: Primárny cieľ';
    } else if (step === 4) {
      if (bar) bar.style.width = '100%';
      if (counter) counter.textContent = 'Diagnostická analýza';
    }
  }

  // Aplikovanie diagnostiky na prispôsobenie cesty
  function applyDiagnosticPersonalization(diag, doSync = true) {
    if (!diag) return;

    // 1. Zobrazenie výsledkov v modale
    const tensionMap = {
      laryngeal: 'Glotálno-laryngeálny kŕč (Hlasivky)',
      plosives: 'Plozívny artikulačný pretlak (Pery & Jazyk)',
      clonic: 'Klonické zrýchlené opakovanie',
      prolongation: 'Prolungácia & ťahanie tónu'
    };

    const worldMap = {
      laryngeal: 'Svet 1: Samohlásky & Easy Onset',
      plosives: 'Svet 3: Plozívy & Ľahký dotyk',
      clonic: 'Svet 4: Rytmizácia, Tempo & Vety',
      prolongation: 'Svet 2: Znelé spoluhlásky & Rezonancia'
    };

    const situationMap = {
      phone: 'Telefonovanie & Nečakané hovory',
      name: 'Predstavenie sa vlastným menom',
      ordering: 'Objednávanie v kaviarni/obchode',
      authorities: 'Pracovné porady & Prezentácie'
    };

    const dafMap = {
      laryngeal: 'Delay 85 ms • Formant Harmonics ON',
      plosives: 'Delay 90 ms • Pitch Shift +1.5 st',
      clonic: 'Delay 115 ms • Spomalenie tempa ON',
      prolongation: 'Delay 75 ms • Rezonančná slučka'
    };

    const tensionText = tensionMap[diag.tension] || 'Laryngeálno-glotálna tenzia';
    const worldText = worldMap[diag.tension] || 'Svet 1: Samohlásky & Easy Onset';
    const situationText = situationMap[diag.situation] || 'Telefonovanie & Hovory';
    const dafText = dafMap[diag.tension] || 'Delay 90 ms • Choral Effect';

    const elTension = document.getElementById('diagSummaryTension');
    const elWorld = document.getElementById('diagSummaryWorld');
    const elSituation = document.getElementById('diagSummarySituation');
    const elDaf = document.getElementById('diagSummaryDaf');

    if (elTension) elTension.textContent = tensionText;
    if (elWorld) elWorld.textContent = worldText;
    if (elSituation) elSituation.textContent = situationText;
    if (elDaf) elDaf.textContent = dafText;

    // Aktualizácia karty v Telemetrii
    const tTension = document.getElementById('telemetryDiagTension');
    const tWorld = document.getElementById('telemetryDiagWorld');
    const tSituation = document.getElementById('telemetryDiagSituation');
    const tGoal = document.getElementById('telemetryDiagGoal');

    if (tTension) tTension.textContent = tensionText;
    if (tWorld) tWorld.textContent = worldText;
    if (tSituation) tSituation.textContent = situationText;
    if (tGoal) tGoal.textContent = diag.goal === 'easy_onset' ? 'Jemný mäkký nábeh hlasiviek' : (diag.goal === 'daf_choral' ? 'DAF/FAF zborový efekt' : 'Desenzitizácia a odbúranie strachu');

    // 2. Personalizácia Trezoru slov a viet podľa situácie
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

      // Vložiť unikátne
      customItems.forEach(item => {
        if (!words.some(w => w.word === item.word)) {
          words.unshift(item);
        }
      });
      window.duoState.saveVaultWords(words);
    }

    // 3. Kalibrácia DAF Asistenta
    if (diag.tension === 'clonic') {
      const delaySlider = document.getElementById('dafDelaySlider');
      if (delaySlider) {
        delaySlider.value = 115;
        delaySlider.dispatchEvent(new Event('input'));
      }
    } else if (diag.tension === 'laryngeal') {
      const delaySlider = document.getElementById('dafDelaySlider');
      if (delaySlider) {
        delaySlider.value = 85;
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
    const headerProfileBtn = document.getElementById('headerProfileBtn');
    const btnLogout = document.getElementById('btnLogout');
    const reopenDiagnosticBtn = document.getElementById('reopenDiagnosticBtn');
    const openAuthModalFromTelemetryBtn = document.getElementById('openAuthModalFromTelemetryBtn');

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
    // Krok 1 karty
    const step1Cards = document.querySelectorAll('#diagStep1 .diag-option-card');
    const diagNext1 = document.getElementById('diagNext1');

    step1Cards.forEach(card => {
      card.addEventListener('click', () => {
        step1Cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        diagnosticAnswers.tension = card.getAttribute('data-val');
        if (diagNext1) diagNext1.disabled = false;
        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(520, 'sine', 0.04, 0.08);
        }
      });
    });

    if (diagNext1) {
      diagNext1.addEventListener('click', () => goToDiagStep(2));
    }

    // Krok 2 karty
    const step2Cards = document.querySelectorAll('#diagStep2 .diag-option-card');
    const diagNext2 = document.getElementById('diagNext2');
    const diagBack2 = document.getElementById('diagBack2');

    step2Cards.forEach(card => {
      card.addEventListener('click', () => {
        step2Cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        diagnosticAnswers.situation = card.getAttribute('data-val');
        if (diagNext2) diagNext2.disabled = false;
        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(580, 'sine', 0.04, 0.08);
        }
      });
    });

    if (diagBack2) diagBack2.addEventListener('click', () => goToDiagStep(1));
    if (diagNext2) diagNext2.addEventListener('click', () => goToDiagStep(3));

    // Krok 3 karty
    const step3Cards = document.querySelectorAll('#diagStep3 .diag-option-card');
    const diagFinishBtn = document.getElementById('diagFinishBtn');
    const diagBack3 = document.getElementById('diagBack3');

    step3Cards.forEach(card => {
      card.addEventListener('click', () => {
        step3Cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        diagnosticAnswers.goal = card.getAttribute('data-val');
        if (diagFinishBtn) diagFinishBtn.disabled = false;
        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(660, 'sine', 0.05, 0.08);
        }
      });
    });

    if (diagBack3) diagBack3.addEventListener('click', () => goToDiagStep(2));

    if (diagFinishBtn) {
      diagFinishBtn.addEventListener('click', () => {
        applyDiagnosticPersonalization(diagnosticAnswers, true);
        goToDiagStep(4);
        if (typeof duoSfx !== 'undefined' && duoSfx.playLevelComplete) {
          duoSfx.playLevelComplete();
        }
      });
    }

    // Krok 4: Vstup do aplikácie
    const diagEnterAppBtn = document.getElementById('diagEnterAppBtn');
    if (diagEnterAppBtn) {
      diagEnterAppBtn.addEventListener('click', () => {
        localStorage.setItem('fl_diagnostic', JSON.stringify(diagnosticAnswers));
        localStorage.setItem('fl_onboarding_completed', '1');
        hideWelcomeOverlay();
        updateUI();

        // Prepnutie na záložku Cesta
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
