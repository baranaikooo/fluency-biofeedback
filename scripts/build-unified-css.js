const fs = require('fs');
const path = require('path');

const rootDir = 'C:/Users/HP/Downloads/stutter/stutter_biofeedback_antigravity';
const srcIndexCssPath = path.join(rootDir, 'extracted_dizajn', 'src', 'index.css');

if (!fs.existsSync(srcIndexCssPath)) {
  console.error('Source index.css not found at', srcIndexCssPath);
  process.exit(1);
}

let figmaCss = fs.readFileSync(srcIndexCssPath, 'utf8');

// 1. Remove @import "tailwindcss";
figmaCss = figmaCss.replace(/@import\s+['"]tailwindcss['"];?\s*/g, '');

// 2. Unwrap @layer base { ... }
const layerBaseIdx = figmaCss.indexOf('@layer base {');
if (layerBaseIdx !== -1) {
  const afterLayer = figmaCss.slice(layerBaseIdx + '@layer base {'.length);
  const appShellIdx = afterLayer.indexOf('.app-shell {');
  if (appShellIdx !== -1) {
    const layerContent = afterLayer.slice(0, appShellIdx);
    const lastBrace = layerContent.lastIndexOf('}');
    if (lastBrace !== -1) {
      const unwrapped = layerContent.slice(0, lastBrace) + afterLayer.slice(appShellIdx);
      figmaCss = figmaCss.slice(0, layerBaseIdx) + unwrapped;
    }
  }
}

// 3. Glide Biofeedback Functional Extensions (matching Figma Vela design tokens)
const functionalAdditions = `
/* ==========================================================================
   GLIDE FUNCTIONAL ENGINE EXTENSIONS (Pure CSS matching Figma Vela Palette)
   ========================================================================== */

/* Universal Reset & Form Controls */
*, *::before, *::after {
  box-sizing: border-box;
}

button, a {
  cursor: pointer;
  font-family: inherit;
}

input, select, textarea {
  font-family: var(--font-sans);
}

/* Tab Switching */
.tab-pane {
  display: none !important;
}
.tab-pane.active {
  display: block !important;
  animation: fadeIn 200ms ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Modals Overlay (Rock-Solid Fullscreen Backdrop) */
.modal-backdrop-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10000 !important;
  background: rgba(37, 35, 65, 0.76) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}

/* Auth Modal Card (Figma Login Card adaptation) */
.auth-modal-card {
  width: 100%;
  max-width: 480px;
  background: var(--paper) !important;
  border: 1px solid var(--line) !important;
  border-radius: var(--radius-xl) !important;
  padding: 36px 30px !important;
  box-shadow: 0 24px 64px rgba(37, 35, 65, 0.22) !important;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
  color: var(--ink) !important;
}

.auth-modal-hero {
  text-align: center;
  margin-bottom: 24px;
}

.auth-overline {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--purple);
  text-transform: uppercase;
  display: block;
  margin-bottom: 6px;
}

.auth-modal-title {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
  margin-bottom: 8px;
}

.auth-modal-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
}

/* Social Google Button */
.social-login-btn.google,
.google-button {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: white;
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: all 180ms ease;
  padding: 10px 16px;
}

.social-login-btn.google:hover,
.google-button:hover {
  background: #fbfaff;
  border-color: #d1cbe5;
  box-shadow: 0 4px 12px rgba(109, 91, 208, 0.12);
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.auth-divider::before,
.auth-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}

.auth-field-group {
  margin-bottom: 14px;
}

.auth-field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink);
}

.auth-input {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: white;
  padding: 0 14px;
  color: var(--ink);
  font-size: 14px;
  transition: border-color 160ms ease;
}

.auth-input:focus {
  outline: none;
  border-color: var(--purple);
  box-shadow: 0 0 0 3px rgba(109, 91, 208, 0.18);
}

.btn-primary.full,
.btn-3d.green.full,
.focus-cta-btn {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  border-radius: 12px;
  background: var(--purple);
  color: white;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(109, 91, 208, 0.28);
  transition: all 180ms ease;
  padding: 12px 20px;
}

.btn-primary.full:hover,
.btn-3d.green.full:hover,
.focus-cta-btn:hover {
  background: var(--purple-dark);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(109, 91, 208, 0.35);
}

.guest-bypass-btn {
  width: 100%;
  min-height: 42px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  margin-top: 14px;
  text-align: center;
  transition: color 160ms ease;
}

.guest-bypass-btn:hover {
  color: var(--purple-dark);
  text-decoration: underline;
}

/* Questionnaire Modal */
.questionnaire-modal-card {
  width: 100%;
  max-width: 820px;
  background: var(--paper) !important;
  border: 1px solid var(--line) !important;
  border-radius: var(--radius-xl) !important;
  padding: 38px 36px 32px !important;
  box-shadow: 0 28px 72px rgba(37, 35, 65, 0.26) !important;
  max-height: 90vh;
  overflow-y: auto;
  color: var(--ink) !important;
}

/* 5 Worlds Gamification Curriculum */
.worlds-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 20px;
}

.world-header-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(227, 222, 253, 0.6) 0%, rgba(255, 254, 253, 0.9) 100%);
  border: 1px solid var(--line);
  padding: 22px 24px;
  margin-bottom: 12px;
}

.world-banner-tag {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--purple);
  text-transform: uppercase;
}

.world-banner-title {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 600;
  color: var(--ink);
  margin: 4px 0 2px;
}

.world-banner-sub {
  font-size: 13px;
  color: var(--muted);
}

.world-banner-icon {
  font-size: 32px;
}

.duo-world-card {
  border: 1px solid var(--line);
  border-radius: 20px;
  background: rgba(255, 254, 253, 0.76);
  padding: 24px 20px;
  margin-bottom: 24px;
}

.duo-node {
  display: flex;
  justify-content: center;
  position: relative;
  margin: 22px 0;
}

.path-node-btn {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 4px solid var(--line);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--muted);
  box-shadow: 0 4px 12px rgba(37, 35, 65, 0.08);
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.path-node-btn.unlocked {
  border-color: var(--purple);
  background: #fbf9ff;
  color: var(--purple);
  box-shadow: 0 6px 18px rgba(109, 91, 208, 0.22);
}

.path-node-btn.current {
  border-color: var(--purple-dark);
  background: var(--purple);
  color: white;
  transform: scale(1.12);
  box-shadow: 0 8px 24px rgba(109, 91, 208, 0.42);
}

.path-node-btn.current::after {
  content: "";
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px dashed var(--purple);
  animation: spinSlow 12s linear infinite;
}

@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.node-current-beacon {
  position: absolute;
  top: -26px;
  background: var(--purple-dark);
  color: white;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.node-stars-badge {
  position: absolute;
  bottom: -18px;
  font-size: 11px;
  color: #f59e0b;
}

/* Node Popover Backdrop & Card */
.node-popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(37, 35, 65, 0.4);
  backdrop-filter: blur(4px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.node-popover-card {
  width: 100%;
  max-width: 360px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 26px 24px 22px;
  box-shadow: 0 20px 50px rgba(37, 35, 65, 0.2);
  text-align: center;
  position: relative;
}

.popover-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--muted);
}

.popover-world-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--purple);
  text-transform: uppercase;
}

.popover-title {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  margin: 6px 0 8px;
}

.popover-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
  margin-bottom: 16px;
}

.popover-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 18px;
  font-size: 12px;
  font-weight: 600;
}

.popover-xp {
  color: var(--purple);
}

.popover-count {
  color: var(--muted);
}

/* Fullscreen Lesson Screen (#lessonScreen) */
.lesson-screen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  background: var(--cream) !important;
  display: none;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px 24px calc(24px + env(safe-area-inset-bottom));
}

.lesson-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 720px;
  width: 100%;
  margin: 0 auto 24px;
}

.lesson-exit-btn {
  background: transparent;
  border: none;
  font-size: 22px;
  color: var(--muted);
  padding: 6px;
}

.lesson-progress-track {
  flex: 1;
  height: 10px;
  background: #e7e3dc;
  border-radius: 999px;
  overflow: hidden;
}

.lesson-progress-fill {
  height: 100%;
  background: var(--purple);
  border-radius: 999px;
  transition: width 300ms ease;
}

.lesson-hearts {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  color: var(--coral);
}

.lesson-stage {
  max-width: 600px;
  width: 100%;
  margin: auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.headphone-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 22px;
  transition: all 180ms ease;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--purple-dark);
}

.headphone-live-badge.off {
  background: #f0ece3;
  color: var(--muted);
  border-color: #dfdbd2;
}

.target-word-container {
  margin-bottom: 24px;
}

.target-word {
  font-family: var(--font-serif);
  font-size: 52px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -1px;
  line-height: 1.1;
  margin-bottom: 6px;
}

.target-meta {
  font-size: 13px;
  color: var(--muted);
}

/* Zen Pacer Circle */
.pacer-wrapper {
  margin: 16px 0 24px;
  display: flex;
  justify-content: center;
}

.pacer-circle {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, #f4f0ff 0%, #e9e3fd 100%);
  border: 4px solid var(--purple);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 36px rgba(109, 91, 208, 0.22);
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease;
}

.pacer-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--purple-dark);
}

.status-alert {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 20px;
  min-height: 20px;
}

.lesson-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  width: 100%;
  max-width: 380px;
  margin-bottom: 16px;
}

.lesson-controls button {
  flex: 1;
}

/* Feedback Drawer (Sheet from bottom) */
.feedback-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--paper);
  border-top: 1px solid var(--line);
  box-shadow: 0 -12px 40px rgba(37, 35, 65, 0.15);
  padding: 24px 28px calc(24px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 250ms cubic-bezier(0.2, 0.9, 0.3, 1);
  z-index: 10001;
}

.feedback-drawer.active {
  transform: translateY(0);
}

.drawer-inner {
  max-width: 600px;
  margin: 0 auto;
}

.drawer-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.drawer-status-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e6f9f0;
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
}

.drawer-headline {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
}

.drawer-subtext {
  font-size: 12px;
  color: var(--muted);
}

.drawer-xp-badge {
  margin-left: auto;
  font-weight: 700;
  font-size: 14px;
  color: var(--purple);
}

.canvas-wrap {
  background: #19142b;
  border-radius: 12px;
  padding: 12px;
  margin: 14px 0;
}

.canvas-wrap canvas {
  width: 100%;
  height: 80px;
  display: block;
}

.canvas-label {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #a49fc0;
  margin-bottom: 6px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 12px 0 18px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f7f5ef;
  border-radius: 8px;
  font-size: 11px;
}

.metric-title {
  color: var(--muted);
}

.metric-val {
  font-weight: 700;
  color: var(--ink);
}

/* Assistant Sliders & Rulers */
.assistant-container,
.sandbox-container,
.telemetry-container {
  max-width: 820px;
  margin: 0 auto;
  padding-bottom: 60px;
}

.assistant-hero-card,
.sandbox-hero-card,
.telemetry-hero-card {
  border: 1px solid var(--line);
  border-radius: 20px;
  background: rgba(255, 254, 253, 0.76);
  padding: 26px 24px;
  margin-bottom: 20px;
}

.assistant-badge,
.sandbox-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--purple);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.assistant-title,
.sandbox-title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 8px;
}

.assistant-sub,
.sandbox-sub {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}

.assistant-controls-card,
.sandbox-input-card,
.sandbox-mode-card,
.telemetry-card {
  border: 1px solid var(--line);
  border-radius: 20px;
  background: rgba(255, 254, 253, 0.76);
  padding: 24px;
  margin-bottom: 20px;
}

.control-row-group {
  margin-bottom: 26px;
}

.control-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.control-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.control-val-badge {
  background: #ebe7fb;
  color: var(--purple-dark);
  font-weight: 700;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
}

.assistant-slider {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e2ded7;
  outline: none;
  -webkit-appearance: none;
}

.assistant-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--purple);
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(109, 91, 208, 0.4);
  cursor: pointer;
}

.slider-ruler {
  display: flex;
  justify-content: space-between;
  position: relative;
  height: 22px;
  margin-top: 6px;
}

.ruler-mark {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ruler-tick {
  width: 1px;
  height: 6px;
  background: #cfc9be;
}

.ruler-label {
  font-size: 10px;
  color: var(--muted);
  margin-top: 3px;
  white-space: nowrap;
}

.ruler-label.sweet {
  color: var(--purple-dark);
  font-weight: 700;
}

/* 3D button utility classes */
.btn-3d {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  background: white;
  color: var(--ink);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 160ms ease;
}

.btn-3d:hover {
  background: #fcfbfe;
  border-color: #d1cbe5;
}

.btn-3d.green {
  background: var(--purple);
  border-color: var(--purple);
  color: white;
}

.btn-3d.green:hover {
  background: var(--purple-dark);
}

.btn-3d.amber {
  background: #fff8eb;
  border-color: #fbd38d;
  color: #b7791f;
}

.btn-3d.blue {
  background: #ebf8ff;
  border-color: #bee3f8;
  color: #2b6cb0;
}

.btn-3d.sm {
  padding: 6px 12px;
  font-size: 11px;
}

.btn-3d.lg {
  padding: 14px 24px;
  font-size: 15px;
}

.btn-3d.full {
  width: 100%;
}

/* Preset Chips & Filter Pills */
.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.preset-chips .chip {
  background: #f2efe9;
  border: 1px solid var(--line);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 160ms ease;
}

.preset-chips .chip:hover {
  background: #ebe7fb;
  border-color: var(--purple);
  color: var(--purple-dark);
}

/* VRT Gauge Bar in Telemetry */
.vrt-gauge-box {
  margin: 18px 0;
  text-align: center;
}

.vrt-big-number {
  font-family: var(--font-serif);
  font-size: 44px;
  font-weight: 600;
  color: var(--ink);
}

.vrt-unit {
  font-size: 16px;
  font-family: var(--font-sans);
  color: var(--muted);
  margin-left: 4px;
}

.vrt-scale-bar {
  display: flex;
  height: 24px;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 12px;
  font-size: 10px;
  font-weight: 700;
  color: white;
}

.vrt-zone.hard {
  flex: 45;
  background: #f87171;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vrt-zone.sweet {
  flex: 95;
  background: #34d399;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vrt-zone.breathy {
  flex: 100;
  background: #fbbf24;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Science Modal */
.science-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(37, 35, 65, 0.72);
  backdrop-filter: blur(10px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.science-modal-card {
  width: 100%;
  max-width: 800px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 32px 28px;
  max-height: 88vh;
  overflow-y: auto;
}

.science-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.science-close-btn {
  background: transparent;
  border: none;
  font-size: 22px;
  color: var(--muted);
}
`;

const unifiedCss = figmaCss + '\n' + functionalAdditions;

const targetStyleCssPath = path.join(rootDir, 'style.css');
fs.writeFileSync(targetStyleCssPath, unifiedCss, 'utf8');

console.log('Successfully written unified style.css, size:', fs.statSync(targetStyleCssPath).size);

// Bracket balance verification
const openCount = (unifiedCss.match(/\{/g) || []).length;
const closeCount = (unifiedCss.match(/\}/g) || []).length;
console.log(`Bracket Balance: { = ${openCount}, } = ${closeCount}`);
if (openCount !== closeCount) {
  console.error('WARNING: Bracket mismatch detected!');
  process.exit(1);
} else {
  console.log('PERFECT! Bracket balance is 100% matched.');
}
