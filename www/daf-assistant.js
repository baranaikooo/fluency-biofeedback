/**
 * FLUENCY BIOFEEDBACK - LIVE DAF & FAF (FREQUENCY ALTERED FEEDBACK) ASSISTANT
 * 
 * Skutočný vedecký Real-Time Dual-Line Doppler Pitch Shifter (FAF):
 *   mediaStreamSource ──> DelayNode A (Primary DAF, napr. 70 ms)
 *                            │
 *                            ├─> DirectGain (0.75) ──────────────────────────┬─> MasterGain ──> destination
 *                            │                                               │
 *                            └─> Dual-Line Doppler Pitch Shifter (+2 poltóny) │
 *                                  ├─> DelayLine 1 (Sawtooth LFO 1) ──> Gain 1 ─┤
 *                                  └─> DelayLine 2 (Sawtooth LFO 2) ──> Gain 2 ─┘
 *                                        (180° fázový posun, sin(pi*phi) okno)
 *                                        High-pass 140 Hz ──> FafVoiceGain (0.65) ─┘
 *
 * 100% natívne Web Audio API uzly bez flangeru a comb-filteringu.
 * V uchu vzniká pravý efekt zborovej reči (Choral Speech Effect, +2 poltóny / 1.12x F0).
 */

(function (window) {
  'use strict';

  class DafAssistantEngine {
    constructor() {
      this.isActive = false;
      this.delayMs = 70;
      this.volumePercent = 85;
      this.pitchSemitones = 2;

      this.audioCtx = null;
      this.mediaStreamSource = null;
      this.delayNodeA = null;
      this.directGain = null;

      // FAF Pitch Shifter nody
      this.fafDelay1 = null;
      this.fafDelay2 = null;
      this.fafGain1 = null;
      this.fafGain2 = null;
      this.fafFilter = null;
      this.fafVoiceGain = null;
      this.lfoSource = null;
      this.lfoSplitter = null;

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

      // 3.5. FAF Zmena výšky hlasu (Pitch Shift slider -4..+4 st)
      const pitchSlider = document.getElementById('assistantPitchSlider');
      const pitchValEl = document.getElementById('assistantPitchVal');
      if (pitchSlider) {
        const handlePitchInput = () => {
          const val = parseInt(pitchSlider.value, 10);
          this.setPitch(val);
          if (pitchValEl) pitchValEl.textContent = `${val > 0 ? '+' : ''}${val} st`;
          updateRulerActive('pitchRuler', val, 0);

          const min = parseInt(pitchSlider.min || '-4', 10);
          const max = parseInt(pitchSlider.max || '4', 10);
          const pct = ((val - min) / (max - min)) * 100;
          pitchSlider.style.background = `linear-gradient(to right, var(--duo-purple) 0%, var(--duo-purple) ${pct}%, #0b132b ${pct}%, #0b132b 100%)`;
        };

        pitchSlider.addEventListener('input', handlePitchInput);
        handlePitchInput();
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

      const pitchRuler = document.getElementById('pitchRuler');
      if (pitchRuler && pitchSlider && pitchRuler.querySelectorAll) {
        const pMarks = pitchRuler.querySelectorAll('.ruler-mark');
        if (pMarks && pMarks.forEach) {
          pMarks.forEach(mark => {
            mark.addEventListener('click', () => {
              const rawVal = mark.dataset ? mark.dataset.val : (mark.getAttribute ? mark.getAttribute('data-val') : null);
              const snapVal = parseInt(rawVal, 10);
              if (!isNaN(snapVal)) {
                pitchSlider.value = snapVal;
                pitchSlider.dispatchEvent(new Event('input'));
                if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
                  duoSfx.playTone(820, 'sine', 0.04, 0.08);
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
          let stream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
            });
          } catch (_) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          window.micStream = stream;
          this.mediaStreamSource = this.audioCtx.createMediaStreamSource(stream);
          window.mediaStreamSource = this.mediaStreamSource;
        }
      }

      // 3. Zostav paralelnú Zborovú DAF + FAF vetvu:
      // Voice A (Prirodzený DAF odposluch): mediaStreamSource -> delayNodeA -> directGain -> masterGain -> destination
      // Voice B (Skutočný FAF Pitch Shifter +2 poltóny): delayNodeA -> Dual-Line Doppler Pitch Shifter -> masterGain -> destination
      if (!this.masterGain) {
        const now = this.audioCtx.currentTime;

        // Voice A: Základný oneskorený odposluch (DAF, napr. 70 ms)
        this.delayNodeA = this.audioCtx.createDelay(1.0);
        this.delayNodeA.delayTime.setValueAtTime(this.delayMs / 1000, now);

        this.directGain = this.audioCtx.createGain();
        this.directGain.gain.setValueAtTime(0.75, now);

        // Voice B: Skutočný Real-Time Dual-Line Doppler Pitch Shifter (FAF, +2 poltóny / ~1.12x F0)
        // Pripojený za delayNodeA (takže automaticky preberá nastavené DAF oneskorenie)
        const fafVoiceGain = this.buildDopplerPitchShifter(this.delayNodeA);

        // Master Gain
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.volumePercent / 100, now);

        // Analyser pre vizuálny pulz v reálnom čase
        this.dafAnalyser = this.audioCtx.createAnalyser();
        this.dafAnalyser.fftSize = 256;
        this.dafAnalyser.smoothingTimeConstant = 0.2;

        // Prepojenie Voice A (DAF)
        this.mediaStreamSource.connect(this.delayNodeA);
        this.delayNodeA.connect(this.directGain);
        this.directGain.connect(this.masterGain);

        // Prepojenie Voice B (FAF)
        fafVoiceGain.connect(this.masterGain);

        // Prepojenie na Analyser pre vizualizáciu
        this.masterGain.connect(this.dafAnalyser);
      }
    }

    buildLfoBuffer(semitones = 2) {
      const ctx = this.audioCtx;
      if (!ctx) return null;
      const sampleRate = ctx.sampleRate || 48000;
      const bufferLength = sampleRate;
      const numCycles = 8;
      const baseDelaySec = 0.003;

      const ratio = Math.pow(2, semitones / 12);
      const slope = 1 - ratio;
      const windowSec = Math.min(0.035, Math.max(0.001, Math.abs(slope) / numCycles));

      const lfoBuffer = ctx.createBuffer(4, bufferLength, sampleRate);
      const chD1 = lfoBuffer.getChannelData(0);
      const chG1 = lfoBuffer.getChannelData(1);
      const chD2 = lfoBuffer.getChannelData(2);
      const chG2 = lfoBuffer.getChannelData(3);

      for (let i = 0; i < bufferLength; i++) {
        const t = i / sampleRate;
        const phi1 = (t * numCycles) % 1.0;
        const phi2 = (phi1 + 0.5) % 1.0;

        if (slope <= 0) {
          chD1[i] = baseDelaySec + windowSec * (1.0 - phi1);
          chD2[i] = baseDelaySec + windowSec * (1.0 - phi2);
        } else {
          chD1[i] = baseDelaySec + windowSec * phi1;
          chD2[i] = baseDelaySec + windowSec * phi2;
        }

        chG1[i] = Math.sin(Math.PI * phi1);
        chG2[i] = Math.sin(Math.PI * phi2);
      }
      return lfoBuffer;
    }

    setPitch(semitones) {
      this.pitchSemitones = semitones;
      if (!this.audioCtx || !this.lfoSplitter) return;
      try {
        if (this.lfoSource) {
          try { this.lfoSource.stop(); } catch (_) {}
          this.lfoSource.disconnect();
        }
        const buf = this.buildLfoBuffer(semitones);
        this.lfoSource = this.audioCtx.createBufferSource();
        this.lfoSource.buffer = buf;
        this.lfoSource.loop = true;
        this.lfoSource.connect(this.lfoSplitter);
        this.lfoSource.start(this.audioCtx.currentTime);
      } catch (e) {
        console.warn('[FAF] setPitch error:', e);
      }
    }

    /**
     * Vedecký Dual-Line Doppler Pitch Shifter (FAF):
     * Dve modulované delay linky s fázovým posunom 180° a polsínusovým crossfade oknom.
     * Pri 15 ms okne a 8.0 Hz LFO je rýchlosť d(delay)/dt = -0.015 * 8.0 = -0.120,
     * čo zvyšuje frekvenciu o presne 1.120x (~+1.96 poltóna, pravý FAF posun o +2 poltóny).
     */
    buildDopplerPitchShifter(inputNode) {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // 1. Dve paralelné delay linky
      this.fafDelay1 = ctx.createDelay(0.1);
      this.fafDelay1.delayTime.setValueAtTime(0, now);

      this.fafDelay2 = ctx.createDelay(0.1);
      this.fafDelay2.delayTime.setValueAtTime(0, now);

      // 2. Crossfade gain linky (východzia hodnota 0, ovládané LFO)
      this.fafGain1 = ctx.createGain();
      this.fafGain1.gain.setValueAtTime(0, now);

      this.fafGain2 = ctx.createGain();
      this.fafGain2.gain.setValueAtTime(0, now);

      // 3. AudioBuffer pre presné 8.0 Hz LFO
      const lfoBuffer = this.buildLfoBuffer(this.pitchSemitones || 2);

      this.lfoSource = ctx.createBufferSource();
      this.lfoSource.buffer = lfoBuffer;
      this.lfoSource.loop = true;

      this.lfoSplitter = ctx.createChannelSplitter(4);
      this.lfoSource.connect(this.lfoSplitter);

      // Prepojenie LFO kanálov na AudioParams
      this.lfoSplitter.connect(this.fafDelay1.delayTime, 0);
      this.lfoSplitter.connect(this.fafGain1.gain, 1);
      this.lfoSplitter.connect(this.fafDelay2.delayTime, 2);
      this.lfoSplitter.connect(this.fafGain2.gain, 3);

      this.lfoSource.start(now);

      // Prepojenie signálu z primárneho oneskorenia cez obe vetvy
      inputNode.connect(this.fafDelay1);
      inputNode.connect(this.fafDelay2);

      this.fafDelay1.connect(this.fafGain1);
      this.fafDelay2.connect(this.fafGain2);

      // Filter na odstránenie sub-audible frekvencií pod 140 Hz (prevencia Dopplerovho brumu)
      this.fafFilter = ctx.createBiquadFilter();
      this.fafFilter.type = 'highpass';
      this.fafFilter.frequency.setValueAtTime(140, now);
      this.fafFilter.Q.setValueAtTime(0.7, now);

      this.fafGain1.connect(this.fafFilter);
      this.fafGain2.connect(this.fafFilter);

      // Hlasitosť druhého zborového FAF hlasu (+2 poltóny)
      this.fafVoiceGain = ctx.createGain();
      this.fafVoiceGain.gain.setValueAtTime(0.65, now);
      this.fafFilter.connect(this.fafVoiceGain);

      return this.fafVoiceGain;
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
      if (this.audioCtx && this.delayNodeA) {
        const now = this.audioCtx.currentTime;
        this.delayNodeA.delayTime.cancelScheduledValues(now);
        this.delayNodeA.delayTime.setValueAtTime(this.delayMs / 1000, now);
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
