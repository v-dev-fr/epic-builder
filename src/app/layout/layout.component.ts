import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { CheckIn } from '../models/types';
import { Subscription } from 'rxjs';
import { HostListener } from '@angular/core';
import { AudioService } from '../services/audio.service';
import { trigger, transition, style, animate, query } from '@angular/animations';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.css',
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' })
        ], { optional: true }),
        query(':leave', [
          animate('150ms ease-out', style({ opacity: 0, transform: 'translateY(-10px)' }))
        ], { optional: true }),
        query(':enter', [
          animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true })
      ])
    ])
  ]
})
export class LayoutComponent implements OnInit, OnDestroy {
  showDailyCheckIn = false;
  
  checkInData: Partial<CheckIn> = {
    painLevel: 5,
    energyLevel: 3,
    mood: 'neutral'
  };

  moods: ('bad' | 'neutral' | 'good' | 'great')[] = ['bad', 'neutral', 'good', 'great'];
  
  private sub = new Subscription();
  private todayStr = new Date().toISOString().split('T')[0];

  constructor(private dataService: DataService, private audioService: AudioService) {}

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    let target = event.target as HTMLElement;
    while (target && target !== document.body) {
      if (['BUTTON', 'A'].includes(target.tagName) || target.classList.contains('cursor-pointer')) {
        this.audioService.playClick();
        break;
      }
      target = target.parentElement as HTMLElement;
    }
  }

  ngOnInit() {
    this.sub.add(
      this.dataService.checkIns$.subscribe(checkIns => {
        const hasCheckedInToday = checkIns.some(c => c.date === this.todayStr);
        if (!hasCheckedInToday && checkIns.length >= 0) {
          setTimeout(() => this.showDailyCheckIn = true, 500);
        } else {
          this.showDailyCheckIn = false;
        }
      })
    );

    this.sub.add(
      this.dataService.settings$.subscribe(settings => {
        // Apply theme to body
        const themeClass = `theme-${settings.theme || 'obsidian'}`;
        document.body.className = themeClass; // Replaces existing classes, we will let Tailwind handle background in styles.css
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  submitCheckIn() {
    const newCheckIn: CheckIn = {
      id: Date.now().toString(),
      date: this.todayStr,
      painLevel: this.checkInData.painLevel!,
      energyLevel: this.checkInData.energyLevel!,
      mood: this.checkInData.mood as any
    };

    this.dataService.addCheckIn(newCheckIn);
    this.showDailyCheckIn = false;
  }
}
