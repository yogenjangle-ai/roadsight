/**
 * RoadSight Audio Alert System
 * Uses Web Audio API to produce non-intrusive driver audio beeps for road hazards.
 */

class SoundAlertService {
  constructor() {
    this.audioCtx = null;
    this.lastPlayed = 0;
    this.cooldownMs = 1500; // 1.5s cooldown to prevent audio spamming
    this.enabled = true;
  }

  init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
  }

  playHazardAlert(severity = 'Medium') {
    if (!this.enabled) return;

    const now = Date.now();
    if (now - this.lastPlayed < this.cooldownMs) return;
    this.lastPlayed = now;

    try {
      this.init();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      if (severity === 'Large') {
        // High danger: 3 high warning beeps (880Hz)
        [0, 0.12, 0.24].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, t + offset);
          gain.gain.setValueAtTime(0.18, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.08);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + offset);
          osc.stop(t + offset + 0.09);
        });
      } else if (severity === 'Medium') {
        // Medium: 2 alert pings (680Hz -> 760Hz)
        [0, 0.14].forEach((offset, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(680 + idx * 80, t + offset);
          gain.gain.setValueAtTime(0.15, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.1);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + offset);
          osc.stop(t + offset + 0.11);
        });
      } else {
        // Small: 1 soft chirp (550Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(550, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
      }
    } catch (err) {
      console.warn('Audio alert error:', err);
    }
  }
}

export const soundAlert = new SoundAlertService();
