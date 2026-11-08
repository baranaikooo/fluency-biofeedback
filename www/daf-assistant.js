/**
 * FLUENCY BIOFEEDBACK - LIVE DAF & CHORAL SPEECH ASSISTANT ENGINE
 * Paralelná vetva Web Audio API:
 *   mediaStreamSource ──┬──> DelayNode A (Primary DAF, napr. 70 ms) ─────────────┬──> MasterGain ──> destination
 *                       │                                                        │
 *                       └──> DelayNode B (Choral Lift, delayMs + 12 ms) ──> FormantEQ ──┘
 *
 * 100% spoľahlivá, nezamŕza, žiadne mŕtve AudioBufferSource nody.
 * Zvuk je v slúchadlách krištáľovo čistý, okamžitý a s prirodzeným zborovým harmonickým zdvihom.
 */

(function (window) {
  'use strict';

  class DafAssistantEngine {
    constructor() {
      this.isActive = false;
      this.delayMs = 70;
      this.volumePercent = 85;

      this.audioCtx = null;
      this.mediaStreamSource = null;
      this.delayNodeA = null;
      this.delayNodeB = null;
      this.choralFilter = null;
      this.choralGain = null;
      this.directGain = null;
      this.masterGain = null;
      this.dafAnalyser = null;
      this.animFrameId = null;

      this.initDom();
    }

    initDom() {
      if (typeof document === 'undefined') return;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.bindEvents());
      } else {
        this.bindEvents();
      }
    }

    bindEvents() {
      const toggleBtn = document.getElementById('assistantToggle');
      const delaySlider = document.getElementById('assistantDelaySlider');
      const delayValEl = document.getElementById('assistantDelayVal');
      const volSlider = document.getElementById('assistantVolSlider');
      const volValEl = document.getElementById('assistantVolVal');

      const updateRulerActive = (rulerId, currentVal, tolerance = 3) => {
        const ruler = document.getElementById(rulerId);
        if (!ruler) return;
        const marks = ruler.querySelectorAll ? ruler.querySelectorAll('.ruler-mark') : [];
        if (!marks || !marks.forEach) return;
        marks.forEach(mark => {
          const rawVal = mark.dataset ? mark.dataset.val : (mark.getAttribute ? mark.getAttribute('data-val') : null);
          const mVal = parseInt(rawVal, 10);
          if (!isNaN(mVal) && Math.abs(mVal - currentVal) <= tolerance) {
            mark.classList.add('active');
          } else {
            mark.classList.remove('active');
          }
        });
      };

      // 1. Master Switch (Aktivácia / Deaktivácia)
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          // Okamžité obnovenie AudioContext pri kliknutí používateľa (user gesture)
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
          this.toggle();
        });
      }

      // 2. Rýchlosť odozvy (Delay slider 40-140 ms)
      if (delaySlider) {
        const handleDelayInput = () => {
          const val = parseInt(delaySlider.value, 10);
          this.setDelay(val);
          if (delayValEl) delayValEl.textContent = `${val} ms`;
          updateRulerActive('delayRuler', val, 3);

          const pct = ((val - 40) / (140 - 40)) * 100;
          delaySlider.style.background = `linear-gradient(to right, var(--duo-blue) 0%, var(--duo-blue) ${pct}%, #0b132b ${pct}%, #0b132b 100%)`;
        };

        delaySlider.addEventListener('input', handleDelayInput);
        handleDelayInput();
      }

      // 3. Hlasitosť v uchu (Volume slider 0-100 %)
      if (volSlider) {
        const handleVolInput = () => {
          const val = parseInt(volSlider.value, 10);
          this.setVolume(val);
          if (volValEl) volValEl.textContent = `${val} %`;
          updateRulerActive('volRuler', val, 2);

          volSlider.style.background = `linear-gradient(to right, var(--duo-blue) 0%, var(--duo-blue) ${val}%, #0b132b ${val}%, #0b132b 100%)`;
        };

        volSlider.addEventListener('input', handleVolInput);
        handleVolInput();
      }

      // 4. Klikateľné značky stupnice
      const delayRuler = document.getElementById('delayRuler');
      if (delayRuler && delaySlider && delayRuler.querySelectorAll) {
        const dMarks = delayRuler.querySelectorAll('.ruler-mark');
        if (dMarks && dMarks.forEach) {
          dMarks.forEach(mark => {
            mark.addEventListener('click', () => {
              const rawVal = mark.dataset ? mark.dataset.val : (mark.getAttribute ? mark.getAttribute('data-val') : null);
              const snapVal = parseInt(rawVal, 10);
              if (!isNaN(snapVal)) {
                delaySlider.value = snapVal;
                delaySlider.dispatchEvent(new Event('input'));
                if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
                  duoSfx.playTone(660, 'sine', 0.04, 0.08);
                }
              }
            });
          });
        }
      }

      const volRuler = document.getElementById('volRuler');
      if (volRuler && volSlider && volRuler.querySelectorAll) {
        const vMarks = volRuler.querySelectorAll('.ruler-mark');
        if (vMarks && vMarks.forEach) {
          vMarks.forEach(mark => {
            mark.addEventListener('click', () => {
              const rawVal = mark.dataset ? mark.dataset.val : (mark.getAttribute ? mark.getAttribute('data-val') : null);
              const snapVal = parseInt(rawVal, 10);
              if (!isNaN(snapVal)) {
                volSlider.value = snapVal;
                volSlider.dispatchEvent(new Event('input'));
                if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
                  duoSfx.playTone(740, 'sine', 0.04, 0.08);
                }
              }
            });
          });
        }
      }
    }

    async ensureAudioPipeline() {
      // 1. Získaj alebo vytvor AudioContext
      if (window.audioCtx) {
        this.audioCtx = window.audioCtx;
      } else if (!this.audioCtx) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioClass();
        window.audioCtx = this.audioCtx;
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // 2. Získaj mediaStreamSource z mikrofónu
      if (window.mediaStreamSource) {
        this.mediaStreamSource = window.mediaStreamSource;
      } else {
        if (typeof window.setupAudio === 'function') {
          await window.setupAudio();
          this.mediaStreamSource = window.mediaStreamSource;
          this.audioCtx = window.audioCtx;
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              latency: 0
            }
          });
          window.micStream = stream;
          this.mediaStreamSource = this.audioCtx.createMediaStreamSource(stream);
          window.mediaStreamSource = this.mediaStreamSource;
        }
      }

      // 3. Zostav paralelnú Zborovú DAF vetvu:
      // Voice A (Prirodzený DAF odposluch): mediaStreamSource -> delayNodeA -> directGain -> masterGain -> destination
      // Voice B (Zborový tón / Formantový lift): mediaStreamSource -> delayNodeB -> choralFilter -> choralGain -> masterGain -> destination
      if (!this.masterGain) {
        const now = this.audioCtx.currentTime;

        // Voice A: Základný oneskorený odposluch
        this.delayNodeA = this.audioCtx.createDelay(1.0);
        this.delayNodeA.delayTime.setValueAtTime(this.delayMs / 1000, now);

        this.directGain = this.audioCtx.createGain();
        this.directGain.gain.setValueAtTime(0.7, now);

        // Voice B: Zborový partner s jemným harmonickým posunom (+12 ms offset a formantový zdvih)
        this.delayNodeB = this.audioCtx.createDelay(1.0);
        this.delayNodeB.delayTime.setValueAtTime((this.delayMs + 12) / 1000, now);

        // Formantový Peaking filter pre vyšší, jasnejší rezonančný tón hlasu
        this.choralFilter = this.audioCtx.createBiquadFilter();
        this.choralFilter.type = 'peaking';
        this.choralFilter.frequency.setValueAtTime(2800, now); // Rezonancia vyšších harmonických
        this.choralFilter.Q.setValueAtTime(1.2, now);
        this.choralFilter.gain.setValueAtTime(5.0, now); // +5 dB zdvih pre zreteľný druhý hlas

        this.choralGain = this.audioCtx.createGain();
        this.choralGain.gain.setValueAtTime(0.55, now);

        // Master Gain
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.volumePercent / 100, now);

        // Analyser pre vizuálny pulz v reálnom čase
        this.dafAnalyser = this.audioCtx.createAnalyser();
        this.dafAnalyser.fftSize = 256;
        this.dafAnalyser.smoothingTimeConstant = 0.2;

        // Prepojenie Voice A
        this.mediaStreamSource.connect(this.delayNodeA);
        this.delayNodeA.connect(this.directGain);
        this.directGain.connect(this.masterGain);

        // Prepojenie Voice B (Choral)
        this.mediaStreamSource.connect(this.delayNodeB);
        this.delayNodeB.connect(this.choralFilter);
        this.choralFilter.connect(this.choralGain);
        this.choralGain.connect(this.masterGain);

        // Prepojenie na Analyser pre vizualizáciu
        this.masterGain.connect(this.dafAnalyser);
      }
    }

    async start() {
      try {
        await this.ensureAudioPipeline();

        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume();
        }

        // Pripoj do slúchadiel (audioCtx.destination)
        if (this.masterGain && this.audioCtx) {
          this.masterGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
          this.masterGain.gain.setValueAtTime(this.volumePercent / 100, this.audioCtx.currentTime);
          this.masterGain.connect(this.audioCtx.destination);
        }

        this.isActive = true;
        this.updateUiState(true);
        this.startVisualPulse();

        // Potvrdzujúci tón aktivácie
        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(880, 'sine', 0.08, 0.1);
        }
      } catch (err) {
        console.error('DAF Assistant activation error:', err);
        alert('Nepodarilo sa spustiť asistenta. Skontroluj prístup k mikrofónu v prehliadači.');
        this.updateUiState(false);
      }
    }

    stop() {
      this.isActive = false;

      // Plynulé odpojenie z výstupu do slúchadiel
      if (this.masterGain && this.audioCtx) {
        try {
          this.masterGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
          this.masterGain.disconnect(this.audioCtx.destination);
        } catch (_) {}
      }

      this.stopVisualPulse();
      this.updateUiState(false);

      if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
        duoSfx.playTone(440, 'sine', 0.08, 0.08);
      }
    }

    toggle() {
      if (this.isActive) {
        this.stop();
      } else {
        this.start();
      }
    }

    setDelay(ms) {
      this.delayMs = Math.max(40, Math.min(140, ms));
      if (window.dafFafPipeline && typeof window.dafFafPipeline.setDelay === 'function') {
        window.dafFafPipeline.setDelay(this.delayMs);
      }
      if (this.audioCtx) {
        const now = this.audioCtx.currentTime;
        if (this.delayNodeA) {
          this.delayNodeA.delayTime.cancelScheduledValues(now);
          this.delayNodeA.delayTime.setValueAtTime(this.delayMs / 1000, now);
        }
        if (this.delayNodeB) {
          this.delayNodeB.delayTime.cancelScheduledValues(now);
          this.delayNodeB.delayTime.setValueAtTime((this.delayMs + 12) / 1000, now);
        }
      }
    }

    setVolume(percent) {
      this.volumePercent = Math.max(0, Math.min(100, percent));
      if (window.dafFafPipeline && typeof window.dafFafPipeline.setVolume === 'function') {
        window.dafFafPipeline.setVolume(this.volumePercent);
      }
      if (this.masterGain && this.audioCtx && this.isActive) {
        this.masterGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.masterGain.gain.setValueAtTime(this.volumePercent / 100, this.audioCtx.currentTime);
      }
    }

    updateUiState(active) {
      const toggleBtn = document.getElementById('assistantToggle');
      const pulseWrap = document.getElementById('assistantPulseIndicator');
      const pulseStatus = document.getElementById('assistantPulseStatus');

      if (toggleBtn) {
        if (active) {
          toggleBtn.classList.add('active', 'running');
          toggleBtn.innerHTML = '<span class="btn-main-label">🟢 Asistent aktívny v slúchadle (Klikni pre vypnutie)</span>';
        } else {
          toggleBtn.classList.remove('active', 'running');
          toggleBtn.innerHTML = '<span class="btn-main-label">▶ Aktivovať asistenta</span>';
        }
      }

      if (pulseWrap) {
        if (active) {
          pulseWrap.classList.add('active');
        } else {
          pulseWrap.classList.remove('active');
          pulseWrap.style.transform = 'scale(1)';
        }
      }

      if (pulseStatus) {
        pulseStatus.textContent = active
          ? '🎧 Živý odposluch so zborovým efektom je aktívny v slúchadle'
          : 'Asistent je pripravený';
      }
    }

    startVisualPulse() {
      this.stopVisualPulse();

      const pulseEl = document.getElementById('assistantPulseIndicator');
      if (!this.dafAnalyser || !pulseEl) return;

      const bufferLength = this.dafAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawPulse = () => {
        if (!this.isActive) return;

        this.dafAnalyser.getByteTimeDomainData(dataArray);

        // Vypočítaj RMS amplitúdu
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);

        // Plynulá reakcia pulzu (scale 1.0 až 1.35)
        const scale = 1.0 + Math.min(0.35, rms * 2.8);
        pulseEl.style.transform = `scale(${scale.toFixed(3)})`;

        if (rms > 0.04) {
          pulseEl.style.borderColor = 'var(--duo-green)';
          pulseEl.style.boxShadow = `0 0 ${Math.floor(rms * 45)}px rgba(46, 204, 113, 0.6)`;
        } else {
          pulseEl.style.borderColor = 'rgba(56, 189, 248, 0.3)';
          pulseEl.style.boxShadow = 'none';
        }

        this.animFrameId = requestAnimationFrame(drawPulse);
      };

      drawPulse();
    }

    stopVisualPulse() {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      const pulseEl = document.getElementById('assistantPulseIndicator');
      if (pulseEl) {
        pulseEl.style.transform = 'scale(1)';
        pulseEl.style.borderColor = '';
        pulseEl.style.boxShadow = '';
      }
    }
  }

  // Registrácia inštancie globálne
  window.dafAssistant = new DafAssistantEngine();

})(typeof window !== 'undefined' ? window : this);
