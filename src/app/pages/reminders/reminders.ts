import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Reminder } from '../../models/types';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reminders.html',
  styleUrl: './reminders.css'
})
export class Reminders {
  reminders: Reminder[] = [];
  private sub: Subscription = new Subscription();
  
  showAddModal = false;
  newReminder: Partial<Reminder> = this.resetReminder();

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.sub = this.dataService.reminders$.subscribe(r => {
      this.reminders = r;
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  toggleActive(reminder: Reminder) {
    reminder.isActive = !reminder.isActive;
    this.dataService.updateReminders(this.reminders);
  }

  deleteReminder(id: string) {
    const updated = this.reminders.filter(r => r.id !== id);
    this.dataService.updateReminders(updated);
  }

  openAddModal() {
    this.newReminder = this.resetReminder();
    this.showAddModal = true;
  }

  editReminder(reminder: Reminder) {
    this.newReminder = { ...reminder };
    this.showAddModal = true;
  }

  saveReminder() {
    if (!this.newReminder.title || !this.newReminder.time) return;
    
    if (this.newReminder.id) {
      // Update existing
      const updated = this.reminders.map(r => r.id === this.newReminder.id ? (this.newReminder as Reminder) : r);
      this.dataService.updateReminders(updated);
    } else {
      // Create new
      const r: Reminder = {
        ...this.newReminder,
        id: Date.now().toString(),
      } as Reminder;
      this.dataService.addReminder(r);
    }
    
    this.showAddModal = false;
  }

  private resetReminder(): Partial<Reminder> {
    return {
      title: '',
      frequency: 'daily',
      time: '12:00',
      intervalMode: false,
      intervalMinutes: 0,
      snoozeEnabled: true,
      priority: 'medium',
      isActive: true
    };
  }
}
