import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof document === 'undefined') return;

    const unlock = () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      // Resume if suspended (autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };

    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
  }

  playClick() {
    if (!this.enabled) return;

    // Lazily create context on first play if not yet initialized
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return;
      }
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Create a short, crisp click using an oscillator
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Quick frequency sweep for a "tick" sound
      oscillator.frequency.setValueAtTime(1200, now);
      oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      // Quick volume envelope
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      oscillator.start(now);
      oscillator.stop(now + 0.06);
    } catch {
      // Ignore audio errors gracefully
    }
  }
}
