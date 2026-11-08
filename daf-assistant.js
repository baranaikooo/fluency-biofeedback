/**
 * FLUENCY BIOFEEDBACK - LIVE DAF ASSISTANT ENGINE
 * Paralelná vetva Web Audio API: mediaStreamSource -> DelayNode -> GainNode -> destination
 * Neovplyvňuje 5-bodový DSP audit.
 * Rozsah delay: 40 ms až 140 ms (default 70 ms)
 * Rozsah hlasitosti: 0 % až 100 % (default 85 %)
 */

(function (window) {
  'use strict';

  // ========================================================================
  // WEBAUDIO REAL-TIME PITCH SHIFTER PRE FAF (FREQUENCY ALTERED FEEDBACK)
  // Cross-faded dual modulated delay algorithm s nulovým oneskorením pri 0 st
  // ========================================================================
  class WebAudioPitchShifter {
    constructor(audioCtx, bufferTime = 0.08) {
      this.audioCtx = audioCtx;
      this.bufferTime = bufferTime;
      this.semitones = 0;

      this.input = audioCtx.createGain();
      this.output = audioCtx.createGain();
      this.bypassGain = audioCtx.createGain();
      this.pitchGain = audioCtx.createGain();

      this.input.connect(this.bypassGain);
      this.bypassGain.connect(this.output);
      this.bypassGain.gain.setValueAtTime(1, audioCtx.currentTime);
      this.pitchGain.gain.setValueAtTime(0, audioCtx.currentTime);

      this.initShifterNodes();
    }

    initShifterNodes() {
      const ctx = this.audioCtx;
      const sampleRate = ctx.sampleRate || 44100;
      const bufferSize = Math.max(1024, Math.floor(sampleRate * this.bufferTime));

      this.delayA = ctx.createDelay(1.0);
      this.delayB = ctx.createDelay(1.0);
      this.gainA = ctx.createGain();
      this.gainB = ctx.createGain();

      // Sawtooth rampa
      const rampBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const rampData = rampBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        rampData[i] = i / bufferSize;
      }

      // Hanning envelope pre plynulý cross-fade bez klikov
      const envBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const envData = envBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const x = i / bufferSize;
        envData[i] = 0.5 * (1 - Math.cos(2 * Math.PI * x));
      }

      this.rampSourceA = ctx.createBufferSource();
      this.rampSourceA.buffer = rampBuffer;
      this.rampSourceA.loop = true;

      this.rampSourceB = ctx.createBufferSource();
      this.rampSourceB.buffer = rampBuffer;
      this.rampSourceB.loop = true;

      this.modGainA = ctx.createGain();
      this.modGainB = ctx.createGain();

      this.rampSourceA.connect(this.modGainA);
      this.modGainA.connect(this.delayA.delayTime);

      this.rampSourceB.connect(this.modGainB);
      this.modGainB.connect(this.delayB.delayTime);

      this.envSourceA = ctx.createBufferSource();
      this.envSourceA.buffer = envBuffer;
      this.envSourceA.loop = true;

      this.envSourceB = ctx.createBufferSource();
      this.envSourceB.buffer = envBuffer;
      this.envSourceB.loop = true;

      this.envSourceA.connect(this.gainA.gain);
      this.envSourceB.connect(this.gainB.gain);

      this.input.connect(this.delayA);
      this.input.connect(this.delayB);

      this.delayA.connect(this.gainA);
      this.delayB.connect(this.gainB);

      this.gainA.connect(this.pitchGain);
      this.gainB.connect(this.pitchGain);
      this.pitchGain.connect(this.output);

      const now = ctx.currentTime;
      const halfPeriod = this.bufferTime / 2;
      this.rampSourceA.start(now);
      this.envSourceA.start(now);
      this.rampSourceB.start(now + halfPeriod);
      this.envSourceB.start(now + halfPeriod);

      this.setSemitones(0);
    }

    setSemitones(semitones) {
      this.semitones = semitones;
      const now = this.audioCtx.currentTime;

      if (semitones === 0) {
        // Čistý bypass pre 100% prirodzený DAF
        this.bypassGain.gain.setValueAtTime(1, now);
        this.pitchGain.gain.setValueAtTime(0, now);
        return;
      }

      this.bypassGain.gain.setValueAtTime(0, now);
      this.pitchGain.gain.setValueAtTime(1, now);

      const ratio = Math.pow(2, semitones / 12);
      const modDepth = (1 - ratio) * this.bufferTime;

      if (modDepth >= 0) {
        this.delayA.delayTime.setValueAtTime(0, now);
        this.delayB.delayTime.setValueAtTime(0, now);
        this.modGainA.gain.setValueAtTime(modDepth, now);
        this.modGainB.gain.setValueAtTime(modDepth, now);
      } else {
        this.delayA.delayTime.setValueAtTime(-modDepth, now);
        this.delayB.delayTime.setValueAtTime(-modDepth, now);
        this.modGainA.gain.setValueAtTime(modDepth, now);
        this.modGainB.gain.setValueAtTime(modDepth, now);
      }
    }
  }

  class DafAssistantEngine {
    constructor() {
      this.isActive = false;
      this.delayMs = 70;
      this.volumePercent = 85;
      this.fafSemitones = 2; // Automatické jemné zvýšenie tónu (+2 st) pre zborový efekt

      this.audioCtx = null;
      this.mediaStreamSource = null;
      this.delayNode = null;
      this.pitchShifter = null;
      this.gainNode = null;
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
        const marks = ruler.querySelectorAll ? ruler.querySelectorAll('.ruler-mark') : (document.querySelectorAll ? document.querySelectorAll(`#${rulerId} .ruler-mark`) : []);
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
        handleDelayInput(); // Počiatočné nastavenie
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
        handleVolInput(); // Počiatočné nastavenie
      }

      // 4. Klikateľné značky stupnice (Ruler click-to-snap)
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

      // 2. Získaj mediaStreamSource
      if (window.mediaStreamSource) {
        this.mediaStreamSource = window.mediaStreamSource;
      } else {
        // Inicializuj mikrofón cez setupAudio alebo priamo
        if (typeof window.setupAudio === 'function') {
          await window.setupAudio();
          this.mediaStreamSource = window.mediaStreamSource;
          this.audioCtx = window.audioCtx;
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, latency: 0 }
          });
          window.micStream = stream;
          this.mediaStreamSource = this.audioCtx.createMediaStreamSource(stream);
          window.mediaStreamSource = this.mediaStreamSource;
        }
      }

      // 3. Zostav paralelnú DAF + FAF vetvu:
      // mediaStreamSource -> DelayNode -> PitchShifter -> GainNode -> destination
      if (!this.delayNode) {
        this.delayNode = this.audioCtx.createDelay(1.0);
        this.delayNode.delayTime.setValueAtTime(this.delayMs / 1000, this.audioCtx.currentTime);

        this.pitchShifter = new WebAudioPitchShifter(this.audioCtx, 0.07);
        this.pitchShifter.setSemitones(this.fafSemitones);

        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.setValueAtTime(this.volumePercent / 100, this.audioCtx.currentTime);

        // Analyser pre vizuálny pulz v reálnom čase
        this.dafAnalyser = this.audioCtx.createAnalyser();
        this.dafAnalyser.fftSize = 256;
        this.dafAnalyser.smoothingTimeConstant = 0.2;

        this.mediaStreamSource.connect(this.delayNode);
        this.delayNode.connect(this.pitchShifter.input);
        this.pitchShifter.output.connect(this.gainNode);
        this.gainNode.connect(this.dafAnalyser);
      }
    }

    async start() {
      try {
        await this.ensureAudioPipeline();

        // Pripoj do slúchadiel (audioCtx.destination)
        if (this.gainNode && this.audioCtx) {
          this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
          this.gainNode.gain.setValueAtTime(this.volumePercent / 100, this.audioCtx.currentTime);
          this.gainNode.connect(this.audioCtx.destination);
        }

        this.isActive = true;
        this.updateUiState(true);
        this.startVisualPulse();

        // Jemný zvuk potvrdenia zapnutia
        if (typeof duoSfx !== 'undefined' && duoSfx.playTone) {
          duoSfx.playTone(880, 'sine', 0.08, 0.1);
        }
      } catch (err) {
        console.error('DAF Assistant activation error:', err);
        alert('Nepodarilo sa získať prístup k mikrofónu. Skontroluj povolenia v prehliadači.');
        this.updateUiState(false);
      }
    }

    stop() {
      this.isActive = false;

      // Plynulé stlmenie a odpojenie z reproduktora
      if (this.gainNode && this.audioCtx) {
        try {
          this.gainNode.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
          this.gainNode.disconnect(this.audioCtx.destination);
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
      if (this.delayNode && this.audioCtx) {
        this.delayNode.delayTime.cancelScheduledValues(this.audioCtx.currentTime);
        this.delayNode.delayTime.setValueAtTime(this.delayMs / 1000, this.audioCtx.currentTime);
      }
    }

    setVolume(percent) {
      this.volumePercent = Math.max(0, Math.min(100, percent));
      if (this.gainNode && this.audioCtx && this.isActive) {
        this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.gainNode.gain.setValueAtTime(this.volumePercent / 100, this.audioCtx.currentTime);
      }
    }

    setFaf(semitones) {
      this.fafSemitones = semitones;
      if (this.pitchShifter) {
        this.pitchShifter.setSemitones(semitones);
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
          ? '🎧 Zvuk prechádza s oneskorením do slúchadla'
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

        // Moduluj mierku a tieň podľa reálneho hlasu
        const scaleVal = 1 + Math.min(0.45, rms * 1.8);
        const glowPx = Math.min(45, 12 + rms * 80);

        pulseEl.style.transform = `scale(${scaleVal})`;
        pulseEl.style.boxShadow = `0 0 ${glowPx}px rgba(88, 204, 2, ${0.35 + Math.min(0.55, rms * 2)})`;

        this.animFrameId = requestAnimationFrame(drawPulse);
      };

      this.animFrameId = requestAnimationFrame(drawPulse);
    }

    stopVisualPulse() {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      const pulseEl = document.getElementById('assistantPulseIndicator');
      if (pulseEl) {
        pulseEl.style.transform = 'scale(1)';
        pulseEl.style.boxShadow = '';
      }
    }
  }

  // Globálna inštancia DAF Asistenta
  const dafAssistant = new DafAssistantEngine();
  window.DafAssistantEngine = DafAssistantEngine;
  window.dafAssistant = dafAssistant;

})(typeof window !== 'undefined' ? window : global);
