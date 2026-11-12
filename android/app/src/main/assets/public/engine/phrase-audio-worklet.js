class GlidePhraseRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = new Float32Array(2048);
    this.used = 0;
    this.done = false;
    this.port.onmessage = () => {
      this.done = true;
      this.flush();
      this.port.postMessage(null);
    };
  }

  flush() {
    if (!this.used) return;
    const data = this.pending.slice(0, this.used);
    this.port.postMessage(data, [data.buffer]);
    this.used = 0;
  }

  process(inputs) {
    if (this.done) return false;
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (const sample of channel) {
      this.pending[this.used++] = sample;
      if (this.used === this.pending.length) this.flush();
    }
    return true;
  }
}
registerProcessor("glide-phrase-recorder", GlidePhraseRecorder);
