import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Quest, CheckIn } from '../../models/types';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit, OnDestroy {
  level: number = 1;
  xp: number = 0;
  quests: Quest[] = [];
  checkIns: CheckIn[] = [];
  
  newQuest: Partial<Quest> = { title: '', description: '', xpPoints: 50 };
  showAddQuest = false;

  private sub: Subscription = new Subscription();

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.sub = combineLatest([
      this.dataService.level$,
      this.dataService.xp$,
      this.dataService.quests$,
      this.dataService.checkIns$
    ]).subscribe(([level, xp, quests, checkIns]) => {
      this.level = level;
      this.xp = xp;
      this.quests = quests;
      this.checkIns = checkIns;
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  get completedQuests() {
    return this.quests.filter(q => q.completed);
  }

  get activeQuests() {
    return this.quests.filter(q => !q.completed);
  }

  get progressPercentage() {
    return (this.xp / (this.level * 100)) * 100;
  }

  saveQuest() {
    if (!this.newQuest.title || !this.newQuest.xpPoints) return;
    
    const q: Quest = {
      id: Date.now().toString(),
      title: this.newQuest.title,
      description: this.newQuest.description || '',
      xpPoints: this.newQuest.xpPoints,
      completed: false
    };

    this.dataService.addQuest(q);
    this.showAddQuest = false;
    this.newQuest = { title: '', description: '', xpPoints: 50 };
  }
}
