(function (root) {
  const fillers = new Set(["eh", "ehm", "hm", "hmm", "um", "uh"]);
  function words(text) {
    return (
      String(text || "")
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLocaleLowerCase("sk")
        .match(/[\p{L}\p{N}]+/gu) || []
    );
  }

  const numeralWords = new Map([
    ["nula", "0"],
    ["jeden", "1"],
    ["jedna", "1"],
    ["jedno", "1"],
    ["dva", "2"],
    ["dve", "2"],
    ["tri", "3"],
    ["styri", "4"],
    ["pat", "5"],
    ["sest", "6"],
    ["sedem", "7"],
    ["osem", "8"],
    ["devat", "9"],
    ["desat", "10"],
  ]);

  function sameWord(actual, expected) {
    return (
      actual === expected ||
      numeralWords.get(actual) === expected ||
      numeralWords.get(expected) === actual
    );
  }

  function matches(expected, transcript) {
    const target = words(expected);
    const spoken = words(transcript);
    if (!target.length) return false;
    for (let start = 0; start < spoken.length; start++) {
      if (!sameWord(spoken[start], target[0])) continue;
      let next = 1;
      for (let i = start + 1; next < target.length && i < spoken.length; i++) {
        if (sameWord(spoken[i], target[next])) next++;
        else if (
          !sameWord(spoken[i], target[next - 1]) &&
          !fillers.has(spoken[i]) &&
          !target[next].startsWith(spoken[i])
        )
          break;
      }
      if (next === target.length) return true;
    }
    return false;
  }

  const prepared = new WeakMap();
  function native() {
    return root.Capacitor?.isPluginAvailable?.("GlideSpeech")
      ? root.Capacitor.Plugins.GlideSpeech
      : null;
  }

  async function prepare(context) {
    if (!native() || !context?.audioWorklet) return false;
    if (!prepared.has(context)) {
      prepared.set(
        context,
        context.audioWorklet.addModule("/engine/phrase-audio-worklet.js").then(
          () => true,
          () => false,
        ),
      );
    }
    return prepared.get(context);
  }

  function capture(context, source) {
    const plugin = native();
    if (!plugin || !context || !source || !prepared.has(context)) return null;
    let node;
    try {
      node = new AudioWorkletNode(context, "glide-phrase-recorder", { outputChannelCount: [1] });
    } catch {
      return null;
    }
    // The processor outputs silence. Connecting it keeps the audio graph running.
    source.connect(node);
    node.connect(context.destination);
    const chunks = [];
    const capacity = Math.floor(context.sampleRate * 30);
    let samples = 0;
    let resolveDrain;
    let draining;
    let timer;
    let stopped = false;
    let cancelled = false;
    let transcribing = false;
    function disconnect() {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      try {
        source.disconnect(node);
      } catch {
        /* The audio graph may already be closed. */
      }
      node.disconnect();
      node.port.close();
      resolveDrain?.();
    }
    node.port.onmessage = ({ data }) => {
      if (data === null) {
        disconnect();
      } else if (!stopped && samples < capacity) {
        const chunk = data.subarray(0, capacity - samples);
        chunks.push(chunk);
        samples += chunk.length;
      }
    };
    return {
      cancel() {
        cancelled = true;
        disconnect();
        chunks.length = 0;
        if (transcribing) plugin.cancel().catch(() => {});
      },
      async finish() {
        if (cancelled) return "";
        draining ??= new Promise((resolve) => {
          resolveDrain = resolve;
          timer = setTimeout(disconnect, 350);
          node.port.postMessage("finish");
        });
        await draining;
        if (cancelled || !samples) return "";
        const pcm = encodePcm(chunks, samples, context.sampleRate);
        chunks.length = 0;
        transcribing = true;
        try {
          const result = await plugin.transcribe({ pcm });
          return cancelled ? "" : result.text || "";
        } catch {
          return "";
        } finally {
          transcribing = false;
        }
      },
    };
  }

  function encodePcm(chunks, count, rate) {
    const bytes = new Uint8Array(Math.floor((count * 16000) / rate) * 2);
    const output = new DataView(bytes.buffer);
    let index = 0;
    let seen = 0;
    let sum = 0;
    let windowSize = 0;
    for (const chunk of chunks) {
      for (const sample of chunk) {
        sum += sample;
        windowSize++;
        seen++;
        if (index < bytes.length / 2 && seen * 16000 >= (index + 1) * rate) {
          const value = Math.max(-1, Math.min(1, sum / windowSize));
          output.setInt16(index++ * 2, Math.round(value * 32767), true);
          sum = 0;
          windowSize = 0;
        }
      }
    }
    let raw = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(raw);
  }

  root.GlidePhrase = { matches, prepare, capture };
})(window);
