import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { HabitLog, HabitTemplate } from '../../models/types';
import { Subscription, combineLatest } from 'rxjs';
import { FormsModule } from '@angular/forms';

interface HabitStats {
  id: string;
  name: string;
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  history: boolean[]; // Last 7 days, true if completed
}

@Component({
  selector: 'app-habits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habits.html',
  styleUrl: './habits.css'
})
export class Habits implements OnInit, OnDestroy {
  habitLogs: HabitLog[] = [];
  habitTemplates: HabitTemplate[] = [];
  habitStats: HabitStats[] = [];
  private sub: Subscription = new Subscription();

  todayString = new Date().toISOString().split('T')[0];
  
  showAddHabit = false;
  editingHabitId: string | null = null;
  newHabitName: string = '';

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.sub = combineLatest([
      this.dataService.habits$,
      this.dataService.habitTemplates$
    ]).subscribe(([logs, templates]) => {
      this.habitLogs = logs;
      this.habitTemplates = templates;
      this.calculateStats();
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  calculateStats() {
    this.habitStats = this.habitTemplates.map(ht => {
      // Get all logs for this habit sorted descending
      const logsForHabit = this.habitLogs
        .filter(l => l.habitId === ht.id && l.completed)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let currentStreak = 0;
      let checkDate = new Date();
      checkDate.setHours(0,0,0,0); // start of today
      
      const didToday = logsForHabit.some(l => l.date === this.todayString);
      
      if (!didToday) {
        // If not done today, start checking from yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // Simple streak counting going backwards
      let trackingStreak = true;
      let tempDateStr = checkDate.toISOString().split('T')[0];
      
      while(trackingStreak) {
        if(logsForHabit.some(l => l.date === tempDateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
          tempDateStr = checkDate.toISOString().split('T')[0];
        } else {
          trackingStreak = false;
        }
      }

      // Last 7 days heat map data
      const history = [];
      const historyCheck = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(historyCheck);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        history.push(logsForHabit.some(h => h.date === dStr));
      }

      return {
        id: ht.id,
        name: ht.name,
        currentStreak,
        longestStreak: currentStreak, // Keeping it simple for MVP
        completedToday: didToday,
        history
      };
    });
  }

  toggleHabitToday(habitId: string) {
    const existingIndex = this.habitLogs.findIndex(l => l.habitId === habitId && l.date === this.todayString);
    const templateName = this.habitTemplates.find(h => h.id === habitId)?.name || 'Habit';
    
    this.dataService.addHabitLog({
      id: Date.now().toString(),
      habitId,
      name: templateName,
      date: this.todayString,
      completed: existingIndex >= 0 ? !this.habitLogs[existingIndex].completed : true
    });
  }

  openEditHabit(habit: HabitStats) {
    this.editingHabitId = habit.id;
    this.newHabitName = habit.name;
    this.showAddHabit = true;
  }

  saveHabit() {
    if (!this.newHabitName.trim()) return;

    let templates = [...this.habitTemplates];
    
    if (this.editingHabitId) {
      // Update
      const idx = templates.findIndex(t => t.id === this.editingHabitId);
      if (idx >= 0) {
        templates[idx].name = this.newHabitName.trim();
      }
    } else {
      // Create new
      templates.push({
        id: 'hab-' + Date.now(),
        name: this.newHabitName.trim()
      });
    }

    this.dataService.updateHabitTemplates(templates);
    this.showAddHabit = false;
    this.editingHabitId = null;
    this.newHabitName = '';
  }

  deleteHabit(id: string) {
    const templates = this.habitTemplates.filter(t => t.id !== id);
    this.dataService.updateHabitTemplates(templates);
  }
}
