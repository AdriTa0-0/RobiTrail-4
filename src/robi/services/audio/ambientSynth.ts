// Procedural Web Audio API soundscape: Warm acoustic pad + gentle bansuri flute melody & tactile UI SFX

// Soft Raag Yaman / Bhupali inspired lyrical phrases (frequencies in Hz, null = breath rest)
const BANSURI_PHRASES: Array<{ freq: number | null; durSec: number }>[] = [
  [
    { freq: 329.63, durSec: 1.35 }, // Ga4 (E4)
    { freq: 392.0, durSec: 1.55 }, // Pa4 (G4)
    { freq: 440.0, durSec: 1.25 }, // Dha4 (A4)
    { freq: 392.0, durSec: 1.85 }, // Pa4 (G4)
    { freq: null, durSec: 1.1 }, // gentle rest
    { freq: 293.66, durSec: 1.2 }, // Re4 (D4)
    { freq: 329.63, durSec: 1.45 }, // Ga4 (E4)
    { freq: 261.63, durSec: 2.1 }, // Sa4 (C4)
    { freq: null, durSec: 1.5 }, // serene pause
  ],
  [
    { freq: 392.0, durSec: 1.3 }, // Pa4
    { freq: 440.0, durSec: 1.45 }, // Dha4
    { freq: 523.25, durSec: 1.75 }, // Sa5 (C5)
    { freq: 440.0, durSec: 1.3 }, // Dha4
    { freq: null, durSec: 1.0 },
    { freq: 392.0, durSec: 1.35 }, // Pa4
    { freq: 329.63, durSec: 1.55 }, // Ga4
    { freq: 293.66, durSec: 1.9 }, // Re4
    { freq: null, durSec: 1.6 },
  ],
  [
    { freq: 261.63, durSec: 1.4 }, // Sa4
    { freq: 293.66, durSec: 1.25 }, // Re4
    { freq: 329.63, durSec: 1.7 }, // Ga4
    { freq: null, durSec: 0.9 },
    { freq: 392.0, durSec: 1.4 }, // Pa4
    { freq: 329.63, durSec: 1.25 }, // Ga4
    { freq: 293.66, durSec: 1.45 }, // Re4
    { freq: 261.63, durSec: 2.2 }, // Sa4
    { freq: null, durSec: 1.6 },
  ],
];

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private padLfo: OscillatorNode | null = null;
  private stepTimeout: number | null = null;
  private breathNoiseBuffer: AudioBuffer | null = null;
  private activeToken = 0;

  private ensureContext(): AudioContext | null {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) this.ctx = new AudioCtx();
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      if (!this.breathNoiseBuffer && this.ctx) {
        const len = Math.floor(this.ctx.sampleRate * 2);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        // Very soft smoothed pink-ish noise for airy flute breath nuance
        let b0 = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.92 * b0 + white * 0.08;
          data[i] = b0 * 0.5;
        }
        this.breathNoiseBuffer = buf;
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public startAmbient(baseFreq: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopAmbient();

    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(0.015, now + 1.2);
      master.connect(ctx.destination);
      this.masterGain = master;

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      osc.type = "sine";
      osc.frequency.value = baseFreq;
      filter.type = "lowpass";
      filter.frequency.value = 280;
      osc.connect(filter);
      filter.connect(master);
      osc.start(now);
      this.padOscs.push(osc);
    } catch {
      // Ignore blocked audio contexts
    }
  }

  public startGameplayMusic(citySeed = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopAmbient();

    const myToken = ++this.activeToken;

    try {
      const now = ctx.currentTime;

      // Master ambient bus with gentle fade-in
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(0.82, now + 1.6);
      master.connect(ctx.destination);
      this.masterGain = master;

      // Warm Acoustic Tanpura/Drone Pad (C3 + G3 soft lowpass with slow breathing LFO)
      const padFilter = ctx.createBiquadFilter();
      padFilter.type = "lowpass";
      padFilter.frequency.value = 270;
      padFilter.Q.value = 0.6;

      const padGain = ctx.createGain();
      padGain.gain.value = 0.013;

      const padLfo = ctx.createOscillator();
      const padLfoGain = ctx.createGain();
      padLfo.type = "sine";
      padLfo.frequency.value = 0.11; // slow 9s shimmer
      padLfoGain.gain.value = 75;
      padLfo.connect(padLfoGain);
      padLfoGain.connect(padFilter.frequency);
      padLfo.start(now);
      this.padLfo = padLfo;

      padFilter.connect(padGain);
      padGain.connect(master);

      const padNotes = [
        { freq: 130.81, type: "sine" as OscillatorType, detune: -3 }, // C3
        { freq: 196.0, type: "sine" as OscillatorType, detune: 3 }, // G3
        { freq: 261.63, type: "triangle" as OscillatorType, detune: 0 }, // C4 soft upper warm
      ];

      padNotes.forEach((p, idx) => {
        const osc = ctx.createOscillator();
        const subGain = ctx.createGain();
        osc.type = p.type;
        osc.frequency.value = p.freq;
        osc.detune.value = p.detune;
        subGain.gain.value = idx === 2 ? 0.25 : 0.65;
        osc.connect(subGain);
        subGain.connect(padFilter);
        osc.start(now);
        this.padOscs.push(osc);
      });

      // Gentle Bansuri Flute Scheduler
      const phrase = BANSURI_PHRASES[Math.abs(citySeed) % BANSURI_PHRASES.length];
      let stepIdx = 0;

      const scheduleNextNote = () => {
        if (!this.ctx || myToken !== this.activeToken || !this.masterGain) return;
        const item = phrase[stepIdx % phrase.length];
        stepIdx += 1;

        if (item.freq !== null && this.ctx) {
          this.triggerBansuriNote(this.ctx, this.masterGain, item.freq, item.durSec);
        }

        const waitMs = Math.round(item.durSec * 1000 * 0.92);
        this.stepTimeout = window.setTimeout(scheduleNextNote, waitMs);
      };

      // Slight initial grace before first flute breath
      this.stepTimeout = window.setTimeout(scheduleNextNote, 550);
    } catch {
      // Ignore blocked audio contexts
    }
  }

  private triggerBansuriNote(ctx: AudioContext, dest: AudioNode, freq: number, durSec: number) {
    try {
      const now = ctx.currentTime;
      const attack = Math.min(0.24, durSec * 0.24);
      const release = Math.min(0.55, durSec * 0.4);

      const noteFilter = ctx.createBiquadFilter();
      noteFilter.type = "lowpass";
      noteFilter.frequency.setValueAtTime(520, now);
      noteFilter.frequency.linearRampToValueAtTime(760, now + attack + 0.15);
      noteFilter.frequency.exponentialRampToValueAtTime(420, now + durSec);
      noteFilter.Q.value = 0.8;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.022, now + attack);
      env.gain.setValueAtTime(0.019, Math.max(now + attack + 0.05, now + durSec - release));
      env.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

      // Fundamental warm flute sine + delicate 2nd octave overtone
      const fundamental = ctx.createOscillator();
      fundamental.type = "sine";
      // Slight gentle slide-up ornament like a natural bamboo embouchure
      fundamental.frequency.setValueAtTime(freq * 0.985, now);
      fundamental.frequency.exponentialRampToValueAtTime(freq, now + 0.09);

      const harmonic = ctx.createOscillator();
      harmonic.type = "sine";
      harmonic.frequency.value = freq * 2;
      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = 0.09;

      // Subtle delayed bamboo flute vibrato
      const vib = ctx.createOscillator();
      const vibDepth = ctx.createGain();
      vib.type = "sine";
      vib.frequency.value = 4.6;
      vibDepth.gain.setValueAtTime(0, now);
      vibDepth.gain.linearRampToValueAtTime(3.2, now + attack + 0.25);
      vib.connect(vibDepth);
      vibDepth.connect(fundamental.frequency);

      fundamental.connect(noteFilter);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(noteFilter);

      // Subtle airy breath texture
      let breathSrc: AudioBufferSourceNode | null = null;
      if (this.breathNoiseBuffer) {
        breathSrc = ctx.createBufferSource();
        breathSrc.buffer = this.breathNoiseBuffer;
        breathSrc.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1350;
        bp.Q.value = 1.4;
        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.0001, now);
        bGain.gain.linearRampToValueAtTime(0.0035, now + attack * 0.8);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec * 0.75);
        breathSrc.connect(bp);
        bp.connect(bGain);
        bGain.connect(dest);
        breathSrc.start(now);
        breathSrc.stop(now + durSec + 0.05);
      }

      noteFilter.connect(env);
      env.connect(dest);

      fundamental.start(now);
      harmonic.start(now);
      vib.start(now);

      fundamental.stop(now + durSec + 0.06);
      harmonic.stop(now + durSec + 0.06);
      vib.stop(now + durSec + 0.06);
    } catch {
      // Ignore audio scheduling errors
    }
  }

  public stopAmbient() {
    this.activeToken += 1;
    if (this.stepTimeout !== null) {
      window.clearTimeout(this.stepTimeout);
      this.stepTimeout = null;
    }
    try {
      this.padOscs.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {
          // Ignore
        }
      });
      this.padOscs = [];
      if (this.padLfo) {
        this.padLfo.stop();
        this.padLfo.disconnect();
        this.padLfo = null;
      }
      if (this.masterGain) {
        this.masterGain.disconnect();
        this.masterGain = null;
      }
    } catch {
      // Ignore
    }
  }

  public playClick(enabled: boolean) {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(580, now);
      o.frequency.exponentialRampToValueAtTime(340, now + 0.036);
      f.type = "lowpass";
      f.frequency.value = 950;
      g.gain.setValueAtTime(0.0008, now);
      g.gain.linearRampToValueAtTime(0.018, now + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.042);
      o.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.045);
    } catch {
      // Ignore
    }
  }

  public playSuccessChime(enabled: boolean) {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [392.0, 493.88, 587.33, 783.99].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const f = ctx.createBiquadFilter();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        f.type = "lowpass";
        f.frequency.value = 1400;
        g.gain.setValueAtTime(0.0008, now + idx * 0.09);
        g.gain.linearRampToValueAtTime(0.032, now + idx * 0.09 + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.09 + 0.42);
        o.connect(f);
        f.connect(g);
        g.connect(ctx.destination);
        o.start(now + idx * 0.09);
        o.stop(now + idx * 0.09 + 0.45);
      });
    } catch {
      // Ignore
    }
  }
}

export const ambientSynth = new AmbientSoundEngine();
