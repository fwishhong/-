export class SoundEngine {
  ctx: AudioContext | null = null;
  muted: boolean = false;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.error("AudioContext not supported");
    }
  }

  init() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1, when: number = 0) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + when);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + when + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime + when);
    osc.stop(this.ctx.currentTime + when + duration);
  }

  playWin() {
    this.playTone(523.25, 'square', 0.1, 0.1, 0);
    this.playTone(659.25, 'square', 0.1, 0.1, 0.1);
    this.playTone(783.99, 'square', 0.1, 0.1, 0.2);
    this.playTone(1046.50, 'square', 0.3, 0.1, 0.3);
  }

  playLose() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playTick() {
    this.playTone(800, 'square', 0.05, 0.05);
  }
  
  playStart() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playClick() {
    this.playTone(1200, 'sine', 0.05, 0.1);
  }
}

export const sfx = new SoundEngine();