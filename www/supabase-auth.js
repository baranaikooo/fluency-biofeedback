/**
 * ============================================================================
 * SUPABASE AUTH & CLOUD PROFILE SYNC
 * Projekt: Fluency Biofeedback (valdfrjvcvxosjtxhqqb)
 * Podpora: Google OAuth, Email/Heslo & Magic Link (bez hesla)
 * ============================================================================
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://valdfrjvcvxosjtxhqqb.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbGRmcmp2Y3Z4b3NqdHhocXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxNjA0NzYsImV4cCI6MjEwOTczNjQ3Nn0.nYDrMWPJWoZnkYHklKWWE568qCWwCQZ6s_JW_9stxhQ';

  let client = null;
  let currentUser = null;
  let currentProfile = null;

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
          detectSessionInUrl: true
        }
      });
      window.fluencySupabase = client;
    }
    return true;
  }

  function setFeedback(msg, isSuccess = false) {
    const el = document.getElementById('authFeedbackMsg');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.className = isSuccess ? 'auth-feedback-msg success' : 'auth-feedback-msg error';
  }

  // Prihlásenie cez Google
  async function signInWithGoogle() {
    if (!initSupabase()) return;
    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Supabase Auth] Chyba pri Google prihlásení:', err);
      setFeedback('Chyba Google prihlásenia: ' + (err.message || err));
    }
  }

  // Prihlásenie / Registrácia cez Email a Heslo
  async function signInOrSignUpWithEmail(email, password) {
    if (!initSupabase()) return;
    if (!email || !email.includes('@')) {
      setFeedback('Zadaj prosím platnú emailovú adresu.');
      return;
    }
    if (!password || password.length < 6) {
      setFeedback('Heslo musí mať aspoň 6 znakov.');
      return;
    }

    setFeedback('Overujem údaje v cloude...', true);

    try {
      // 1. Skúsime sa prihlásiť
      const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (!signInErr && signInData.user) {
        currentUser = signInData.user;
        await fetchProfile(currentUser);
        setFeedback('Úspešne prihlásený!', true);
        return;
      }

      // 2. Ak používateľ neexistuje, zaregistrujeme ho
      if (signInErr && (signInErr.message.includes('Invalid login credentials') || signInErr.status === 400)) {
        console.log('[Supabase Auth] Používateľ neexistuje, registrujem nový účet...');
        const { data: signUpData, error: signUpErr } = await client.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: email.split('@')[0],
              preferred_name: email.split('@')[0]
            }
          }
        });

        if (signUpErr) throw signUpErr;

        if (signUpData.user) {
          currentUser = signUpData.user;
          await fetchProfile(currentUser);
          setFeedback('Účet vytvorený a úspešne prihlásený!', true);
        } else {
          setFeedback('Skontroluj si schránku a potvrď registračný email.', true);
        }
      } else if (signInErr) {
        throw signInErr;
      }
    } catch (err) {
      console.error('[Supabase Auth] Chyba pri email prihlásení:', err);
      setFeedback('Chyba: ' + (err.message || err));
    }
  }

  // Bezheslové prihlásenie cez Magic Link (Email OTP)
  async function sendMagicLink(email) {
    if (!initSupabase()) return;
    if (!email || !email.includes('@')) {
      setFeedback('Zadaj prosím platnú emailovú adresu pre odoslanie odkazu.');
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

  // Odhlásenie
  async function signOut() {
    if (!initSupabase()) return;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      currentUser = null;
      currentProfile = null;
      updateUI();
      setFeedback('Bol si odhlásený.', true);
      if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
        duoSfx.playTone(340, 'sine', 0.05, 0.1);
      }
    } catch (err) {
      console.error('[Supabase Auth] Chyba pri odhlásení:', err);
    }
  }

  // Načítanie profilu z tabuľky public.profiles
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
      console.log('[Supabase Auth] Profil načítaný:', currentProfile);

      // Synchronizácia XP a Streak do lokálneho gamification enginu ak sú v cloude vyššie
      if (currentProfile) {
        const localXp = parseInt(localStorage.getItem('fluency_xp') || '0', 10);
        if (currentProfile.xp > localXp) {
          localStorage.setItem('fluency_xp', String(currentProfile.xp));
          const xpEl = document.getElementById('xpVal');
          if (xpEl) xpEl.textContent = currentProfile.xp;
        } else if (localXp > currentProfile.xp) {
          await updateCloudStats(localXp, parseInt(localStorage.getItem('fluency_streak') || '0', 10));
        }
      }

      updateUI();
    } catch (err) {
      console.error('[Supabase Auth] Výnimka pri načítaní profilu:', err);
    }
  }

  // Aktualizácia štatistík profilu v cloude
  async function updateCloudStats(xp, streak) {
    if (!client || !currentUser) return;
    try {
      await client
        .from('profiles')
        .update({
          xp: xp,
          streak: streak,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);
    } catch (err) {
      console.warn('[Supabase Auth] Nepodarilo sa uložiť štatistiky do cloudu:', err);
    }
  }

  // Aktualizácia DOM prvkov podľa stavu prihlásenia
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
        authStatusBadge.textContent = 'Prihlásený';
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
        authStatusBadge.textContent = 'Hosť (Lokálne)';
        authStatusBadge.className = 'auth-status-badge offline';
      }
      if (authLoggedOutView) authLoggedOutView.style.display = 'block';
      if (authLoggedInView) authLoggedInView.style.display = 'none';

      if (headerProfileBtn) {
        headerProfileBtn.classList.remove('logged-in');
      }
      if (headerProfileName) {
        headerProfileName.textContent = 'Profil';
      }
    }
  }

  function setupAuthEvents() {
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    const btnEmailLogin = document.getElementById('btnEmailLogin');
    const btnMagicLink = document.getElementById('btnMagicLink');
    const btnLogout = document.getElementById('btnLogout');
    const headerProfileBtn = document.getElementById('headerProfileBtn');

    if (headerProfileBtn) {
      headerProfileBtn.addEventListener('click', () => {
        // Prepne na záložku Telemetria a zascrolluje na profil
        const navTabTelemetria = document.getElementById('navTabTelemetria');
        if (navTabTelemetria) navTabTelemetria.click();
        const profileCard = document.getElementById('telemetryProfileCard');
        if (profileCard) {
          profileCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (btnGoogleLogin) {
      btnGoogleLogin.addEventListener('click', () => signInWithGoogle());
    }

    if (btnEmailLogin) {
      btnEmailLogin.addEventListener('click', () => {
        const emailEl = document.getElementById('authEmailInput');
        const passEl = document.getElementById('authPasswordInput');
        const email = emailEl ? emailEl.value : '';
        const pass = passEl ? passEl.value : '';
        signInOrSignUpWithEmail(email, pass);
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
  }

  // Inicializácia pri načítaní stránky
  async function init() {
    if (!initSupabase()) {
      setTimeout(init, 300);
      return;
    }

    setupAuthEvents();

    // Načítanie existujúceho session
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        currentUser = session.user;
        await fetchProfile(currentUser);
      } else {
        updateUI();
      }
    } catch (err) {
      console.warn('[Supabase Auth] Chyba pri overení session:', err);
      updateUI();
    }

    // Počúvanie na zmeny autentifikácie (prihlásenie, odhlásenie)
    client.auth.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth] Udalosť stavu:', event);
      if (session && session.user) {
        currentUser = session.user;
        await fetchProfile(currentUser);
      } else {
        currentUser = null;
        currentProfile = null;
        updateUI();
      }
    });
  }

  window.fluencyAuth = {
    signInWithGoogle,
    signInOrSignUpWithEmail,
    sendMagicLink,
    signOut,
    getCurrentUser: () => currentUser,
    getCurrentProfile: () => currentProfile,
    updateCloudStats
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
