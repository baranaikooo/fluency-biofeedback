const fs = require('fs');
const html = fs.readFileSync('C:/Users/HP/Downloads/stutter/stutter_biofeedback_antigravity/index.html', 'utf8');

const requiredIds = [
  'startBtn', 'pacerCircle', 'wordInput', 'headphoneLiveIndicator', 'headphoneStatusText',
  'micStatus', 'vrtValue', 'envelopeCanvas', 'rmsCanvas', 'calibrationModal',
  'm1', 'm2', 'm3', 'm4', 'm5', 'targetWord', 'targetMeta', 'cameraFeed',
  'callOverlay', 'callerName', 'answerCallBtn', 'declineCallBtn', 'feedbackDrawer',
  'drawerContinueBtn', 'assistantToggle', 'assistantDelaySlider', 'assistantPitchSlider',
  'assistantVolSlider', 'assistantDelayVal', 'assistantVolVal', 'assistantPitchVal',
  'worldsWrapper', 'celebrationModal', 'xpVal', 'streakVal', 'heartsVal', 'rankTitle',
  'openAuthModalFromTelemetryBtn', 'authLoggedOutView', 'authLoggedInView',
  'authEmailInput', 'authPasswordInput', 'btnEmailLogin', 'btnMagicLink',
  'btnGoogleLogin', 'authFeedbackMsg', 'figmaQuestionnaireModal', 'welcomeAuthOverlay',
  'welcomeBtnGoogle', 'welcomeSubmitBtn', 'welcomeGuestBtn', 'welcomeNameInput',
  'welcomeEmailInput', 'welcomePasswordInput', 'welcomeAuthFeedback', 'launchSosDrillBtn',
  'tabCesta', 'tabDril', 'tabAsistent', 'tabTelemetria', 'navTabCesta', 'navTabDril',
  'navTabAsistent', 'navTabTelemetria'
];

const missing = [];
for (const id of requiredIds) {
  if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")) {
    missing.push(id);
  }
}

if (missing.length === 0) {
  console.log('SUCCESS: All ' + requiredIds.length + ' critical IDs are 100% present in index.html!');
} else {
  console.error('MISSING IDs:', missing);
  process.exit(1);
}
