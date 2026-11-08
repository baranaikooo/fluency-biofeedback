/**
 * FLUENCY BIOFEEDBACK - LIVE DAF SPEECHEASY ASSISTANT ENGINE
 * Paralelná vetva Web Audio API: mediaStreamSource -> DelayNode -> GainNode -> destination
 * Neovplyvňuje 5-bodový DSP audit.
 * Rozsah delay: 40 ms až 140 ms (default 70 ms)
 * Rozsah hlasitosti: 0 % až 100 % (default 85 %)
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
      this.delayNode = null;
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

      // 1. Master Switch (Aktivácia / Deaktivácia)
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          this.toggle();
        });
      }

      // 2. Rýchlosť odozvy (Delay slider 40-140 ms)
      if (delaySlider) {
        delaySlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.setDelay(val);
          if (delayValEl) delayValEl.textContent = `${val} ms`;
        });
      }

      // 3. Hlasitosť v uchu (Volume slider 0-100 %)
      if (volSlider) {
        volSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.setVolume(val);
          if (volValEl) volValEl.textContent = `${val} %`;
        });
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

      // 3. Zostav paralelnú DAF vetvu: mediaStreamSource -> DelayNode -> GainNode -> destination
      if (!this.delayNode) {
        this.delayNode = this.audioCtx.createDelay(1.0);
        this.delayNode.delayTime.setValueAtTime(this.delayMs / 1000, this.audioCtx.currentTime);

        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.setValueAtTime(this.volumePercent / 100, this.audioCtx.currentTime);

        // Analyser pre vizuálny pulz v reálnom čase
        this.dafAnalyser = this.audioCtx.createAnalyser();
        this.dafAnalyser.fftSize = 256;
        this.dafAnalyser.smoothingTimeConstant = 0.2;

        this.mediaStreamSource.connect(this.delayNode);
        this.delayNode.connect(this.gainNode);
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
