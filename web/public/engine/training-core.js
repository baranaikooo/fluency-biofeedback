/* Product policy inspired by clinical goals; NOT a validated diagnostic model.
 * Exact thresholds and rewards below are engineering parameters, not literature cutoffs.
 * Evidence/limitations are documented in TRAINING-CORE.md. No data is uploaded here.
 */
(function (root) {
  'use strict';
  const VERSION = 'communication-1';
  const PARAMETERS = Object.freeze({attemptXp:30,wordVoiceMs:40,replyVoiceMs:200});
  function capture(signal) {
    if (signal.clipped) return {accepted:false,reason:'clipping'};
    const numeric = ['firstSound','nucleus','peakDb','minimumDb','voicedMs'];
    if (!numeric.every(k => Number.isFinite(signal[k]))) return {accepted:false,reason:'invalid_signal'};
    const enough = signal.firstSound >= 0 && signal.nucleus >= 0 && signal.peakDb >= signal.minimumDb && signal.voicedMs >= (signal.freeReply ? PARAMETERS.replyVoiceMs : PARAMETERS.wordVoiceMs);
    return {accepted:enough,reason:enough?'captured':'silent_block'};
  }
  function reward(attempt) {
    return attempt.accepted || attempt.selfConfirmed ? PARAMETERS.attemptXp : 0;
  }
  function conditions(preferences = {}) {
    return Object.freeze({pressure:preferences.pressure === true,surprise:preferences.surprise === true,technique:['onset','pace'].includes(preferences.technique)?preferences.technique:'none'});
  }
  function voiceVariant(variants,lastSpeaker,random = Math.random) {
    if (!Array.isArray(variants) || !variants.length) return null;
    const valid = variants.filter(v => v && typeof v.url === 'string' && typeof v.speaker === 'string');
    const others = valid.filter(v => v.speaker !== lastSpeaker);
    const choices = others.length ? others : valid;
    if (!choices.length) return null;
    const draw=random();
    const index=Number.isFinite(draw)?Math.min(choices.length-1,Math.max(0,Math.floor(draw*choices.length))):0;
    return choices[index];
  }
  const core=Object.freeze({version:VERSION,parameters:PARAMETERS,capture,reward,conditions,voiceVariant});
  if (typeof module !== 'undefined' && module.exports) module.exports=core;
  else root.GlideTrainingCore=core;
})(typeof window !== 'undefined' ? window : globalThis);
