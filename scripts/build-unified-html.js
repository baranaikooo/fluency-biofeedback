const fs = require('fs');
const path = require('path');

const rootDir = 'C:/Users/HP/Downloads/stutter/stutter_biofeedback_antigravity';
const targetHtmlPath = path.join(rootDir, 'index.html');

const htmlContent = `<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Glide – Rečový Biofeedback Trenažér</title>

  <!-- PWA & Mobile Web App Meta -->
  <link rel="manifest" href="./manifest.json">
  <meta name="theme-color" content="#f8f6f0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Glide">
  <link rel="apple-touch-icon" href="./icon-192.png">
  <link rel="icon" type="image/svg+xml" href="./icon.svg">
  <link rel="icon" type="image/png" sizes="192x192" href="./icon-192.png">

  <!-- Google Fonts: DM Sans & Newsreader (Figma Typography) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="./style.css">

  <!-- OAuth Deep Link Relay -->
  <script>
    (function () {
      try {
        var hash = window.location.hash || '';
        var search = window.location.search || '';
        var isAuthReturn = (hash && (hash.indexOf('access_token=') !== -1 || hash.indexOf('error=') !== -1)) ||
                           (search && (search.indexOf('code=') !== -1 || search.indexOf('error=') !== -1));

        if (isAuthReturn) {
          var isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
          if (!isCapacitor) {
            var targetScheme = 'com.fluency.biofeedback://auth-callback' + (hash || search);
            window.location.href = targetScheme;
          }
        }
      } catch (e) {
        console.warn('[Auth Relay] Chyba:', e);
      }
    })();
  </script>
</head>
<body>

<!-- ==================================================================== -->
<!-- 1. FIGMA PRIHLASOVACÍ MODAL (AUTENTIFIKAČNÁ BRÁNA)                   -->
<!-- ==================================================================== -->
<div class="modal-backdrop-overlay" id="welcomeAuthOverlay" style="display:none;">
  <div class="auth-modal-card">
    <div class="auth-modal-hero">
      <div class="brand-mark small" style="margin: 0 auto 12px auto;">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="auth-overline">TVOJ BEZPEČNÝ PRIESTOR PRE REČ</span>
      <h1 class="auth-modal-title">Dýchaj voľne. Hovor s istotou.</h1>
      <p class="auth-modal-desc">Vedecký rečový biofeedback & DAF/FAF trenažér rečovej plynulosti</p>
    </div>

    <!-- Google Sign-in -->
    <button class="google-button" id="welcomeBtnGoogle" type="button">
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      <span>Pokračovať cez Google účet</span>
    </button>

    <div class="auth-divider">
      <span>alebo pokračuj e-mailom</span>
    </div>

    <div class="auth-form-fields" id="welcomeAuthBox">
      <div class="auth-field-group">
        <label class="auth-field-label" for="welcomeNameInput">Tvoje meno / prezývka</label>
        <input type="text" class="auth-input" id="welcomeNameInput" placeholder="napr. Alex" autocomplete="name" />
      </div>

      <div class="auth-field-group">
        <label class="auth-field-label" for="welcomeEmailInput">Emailová adresa</label>
        <input type="email" class="auth-input" id="welcomeEmailInput" placeholder="napr. tvoj.email@gmail.com" autocomplete="email" />
      </div>

      <div class="auth-field-group">
        <label class="auth-field-label" for="welcomePasswordInput">Heslo</label>
        <input type="password" class="auth-input" id="welcomePasswordInput" placeholder="Minimálne 6 znakov" autocomplete="current-password" />
      </div>

      <div class="auth-feedback-msg" id="welcomeAuthFeedback" style="display:none; color: var(--coral); font-size: 12px; margin-bottom: 12px; font-weight: 500;"></div>

      <button class="btn-primary full" id="welcomeSubmitBtn" type="button">
        <span id="welcomeSubmitText">Vstúpiť do aplikácie</span>
      </button>
    </div>

    <button class="guest-bypass-btn" id="welcomeGuestBtn" type="button">
      <span>Vyskúšať bez prihlásenia (Lokálny režim)</span>
    </button>
  </div>
</div>

<!-- ==================================================================== -->
<!-- 2. OFICIÁLNY FIGMA VÝSKUMNÝ DOTAZNÍK (MODÁL PO PRVOM PRIHLÁSENÍ)      -->
<!-- ==================================================================== -->
<div class="modal-backdrop-overlay" id="figmaQuestionnaireModal" style="display:none;">
  <div class="questionnaire-modal-card">
    <div class="questionnaire-top">
      <div>
        <p class="eyebrow">VÝSKUMNÝ DOTAZNÍK</p>
        <h1 class="q-main-title">Tvoja skúsenosť s rečou<span>.</span></h1>
      </div>
      <span class="questionnaire-count" id="qCountText" style="display:none;">1 / 3</span>
    </div>

    <div class="questionnaire-progress" id="qProgressWrap" aria-label="Priebeh dotazníka">
      <span id="qProgressBar" style="width: 0%;"></span>
    </div>

    <!-- KROK 0: UVÍTACIA OBRAZOVKA S INFORMÁCIAMI A SÚHLASOM -->
    <section class="questionnaire-welcome" id="qStep0">
      <div class="research-intro">
        <span class="research-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4" /></svg>
        </span>
        <span class="section-kicker">PRED ZAČIATKOM</span>
        <h2>Nejde o test plynulosti ani o diagnózu.</h2>
        <p>
          Tento dotazník mapuje, ako zajakavosť ovplyvňuje tvoje rozprávanie, prežívanie a každodenný život. Vyplnenie trvá približne 4 minúty.
        </p>
      </div>

      <div class="research-points">
        <article>
          <span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Z" /></svg>
          </span>
          <div>
            <strong>Odpovede zostávajú v tomto zariadení</strong>
            <p>Nikam sa neodosielajú bez tvojho vedomia. Slúžia na personalizáciu tréningu mäkkého nábehu.</p>
          </div>
        </article>
        <article>
          <span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></svg>
          </span>
          <div>
            <strong>Vedecky podložené oblasti</strong>
            <p>Obsah vychádza z logopedických rámcov OASES-A, WASSP a ICF.</p>
          </div>
        </article>
      </div>

      <div class="consent-box" style="margin-top: 24px;">
        <label class="consent-check" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; cursor:pointer;">
          <input type="checkbox" id="qAdultCheck" />
          <span style="font-size: 13px; color: var(--ink);">Mám 18 rokov alebo viac.</span>
        </label>
        <label class="consent-check" style="display:flex; align-items:center; gap:10px; cursor:pointer;">
          <input type="checkbox" id="qConsentCheck" />
          <span style="font-size: 13px; color: var(--ink);">Rozumiem účelu dotazníka a dobrovoľne súhlasím s vyplnením.</span>
        </label>
      </div>
    </section>

    <!-- KROK 1: SKÚSENOSŤ S ROZPRÁVANÍM -->
    <section class="questionnaire-form" id="qStep1" style="display:none;">
      <header>
        <span class="section-kicker">ČASŤ 1 Z 3</span>
        <h2>Skúsenosť s rozprávaním</h2>
        <p>Ako často si za posledné dva týždne zažíval/a nasledujúce situácie?</p>
      </header>

      <div class="question-list">
        <fieldset class="question-item">
          <legend class="question-text">Mal/a som pocit, že pri rozprávaní strácam kontrolu.</legend>
          <div class="answer-scale" data-qid="speech-control">
            <label><input type="radio" name="speech-control" value="0" /><span><b>0</b><small>Nikdy</small></span></label>
            <label><input type="radio" name="speech-control" value="1" /><span><b>1</b><small>Zriedka</small></span></label>
            <label><input type="radio" name="speech-control" value="2" /><span><b>2</b><small>Občas</small></span></label>
            <label><input type="radio" name="speech-control" value="3" /><span><b>3</b><small>Často</small></span></label>
            <label><input type="radio" name="speech-control" value="4" /><span><b>4</b><small>Takmer vždy</small></span></label>
          </div>
        </fieldset>

        <fieldset class="question-item">
          <legend class="question-text">Na vyslovenie slov som musel/a vynaložiť fyzické úsilie.</legend>
          <div class="answer-scale" data-qid="speech-effort">
            <label><input type="radio" name="speech-effort" value="0" /><span><b>0</b><small>Nikdy</small></span></label>
            <label><input type="radio" name="speech-effort" value="1" /><span><b>1</b><small>Zriedka</small></span></label>
            <label><input type="radio" name="speech-effort" value="2" /><span><b>2</b><small>Občas</small></span></label>
            <label><input type="radio" name="speech-effort" value="3" /><span><b>3</b><small>Často</small></span></label>
            <label><input type="radio" name="speech-effort" value="4" /><span><b>4</b><small>Takmer vždy</small></span></label>
          </div>
        </fieldset>

        <fieldset class="question-item">
          <legend class="question-text">Neistota, kedy sa zakokcem, mi sťažovala rozprávanie.</legend>
          <div class="answer-scale" data-qid="speech-unpredictable">
            <label><input type="radio" name="speech-unpredictable" value="0" /><span><b>0</b><small>Nikdy</small></span></label>
            <label><input type="radio" name="speech-unpredictable" value="1" /><span><b>1</b><small>Zriedka</small></span></label>
            <label><input type="radio" name="speech-unpredictable" value="2" /><span><b>2</b><small>Občas</small></span></label>
            <label><input type="radio" name="speech-unpredictable" value="3" /><span><b>3</b><small>Často</small></span></label>
            <label><input type="radio" name="speech-unpredictable" value="4" /><span><b>4</b><small>Takmer vždy</small></span></label>
          </div>
        </fieldset>
      </div>
    </section>

    <!-- KROK 2: MYŠLIENKY A POCITY -->
    <section class="questionnaire-form" id="qStep2" style="display:none;">
      <header>
        <span class="section-kicker">ČASŤ 2 Z 3</span>
        <h2>Myšlienky a pocity</h2>
        <p>Neexistuje správna odpoveď. Vyber to, čo najlepšie vystihuje tvoju skúsenosť.</p>
      </header>

      <div class="question-list">
        <fieldset class="question-item">
          <legend class="question-text">Mal/a som obavy alebo úzkosť z toho, že budem musieť hovoriť.</legend>
          <div class="answer-scale" data-qid="feeling-worry">
            <label><input type="radio" name="feeling-worry" value="0" /><span><b>0</b><small>Nikdy</small></span></label>
            <label><input type="radio" name="feeling-worry" value="1" /><span><b>1</b><small>Zriedka</small></span></label>
            <label><input type="radio" name="feeling-worry" value="2" /><span><b>2</b><small>Občas</small></span></label>
            <label><input type="radio" name="feeling-worry" value="3" /><span><b>3</b><small>Často</small></span></label>
            <label><input type="radio" name="feeling-worry" value="4" /><span><b>4</b><small>Takmer vždy</small></span></label>
          </div>
        </fieldset>

        <fieldset class="question-item">
          <legend class="question-text">Vyhýbal/a som sa slovám alebo situáciám, kde by som mohol/mohla zakoktať.</legend>
          <div class="answer-scale" data-qid="feeling-avoid">
            <label><input type="radio" name="feeling-avoid" value="0" /><span><b>0</b><small>Nikdy</small></span></label>
            <label><input type="radio" name="feeling-avoid" value="1" /><span><b>1</b><small>Zriedka</small></span></label>
            <label><input type="radio" name="feeling-avoid" value="2" /><span><b>2</b><small>Občas</small></span></label>
            <label><input type="radio" name="feeling-avoid" value="3" /><span><b>3</b><small>Často</small></span></label>
            <label><input type="radio" name="feeling-avoid" value="4" /><span><b>4</b><small>Takmer vždy</small></span></label>
          </div>
        </fieldset>

        <fieldset class="question-item">
          <legend class="question-text">Po rozhovore som sa k nemu v myšlienkach vracal/a s pocitom nespokojnosti.</legend>
          <div class="answer-scale" data-qid="feeling-after">
            <label><input type="radio" name="feeling-after" value="0" /><span><b>0</b><small>Nikdy</small></span></label>
            <label><input type="radio" name="feeling-after" value="1" /><span><b>1</b><small>Zriedka</small></span></label>
            <label><input type="radio" name="feeling-after" value="2" /><span><b>2</b><small>Občas</small></span></label>
            <label><input type="radio" name="feeling-after" value="3" /><span><b>3</b><small>Často</small></span></label>
            <label><input type="radio" name="feeling-after" value="4" /><span><b>4</b><small>Takmer vždy</small></span></label>
          </div>
        </fieldset>
      </div>
    </section>

    <!-- KROK 3: ÚČASŤ V KAŽDODENNOM ŽIVOTE -->
    <section class="questionnaire-form" id="qStep3" style="display:none;">
      <header>
        <span class="section-kicker">ČASŤ 3 Z 3</span>
        <h2>Každodenný život</h2>
        <p>Ako veľmi zajakavosť ovplyvňuje tvoje bežné fungovanie?</p>
      </header>

      <div class="question-list">
        <fieldset class="question-item">
          <legend class="question-text">Zajakavosť ovplyvňuje moju prácu, štúdium alebo profesijné rozhodnutia.</legend>
          <div class="answer-scale" data-qid="life-work">
            <label><input type="radio" name="life-work" value="0" /><span><b>0</b><small>Nikdy</small></span></label>
            <label><input type="radio" name="life-work" value="1" /><span><b>1</b><small>Zriedka</small></span></label>
            <label><input type="radio" name="life-work" value="2" /><span><b>2</b><small>Občas</small></span></label>
            <label><input type="radio" name="life-work" value="3" /><span><b>3</b><small>Často</small></span></label>
            <label><input type="radio" name="life-work" value="4" /><span><b>4</b><small>Takmer vždy</small></span></label>
          </div>
        </fieldset>

        <fieldset class="question-item">
          <legend class="question-text">Zajakavosť obmedzuje moje vzťahy alebo spoločenský život.</legend>
          <div class="answer-scale" data-qid="life-social">
            <label><input type="radio" name="life-social" value="0" /><span><b>0</b><small>Nikdy</small></span></label>
            <label><input type="radio" name="life-social" value="1" /><span><b>1</b><small>Zriedka</small></span></label>
            <label><input type="radio" name="life-social" value="2" /><span><b>2</b><small>Občas</small></span></label>
            <label><input type="radio" name="life-social" value="3" /><span><b>3</b><small>Často</small></span></label>
            <label><input type="radio" name="life-social" value="4" /><span><b>4</b><small>Takmer vždy</small></span></label>
          </div>
        </fieldset>

        <fieldset class="question-item">
          <legend class="question-text">Je pre mňa náročné vybaviť bežné veci, napríklad telefonát alebo nákup.</legend>
          <div class="answer-scale" data-qid="life-routine">
            <label><input type="radio" name="life-routine" value="0" /><span><b>0</b><small>Nikdy</small></span></label>
            <label><input type="radio" name="life-routine" value="1" /><span><b>1</b><small>Zriedka</small></span></label>
            <label><input type="radio" name="life-routine" value="2" /><span><b>2</b><small>Občas</small></span></label>
            <label><input type="radio" name="life-routine" value="3" /><span><b>3</b><small>Často</small></span></label>
            <label><input type="radio" name="life-routine" value="4" /><span><b>4</b><small>Takmer vždy</small></span></label>
          </div>
        </fieldset>
      </div>
    </section>

    <!-- KROK 4: DOPLŇUJÚCI KONTEXT -->
    <section class="questionnaire-form context-step" id="qStep4" style="display:none;">
      <header>
        <span class="section-kicker">DOPLŇUJÚCI KONTEXT</span>
        <h2>Kde je rozprávanie najnáročnejšie?</h2>
        <p>Môžeš vybrať viac možností alebo tento krok preskočiť.</p>
      </header>

      <div class="situation-grid" id="qSituationGrid">
        <button type="button" class="situation-btn" data-sit="Telefonovanie"><span></span>Telefonovanie</button>
        <button type="button" class="situation-btn" data-sit="Objednávanie jedla a nákupy"><span></span>Objednávanie & Nákupy</button>
        <button type="button" class="situation-btn" data-sit="Práca, porady a prezentácie"><span></span>Práca & Porady</button>
        <button type="button" class="situation-btn" data-sit="Predstavovanie sa vlastným menom"><span></span>Predstavovanie sa menom</button>
        <button type="button" class="situation-btn" data-sit="Rozhovory s autoritami"><span></span>Rozhovory s autoritami</button>
        <button type="button" class="situation-btn" data-sit="Neznámi ľudia"><span></span>Neznámi ľudia</button>
      </div>

      <label class="questionnaire-note" style="margin-top: 20px; display:block;">
        <span style="font-size: 12px; font-weight: 600; color: var(--ink); margin-bottom: 6px; display:block;">Chceš niečo doplniť? <small style="color:var(--muted); font-weight:400;">nepovinné</small></span>
        <textarea id="qNoteInput" class="auth-input" style="min-height: 90px; padding: 12px;" placeholder="Napíš vlastnými slovami, čo je pre teba dôležité…" maxlength="500"></textarea>
        <small id="qNoteCount" style="color:var(--muted); font-size:11px; float:right; margin-top:4px;">0 / 500</small>
      </label>
    </section>

    <!-- KROK 5: VÝSLEDKY A ZHRNUTIE -->
    <section class="questionnaire-results" id="qStep5" style="display:none; text-align:center;">
      <div class="complete-icon" style="margin: 0 auto 16px auto;">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12 4 4 8-9" /></svg>
      </div>
      <span class="section-kicker">DOTAZNÍK DOKONČENÝ</span>
      <h2>Ďakujeme za tvoju otvorenosť.</h2>
      <p style="color:var(--muted); font-size:13px; max-width: 520px; margin: 8px auto 24px auto;">
        Tvoje odpovede pomohli prispôsobiť citlivosť soft onset detektora a nastavenie sluchového DAF asistenta.
      </p>

      <div class="domain-results" style="display:grid; gap:12px; max-width:480px; margin: 0 auto;">
        <article style="border: 1px solid var(--line); border-radius: 14px; padding: 14px 18px; text-align:left; background: white;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <strong style="font-size:13px; color:var(--ink);">Rozprávanie</strong>
            <span style="font-size:12px; font-weight:600; color:var(--purple);" id="domainRes0">stredná záťaž</span>
          </div>
          <div class="domain-bar" style="height:6px; background:#e8e4dc; border-radius:999px; overflow:hidden;"><span id="domainBar0" style="display:block; height:100%; background:var(--purple); width: 50%;"></span></div>
        </article>

        <article style="border: 1px solid var(--line); border-radius: 14px; padding: 14px 18px; text-align:left; background: white;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <strong style="font-size:13px; color:var(--ink);">Pocity</strong>
            <span style="font-size:12px; font-weight:600; color:var(--purple);" id="domainRes1">stredná záťaž</span>
          </div>
          <div class="domain-bar" style="height:6px; background:#e8e4dc; border-radius:999px; overflow:hidden;"><span id="domainBar1" style="display:block; height:100%; background:var(--purple); width: 50%;"></span></div>
        </article>

        <article style="border: 1px solid var(--line); border-radius: 14px; padding: 14px 18px; text-align:left; background: white;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <strong style="font-size:13px; color:var(--ink);">Každodenný život</strong>
            <span style="font-size:12px; font-weight:600; color:var(--purple);" id="domainRes2">stredná záťaž</span>
          </div>
          <div class="domain-bar" style="height:6px; background:#e8e4dc; border-radius:999px; overflow:hidden;"><span id="domainBar2" style="display:block; height:100%; background:var(--purple); width: 50%;"></span></div>
        </article>
      </div>

      <button class="btn-primary full lg" id="qFinishEnterBtn" type="button" style="margin-top: 26px;">
        <span>Vstúpiť do aplikácie a začať tréning →</span>
      </button>
    </section>

    <!-- SPODNÁ NAVIGÁCIA DOTAZNÍKA -->
    <footer class="questionnaire-actions" id="qActionsFooter" style="display:flex; justify-content:space-between; margin-top:28px;">
      <button class="btn-3d sm" id="qBackBtn" type="button" style="visibility:hidden;">
        Späť
      </button>
      <button class="btn-primary sm" id="qNextBtn" type="button" disabled style="min-width: 140px;">
        <span id="qNextBtnText">Začať dotazník</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
      </button>
    </footer>
  </div>
</div>

<!-- ==================================================================== -->
<!-- HLAVNÁ APLIKÁCIA (FIGMA APP SHELL S DESKTOP SIDEBAROM)               -->
<!-- ==================================================================== -->
<div class="app-shell" id="appShell">

  <!-- DESKTOP SIDEBAR (BEZ DOTAZNÍKA V MENU) -->
  <aside class="sidebar" id="appSidebar">
    <a class="brand" href="#" id="sidebarBrandBtn" aria-label="Domovská stránka Glide">
      <span class="brand-mark">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span>glide</span>
    </a>

    <nav class="main-nav" aria-label="Hlavná navigácia">
      <button class="nav-item active" data-tab="tabCesta" id="sidebarTabCesta">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></svg>
        <span>Dnes</span>
      </button>
      <button class="nav-item" data-tab="tabDril" id="sidebarTabDril">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4v16M19 4v16"/><path d="M9 8v8M15 8v8M2 12h20"/></svg>
        <span>Cvičenia</span>
      </button>
      <button class="nav-item" data-tab="tabAsistent" id="sidebarTabAsistent">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h4v7H6a2 2 0 0 1-2-2v-5ZM20 14h-4v7h2a2 2 0 0 0 2-2v-5Z"/></svg>
        <span>Asistent</span>
      </button>
      <button class="nav-item" data-tab="tabTelemetria" id="sidebarTabTelemetria">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>
        <span>Môj pokrok</span>
      </button>
    </nav>

    <div class="sidebar-bottom">
      <button class="nav-item" id="sidebarSettingsBtn">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06-2.83 2.83-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1v.1h-4V21a1.8 1.8 0 0 0-1.2-1.7 1.8 1.8 0 0 0-2 .4l-.06.07-2.83-2.83.06-.06a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 2.2 14H2v-4h.1a1.8 1.8 0 0 0 1.7-1.2 1.8 1.8 0 0 0-.4-2l-.07-.06L6.16 3.9l.06.06a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 9.2 2.6V2h4v.1a1.8 1.8 0 0 0 1.2 1.7 1.8 1.8 0 0 0 2-.4l.06-.07 2.83 2.83-.06.06a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 20.6 9h.4v4h-.1a1.8 1.8 0 0 0-1.5 2Z"/></svg>
        <span>Veda & Modely</span>
      </button>
      <button class="profile-chip" id="sidebarProfileChip" aria-label="Otvoriť profil">
        <span class="avatar" id="sidebarAvatarCircle">AM</span>
        <span>
          <strong id="sidebarUserName">Alex Morgan</strong>
          <small>Osobný plán</small>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
      </button>
    </div>
  </aside>

  <!-- HLAVNÉ TELO -->
  <main>
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="mobile-brand" id="brandLogoBtn">
        <span class="brand-mark small">
          <span></span>
          <span></span>
          <span></span>
        </span>
        glide
      </div>
      <div class="date-pill">
        <span id="topbarDayName">Štvrtok</span>
        <strong id="topbarDateStr">22. mája</strong>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="streak-card" style="padding: 6px 14px; margin: 0; min-height: unset; border-radius: 999px; gap:8px;">
          <span class="streak-icon" style="width: 22px; height: 22px; border-radius: 50%;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c4 0 7-2.8 7-6.8 0-3.4-2-5.5-4.3-7.6.1 2-1 3.4-2.1 3.9.3-4.4-2.2-7.2-4.4-9.5.2 3.4-3.2 6-3.2 10.6C5 17.8 8 22 12 22Z"/></svg>
          </span>
          <strong style="font-size: 12px;"><span id="streakVal">6</span> dní</strong>
        </div>
        <button class="avatar mobile-avatar" id="headerProfileBtn" aria-label="Otvoriť profil">
          <span id="headerAvatarCircle">AM</span>
        </button>
      </div>
    </header>

    <!-- ================================================================ -->
    <!-- ZÁLOŽKA 1: DNES (HLAVNÝ DASHBOARD & 5 SVETOV)                     -->
    <!-- ================================================================ -->
    <section class="tab-pane active" id="tabCesta">
      <div class="dashboard">
        
        <!-- WELCOME ROW -->
        <section class="welcome-row">
          <div>
            <p class="eyebrow">TVOJ KAŽDODENNÝ PRIESTOR</p>
            <h1 id="dailyGreetingHeading">Dobrý deň, Alex<span>.</span></h1>
            <p class="subtitle">Nadýchni sa. Tu sa nemusíš ponáhľať.</p>
          </div>
          <div class="streak-card">
            <span class="streak-icon">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c4 0 7-2.8 7-6.8 0-3.4-2-5.5-4.3-7.6.1 2-1 3.4-2.1 3.9.3-4.4-2.2-7.2-4.4-9.5.2 3.4-3.2 6-3.2 10.6C5 17.8 8 22 12 22Z"/></svg>
            </span>
            <div>
              <strong>Séria <span id="streakDaysCount">6</span> dní</strong>
              <small>Buduješ si pravidelný rytmus</small>
            </div>
          </div>
        </section>

        <!-- HERO CARD (DNEŠNÉ ZAMERANIE) -->
        <section class="hero-card">
          <div class="hero-copy">
            <span class="mini-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 1.4 5.1L18 9.5l-4.6 2.4L12 17l-1.4-5.1L6 9.5l4.6-2.4L12 2ZM19 16l.6 2.2L22 19.5l-2.4 1.3L19 23l-.6-2.2-2.4-1.3 2.4-1.3L19 16Z"/></svg>
              DNEŠNÉ ZAMERANIE
            </span>
            <h2>Rozohrej svoj hlas<br />jemne.</h2>
            <p id="dailyQuestText">Tri krátke cvičenia, ktoré ti pomôžu cítiť sa pokojne a pripraviť sa na deň.</p>
            <button class="primary-button" id="continuePathBtn" type="button">
              <span>Začať rozcvičku</span>
              <span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
              </span>
            </button>
          </div>
          <div class="hero-visual" aria-hidden="true">
            <span class="orb orb-one"></span>
            <span class="orb orb-two"></span>
            <div class="breath-ring">
              <div>
                <span id="stageBreathLabel">Nádych</span>
                <strong id="stageBreathNum">4</strong>
                <small>sekundy</small>
                <span id="wbBreathLabel" style="display:none;"></span>
                <span id="wbBreathNum" style="display:none;"></span>
              </div>
            </div>
            <span class="wave wave-one"></span>
            <span class="wave wave-two"></span>
            <span class="wave wave-three"></span>
          </div>
        </section>

        <!-- CONTENT GRID: 5 SVETOV & RYTMUS -->
        <div class="content-grid">
          
          <!-- SEKCIA REČOVÉHO PLÁNU (5 SVETOV) -->
          <section class="plan-section">
            <div class="section-heading">
              <div>
                <span class="section-kicker">TVOJ PLÁN</span>
                <h3>5 Svetov neuro-tréningu plynulosti</h3>
              </div>
              <span class="plan-count" id="planProgressCount">0 z 25 dokončené</span>
            </div>

            <!-- 5 Svetov Gamifikácie (Renderuje gamification-engine.js) -->
            <div class="worlds-wrapper" id="worldsWrapper">
              <!-- Dynamicky generované z gamification-engine.js -->
            </div>
          </section>

          <!-- TENTO TÝŽDEŇ & RYTMUS -->
          <aside class="insights-column">
            <div class="section-heading compact">
              <div>
                <span class="section-kicker">TENTO TÝŽDEŇ</span>
                <h3>Tvoj rytmus</h3>
              </div>
              <button class="text-button" id="goToProgressBtn" type="button">Zobraziť pokrok</button>
            </div>

            <div class="rhythm-card">
              <div class="week-bars" id="weeklyBarsContainer">
                <div class="day"><span class="bar complete" style="height: 72px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 12 4 4 8-9"/></svg></span><small>P</small></div>
                <div class="day"><span class="bar complete" style="height: 88px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 12 4 4 8-9"/></svg></span><small>U</small></div>
                <div class="day"><span class="bar complete" style="height: 58px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 12 4 4 8-9"/></svg></span><small>S</small></div>
                <div class="day"><span class="bar complete" style="height: 100px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 12 4 4 8-9"/></svg></span><small>Š</small></div>
                <div class="day"><span class="bar" style="height: 42px;"></span><small>P</small></div>
                <div class="day"><span class="bar" style="height: 15px;"></span><small>S</small></div>
                <div class="day"><span class="bar" style="height: 15px;"></span><small>N</small></div>
              </div>
              <div class="weekly-note">
                <strong><span id="weeklyCountVal">4</span> cvičenia</strong>
                <span>O jedno viac ako minulý týždeň</span>
              </div>
            </div>

            <blockquote>
              <span class="quote-mark">“</span>
              <p>Tvoj hlas stojí za vypočutie presne taký, aký je.</p>
              <footer>Dnešná pripomienka</footer>
            </blockquote>

            <div style="border: 1px solid var(--line); border-radius: 17px; background: rgba(255, 254, 253, 0.76); padding: 18px 20px; margin-top: 16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em;">Stav plynulosti</span>
                <span id="rankTitle" style="font-size:12px; font-weight:700; color:var(--purple);">Začiatočník</span>
              </div>
              <div style="display:flex; gap:20px;">
                <div><small style="color:var(--muted); font-size:11px; display:block;">Body XP</small><div style="font-size:18px; font-weight:700; color:var(--ink);" id="xpVal">0</div></div>
                <div><small style="color:var(--muted); font-size:11px; display:block;">Životy</small><div style="font-size:18px; font-weight:700; color:var(--coral);" id="heartsVal">5</div></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <!-- ================================================================ -->
    <!-- ZÁLOŽKA 2: CVIČENIA (SOS DRILL & TREZOR OBÁVANÝCH SLOV)          -->
    <!-- ================================================================ -->
    <section class="tab-pane" id="tabDril">
      <div class="dashboard inner-page">
        
        <div class="page-intro" style="margin-bottom: 24px;">
          <p class="eyebrow">TERÉNNY REŽIM</p>
          <h1>Cvičenia & SOS Dril<span>.</span></h1>
          <p class="subtitle">Uvoľni sánku, zredukuj anticipačný kŕč a natrénuj si obávané slová.</p>
        </div>

        <div class="sandbox-container">
          <!-- Hero karta SOS Drilu -->
          <div class="sandbox-hero-card">
            <div class="sandbox-badge">⚡ SOS SANDBOX</div>
            <h2 class="sandbox-title">Rýchly Dril v Teréne</h2>
            <p class="sandbox-sub">Čaká ťa pokladňa, telefonát alebo objednávka? Zadaj cieľové slovo a uvoľni sánku v 3 rýchlych pokusoch.</p>
          </div>

          <!-- Vstup na vlastné slovo / meno -->
          <div class="sandbox-input-card">
            <label class="sandbox-label" for="wordInput" style="font-weight:600; font-size:13px; color:var(--ink); display:block; margin-bottom:8px;">Cieľové slovo alebo veta:</label>
            <div style="display:flex; gap:10px;">
              <input type="text" id="wordInput" class="auth-input" value="Peter Novák" placeholder="Zadaj slovo, meno alebo celú vetu..." />
              <button class="btn-3d sm" id="clearWordBtn" title="Vyčistiť text">✕</button>
            </div>

            <!-- Rýchle SOS čipy -->
            <div style="font-size:11px; font-weight:600; color:var(--muted); margin-top:14px; text-transform:uppercase;">Rýchly výber SOS fráz:</div>
            <div class="preset-chips">
              <span class="chip" data-word="Peter Novák">Peter Novák</span>
              <span class="chip" data-word="Kartou, prosím">Kartou, prosím</span>
              <span class="chip" data-word="Dobrý deň, pri telefóne">Dobrý deň, pri telefóne</span>
              <span class="chip" data-word="Káva s mliekom">Káva s mliekom</span>
              <span class="chip" data-word="Chlieb">Chlieb (CH)</span>
              <span class="chip" data-word="Štvrtok o tretej">Štvrtok o tretej</span>
              <span class="chip" data-word="Isto, ďakujem">Isto, ďakujem</span>
            </div>
          </div>

          <!-- Voľba režimu drilu -->
          <div class="sandbox-mode-card">
            <div style="font-weight:600; font-size:13px; color:var(--ink); margin-bottom:12px;">Zvoľ režim tréningu:</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <label style="display:flex; align-items:flex-start; gap:10px; border:1px solid var(--line); border-radius:12px; padding:14px; background:white; cursor:pointer;">
                <input type="radio" name="sandboxMode" value="standard" checked style="margin-top:4px;">
                <div>
                  <strong style="font-size:13px; color:var(--ink); display:block;">Pacer (Technika)</strong>
                  <small style="font-size:11px; color:var(--muted);">Dychový kruh, pomalý plynulý nábeh VRT</small>
                </div>
              </label>

              <label style="display:flex; align-items:flex-start; gap:10px; border:1px solid var(--line); border-radius:12px; padding:14px; background:white; cursor:pointer;">
                <input type="radio" name="sandboxMode" value="guillotine" style="margin-top:4px;">
                <div>
                  <strong style="font-size:13px; color:var(--ink); display:block;">Časový tlak</strong>
                  <small style="font-size:11px; color:var(--muted);">Limit 550 ms na odpoveď bez kŕča</small>
                </div>
              </label>
            </div>
          </div>

          <!-- Veľké tlačidlo na spustenie drilu -->
          <div style="margin-bottom: 24px;">
            <button class="btn-primary full lg" id="launchSosDrillBtn" type="button">
              <span>SPUSTIŤ SOS DRIL (3 pokusy)</span>
            </button>
          </div>

          <!-- TREZOR OBÁVANÝCH SLOV -->
          <div class="telemetry-card feared-words-card" id="fearedWordsCard">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div>
                <span class="section-kicker">DESENZIBILIZAČNÝ MODUL</span>
                <h3 style="font-family:var(--font-serif); font-size:22px; font-weight:600; color:var(--ink);">Trezor Obávaných Slov</h3>
              </div>
              <span class="vault-status-badge" id="vaultMasteryBadge" style="background:#ebe7fb; color:var(--purple-dark); padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700;">0 / 0 Odblokované 🏆</span>
            </div>

            <p style="font-size:13px; color:var(--muted); line-height:1.45; margin-bottom:16px;">
              Ulož si slová, mená či objednávky, ktoré v tebe vyvolávajú anticipačný kŕč. Trénuj ich v SOS drile až do ich plného odblokovania (3 úspešné nábehy = trofej 🏆).
            </p>

            <div style="display:flex; gap:10px; margin-bottom:14px;">
              <input type="text" id="vaultWordInput" class="auth-input" placeholder="Nové obávané slovo, meno alebo objednávka..." />
              <select id="vaultCategorySelect" class="auth-input" style="width:140px;" title="Kategória slova">
                <option value="Meno">Meno</option>
                <option value="Kaviareň">Kaviareň</option>
                <option value="Cestovanie">Mesto</option>
                <option value="Číslo">Číslo</option>
                <option value="Práca">Práca</option>
                <option value="Iné">Iné</option>
              </select>
              <button class="btn-3d amber sm" id="vaultAddBtn" type="button">+ Pridať</button>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <button class="btn-3d sm" id="vaultRandomChallengeBtn" type="button">🎲 Náhodná výzva</button>
              <div style="display:flex; gap:6px;">
                <button class="btn-3d sm" id="vFilterAll" data-filter="all">Všetky (<span id="vCountAll">0</span>)</button>
                <button class="btn-3d sm" id="vFilterTraining" data-filter="unmastered">V tréningu (<span id="vCountTraining">0</span>)</button>
                <button class="btn-3d sm" id="vFilterMastered" data-filter="mastered">🏆 (<span id="vCountMastered">0</span>)</button>
              </div>
            </div>

            <div class="vault-list" id="vaultList">
              <!-- Dynamicky generované z gamification-engine.js -->
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================ -->
    <!-- ZÁLOŽKA 3: ASISTENT (ŽIVÝ DAF & FAF ODPOSLUCH)                    -->
    <!-- ================================================================ -->
    <section class="tab-pane" id="tabAsistent">
      <div class="dashboard inner-page">
        
        <div class="page-intro" style="margin-bottom: 24px;">
          <p class="eyebrow">SLUCHOVÝ ASISTENT</p>
          <h1>Živý DAF & FAF Odposluch<span>.</span></h1>
          <p class="subtitle">Zborový efekt (Choral Speech) pre okamžité uvoľnenie kŕča hlasiviek.</p>
        </div>

        <div class="assistant-container">
          <div class="assistant-hero-card">
            <div class="assistant-badge">🎧 ŽIVÝ REČOVÝ ASISTENT</div>
            <h2 class="assistant-title">Osobný Rečový Asistent</h2>
            <p class="assistant-sub">Živý zborový odposluch vlastného hlasu s jemným časovým oneskorením (DAF 70 ms) a skutočným zvýšením výšky tónu hlasu (FAF +2 poltóny) do slúchadla v reálnom čase. Mozog vníma reč ako hovorenie s partnerom (Choral Speech Effect), čo reflexívne uvoľňuje kŕč hlasiviek pri prezentáciách, hovoroch či v teréne.</p>

            <div style="display:flex; align-items:center; gap:10px; background:#fff7ed; border:1px solid #ffedd5; border-radius:12px; padding:10px 14px; margin-top:14px; color:#c2410c; font-size:12px; font-weight:500;">
              <span>🎧</span>
              <span>Používaj so slúchadlami, aby nevznikala spätná väzba do mikrofónu.</span>
            </div>
          </div>

          <!-- Vizuálny feedback (pulzujúci indikátor) -->
          <div style="border: 1px solid var(--line); border-radius: 20px; background: rgba(255, 254, 253, 0.76); padding: 28px; text-align:center; margin-bottom:20px;">
            <div class="assistant-pulse-circle" id="assistantPulseIndicator" style="width:90px; height:90px; border-radius:50%; background:#f2eefd; border:3px solid var(--purple); display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto; font-size:32px; color:var(--purple);">
              🎧
            </div>
            <div id="assistantPulseStatus" style="font-size:13px; font-weight:600; color:var(--ink);">Asistent je pripravený</div>
          </div>

          <!-- Dominantný Master Switch -->
          <div style="margin-bottom: 20px;">
            <button class="btn-primary full lg" id="assistantToggle" type="button">
              <span>▶ Aktivovať asistenta</span>
            </button>
          </div>

          <!-- Ovládacie posuvníky -->
          <div class="assistant-controls-card">
            
            <!-- 1. Delay Slider -->
            <div class="control-row-group">
              <div class="control-label-row">
                <div class="control-title-wrap">
                  <span>⏱️</span>
                  <span>Rýchlosť odozvy (Delay):</span>
                </div>
                <span class="control-val-badge" id="assistantDelayVal">70 ms</span>
              </div>

              <input type="range" class="assistant-slider" id="assistantDelaySlider" min="40" max="140" step="5" value="70">
              <input type="hidden" id="dafDelaySlider" value="70">

              <div class="slider-ruler" id="delayRuler">
                <div class="ruler-mark" style="left: 0%;" data-val="40"><div class="ruler-tick"></div><span class="ruler-label">40 ms</span></div>
                <div class="ruler-mark active" style="left: 30%;" data-val="70"><div class="ruler-tick"></div><span class="ruler-label sweet">★ Optimálny (70 ms)</span></div>
                <div class="ruler-mark" style="left: 60%;" data-val="100"><div class="ruler-tick"></div><span class="ruler-label">100 ms</span></div>
                <div class="ruler-mark" style="left: 100%;" data-val="140"><div class="ruler-tick"></div><span class="ruler-label">140 ms</span></div>
              </div>
            </div>

            <!-- 2. Volume Slider -->
            <div class="control-row-group">
              <div class="control-label-row">
                <div class="control-title-wrap">
                  <span>🔊</span>
                  <span>Hlasitosť v uchu:</span>
                </div>
                <span class="control-val-badge" id="assistantVolVal">85 %</span>
              </div>

              <input type="range" class="assistant-slider" id="assistantVolSlider" min="0" max="100" step="1" value="85">

              <div class="slider-ruler" id="volRuler">
                <div class="ruler-mark" style="left: 0%;" data-val="0"><div class="ruler-tick"></div><span class="ruler-label">0%</span></div>
                <div class="ruler-mark" style="left: 50%;" data-val="50"><div class="ruler-tick"></div><span class="ruler-label">50%</span></div>
                <div class="ruler-mark active" style="left: 85%;" data-val="85"><div class="ruler-tick"></div><span class="ruler-label sweet">★ 85%</span></div>
                <div class="ruler-mark" style="left: 100%;" data-val="100"><div class="ruler-tick"></div><span class="ruler-label">100%</span></div>
              </div>
            </div>

            <!-- 3. FAF Pitch Shift Slider -->
            <div class="control-row-group" style="margin-bottom:0;">
              <div class="control-label-row">
                <div class="control-title-wrap">
                  <span>🎵</span>
                  <span>FAF Posun výšky tónu:</span>
                </div>
                <span class="control-val-badge" id="assistantPitchVal">+2 st</span>
              </div>

              <input type="range" class="assistant-slider" id="assistantPitchSlider" min="-4" max="4" step="1" value="2">

              <div class="slider-ruler" id="pitchRuler">
                <div class="ruler-mark" style="left: 0%;" data-val="-4"><div class="ruler-tick"></div><span class="ruler-label">-4 st</span></div>
                <div class="ruler-mark" style="left: 50%;" data-val="0"><div class="ruler-tick"></div><span class="ruler-label">0 st</span></div>
                <div class="ruler-mark active" style="left: 75%;" data-val="2"><div class="ruler-tick"></div><span class="ruler-label sweet">★ +2 st</span></div>
                <div class="ruler-mark" style="left: 100%;" data-val="4"><div class="ruler-tick"></div><span class="ruler-label">+4 st</span></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================ -->
    <!-- ZÁLOŽKA 4: MÔJ POKROK (TELEMETRIA, VRT & PROFIL)                  -->
    <!-- ================================================================ -->
    <section class="tab-pane" id="tabTelemetria">
      <div class="dashboard inner-page">
        
        <div class="page-intro" style="margin-bottom: 24px;">
          <p class="eyebrow">ŠTATISTIKY & BIOFEEDBACK</p>
          <h1>Môj pokrok<span>.</span></h1>
          <p class="subtitle">Objektívne akustické merania mäkkého nábehu a synchronizácia profilu.</p>
        </div>

        <div class="telemetry-container">
          
          <!-- Klinický panel VRT -->
          <div class="telemetry-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span class="section-kicker">KLINICKÁ BIO-METRIKA</span>
                <h3 style="font-family:var(--font-serif); font-size:22px; font-weight:600; color:var(--ink);">Vocal Rise Time (VRT)</h3>
              </div>
              <span id="vrtStatusBadge" style="background:#e6f9f0; color:#10b981; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700;">Klinický Sweet-Spot</span>
            </div>

            <div class="vrt-gauge-box">
              <div class="vrt-big-number">
                <span id="avgVrtVal">74.2</span>
                <span class="vrt-unit">ms</span>
              </div>
              <div class="vrt-scale-bar">
                <div class="vrt-zone hard">Tvrdý (&lt; 45 ms)</div>
                <div class="vrt-zone sweet">Mäkký nábeh (60–140 ms)</div>
                <div class="vrt-zone breathy">Únik (&gt; 240 ms)</div>
              </div>
            </div>
          </div>

          <!-- Prehľad pokusov -->
          <div class="telemetry-card">
            <span class="section-kicker">CELKOVÝ PREHĽAD REČI</span>
            <h3 style="font-family:var(--font-serif); font-size:22px; font-weight:600; color:var(--ink); margin-bottom:16px;">Štatistika Pokusov</h3>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:12px;">
              <div style="border:1px solid var(--line); border-radius:14px; padding:14px; background:white;">
                <span style="font-size:22px; font-weight:700; color:var(--ink); display:block;" id="tStatTotalAttempts">0</span>
                <span style="font-size:11px; color:var(--muted);">Celkovo pokusov</span>
              </div>
              <div style="border:1px solid var(--line); border-radius:14px; padding:14px; background:white;">
                <span style="font-size:22px; font-weight:700; color:#10b981; display:block;" id="tStatSuccessRate">100%</span>
                <span style="font-size:11px; color:var(--muted);">Úspešnosť bez kŕča</span>
              </div>
              <div style="border:1px solid var(--line); border-radius:14px; padding:14px; background:white;">
                <span style="font-size:22px; font-weight:700; color:var(--purple); display:block;" id="tStatCompletedLessons">0 / 25</span>
                <span style="font-size:11px; color:var(--muted);">Dokončené lekcie</span>
              </div>
              <div style="border:1px solid var(--line); border-radius:14px; padding:14px; background:white;">
                <span style="font-size:22px; font-weight:700; color:var(--ink); display:block;" id="tStatAvgLatency">410 ms</span>
                <span style="font-size:11px; color:var(--muted);">Priemerná reakcia</span>
              </div>
              <div style="border:1px solid var(--line); border-radius:14px; padding:14px; background:white;">
                <span style="font-size:22px; font-weight:700; color:#f59e0b; display:block;" id="tStatVaultMastered">0 / 3 🏆</span>
                <span style="font-size:11px; color:var(--muted);">Odblokované v trezore</span>
              </div>
            </div>
          </div>

          <!-- Cloud Profil & Supabase -->
          <div class="telemetry-card profile-card" id="telemetryProfileCard">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span class="section-kicker">CLOUD PROFIL & SYNCHRONIZÁCIA</span>
              <span id="authStatusBadge" style="background:#f2efe9; color:var(--muted); font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px;">Hosť (Lokálne)</span>
            </div>
            <h3 style="font-family:var(--font-serif); font-size:22px; font-weight:600; color:var(--ink); margin-bottom:14px;">Používateľský Profil</h3>

            <div class="auth-view-box" id="authLoggedOutView">
              <p style="font-size:13px; color:var(--muted); line-height:1.45; margin-bottom:16px;">Prihlás sa svojím emailom alebo Google účtom a zálohuj si rečový tréning, históriu mäkkých nábehov a Trezor slov do cloudu.</p>

              <button class="btn-3d sm full" id="openAuthModalFromTelemetryBtn" type="button" style="margin-bottom: 14px;">
                <span>🚀 Otvoriť prihlasovaciu obrazovku</span>
              </button>

              <div style="display:grid; gap:10px; margin-bottom:14px;">
                <input type="email" class="auth-input" id="authEmailInput" placeholder="Tvoj email (napr. meno@gmail.com)" autocomplete="email" />
                <input type="password" class="auth-input" id="authPasswordInput" placeholder="Heslo (min. 6 znakov)" autocomplete="current-password" />
                
                <div style="display:flex; gap:10px;">
                  <button class="btn-primary full sm" id="btnEmailLogin" type="button">
                    <span>Prihlásiť sa / Vytvoriť účet</span>
                  </button>
                  <button class="btn-3d sm full" id="btnMagicLink" type="button" title="Bezheslové prihlásenie cez odkaz do emailu">
                    <span>Odkaz do mailu</span>
                  </button>
                </div>
                <div class="auth-feedback-msg" id="authFeedbackMsg" style="display:none; color:var(--coral); font-size:12px; font-weight:500;"></div>
              </div>

              <div class="auth-divider">
                <span>alebo cez Google účet</span>
              </div>

              <button class="google-button" id="btnGoogleLogin" type="button">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Pokračovať cez Google</span>
              </button>
            </div>

            <div class="auth-view-box" id="authLoggedInView" style="display:none;">
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                <img src="" alt="Avatar" class="user-avatar-img" id="userAvatarEl" style="display:none; width:44px; height:44px; border-radius:50%;" />
                <div>
                  <div id="userNameEl" style="font-weight:700; color:var(--ink);">Meno Používateľa</div>
                  <div id="userEmailEl" style="font-size:12px; color:var(--muted);">email@example.com</div>
                </div>
              </div>
              <div style="font-size:12px; color:#10b981; font-weight:600; margin-bottom:14px;" id="profileSyncText">☁️ Cloud synchronizácia aktívna</div>
              <button class="btn-3d sm full" id="btnLogout" type="button" style="color:var(--coral);">Odhlásiť sa</button>
            </div>
          </div>

          <!-- Diagnostika Balbutizmu -->
          <div class="telemetry-card" id="telemetryDiagnosticCard">
            <span class="section-kicker">VEDECKÝ NEURO-PROFIL REČI</span>
            <h3 style="font-family:var(--font-serif); font-size:22px; font-weight:600; color:var(--ink); margin-bottom:14px;">Tvoja Rečová Diagnostika</h3>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
              <div style="border:1px solid var(--line); border-radius:12px; padding:12px; background:white;">
                <span style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:700;">Primárny blok</span>
                <div id="telemetryDiagTension" style="font-size:13px; font-weight:600; color:var(--ink); margin-top:4px;">Glotálny kŕč (Hlasivky)</div>
              </div>
              <div style="border:1px solid var(--line); border-radius:12px; padding:12px; background:white;">
                <span style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:700;">Odporúčaný svet</span>
                <div id="telemetryDiagWorld" style="font-size:13px; font-weight:600; color:var(--purple); margin-top:4px;">Svet 1: Samohlásky</div>
              </div>
              <div style="border:1px solid var(--line); border-radius:12px; padding:12px; background:white;">
                <span style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:700;">Záťažová situácia</span>
                <div id="telemetryDiagSituation" style="font-size:13px; font-weight:600; color:var(--ink); margin-top:4px;">Telefonovanie</div>
              </div>
              <div style="border:1px solid var(--line); border-radius:12px; padding:12px; background:white;">
                <span style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:700;">Cieľ</span>
                <div id="telemetryDiagGoal" style="font-size:13px; font-weight:600; color:var(--ink); margin-top:4px;">Mäkký nábeh + DAF</div>
              </div>
            </div>

            <button class="btn-3d sm full" id="reopenDiagnosticBtn" type="button">
              <span>📋 Otvoriť dotazník balbutizmu</span>
            </button>
          </div>

          <!-- Systém a kalibrácia -->
          <div class="telemetry-card">
            <span class="section-kicker">SPRÁVA MIKROFÓNU & SYSTÉMU</span>
            <h3 style="font-family:var(--font-serif); font-size:22px; font-weight:600; color:var(--ink); margin-bottom:14px;">Nastavenia a Kalibrácia</h3>

            <div style="display:grid; gap:10px;">
              <button class="btn-3d sm full" id="openScienceModalBtn" type="button">🔬 Otvoriť Vedecký Základ & Modely</button>
              <button class="btn-3d amber sm full" id="calibrateFromTelemetryBtn" type="button">Kalibrovať šum mikrofónu</button>
              <a href="https://github.com/baranaikooo/glide/releases/download/v1.0.0/glide-native.apk" download="glide-native.apk" class="btn-3d blue sm full" id="apkDownloadBtn" style="text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px;">
                <span>🤖 Stiahnuť Natívnu Android Aplikáciu (.APK)</span>
              </a>
              <button class="btn-3d sm full" id="resetTelemetryProgressBtn" type="button" style="color:var(--coral);">Resetovať celý herný postup</button>
            </div>
          </div>

          <!-- Histórie tréningu pre gamification-engine.js -->
          <div id="telemetryHistoryList" style="display:none;"></div>
        </div>
      </div>
    </section>

  </main>

  <!-- ==================================================================== -->
  <!-- SPODNÁ MOBILNÁ NAVIGÁCIA (BEZ DOTAZNÍKA V MENU)                      -->
  <!-- ==================================================================== -->
  <nav class="mobile-nav" id="bottomNav" aria-label="Mobilná navigácia">
    <button class="active" data-tab="tabCesta" id="navTabCesta">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></svg>
      <span>Dnes</span>
    </button>
    <button data-tab="tabDril" id="navTabDril">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4v16M19 4v16"/><path d="M9 8v8M15 8v8M2 12h20"/></svg>
      <span>Cvičenia</span>
    </button>
    <button data-tab="tabAsistent" id="navTabAsistent">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h4v7H6a2 2 0 0 1-2-2v-5ZM20 14h-4v7h2a2 2 0 0 0 2-2v-5Z"/></svg>
      <span>Asistent</span>
    </button>
    <button data-tab="tabTelemetria" id="navTabTelemetria">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>
      <span>Pokrok</span>
    </button>
  </nav>

</div><!-- /.app-shell -->

<!-- ==================================================================== -->
<!-- POPUP OKNO PRE LEVEL (POPOVER CARD NA MAPE)                          -->
<!-- ==================================================================== -->
<div class="node-popover-backdrop" id="nodePopoverBackdrop">
  <div class="node-popover-card" id="nodePopover">
    <button class="popover-close" id="popoverCloseBtn">✕</button>
    <div class="popover-world-tag" id="popoverWorldTag">SVET 1 • SAMOHLÁSKY</div>
    <h3 class="popover-title" id="popoverTitle">Lekcia 1.1: Úvod do A a O</h3>
    <p class="popover-desc" id="popoverDesc">Tréning mäkkého nábehu hlasiviek (VRT 45–160 ms). Žiadny tvrdý glotálny úder v hrtane.</p>
    
    <div class="popover-meta">
      <span class="popover-xp">⚡ +30 XP</span>
      <span class="popover-count" id="popoverWordCount">4 cvičenia</span>
    </div>

    <button class="btn-primary full" id="startLessonBtn" type="button">
      <span>SPUSTIŤ TRÉNING</span>
    </button>
  </div>
</div>

<!-- ==================================================================== -->
<!-- CELOOBRAZOVKOVÁ LEKCIA (FULL-SCREEN BIOFEEDBACK & PRACTICE OVERLAY)  -->
<!-- ==================================================================== -->
<section class="lesson-screen" id="lessonScreen">
  <div class="lesson-topbar">
    <button class="lesson-exit-btn" id="exitLessonBtn" title="Opustiť lekciu">✕</button>
    
    <div class="lesson-progress-track">
      <div class="lesson-progress-fill" id="lessonProgressFill" style="width: 0%;"></div>
    </div>

    <div class="lesson-hearts" id="lessonHearts">
      <span>❤️</span>
      <span id="lessonHeartsVal">5</span>
    </div>
  </div>

  <div class="lesson-stage">
    <!-- Video zrkadlo kamery (pre Boss fighty) -->
    <video id="cameraFeed" autoplay playsinline muted style="display:none; width:120px; height:120px; border-radius:50%; object-fit:cover; margin-bottom:12px; border:3px solid var(--purple);"></video>
    <div class="eye-contact-prompt" id="interlocutorPrompt" style="display:none; font-size:12px; font-weight:700; color:var(--purple); margin-bottom:12px;">👀 Udrž očný kontakt s kamerou!</div>

    <!-- Interaktívna bublina oponenta -->
    <div class="lesson-dialogue-card" id="lessonDialogueCard" style="display:none; border:1px solid var(--line); border-radius:16px; padding:14px 18px; background:white; margin-bottom:16px; max-width:440px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <span id="ldAvatar" style="font-size:18px;">👩‍💼</span>
        <strong id="ldSpeaker" style="font-size:13px; color:var(--ink);">Pokladníčka Zuzana</strong>
      </div>
      <p id="ldText" style="font-size:13px; color:var(--muted); font-style:italic;">Dobrý deň, budete platiť v hotovosti alebo kartou?</p>
    </div>

    <!-- Slúchadlový indikátor DAF & FAF -->
    <div id="headphoneLiveIndicator" class="headphone-live-badge off" title="Klikni pre zapnutie alebo vypnutie zvuku v slúchadlách">
      <span>🎧</span>
      <span id="headphoneStatusText">DAF & FAF: Vypnuté (Klikni pre zapnutie)</span>
      <span id="micStatus" style="display:none;">Mikrofón pripravený</span>
    </div>

    <!-- Cieľové slovo -->
    <div class="target-word-container">
      <h1 class="target-word" id="targetWord">AUTO</h1>
      <div class="target-meta" id="targetMeta">Klasifikácia: Samohláska (A) – cieľ VRT 45–160 ms</div>
    </div>

    <!-- Pacer Circle -->
    <div class="pacer-wrapper">
      <div class="pacer-circle" id="pacerCircle" title="Klikni sem pre okamžité predčasné vyhodnotenie!">
        <span class="pacer-text" id="pacerText">Priprav sa</span>
      </div>
    </div>

    <div class="status-alert" id="statusAlert">Stlač tlačidlo Štart pre začiatok dychového cyklu.</div>

    <!-- Ovládanie lekcie -->
    <div class="lesson-controls" id="lessonControls">
      <button id="calibrateBtn" class="btn-3d amber sm" type="button">Kalibrovať ticho</button>
      <button id="startBtn" class="btn-primary" type="button">▶ Spustiť slovo (Pacer)</button>
    </div>

    <!-- Toggles -->
    <div style="display:flex; gap:12px; margin-top:14px; font-size:12px;">
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" id="camToggle">
        <span>Kamera</span>
      </label>
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" id="voicePromptToggle" checked>
        <span>Reálny hlas (/audio)</span>
      </label>
    </div>

    <!-- Hidden compatibility elements for dsp-core.js -->
    <div style="display:none;">
      <div id="lessonContextBadge"></div>
      <div id="xpNextLabel"></div>
      <div id="xpFillBar"></div>
      <span id="comboVal">1x</span>
      <button id="cardioBtn"></button>
    </div>
  </div>

  <!-- Prepadový hovor Overlay -->
  <div class="call-overlay" id="callOverlay" style="display:none; position:fixed; inset:0; z-index:10002; background:rgba(37,35,65,0.85); backdrop-filter:blur(10px); align-items:center; justify-content:center;">
    <div style="background:var(--paper); border-radius:24px; padding:32px 28px; max-width:360px; width:100%; text-align:center;">
      <div style="font-size:42px; margin-bottom:12px;">📞</div>
      <h2 class="caller-name" id="callerName" style="font-family:var(--font-serif); font-size:24px; color:var(--ink); margin-bottom:6px;">Kuriér (Balík)</h2>
      <p id="callerSub" style="font-size:13px; color:var(--muted); margin-bottom:20px;">Prichádzajúci hovor... Vypočuj si otázku a odpovedz bez bloku!</p>
      <div style="display:flex; gap:12px;">
        <button class="btn-3d sm full" id="declineCallBtn" type="button" style="color:var(--coral);">Zrušiť</button>
        <button class="btn-primary full" id="answerCallBtn" type="button">Prijať hovor</button>
      </div>
    </div>
  </div>

  <!-- Spodný Feedback Drawer -->
  <div class="feedback-drawer" id="feedbackDrawer">
    <div class="drawer-inner">
      <div class="drawer-header">
        <div class="drawer-status-icon" id="drawerStatusIcon">✓</div>
        <div>
          <h3 class="drawer-headline" id="drawerHeadline">Úžasné! Dokonalý nábeh!</h3>
          <p class="drawer-subtext" id="drawerSubtext">Hlasivky naskočili mäkko a bez kŕča v sweet-spote.</p>
        </div>
        <div class="drawer-xp-badge" id="drawerXpBadge">+30 XP</div>
      </div>

      <div class="drawer-details-toggle" style="margin-bottom:10px;">
        <button class="btn-3d sm full" id="toggleMatrixBtn" type="button">
          <span>Akustická analýza (VRT & graf)</span>
        </button>
      </div>

      <div class="matrix-panel" id="matrixPanel" style="display:none;">
        <div class="canvas-wrap">
          <div class="canvas-label">
            <span>Akustická obálka formantov (FFT 2048)</span>
            <span>Žlté pásmo = VRT</span>
          </div>
          <canvas id="envelopeCanvas" width="600" height="80"></canvas>
          <canvas id="rmsCanvas" style="display:none;" width="600" height="80"></canvas>
        </div>

        <div class="metrics-grid">
          <div class="metric-row"><span class="metric-title" id="m1Title">1. Štart</span><span class="metric-val" id="m1">-</span></div>
          <div class="metric-row"><span class="metric-title">2. Čistota</span><span class="metric-val" id="m2">-</span></div>
          <div class="metric-row"><span class="metric-title">3. Trvanie</span><span class="metric-val" id="m3">-</span></div>
          <div class="metric-row"><span class="metric-title">4. VRT</span><span class="metric-val" id="m4"><span id="vrtValue">-</span></span></div>
          <div class="metric-row"><span class="metric-title">5. Kontinuita</span><span class="metric-val" id="m5">-</span></div>
        </div>
      </div>

      <div style="margin-top:16px;">
        <button class="btn-primary full lg" id="drawerContinueBtn" type="button">
          <span>POKRAČOVAŤ (Enter)</span>
        </button>
      </div>
    </div>
  </div>
</section>

<!-- ==================================================================== -->
<!-- KALIBRAČNÝ MODAL (MERANIE ŠUMU MIESTNOSTI)                           -->
<!-- ==================================================================== -->
<div class="modal-backdrop-overlay" id="calibrationModal" style="display:none;">
  <div class="auth-modal-card" style="text-align: center; max-width: 380px;">
    <div class="brand-mark small" style="margin: 0 auto 16px auto;">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <h2 class="auth-modal-title" style="font-size: 22px;">Kalibrácia ticha</h2>
    <p class="auth-modal-desc">Meriam hladinu hluku v miestnosti. Prosím, vydrž 1 sekundu v tichu...</p>
    <div style="margin: 24px auto 8px auto; width: 36px; height: 36px; border: 3px solid rgba(109, 91, 208, 0.2); border-top-color: var(--purple); border-radius: 50%; animation: spin 1s linear infinite;"></div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- OSLAVNÝ MODAL (LEKCIA DOKONČENÁ)                                     -->
<!-- ==================================================================== -->
<div class="modal-backdrop-overlay" id="celebrationModal" style="display:none;">
  <div class="auth-modal-card" style="text-align: center; max-width: 420px;">
    <div style="font-size: 48px; margin-bottom: 8px;">🏆</div>
    <h2 class="celebration-title" id="celebrationTitle" style="font-family:var(--font-serif); font-size:26px; color:var(--ink); margin-bottom:6px;">Lekcia dokončená!</h2>
    <p class="celebration-sub" id="celebrationSub" style="font-size:13px; color:var(--muted); margin-bottom:20px;">Tvoj mozog prepísal ďalšiu kŕčovú dráhu na plynulý nábeh.</p>

    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:24px;">
      <div style="border:1px solid var(--line); border-radius:12px; padding:12px; background:white;">
        <span style="font-size:10px; color:var(--muted); display:block; font-weight:700;">ZÍSKANÉ XP</span>
        <span style="font-size:16px; font-weight:700; color:var(--purple);" id="recapXpVal">+30 XP</span>
      </div>
      <div style="border:1px solid var(--line); border-radius:12px; padding:12px; background:white;">
        <span style="font-size:10px; color:var(--muted); display:block; font-weight:700;">ÚSPEŠNOSŤ</span>
        <span style="font-size:16px; font-weight:700; color:#10b981;" id="recapAccuracyVal">100%</span>
      </div>
      <div style="border:1px solid var(--line); border-radius:12px; padding:12px; background:white;">
        <span style="font-size:10px; color:var(--muted); display:block; font-weight:700;">SÉRIA</span>
        <span style="font-size:16px; font-weight:700; color:#f59e0b;" id="recapStreakVal">6 dní</span>
      </div>
    </div>

    <button class="btn-primary full lg" id="celebrationBackBtn" type="button">
      <span>POKRAČOVAŤ</span>
    </button>
  </div>
</div>

<!-- ==================================================================== -->
<!-- VEDECKÝ ZÁKLAD & MODELY MODAL                                        -->
<!-- ==================================================================== -->
<div class="science-modal-backdrop" id="scienceModalBackdrop">
  <div class="science-modal-card">
    <div class="science-modal-header">
      <div>
        <span class="section-kicker">EVIDENCE-BASED NEUROAKUSTIKA</span>
        <h2 style="font-family:var(--font-serif); font-size:24px; color:var(--ink); margin-top:4px;">Vedecký Základ & Klinické Modely</h2>
      </div>
      <button class="science-close-btn" id="scienceModalCloseBtn" type="button">✕</button>
    </div>

    <div style="font-size:13px; color:var(--muted); line-height:1.5; margin-bottom:20px;">
      Glide Biofeedback vychádza z neurobiologických princípov: DIVA/GODIVA sensorimotorický model, Vocal Rise Time (VRT), DAF zborový efekt a Valsalvova dekompresia.
    </div>

    <button class="btn-3d sm full" id="closeScienceModalBtn" type="button">
      <span>← Späť do aplikácie</span>
    </button>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SKRIPTY                                                              -->
<!-- ==================================================================== -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="./questions-and-voices.js"></script>
<script src="./dsp-core.js"></script>
<script src="./gamification-engine.js"></script>
<script src="./daf-assistant.js"></script>
<script src="./supabase-auth.js"></script>

<script>
  // Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[PWA] Service Worker aktívny:', reg.scope))
        .catch(err => console.warn('[PWA] SW chyba:', err));
    });
  }

  // Prepojenie záložiek (Tabs Controller)
  (function initTabNavigation() {
    function switchTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => {
        if (el.id === tabId) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      // Synchronizácia desktop sidebaru a mobilnej navigácie
      document.querySelectorAll('#appSidebar .nav-item[data-tab], #bottomNav button[data-tab]').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        if (tabId) switchTab(tabId);
      });
    });

    // Rýchle tlačidlá
    const brandBtn = document.getElementById('sidebarBrandBtn');
    if (brandBtn) brandBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('tabCesta'); });

    const goToProgressBtn = document.getElementById('goToProgressBtn');
    if (goToProgressBtn) goToProgressBtn.addEventListener('click', () => switchTab('tabTelemetria'));

    const profileChip = document.getElementById('sidebarProfileChip');
    if (profileChip) profileChip.addEventListener('click', () => switchTab('tabTelemetria'));

    const headerProfileBtn = document.getElementById('headerProfileBtn');
    if (headerProfileBtn) headerProfileBtn.addEventListener('click', () => switchTab('tabTelemetria'));

    const settingsBtn = document.getElementById('sidebarSettingsBtn');
    const scienceModal = document.getElementById('scienceModalBackdrop');
    if (settingsBtn && scienceModal) {
      settingsBtn.addEventListener('click', () => { scienceModal.style.display = 'flex'; });
    }
  })();

  // Figma Dotazník Stepper Logic
  (function initQuestionnaire() {
    let currentStep = 0;
    const modal = document.getElementById('figmaQuestionnaireModal');
    const adultCheck = document.getElementById('qAdultCheck');
    const consentCheck = document.getElementById('qConsentCheck');
    const nextBtn = document.getElementById('qNextBtn');
    const backBtn = document.getElementById('qBackBtn');
    const nextText = document.getElementById('qNextBtnText');
    const countText = document.getElementById('qCountText');
    const progressBar = document.getElementById('qProgressBar');
    const finishBtn = document.getElementById('qFinishEnterBtn');
    const reopenBtn = document.getElementById('reopenDiagnosticBtn');
    const actionsFooter = document.getElementById('qActionsFooter');

    const answers = {};

    function updateStepUI() {
      for (let i = 0; i <= 5; i++) {
        const s = document.getElementById('qStep' + i);
        if (s) s.style.display = (i === currentStep) ? 'block' : 'none';
      }

      if (currentStep === 0) {
        if (countText) countText.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
        if (backBtn) backBtn.style.visibility = 'hidden';
        if (nextText) nextText.textContent = 'Začať dotazník';
        if (nextBtn) nextBtn.disabled = !(adultCheck && adultCheck.checked && consentCheck && consentCheck.checked);
        if (actionsFooter) actionsFooter.style.display = 'flex';
      } else if (currentStep >= 1 && currentStep <= 3) {
        if (countText) {
          countText.style.display = 'block';
          countText.textContent = currentStep + ' / 3';
        }
        if (progressBar) progressBar.style.width = Math.round((currentStep / 4) * 100) + '%';
        if (backBtn) backBtn.style.visibility = 'visible';
        if (nextText) nextText.textContent = (currentStep === 3) ? 'K situáciám →' : 'Ďalej →';
        if (actionsFooter) actionsFooter.style.display = 'flex';
        checkStepComplete();
      } else if (currentStep === 4) {
        if (countText) {
          countText.style.display = 'block';
          countText.textContent = 'Kontext';
        }
        if (progressBar) progressBar.style.width = '90%';
        if (backBtn) backBtn.style.visibility = 'visible';
        if (nextText) nextText.textContent = 'Vyhodnotiť profil →';
        if (nextBtn) nextBtn.disabled = false;
        if (actionsFooter) actionsFooter.style.display = 'flex';
      } else if (currentStep === 5) {
        if (countText) countText.style.display = 'none';
        if (progressBar) progressBar.style.width = '100%';
        if (actionsFooter) actionsFooter.style.display = 'none';
      }
    }

    function checkStepComplete() {
      if (currentStep === 0) {
        if (nextBtn) nextBtn.disabled = !(adultCheck && adultCheck.checked && consentCheck && consentCheck.checked);
        return;
      }
      if (currentStep >= 1 && currentStep <= 3) {
        const stepEl = document.getElementById('qStep' + currentStep);
        if (!stepEl) return;
        const scales = stepEl.querySelectorAll('.answer-scale');
        let allAnswered = true;
        scales.forEach(scale => {
          const qid = scale.getAttribute('data-qid');
          if (answers[qid] === undefined) allAnswered = false;
        });
        if (nextBtn) nextBtn.disabled = !allAnswered;
      }
    }

    if (adultCheck) adultCheck.addEventListener('change', checkStepComplete);
    if (consentCheck) consentCheck.addEventListener('change', checkStepComplete);

    document.querySelectorAll('.answer-scale input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const scale = radio.closest('.answer-scale');
        if (scale) {
          const qid = scale.getAttribute('data-qid');
          answers[qid] = parseInt(radio.value, 10);
          checkStepComplete();
        }
      });
    });

    document.querySelectorAll('.situation-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('active'));
    });

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentStep < 5) {
          currentStep++;
          updateStepUI();
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (currentStep > 0) {
          currentStep--;
          updateStepUI();
        }
      });
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        localStorage.setItem('glide_questionnaire_completed', 'true');
        localStorage.setItem('glide_intro_completed', 'true');
        if (modal) modal.style.display = 'none';
      });
    }

    if (reopenBtn && modal) {
      reopenBtn.addEventListener('click', () => {
        currentStep = 0;
        updateStepUI();
        modal.style.display = 'flex';
      });
    }

    // Inicializácia: ak používateľ ešte nevidel dotazník a prihlásil sa / vstúpil
    window.openQuestionnaireIfPending = function() {
      const done = localStorage.getItem('glide_questionnaire_completed');
      if (!done && modal) {
        currentStep = 0;
        updateStepUI();
        modal.style.display = 'flex';
      }
    };
  })();

  // Dátum v Topbare
  (function initTopbarDate() {
    const days = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
    const months = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
    const now = new Date();
    const dayEl = document.getElementById('topbarDayName');
    const dateEl = document.getElementById('topbarDateStr');
    if (dayEl) dayEl.textContent = days[now.getDay()];
    if (dateEl) dateEl.textContent = now.getDate() + '. ' + months[now.getMonth()];
  })();
</script>

</body>
</html>
`;

fs.writeFileSync(targetHtmlPath, htmlContent, 'utf8');
console.log('Successfully written unified index.html, size:', fs.statSync(targetHtmlPath).size);
