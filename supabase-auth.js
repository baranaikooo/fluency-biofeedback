/**
 * ============================================================================
 * SUPABASE AUTH & CLOUD PROFILE SYNC
 * Projekt: Fluency Biofeedback (valdfrjvcvxosjtxhqqb)
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
      alert('Chyba prihlásenia cez Google: ' + (err.message || err));
    }
  }

  // Prihlásenie cez Facebook
  async function signInWithFacebook() {
    if (!initSupabase()) return;
    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Supabase Auth] Chyba pri Facebook prihlásení:', err);
      alert('Chyba prihlásenia cez Facebook: ' + (err.message || err));
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
          // Aktualizácia cloudu vyšším lokálnym XP
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

  function setupAuthModal() {
    const authModalBackdrop = document.getElementById('authModalBackdrop');
    const headerProfileBtn = document.getElementById('headerProfileBtn');
    const authModalCloseBtn = document.getElementById('authModalCloseBtn');
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    const btnFacebookLogin = document.getElementById('btnFacebookLogin');
    const btnLogout = document.getElementById('btnLogout');

    if (headerProfileBtn && authModalBackdrop) {
      headerProfileBtn.addEventListener('click', () => {
        authModalBackdrop.classList.add('active');
      });
    }

    if (authModalCloseBtn && authModalBackdrop) {
      authModalCloseBtn.addEventListener('click', () => {
        authModalBackdrop.classList.remove('active');
      });
    }

    if (authModalBackdrop) {
      authModalBackdrop.addEventListener('click', (e) => {
        if (e.target === authModalBackdrop) {
          authModalBackdrop.classList.remove('active');
        }
      });
    }

    if (btnGoogleLogin) {
      btnGoogleLogin.addEventListener('click', () => signInWithGoogle());
    }

    if (btnFacebookLogin) {
      btnFacebookLogin.addEventListener('click', () => signInWithFacebook());
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

    setupAuthModal();

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
    signInWithFacebook,
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
