import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  // Alarm state
  private alarmOscillators: OscillatorNode[] = [];
  private alarmGain: GainNode | null = null;
  private alarmInterval: any = null;
  private vibrationInterval: any = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof document === 'undefined') return;

    const unlock = () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };

    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
  }

  private ensureContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playClick() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(1200, now);
      oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      oscillator.start(now);
      oscillator.stop(now + 0.06);
    } catch {}
  }

  /**
   * Play a looping alarm tone — two-tone pattern repeating every 1.2s.
   * Also starts a vibration pattern.
   */
  playAlarm() {
    this.stopAlarm(); // clear any existing alarm

    const ctx = this.ensureContext();
    if (!ctx) return;

    // Master gain for the alarm
    this.alarmGain = ctx.createGain();
    this.alarmGain.gain.setValueAtTime(0.35, ctx.currentTime);
    this.alarmGain.connect(ctx.destination);

    // Play a two-tone beep pattern that repeats
    const playBeepCycle = () => {
      if (!this.alarmGain || !this.audioContext) return;
      const now = this.audioContext.currentTime;

      // High tone
      const osc1 = this.audioContext.createOscillator();
      const g1 = this.audioContext.createGain();
      osc1.connect(g1);
      g1.connect(this.alarmGain!);
      osc1.frequency.setValueAtTime(880, now);
      g1.gain.setValueAtTime(0.4, now);
      g1.gain.setValueAtTime(0, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);
      this.alarmOscillators.push(osc1);

      // Low tone after short gap
      const osc2 = this.audioContext.createOscillator();
      const g2 = this.audioContext.createGain();
      osc2.connect(g2);
      g2.connect(this.alarmGain!);
      osc2.frequency.setValueAtTime(660, now + 0.2);
      g2.gain.setValueAtTime(0, now);
      g2.gain.setValueAtTime(0.4, now + 0.2);
      g2.gain.setValueAtTime(0, now + 0.35);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.35);
      this.alarmOscillators.push(osc2);

      // Third beep - urgency
      const osc3 = this.audioContext.createOscillator();
      const g3 = this.audioContext.createGain();
      osc3.connect(g3);
      g3.connect(this.alarmGain!);
      osc3.frequency.setValueAtTime(880, now + 0.4);
      g3.gain.setValueAtTime(0, now);
      g3.gain.setValueAtTime(0.4, now + 0.4);
      g3.gain.setValueAtTime(0, now + 0.55);
      osc3.start(now + 0.4);
      osc3.stop(now + 0.55);
      this.alarmOscillators.push(osc3);
    };

    // Play immediately, then repeat
    playBeepCycle();
    this.alarmInterval = setInterval(() => playBeepCycle(), 1200);

    // Start vibration pattern (vibrate 300ms, pause 200ms, repeat)
    this.startVibration();
  }

  stopAlarm() {
    // Stop oscillators
    for (const osc of this.alarmOscillators) {
      try { osc.stop(); } catch {}
    }
    this.alarmOscillators = [];

    // Disconnect gain
    if (this.alarmGain) {
      try { this.alarmGain.disconnect(); } catch {}
      this.alarmGain = null;
    }

    // Clear repeat interval
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }

    // Stop vibration
    this.stopVibration();
  }

  private startVibration() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Vibrate immediately with pattern
      navigator.vibrate([300, 200, 300, 200, 300]);
      // Repeat vibration pattern every 1.5s
      this.vibrationInterval = setInterval(() => {
        navigator.vibrate([300, 200, 300, 200, 300]);
      }, 1500);
    }
  }

  private stopVibration() {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0); // Cancel all vibration
    }
  }
}
