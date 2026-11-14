/**
 * ============================================================================
 * SUPABASE AUTH & BALBUTOLOGY DIAGNOSTIC ONBOARDING v4.0
 * Projekt: Fluency Biofeedback (valdfrjvcvxosjtxhqqb)
 * Funkcie: Tiché auto-prihlásenie, Google 1-klik, Email registrácia,
 *          Vedecký dotazník balbutizmu & personalizácia cesty do cloudu.
 * ============================================================================
 */

(function () {
  "use strict";

  const SUPABASE_URL = "https://valdfrjvcvxosjtxhqqb.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbGRmcmp2Y3Z4b3NqdHhocXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxNjA0NzYsImV4cCI6MjEwOTczNjQ3Nn0.nYDrMWPJWoZnkYHklKWWE568qCWwCQZ6s_JW_9stxhQ";

  let client = null;
  let currentUser = null;
  let currentProfile = null;
  let syncDebounceTimer = null;
  let profileRequest = null;
  let profileRequestUser = null;
  let restorePromise = null;

  // Stav odpovedí dotazníka
  const diagnosticAnswers = {
    laryngeal: 0,
    plosives: 0,
    prolongation: 0,
    clonic: 0,
    social: 0,
    situation: "phone",
    goal: "easy_onset",
    recWorldId: 1,
    tension: "plosives",
  };

  function evaluateDiagnosticScores(answers) {
    const scores = {
      laryngeal: parseInt(answers.laryngeal, 10) || 1,
      plosives: parseInt(answers.plosives, 10) || 1,
      prolongation: parseInt(answers.prolongation, 10) || 1,
      clonic: parseInt(answers.clonic, 10) || 1,
      social: parseInt(answers.social, 10) || 1,
    };

    const motor = [
      {
        key: "plosives",
        worldId: 3,
        name: "Plozívny artikulačný pretlak (Pery & Jazyk)",
        val: scores.plosives,
      },
      { key: "clonic", worldId: 4, name: "Klonické opakovania & Rýchle tempo", val: scores.clonic },
      {
        key: "laryngeal",
        worldId: 1,
        name: "Glotálno-laryngeálny kŕč (Hlasivky)",
        val: scores.laryngeal,
      },
      {
        key: "prolongation",
        worldId: 2,
        name: "Prolungácie & Ťahanie hlások",
        val: scores.prolongation,
      },
    ];

    motor.sort((a, b) => b.val - a.val);

    let recWorldId = motor[0].worldId;
    let dominantName = motor[0].name;
    let dominantKey = motor[0].key;
    let dominantVal = motor[0].val;

    if (scores.social >= 4 && motor[0].val <= 2) {
      recWorldId = 5;
      dominantName = "Sociálna a anticipačná rečová úzkosť";
      dominantKey = "social";
      dominantVal = scores.social;
    }

    const totalSeverity =
      scores.laryngeal + scores.prolongation + scores.plosives + scores.clonic + scores.social;

    return {
      scores,
      recWorldId,
      dominantName,
      dominantKey,
      dominantVal,
      totalSeverity,
    };
  }

  const AUTH_STORAGE_KEY = "sb-valdfrjvcvxosjtxhqqb-auth-token";
  let authStorage;

  function createAuthStorage() {
    const legacy = window.localStorage;
    const native = window.Capacitor?.getPlatform?.() === "android"
      ? window.Capacitor.Plugins?.GlideAuthStorage
      : null;
    if (!native) return legacy;

    return {
      async getItem(key) {
        const { value } = await native.get({ key });
        if (typeof value === "string") return value;
        const oldValue = legacy.getItem(key);
        if (oldValue === null) return null;
        await native.set({ key, value: oldValue });
        legacy.removeItem(key);
        return oldValue;
      },
      async setItem(key, value) {
        await native.set({ key, value });
        legacy.removeItem(key);
      },
      async removeItem(key) {
        legacy.removeItem(key);
        await native.remove({ key });
      },
    };
  }

  function initSupabase() {
    if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
      console.warn("[Supabase] Knihovna supabase-js zatiaľ nie je načítaná.");
      return false;
    }
    if (!client) {
      authStorage = createAuthStorage();
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: AUTH_STORAGE_KEY,
          storage: authStorage,
        },
      });
      window.fluencySupabase = client;
    }
    return true;
  }

  // Zobrazenie spätnej väzby
  function setFeedback(msg, isSuccess = false, targetId = "welcomeAuthFeedback") {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    el.className = isSuccess ? "auth-feedback-msg success" : "auth-feedback-msg error";
  }

  function clearFeedback(targetId = "welcomeAuthFeedback") {
    const el = document.getElementById(targetId);
    if (el) {
      el.textContent = "";
      el.style.display = "none";
    }
  }

  // Ovládanie overlayu
  function showWelcomeOverlay() {
    const overlay = document.getElementById("welcomeAuthOverlay");
    if (overlay) {
      overlay.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }

  function hideWelcomeOverlay() {
    const overlay = document.getElementById("welcomeAuthOverlay");
    if (overlay) {
      overlay.style.display = "none";
      document.body.style.overflow = "";
    }
  }

  // Prepínanie medzi prihlásením a dotazníkom
  function showAuthScreen() {
    showWelcomeOverlay();
  }

  function showDiagnosticScreen(reset = false) {
    hideWelcomeOverlay();
    if (window.openFigmaQuestionnaire) {
      window.openFigmaQuestionnaire(reset);
    }
  }

  // 1. Prihlásenie cez Google OAuth
  async function signInWithGoogle() {
    if (!initSupabase()) return;
    setFeedback("Pripravujem overenie cez Google...", true);
    try {
      const isNative = !!(
        window.Capacitor &&
        window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform()
      );
      // V natívnej aplikácii posielame na Vercel relay, ktorý nás cez Deep Link okamžite prepne späť do APK
      const redirectUrl = isNative
        ? "https://glidesk.vercel.app/?glide_android=1"
        : window.location.origin + window.location.pathname;

      console.log(
        "[Supabase Auth] signInWithGoogle redirectUrl:",
        redirectUrl,
        "isNative:",
        isNative,
      );

      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("[Supabase Auth] Chyba pri Google prihlásení:", err);
      setFeedback("Chyba Google prihlásenia: " + (err.message || err));
    }
  }

  // Spracovanie natívneho Deep Linku (návrat z Google OAuth z externého prehliadača do natívnej APK)
  window.handleNativeDeepLink = async function (urlStr) {
    if (!initSupabase()) return;
    if (!urlStr) return;

    try {
      setFeedback("Spracovávam overený Google účet...", true);

      var hash = "";
      if (urlStr.indexOf("#") !== -1) {
        hash = urlStr.substring(urlStr.indexOf("#") + 1);
      } else if (urlStr.indexOf("?") !== -1) {
        hash = urlStr.substring(urlStr.indexOf("?") + 1);
      }

      if (!hash) {
        console.warn("[Supabase Auth] Deep Link neobsahuje parametre tokenu.");
        return;
      }

      var params = new URLSearchParams(hash);
      var accessToken = params.get("access_token");
      var refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        console.log("[Supabase Auth] Ukladám session z Deep Linku do natívneho úložiska...");
        var res = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (res.error) throw res.error;

        if (res.data && res.data.user) {
          currentUser = res.data.user;
          sessionStorage.removeItem("fl_guest_mode");
          setFeedback("Úspešne prihlásený!", true);
          await onAuthSuccess(currentUser);
        }
      } else {
        var errDesc = params.get("error_description") || params.get("error");
        if (errDesc) {
          setFeedback("Google overenie: " + decodeURIComponent(errDesc));
        }
      }
    } catch (err) {
      console.error("[Supabase Auth] Chyba pri spracovaní Deep Linku:", err);
      setFeedback("Chyba Google prihlásenia: " + (err.message || err));
    }
  };

  // 2. Inteligentné prihlásenie / registrácia cez email
  async function handleEmailAuth(email, password, name, targetFeedbackId = "welcomeAuthFeedback") {
    if (!initSupabase()) return;
    if (!email || !email.includes("@")) {
      setFeedback("Zadaj prosím platnú emailovú adresu.", false, targetFeedbackId);
      return;
    }
    if (!password || password.length < 6) {
      setFeedback("Heslo musí mať aspoň 6 znakov.", false, targetFeedbackId);
      return;
    }

    setFeedback("Overujem prihlasovacie údaje...", true, targetFeedbackId);

    try {
      // 1. Skúsime sa prihlásiť
      const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (!signInErr && signInData.user) {
        currentUser = signInData.user;
        sessionStorage.removeItem("fl_guest_mode");
        setFeedback("Úspešne prihlásený!", true, targetFeedbackId);
        await onAuthSuccess(currentUser);
        return;
      }

      // 2. Ak používateľ neexistuje, zaregistrujeme ho
      if (
        signInErr &&
        (signInErr.message.includes("Invalid login credentials") ||
          signInErr.status === 400 ||
          signInErr.message.includes("Email not confirmed"))
      ) {
        const cleanName = (name && name.trim()) || email.split("@")[0];
        setFeedback("Vytváram tvoj profil v cloude...", true, targetFeedbackId);

        const { data: signUpData, error: signUpErr } = await client.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: cleanName,
              preferred_name: cleanName,
            },
          },
        });

        if (signUpErr) {
          if (/already registered|already exists/i.test(signUpErr.message || "")) {
            setFeedback(
              "Tento email už má účet, ale heslo nesedí. Skús iné heslo.",
              false,
              targetFeedbackId,
            );
            return;
          }
          throw signUpErr;
        }

        if (signUpData.user && signUpData.session) {
          currentUser = signUpData.user;
          sessionStorage.removeItem("fl_guest_mode");
          setFeedback("Účet úspešne vytvorený!", true, targetFeedbackId);
          await onAuthSuccess(currentUser);
        } else {
          setFeedback(
            "Registrácia odoslaná! Skontroluj si schránku a potvrď email.",
            true,
            targetFeedbackId,
          );
        }
      } else if (signInErr) {
        throw signInErr;
      }
    } catch (err) {
      console.error("[Supabase Auth] Chyba autentifikácie:", err);
      setFeedback("Chyba: " + (err.message || err), false, targetFeedbackId);
    }
  }

  // Po úspešnom overení používateľa
  async function onAuthSuccess(user) {
    currentUser = user;
    sessionStorage.removeItem("fl_guest_mode");
    hideWelcomeOverlay();
    updateUI();
    await fetchProfile(user);
    if (currentUser?.id !== user.id) return;

    // Dotazník nasleduje hneď po prihlásení, ak ho tento účet ešte nevyplnil.
    if (!isDiagnosticCompleted()) {
      showDiagnosticScreen(true);
    }
  }

  function isDiagnosticCompleted() {
    if (localStorage.getItem("fl_onboarding_completed") === "1") return true;
    if (currentProfile && currentProfile.progress && currentProfile.progress.diagnostic)
      return true;
    return false;
  }

  // 3. Odhlásenie
  async function signOut() {
    if (!initSupabase()) return;
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
      clearTimeout(syncDebounceTimer);
      currentUser = null;
      currentProfile = null;
      sessionStorage.removeItem("fl_guest_mode");
      updateUI();
      showAuthScreen();
      setFeedback("Bol si úspešne odhlásený.", true);
      if (typeof duoSfx !== "undefined" && duoSfx.playTone) {
        duoSfx.playTone(340, "sine", 0.05, 0.1);
      }
    } catch (err) {
      console.error("[Supabase Auth] Chyba pri odhlásení:", err);
    }
  }

  // 4. Načítanie profilu a aplikovanie progresu
  function fetchProfile(user) {
    if (profileRequest && profileRequestUser === user?.id) return profileRequest;
    profileRequestUser = user?.id;
    const request = fetchProfileData(user).finally(() => {
      if (profileRequest === request) profileRequest = null;
    });
    profileRequest = request;
    return request;
  }

  async function fetchProfileData(user) {
    if (!client || !user) return;
    try {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("[Supabase Auth] Profil sa nepodarilo načítať:", error);
        return;
      }

      if (currentUser?.id !== user.id) return;
      currentProfile = data;

      // Aplikovanie progresu do gamifikačného enginu
      if (currentProfile && window.duoState) {
        if (typeof currentProfile.xp === "number") {
          window.duoState.state.xp = Math.max(window.duoState.state.xp || 0, currentProfile.xp);
        }
        if (typeof currentProfile.streak === "number") {
          window.duoState.state.streak = Math.max(
            window.duoState.state.streak || 1,
            currentProfile.streak,
          );
        }

        if (currentProfile.progress && Object.keys(currentProfile.progress).length > 0) {
          window.duoState.applyCloudState(currentProfile);

          // Ak profil v cloude obsahuje diagnostiku, načítame ju lokálne
          if (currentProfile.progress.diagnostic) {
            localStorage.setItem(
              "fl_diagnostic",
              JSON.stringify(currentProfile.progress.diagnostic),
            );
            localStorage.setItem("fl_onboarding_completed", "1");
            applyDiagnosticPersonalization(currentProfile.progress.diagnostic, false);
            window.duoPath?.render();
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
      console.error("[Supabase Auth] Výnimka pri načítaní profilu:", err);
    }
  }

  // 5. Automatická synchronizácia progresu do Supabase cloudu
  async function syncCloudProgress(state) {
    if (!client || !currentUser || !state) return;
    const userId = currentUser.id;

    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(async () => {
      if (currentUser?.id !== userId) return;
      try {
        const savedDiag = getSavedDiagnostic();
        const payload = {
          xp: typeof state.xp === "number" ? state.xp : 0,
          streak: typeof state.streak === "number" ? state.streak : 1,
          progress: {
            unlockedLevels: state.unlockedLevels || ["1.1"],
            completedLevels: state.completedLevels || {},
            userName: state.userName || "Používateľ",
            lastPlayedDate: state.lastPlayedDate || new Date().toISOString().slice(0, 10),
            lives: typeof state.lives === "number" ? state.lives : 5,
            diagnostic: savedDiag,
            syncedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        };

        // update() nehlási chybu, ak riadok profilu ešte neexistuje, preto ho vtedy vytvoríme.
        let { data: updated, error } = await client
          .from("profiles")
          .update(payload)
          .eq("id", userId)
          .select("id");
        if (!error && (!updated || updated.length === 0)) {
          if (currentUser?.id !== userId) return;
          ({ error } = await client.from("profiles").insert({ id: userId, ...payload }));
        }

        const syncBadge = document.getElementById("profileSyncText");
        if (syncBadge) {
          syncBadge.textContent = error
            ? "Cloud synchronizácia zlyhala, progres je uložený v zariadení"
            : "Cloud synchronizácia aktívna (uložené)";
        }
        if (error) console.warn("[Supabase Sync] Uloženie zlyhalo:", error.message);
      } catch (err) {
        console.warn("[Supabase Sync] Výnimka pri synchronizácii:", err);
      }
    }, 400);
  }

  function getSavedDiagnostic() {
    try {
      const raw = localStorage.getItem("fl_diagnostic");
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  // 6. Obsluha a kroky vedeckého dotazníka (delegované na oficiálny Figma dotazník)
  function goToDiagStep(step) {
    if (window.openFigmaQuestionnaire) {
      window.openFigmaQuestionnaire(false);
    }
  }

  // Aplikovanie diagnostiky na prispôsobenie cesty
  function applyDiagnosticPersonalization(diag, doSync = true, configureAudio = false) {
    if (!diag) return;

    const evalRes = evaluateDiagnosticScores(diag);
    diag.recWorldId = evalRes.recWorldId;
    diag.tension = evalRes.dominantKey;

    const worldNames = {
      1: "Svet 1: Samohlásky & Easy Onset",
      2: "Svet 2: Znelé spoluhlásky & Rezonancia",
      3: "Svet 3: Plozívy a zhluky",
      4: "Svet 4: Rytmizácia, Tempo & Vety",
      5: "Svet 5: Sociálna expozícia & Dialógy",
    };

    const situationMap = {
      phone: "Telefonovanie & Nečakané hovory",
      name: "Predstavenie sa vlastným menom",
      ordering: "Objednávanie v kaviarni/obchode",
      authorities: "Pracovné porady & Prezentácie",
    };

    const dafMap = {
      1: "DAF 85 ms • FAF +2 st",
      2: "DAF 75 ms • FAF +2 st",
      3: "DAF 90 ms • FAF +2 st",
      4: "DAF 115 ms • FAF +2 st",
      5: "DAF 95 ms • FAF +2 st",
    };

    const domainLabels = {
      laryngeal: "Začiatok hlasu",
      plosives: "Artikulačné napätie",
      prolongation: "Predlžovanie hlások",
      clonic: "Opakovanie hlások",
      social: "Sociálna neistota",
    };
    const tensionText = `${domainLabels[evalRes.dominantKey]} (vlastné hodnotenie ${evalRes.dominantVal}/5)`;
    const worldText = worldNames[evalRes.recWorldId] || "Svet 3: Plozívy a zhluky";
    const situationText = situationMap[diag.situation] || "Telefonovanie & Hovory";
    const dafText = dafMap[evalRes.recWorldId] || "Delay 90 ms • Choral Effect";

    const elTension = document.getElementById("diagSummaryTension");
    const elWorld = document.getElementById("diagSummaryWorld");
    const elSituation = document.getElementById("diagSummarySituation");
    const elDaf = document.getElementById("diagSummaryDaf");
    const elSeverity = document.getElementById("diagSummarySeverity");
    const elEnterBtn = document.getElementById("diagEnterAppBtn");

    if (elTension) elTension.textContent = tensionText;
    if (elWorld) elWorld.textContent = worldText;
    if (elSituation) elSituation.textContent = situationText;
    if (elDaf) elDaf.textContent = dafText;
    if (elSeverity) elSeverity.textContent = `${evalRes.totalSeverity} / 25 bodov`;

    if (elEnterBtn) {
      elEnterBtn.innerHTML = `<span>🚀 Začať odporúčaným Svetom ${evalRes.recWorldId}</span>`;
    }

    // Aktualizácia karty v Telemetrii
    const tTension = document.getElementById("telemetryDiagTension");
    const tWorld = document.getElementById("telemetryDiagWorld");
    const tSituation = document.getElementById("telemetryDiagSituation");
    const tGoal = document.getElementById("telemetryDiagGoal");

    if (tTension) tTension.textContent = tensionText;
    if (tWorld) tWorld.textContent = worldText;
    if (tSituation) tSituation.textContent = situationText;
    if (tGoal)
      tGoal.textContent =
        diag.goal === "easy_onset"
          ? "Jemný mäkký nábeh hlasiviek"
          : diag.goal === "daf_choral"
            ? "DAF/FAF zborový efekt"
            : "Desenzitizácia a odbúranie strachu";
    const status = document.getElementById("diagProfileStatusPill");
    if (status) status.textContent = "Sebareflexia";

    // Personalizácia Trezoru slov a viet podľa situácie
    if (window.duoState) {
      const words = window.duoState.loadVaultWords();
      const userName =
        (currentProfile && currentProfile.full_name) ||
        window.duoState.state.userName ||
        "Používateľ";

      const customItems = [
        {
          id: "diag_1",
          word: `Moje meno je ${userName}`,
          category: "Predstavenie",
          successes: 0,
          attempts: 0,
          isMastered: false,
          date: new Date().toISOString().slice(0, 10),
        },
      ];

      if (diag.situation === "phone") {
        customItems.push({
          id: "diag_phone",
          word: "Dobrý deň, volám ohľadom balíka",
          category: "Telefón",
          successes: 0,
          attempts: 0,
          isMastered: false,
          date: new Date().toISOString().slice(0, 10),
        });
      } else if (diag.situation === "ordering") {
        customItems.push({
          id: "diag_order",
          word: "Dobrý deň, jedno espresso a minerálku poprosím",
          category: "Kaviareň",
          successes: 0,
          attempts: 0,
          isMastered: false,
          date: new Date().toISOString().slice(0, 10),
        });
      } else {
        customItems.push({
          id: "diag_auth",
          word: "Rád by som sa vyjadril k tomuto bodu",
          category: "Práca",
          successes: 0,
          attempts: 0,
          isMastered: false,
          date: new Date().toISOString().slice(0, 10),
        });
      }

      customItems.forEach((item) => {
        if (!words.some((w) => w.word === item.word)) {
          words.unshift({ ...item, id: "diag_" + crypto.randomUUID() });
        }
      });
      window.duoState.saveVaultWords(words);
    }

    // Apply defaults once on explicit profile completion, never overwrite manual settings on navigation.
    if (configureAudio) {
      const delaySlider = document.getElementById("assistantDelaySlider");
      if (delaySlider) {
        delaySlider.value = { 1: 85, 2: 75, 3: 90, 4: 115, 5: 95 }[evalRes.recWorldId];
        delaySlider.dispatchEvent(new Event("input"));
      }
    }

    if (doSync && window.duoState) {
      syncCloudProgress(window.duoState.state);
    }
  }

  // 7. Aktualizácia DOM prvkov podľa stavu prihlásenia
  function updateUI() {
    const authStatusBadge = document.getElementById("authStatusBadge");
    const authLoggedOutView = document.getElementById("authLoggedOutView");
    const authLoggedInView = document.getElementById("authLoggedInView");
    const userAvatarEl = document.getElementById("userAvatarEl");
    const userNameEl = document.getElementById("userNameEl");
    const userEmailEl = document.getElementById("userEmailEl");
    const headerProfileBtn = document.getElementById("headerProfileBtn");
    const headerProfileName = document.getElementById("headerProfileName");

    if (currentUser) {
      const name =
        localStorage.getItem("fl_custom_name")?.trim() ||
        (currentProfile && (currentProfile.full_name || currentProfile.preferred_name)) ||
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split("@")[0] ||
        "Používateľ";

      const avatar =
        (currentProfile && currentProfile.avatar_url) ||
        currentUser.user_metadata?.avatar_url ||
        currentUser.user_metadata?.picture ||
        "";

      if (authStatusBadge) {
        authStatusBadge.textContent = "Prihlásený (Cloud)";
        authStatusBadge.className = "auth-status-badge online";
      }
      if (authLoggedOutView) authLoggedOutView.style.display = "none";
      if (authLoggedInView) authLoggedInView.style.display = "block";

      if (userNameEl) userNameEl.textContent = name;
      if (userEmailEl) userEmailEl.textContent = currentUser.email || "";

      if (userAvatarEl) {
        if (avatar) {
          userAvatarEl.src = avatar;
          userAvatarEl.style.display = "block";
        } else {
          userAvatarEl.style.display = "none";
        }
      }

      if (headerProfileBtn) {
        headerProfileBtn.classList.add("logged-in");
      }
      if (headerProfileName) {
        headerProfileName.textContent = name.split(" ")[0];
      }

      const dailyGreetingHeading = document.getElementById("dailyGreetingHeading");
      const headerAvatarCircle = document.getElementById("headerAvatarCircle");
      if (headerAvatarCircle) {
        const parts = name.trim().split(/\s+/);
        const initials =
          parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
        headerAvatarCircle.textContent = initials || "AB";
      }
      if (dailyGreetingHeading) {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? "Dobré ráno" : hour < 18 ? "Dobrý deň" : "Dobrý večer";
        dailyGreetingHeading.textContent = `${timeGreeting}, ${name.split(" ")[0]}.`;
      }
    } else {
      if (authStatusBadge) {
        authStatusBadge.textContent = "Hosť (Lokálny režim)";
        authStatusBadge.className = "auth-status-badge offline";
      }
      if (authLoggedOutView) authLoggedOutView.style.display = "block";
      if (authLoggedInView) authLoggedInView.style.display = "none";

      if (headerProfileBtn) {
        headerProfileBtn.classList.remove("logged-in");
      }
      if (headerProfileName) {
        headerProfileName.textContent = localStorage.getItem("fl_custom_name") || "Tvoj profil";
      }

      const dailyGreetingHeading = document.getElementById("dailyGreetingHeading");
      const headerAvatarCircle = document.getElementById("headerAvatarCircle");
      if (headerAvatarCircle)
        headerAvatarCircle.textContent = (localStorage.getItem("fl_custom_name") || "Ty")
          .slice(0, 2)
          .toUpperCase();
      if (dailyGreetingHeading) {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? "Dobré ráno" : hour < 18 ? "Dobrý deň" : "Dobrý večer";
        const savedName = localStorage.getItem("fl_custom_name")?.trim();
        dailyGreetingHeading.textContent = savedName
          ? `${timeGreeting}, ${savedName.split(/\s+/)[0]}.`
          : `${timeGreeting}.`;
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
    const welcomeBtnGoogle = document.getElementById("welcomeBtnGoogle");
    const welcomeSubmitBtn = document.getElementById("welcomeSubmitBtn");
    const welcomeGuestBtn = document.getElementById("welcomeGuestBtn");
    const headerProfileBtn = document.getElementById("headerProfileBtn");
    const btnLogout = document.getElementById("btnLogout");
    const reopenDiagnosticBtn = document.getElementById("reopenDiagnosticBtn");
    const openAuthModalFromTelemetryBtn = document.getElementById("openAuthModalFromTelemetryBtn");

    // Google Sign-In
    if (welcomeBtnGoogle) {
      welcomeBtnGoogle.addEventListener("click", () => signInWithGoogle());
    }

    // Email Submit (Prihlásiť / Zaregistrovať)
    if (welcomeSubmitBtn) {
      welcomeSubmitBtn.addEventListener("click", () => {
        const emailEl = document.getElementById("welcomeEmailInput");
        const passEl = document.getElementById("welcomePasswordInput");
        const nameEl = document.getElementById("welcomeNameInput");
        const email = emailEl ? emailEl.value : "";
        const pass = passEl ? passEl.value : "";
        const name = nameEl ? nameEl.value : "";
        handleEmailAuth(email, pass, name);
      });
    }

    // An explicit guest action always returns to the app, not another gate.
    if (welcomeGuestBtn) {
      welcomeGuestBtn.addEventListener("click", () => {
        sessionStorage.setItem("fl_guest_mode", "1");
        hideWelcomeOverlay();
        updateUI();
        if (!isDiagnosticCompleted()) showDiagnosticScreen(true);
      });
    }

    // Profil tlačidlo v hlavičke
    if (headerProfileBtn) {
      headerProfileBtn.addEventListener("click", () => {
        document.getElementById("navTabTelemetria")?.click();
        document.getElementById("tabTelemetria")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener("click", () => signOut());
    }

    if (reopenDiagnosticBtn) {
      reopenDiagnosticBtn.addEventListener("click", () => {
        showDiagnosticScreen(true);
      });
    }

    if (openAuthModalFromTelemetryBtn) {
      openAuthModalFromTelemetryBtn.addEventListener("click", () => {
        showAuthScreen();
      });
    }

    // Priame prihlásenie z karty Telemetrie (#authLoggedOutView)
    const btnGoogleLogin = document.getElementById("btnGoogleLogin");
    if (btnGoogleLogin) {
      btnGoogleLogin.addEventListener("click", () => signInWithGoogle());
    }

    const btnEmailLogin = document.getElementById("btnEmailLogin");
    if (btnEmailLogin) {
      btnEmailLogin.addEventListener("click", () => {
        const emailEl = document.getElementById("authEmailInput");
        const passEl = document.getElementById("authPasswordInput");
        const email = emailEl ? emailEl.value : "";
        const pass = passEl ? passEl.value : "";
        handleEmailAuth(email, pass, "", "authFeedbackMsg");
      });
    }

    const authPassInput = document.getElementById("authPasswordInput");
    if (authPassInput) {
      authPassInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          if (btnEmailLogin) btnEmailLogin.click();
        }
      });
    }

    const btnMagicLink = document.getElementById("btnMagicLink");
    if (btnMagicLink) {
      btnMagicLink.addEventListener("click", async () => {
        if (!initSupabase()) return;
        const emailEl = document.getElementById("authEmailInput");
        const email = emailEl ? emailEl.value.trim() : "";
        if (!email || !email.includes("@")) {
          setFeedback(
            "Zadaj prosím platnú emailovú adresu pre odoslanie odkazu.",
            false,
            "authFeedbackMsg",
          );
          return;
        }
        setFeedback("Odosielam prihlasovací link do emailu...", true, "authFeedbackMsg");
        try {
          const { error } = await client.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: window.location.origin,
            },
          });
          if (error) throw error;
          setFeedback(
            "Prihlasovací link bol odoslaný! Skontroluj si schránku.",
            true,
            "authFeedbackMsg",
          );
        } catch (err) {
          console.error("[Supabase Auth] Magic Link chyba:", err);
          setFeedback("Chyba: " + (err.message || err), false, "authFeedbackMsg");
        }
      });
    }

    // Enter kláves v prihlasovacích poliach
    const welcomePassInput = document.getElementById("welcomePasswordInput");
    if (welcomePassInput) {
      welcomePassInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          if (welcomeSubmitBtn) welcomeSubmitBtn.click();
        }
      });
    }

    // ===== OBSLUHA KROKOV DOTAZNÍKA =====
    setupDiagnosticSteps();
  }

  function setupDiagnosticSteps() {
    // Starý dotazník bol nahradený oficiálnym Figma dotazníkom riadeným cez window.openFigmaQuestionnaire
  }

  function applySession(session) {
    if (!session?.user) return;
    currentUser = session.user;
    sessionStorage.removeItem("fl_guest_mode");
    hideWelcomeOverlay();
    updateUI();
  }

  function restoreSession() {
    if (restorePromise) return restorePromise;
    restorePromise = (async () => {
      try {
        const { data: { session }, error } = await client.auth.getSession();
        if (error) throw error;
        if (session?.user) {
          applySession(session);
          void fetchProfile(session.user);
        }
        return session;
      } catch (_) {
        // A connection failure must not erase a stored session or trigger logout.
        console.warn("[Supabase Auth] Obnovenie relácie čaká na pripojenie.");
        return null;
      } finally {
        restorePromise = null;
      }
    })();
    return restorePromise;
  }

  function watchSession() {
    // Subscribe before handling any initial/deep-link session. Do not await a
    // Supabase request while its auth event callback holds the session lock.
    client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const changedUser = currentUser?.id !== session.user.id;
        applySession(session);
        if (event !== "TOKEN_REFRESHED" && (changedUser || !currentProfile)) {
          setTimeout(() => {
            if (currentUser?.id === session.user.id) void fetchProfile(session.user);
          }, 0);
        }
      } else if (event === "SIGNED_OUT") {
        clearTimeout(syncDebounceTimer);
        currentUser = null;
        currentProfile = null;
        updateUI();
        hideWelcomeOverlay();
      }
    });
    const native = window.Capacitor?.getPlatform?.() === "android";
    const foreground = () => {
      if (native) void client.auth.startAutoRefresh();
      void restoreSession();
    };
    const background = () => { if (native) void client.auth.stopAutoRefresh(); };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) background();
      else foreground();
    });
    window.addEventListener("online", foreground);
    window.Capacitor?.Plugins?.GlideUpdates?.addListener("resume", foreground);
    window.Capacitor?.Plugins?.GlideUpdates?.addListener("pause", background);
    if (native) void client.auth.startAutoRefresh();
  }

  // 9. Inicializácia pri štarte aplikácie (Tiché auto-prihlásenie)
  async function init() {
    if (!initSupabase()) {
      setTimeout(init, 300);
      return;
    }

    setupAuthEvents();
    watchSession();
    hideWelcomeOverlay();
    updateUI();

    // Kontrola prijatého natívneho Deep Linku pri štarte
    if (window.__pendingDeepLink) {
      const pending = window.__pendingDeepLink;
      window.__pendingDeepLink = null;
      await window.handleNativeDeepLink(pending);
    } else if (window.location.hash && window.location.hash.indexOf("access_token=") !== -1) {
      await window.handleNativeDeepLink(window.location.href);
    }

    // Browsing never depends on network authentication or questionnaire completion.
    hideWelcomeOverlay();
    updateUI();
    try {
      const session = await restoreSession();
      if (!session?.user && !currentUser) {
        sessionStorage.setItem("fl_guest_mode", "1");
        // Úvodná obrazovka sa ukáže len pri úplne prvom spustení; dá sa zavrieť.
        const hasStoredSession = !!(await authStorage.getItem(AUTH_STORAGE_KEY));
        if (!hasStoredSession && !localStorage.getItem("fl_welcome_seen") && !isDiagnosticCompleted()) {
          localStorage.setItem("fl_welcome_seen", "1");
          showWelcomeOverlay();
        }
      }
      updateUI();
    } catch (err) {
      console.warn("Session unavailable; staying in local mode.");
      updateUI();
    }

  }

  window.fluencyAuth = {
    refreshUI: updateUI,
    saveTrainingProfile(answers) {
      const evaluation = evaluateDiagnosticScores(answers);
      const profile = {
        ...answers,
        recWorldId: evaluation.recWorldId,
        tension: evaluation.dominantKey,
      };
      localStorage.setItem("fl_diagnostic", JSON.stringify(profile));
      applyDiagnosticPersonalization(profile, false, true);
      window.duoState?.startAtRecommendedWorld(profile.recWorldId);
    },
    signInWithGoogle,
    handleEmailAuth,
    signOut,
    showWelcomeOverlay,
    hideWelcomeOverlay,
    showDiagnosticScreen,
    syncCloudProgress,
    getCurrentUser: () => currentUser,
    getCurrentProfile: () => currentProfile,
    restoreSession,
  };

  if (document.readyState === "loading") {
    window.fluencyAuthReady = new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => { void init().then(resolve); }, { once: true });
    });
  } else {
    window.fluencyAuthReady = init();
  }
})();
