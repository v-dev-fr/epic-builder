import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private enabled = true;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof document === 'undefined') return;

    // Create a hidden audio element in the DOM 
    // This is much more reliable on restrictive mobile browsers than pure JS Audio objects
    this.audioElement = document.createElement('audio');
    this.audioElement.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    this.audioElement.volume = 0.5;
    this.audioElement.style.display = 'none';
    this.audioElement.setAttribute('playsinline', '');
    document.body.appendChild(this.audioElement);
    
    // Attempt to unlock audio on first interaction anywhere
    const unlockAudio = () => {
      if (this.audioElement) {
        this.audioElement.play().then(() => {
          this.audioElement!.pause();
          this.audioElement!.currentTime = 0;
        }).catch(() => {});
      }
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
  }

  playClick() {
    if (!this.enabled || !this.audioElement) return;
    try {
      this.audioElement.currentTime = 0;
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Ignore autoplay blocked errors
        });
      }
    } catch (e) {
      console.warn('Audio playback failed', e);
    }
  }
}
