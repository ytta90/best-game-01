// Emberkeep — every sound is synthesized with WebAudio: no audio files,
// no network, just oscillators, filtered noise and a small step sequencer
// for the music. The context is created lazily on the first user gesture
// (browsers forbid sound before one), and everything is a no-op until then.

export function createSoundBank() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ freq, endFreq = null, type = 'sine', dur = 0.12, vol = 0.2, when = 0, slide = null }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
    else if (slide !== null) osc.frequency.linearRampToValueAtTime(Math.max(1, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.2, vol = 0.2, freq = 1200, q = 1, when = 0, sweepTo = null }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    if (sweepTo !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t0 + dur);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // A slow, soft pad-and-pluck loop in A minor pentatonic. The sequencer
  // runs on a timer (not the render loop) so the music keeps time even
  // when the tab's frame rate wobbles.
  const MELODY = [440, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440, 392, 440, 523.25, 659.25, 587.33, 523.25, 440];
  const CHORDS = [
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [196, 246.94, 293.66],
    [164.81, 220, 261.63],
  ];

  function musicTick() {
    if (!ctx || muted) return;
    const step = musicStep % 16;
    const bar = Math.floor(musicStep / 16) % CHORDS.length;
    if (step === 0) {
      for (const f of CHORDS[bar]) {
        tone({ freq: f, type: 'triangle', dur: 2.4, vol: 0.05 });
      }
    }
    if (step % 2 === 0) {
      const note = MELODY[step];
      tone({ freq: note, type: 'sine', dur: 0.5, vol: 0.07 });
      if (step % 8 === 4) tone({ freq: note / 2, type: 'sine', dur: 0.7, vol: 0.05 });
    }
    musicStep += 1;
  }

  return {
    unlock() {
      ensure();
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    startMusic() {
      if (!ensure() || musicTimer !== null) return;
      musicTimer = window.setInterval(musicTick, 300);
    },
    shoot() {
      tone({ freq: 880, endFreq: 320, type: 'square', dur: 0.07, vol: 0.06 });
    },
    hit() {
      noise({ dur: 0.05, vol: 0.1, freq: 2400, q: 2 });
    },
    enemyDie() {
      tone({ freq: 320, endFreq: 60, type: 'sawtooth', dur: 0.22, vol: 0.12 });
      noise({ dur: 0.16, vol: 0.1, freq: 900, sweepTo: 200 });
    },
    bruteDie() {
      tone({ freq: 180, endFreq: 40, type: 'sawtooth', dur: 0.5, vol: 0.2 });
      noise({ dur: 0.4, vol: 0.18, freq: 500, sweepTo: 120 });
    },
    pickup() {
      tone({ freq: 1320, type: 'sine', dur: 0.09, vol: 0.1 });
      tone({ freq: 1760, type: 'sine', dur: 0.12, vol: 0.08, when: 0.05 });
    },
    levelUp() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.14, when: i * 0.07 });
      });
    },
    waveHorn() {
      tone({ freq: 196, endFreq: 392, type: 'sawtooth', dur: 0.6, vol: 0.1 });
      tone({ freq: 294, endFreq: 440, type: 'triangle', dur: 0.6, vol: 0.08, when: 0.08 });
    },
    bossRoar() {
      noise({ dur: 0.9, vol: 0.25, freq: 300, sweepTo: 90, q: 0.8 });
      tone({ freq: 90, endFreq: 45, type: 'sawtooth', dur: 0.9, vol: 0.16 });
    },
    playerHurt() {
      tone({ freq: 220, endFreq: 110, type: 'square', dur: 0.18, vol: 0.16 });
    },
    lanternHit() {
      tone({ freq: 140, endFreq: 90, type: 'triangle', dur: 0.25, vol: 0.12 });
    },
    nova() {
      noise({ dur: 0.35, vol: 0.16, freq: 1600, sweepTo: 300 });
      tone({ freq: 660, endFreq: 110, type: 'sine', dur: 0.35, vol: 0.12 });
    },
    gameOver() {
      [392, 329.63, 261.63, 196].forEach((f, i) => {
        tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.14, when: i * 0.16 });
      });
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
        tone({ freq: f, type: 'triangle', dur: 0.4, vol: 0.14, when: i * 0.1 });
      });
    },
    uiClick() {
      tone({ freq: 660, type: 'sine', dur: 0.06, vol: 0.1 });
    },
  };
}
