// Procedural WebAudio sound: every effect is synthesized, no audio files.
// The context is created lazily on the first user gesture (browsers block
// audio before one) and every call is guarded so a headless run never
// throws. M toggles mute.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.musicOn = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  _tone(freq, dur, type = 'sine', vol = 0.2, slideTo = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo > 0) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  }

  _noise(dur, vol = 0.2, freq = 1200, delay = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t0);
    } catch {
      // Ignore.
    }
  }

  shoot() { this._tone(720 + Math.random() * 120, 0.07, 'square', 0.06, 240); }
  hit() { this._tone(190, 0.05, 'triangle', 0.1, 120); }
  die() { this._noise(0.16, 0.16, 900); this._tone(320, 0.14, 'sawtooth', 0.08, 60); }
  hurt() { this._tone(140, 0.22, 'sawtooth', 0.2, 55); this._noise(0.12, 0.12, 500); }
  pickup() { this._tone(880, 0.07, 'sine', 0.1, 1320); }
  heart() { this._tone(520, 0.12, 'sine', 0.14, 780); this._tone(780, 0.14, 'sine', 0.12, 1040, 0.09); }
  levelup() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.16, 'triangle', 0.14, 0, i * 0.07));
  }
  wave() { this._tone(196, 0.3, 'triangle', 0.16, 392); this._tone(392, 0.25, 'sine', 0.1, 0, 0.12); }
  boss() { this._noise(0.6, 0.22, 300); this._tone(98, 0.5, 'sawtooth', 0.16, 49); }
  nova() { this._noise(0.3, 0.14, 2400); this._tone(1200, 0.25, 'sine', 0.08, 300); }
  dash() { this._noise(0.1, 0.08, 1800); }
  victory() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone(f, 0.3, 'triangle', 0.15, 0, i * 0.11));
  }
  gameover() {
    [392, 330, 262, 196].forEach((f, i) => this._tone(f, 0.32, 'triangle', 0.14, 0, i * 0.14));
  }

  // A minimal bass pulse under the action: two alternating roots, one soft
  // tick per beat. Called from the game loop with dt; cheap and quiet.
  music(dt) {
    if (!this.ctx || this.muted || !this.musicOn) return;
    this.musicTimer += dt;
    if (this.musicTimer < 0.42) return;
    this.musicTimer -= 0.42;
    this.musicStep++;
    const roots = [110, 110, 130.8, 98];
    const f = roots[this.musicStep % roots.length];
    this._tone(f, 0.38, 'triangle', 0.05, f * 0.99);
    if (this.musicStep % 2 === 0) this._tone(f * 2, 0.1, 'sine', 0.03);
  }

  startMusic() { this.musicOn = true; }
  stopMusic() { this.musicOn = false; }
}
