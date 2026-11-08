/**
 * ============================================================================
 * SUPABASE AUTH & CLOUD PROGRESS SYNC v3.0
 * Projekt: Fluency Biofeedback (valdfrjvcvxosjtxhqqb)
 * Podpora: Google OAuth, Email/Heslo, Magic Link, Úvodná obrazovka, Auto-Sync
 * ============================================================================
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://valdfrjvcvxosjtxhqqb.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbGRmcmp2Y3Z4b3NqdHhocXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxNjA0NzYsImV4cCI6MjEwOTczNjQ3Nn0.nYDrMWPJWoZnkYHklKWWE568qCWwCQZ6s_JW_9stxhQ';

  let client = null;
  let currentUser = null;
  let currentProfile = null;
  let currentAuthMode = 'login'; // 'login' | 'register' | 'magic'
  let syncDebounceTimer = null;

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

  // Zobrazenie spätnej väzby v modale / karte
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

  // Ovládanie úvodnej obrazovky (Welcome Gateway)
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

  // Prepínanie režimov: Prihlásenie / Nový účet / Magic Link
  function setAuthMode(mode) {
    currentAuthMode = mode;
    clearFeedback('welcomeAuthFeedback');

    const amtLoginBtn = document.getElementById('amtLoginBtn');
    const amtRegisterBtn = document.getElementById('amtRegisterBtn');
    const amtMagicBtn = document.getElementById('amtMagicBtn');
    const nameGroup = document.getElementById('welcomeNameGroup');
    const passwordGroup = document.getElementById('welcomePasswordGroup');
    const submitText = document.getElementById('welcomeSubmitText');
    const heading = document.getElementById('welcomeAuthHeading');
    const sub = document.getElementById('welcomeAuthSub');

    if (amtLoginBtn) amtLoginBtn.classList.toggle('active', mode === 'login');
    if (amtRegisterBtn) amtRegisterBtn.classList.toggle('active', mode === 'register');
    if (amtMagicBtn) amtMagicBtn.classList.toggle('active', mode === 'magic');

    if (mode === 'login') {
      if (nameGroup) nameGroup.style.display = 'none';
      if (passwordGroup) passwordGroup.style.display = 'flex';
      if (submitText) submitText.textContent = '🔑 Prihlásiť sa';
      if (heading) heading.textContent = 'Prihlásenie do profilu';
      if (sub) sub.textContent = 'Zadaj svoj email a heslo pre načítanie tvojho postupu z cloudu.';
    } else if (mode === 'register') {
      if (nameGroup) nameGroup.style.display = 'flex';
      if (passwordGroup) passwordGroup.style.display = 'flex';
      if (submitText) submitText.textContent = '✨ Vytvoriť nový účet';
      if (heading) heading.textContent = 'Vytvorenie nového profilu';
      if (sub) sub.textContent = 'Zadaj svoje meno, email a heslo. Tvoj postup sa bude bezpečne zálohovať.';
    } else if (mode === 'magic') {
      if (nameGroup) nameGroup.style.display = 'none';
      if (passwordGroup) passwordGroup.style.display = 'none';
      if (submitText) submitText.textContent = '📨 Poslať prihlasovací link';
      if (heading) heading.textContent = 'Prihlásenie bez hesla';
      if (sub) sub.textContent = 'Pošleme ti na email priamy bezpečný link, na ktorý stačí kliknúť.';
    }
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

  // 2. Prihlásenie s Emailom a Heslom
  async function signInWithEmail(email, password) {
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
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      if (data && data.user) {
        currentUser = data.user;
        sessionStorage.removeItem('fl_guest_mode');
        setFeedback('Úspešne prihlásený!', true);
        setTimeout(() => {
          hideWelcomeOverlay();
          fetchProfile(currentUser);
        }, 500);
      }
    } catch (err) {
      console.error('[Supabase Auth] Chyba prihlásenia:', err);
      setFeedback('Nesprávny email alebo heslo (' + (err.message || err) + ')');
    }
  }

  // 3. Registrácia nového účtu s Emailom a Heslom
  async function signUpWithEmail(email, password, name) {
    if (!initSupabase()) return;
    if (!email || !email.includes('@')) {
      setFeedback('Zadaj prosím platnú emailovú adresu.');
      return;
    }
    if (!password || password.length < 6) {
      setFeedback('Heslo musí mať aspoň 6 znakov.');
      return;
    }

    const cleanName = (name && name.trim()) || email.split('@')[0];
    setFeedback('Vytváram tvoj profil v cloude...', true);

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: cleanName,
            preferred_name: cleanName
          }
        }
      });

      if (error) throw error;

      if (data && data.user) {
        currentUser = data.user;
        sessionStorage.removeItem('fl_guest_mode');
        setFeedback('Účet úspešne vytvorený!', true);
        setTimeout(() => {
          hideWelcomeOverlay();
          fetchProfile(currentUser);
        }, 500);
      } else {
        setFeedback('Registrácia odoslaná! Skontroluj si schránku a potvrď email.', true);
      }
    } catch (err) {
      console.error('[Supabase Auth] Chyba registrácie:', err);
      setFeedback('Chyba registrácie: ' + (err.message || err));
    }
  }

  // 4. Bezheslové prihlásenie cez Magic Link (Email OTP)
  async function sendMagicLink(email) {
    if (!initSupabase()) return;
    if (!email || !email.includes('@')) {
      setFeedback('Zadaj prosím platnú emailovú adresu.');
      return;
    }

    setFeedback('Odosielam prihlasovací link do schránky...', true);

    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
      setFeedback('✨ Skontroluj si email! Poslali sme ti priamy prihlasovací link.', true);
    } catch (err) {
      console.error('[Supabase Auth] Chyba pri odoslaní Magic Linku:', err);
      setFeedback('Chyba pri odosielaní: ' + (err.message || err));
    }
  }

  // 5. Odhlásenie
  async function signOut() {
    if (!initSupabase()) return;
    try {
      await client.auth.signOut();
      currentUser = null;
      currentProfile = null;
      sessionStorage.removeItem('fl_guest_mode');
      updateUI();
      showWelcomeOverlay();
      setFeedback('Bol si úspešne odhlásený.', true);
      if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
        duoSfx.playTone(340, 'sine', 0.05, 0.1);
      }
    } catch (err) {
      console.error('[Supabase Auth] Chyba pri odhlásení:', err);
    }
  }

  // 6. Načítanie profilu a aplikovanie progresu do gamifikačného enginu
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

      // Aplikovanie stavu do gamifikačného enginu
      if (currentProfile && window.duoState) {
        if (currentProfile.progress && Object.keys(currentProfile.progress).length > 0) {
          window.duoState.applyCloudState(currentProfile);
        } else {
          // Cloud profil je čerstvý, uložíme tam aktuálny lokálny stav
          syncCloudProgress(window.duoState.state);
        }
      }

      updateUI();
    } catch (err) {
      console.error('[Supabase Auth] Výnimka pri načítaní profilu:', err);
    }
  }

  // 7. Automatická synchronizácia progresu používateľa do Supabase cloudu
  async function syncCloudProgress(state) {
    if (!client || !currentUser || !state) return;

    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(async () => {
      try {
        const payload = {
          xp: typeof state.xp === 'number' ? state.xp : 0,
          streak: typeof state.streak === 'number' ? state.streak : 1,
          progress: {
            unlockedLevels: state.unlockedLevels || ["1.1"],
            completedLevels: state.completedLevels || {},
            userName: state.userName || "Používateľ",
            lastPlayedDate: state.lastPlayedDate || new Date().toISOString().slice(0, 10),
            lives: typeof state.lives === 'number' ? state.lives : 5,
            syncedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        };

        const { error } = await client
          .from('profiles')
          .update(payload)
          .eq('id', currentUser.id);

        if (error) {
          console.warn('[Supabase Sync] Chyba ukladania progresu:', error);
        } else {
          console.log('[Supabase Sync] Progres úspešne synchronizovaný v cloude:', payload.progress);
          const syncBadge = document.getElementById('profileSyncText');
          if (syncBadge) {
            syncBadge.textContent = 'Cloud synchronizácia aktívna (uložené práve teraz)';
          }
        }
      } catch (err) {
        console.warn('[Supabase Sync] Výnimka pri synchronizácii:', err);
      }
    }, 400); // 400ms debounce na ochranu pred preťažením
  }

  // 8. Aktualizácia DOM prvkov podľa stavu prihlásenia
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
  }

  // 9. Nastavenie obslužných udalostí
  function setupAuthEvents() {
    // Tlačidlá na úvodnej obrazovke (Welcome Gateway)
    const welcomeBtnGoogle = document.getElementById('welcomeBtnGoogle');
    const welcomeSubmitBtn = document.getElementById('welcomeSubmitBtn');
    const welcomeGuestBtn = document.getElementById('welcomeGuestBtn');
    const amtLoginBtn = document.getElementById('amtLoginBtn');
    const amtRegisterBtn = document.getElementById('amtRegisterBtn');
    const amtMagicBtn = document.getElementById('amtMagicBtn');

    if (welcomeBtnGoogle) {
      welcomeBtnGoogle.addEventListener('click', () => signInWithGoogle());
    }

    if (amtLoginBtn) {
      amtLoginBtn.addEventListener('click', () => setAuthMode('login'));
    }
    if (amtRegisterBtn) {
      amtRegisterBtn.addEventListener('click', () => setAuthMode('register'));
    }
    if (amtMagicBtn) {
      amtMagicBtn.addEventListener('click', () => setAuthMode('magic'));
    }

    if (welcomeSubmitBtn) {
      welcomeSubmitBtn.addEventListener('click', () => {
        const emailEl = document.getElementById('welcomeEmailInput');
        const passEl = document.getElementById('welcomePasswordInput');
        const nameEl = document.getElementById('welcomeNameInput');
        const email = emailEl ? emailEl.value : '';
        const pass = passEl ? passEl.value : '';
        const name = nameEl ? nameEl.value : '';

        if (currentAuthMode === 'login') {
          signInWithEmail(email, pass);
        } else if (currentAuthMode === 'register') {
          signUpWithEmail(email, pass, name);
        } else if (currentAuthMode === 'magic') {
          sendMagicLink(email);
        }
      });
    }

    // Vstúpiť ako hosť
    if (welcomeGuestBtn) {
      welcomeGuestBtn.addEventListener('click', () => {
        sessionStorage.setItem('fl_guest_mode', '1');
        hideWelcomeOverlay();
        updateUI();
        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(440, 'triangle', 0.06, 0.1);
        }
      });
    }

    // Tlačidlo v hlavičke aplikácie
    const headerProfileBtn = document.getElementById('headerProfileBtn');
    if (headerProfileBtn) {
      headerProfileBtn.addEventListener('click', () => {
        if (!currentUser) {
          showWelcomeOverlay();
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

    // Prvky v karte Profil v Telemetrii
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    const btnEmailLogin = document.getElementById('btnEmailLogin');
    const btnMagicLink = document.getElementById('btnMagicLink');
    const btnLogout = document.getElementById('btnLogout');

    if (btnGoogleLogin) {
      btnGoogleLogin.addEventListener('click', () => signInWithGoogle());
    }

    if (btnEmailLogin) {
      btnEmailLogin.addEventListener('click', () => {
        const emailEl = document.getElementById('authEmailInput');
        const passEl = document.getElementById('authPasswordInput');
        const email = emailEl ? emailEl.value : '';
        const pass = passEl ? passEl.value : '';
        signInWithEmail(email, pass);
      });
    }

    if (btnMagicLink) {
      btnMagicLink.addEventListener('click', () => {
        const emailEl = document.getElementById('authEmailInput');
        const email = emailEl ? emailEl.value : '';
        sendMagicLink(email);
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => signOut());
    }

    const openAuthModalFromTelemetryBtn = document.getElementById('openAuthModalFromTelemetryBtn');
    if (openAuthModalFromTelemetryBtn) {
      openAuthModalFromTelemetryBtn.addEventListener('click', () => showWelcomeOverlay());
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
  }

  // 10. Inicializácia pri štarte aplikácie
  async function init() {
    if (!initSupabase()) {
      setTimeout(init, 300);
      return;
    }

    setupAuthEvents();

    const isGuest = sessionStorage.getItem('fl_guest_mode') === '1';

    // Overenie existujúceho uloženého session
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        currentUser = session.user;
        sessionStorage.removeItem('fl_guest_mode');
        hideWelcomeOverlay();
        await fetchProfile(currentUser);
      } else if (!isGuest) {
        showWelcomeOverlay();
        updateUI();
      } else {
        hideWelcomeOverlay();
        updateUI();
      }
    } catch (err) {
      console.warn('[Supabase Auth] Chyba pri overení session:', err);
      if (!isGuest) showWelcomeOverlay();
      updateUI();
    }

    // Reagovanie na zmeny stavu autentifikácie (napr. návrat z Google OAuth)
    client.auth.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth] Auth state change:', event);
      if (session && session.user) {
        currentUser = session.user;
        sessionStorage.removeItem('fl_guest_mode');
        hideWelcomeOverlay();
        await fetchProfile(currentUser);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentProfile = null;
        updateUI();
        showWelcomeOverlay();
      }
    });
  }

  window.fluencyAuth = {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendMagicLink,
    signOut,
    showWelcomeOverlay,
    hideWelcomeOverlay,
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
