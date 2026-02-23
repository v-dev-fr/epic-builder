import { Injectable } from '@angular/core';
import { Reminder } from '../models/types';
import { DataService } from './data.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RemindersService {
  private reminders: Reminder[] = [];
  private sub: Subscription = new Subscription();

  constructor(private dataService: DataService) {}

  async init() {
    this.sub = this.dataService.reminders$.subscribe(rem => {
      this.reminders = rem;
      this.scheduleAllActiveReminders();
    });

    if (Capacitor.isNativePlatform()) {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    }
  }

  async scheduleAllActiveReminders() {
    if (!Capacitor.isNativePlatform()) return;

    // Clear existing to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const notificationsToSchedule = [];
    
    // We assign a dynamic ID sequentially just for simple mapping here
    let notifId = 1000;

    for (const reminder of this.reminders) {
      if (!reminder.isActive) continue;

      const [hours, minutes] = reminder.time.split(':').map(Number);
      
      // Simple daily schedule
      if (reminder.frequency === 'daily') {
        notificationsToSchedule.push({
          title: "Epic Builder - Ritual",
          body: reminder.title,
          id: notifId++,
          schedule: { on: { hour: hours, minute: minutes } }
        });
      } 
      else if (reminder.frequency === 'weekdays') {
        // 1 to 5
        for (let d = 1; d <= 5; d++) {
          notificationsToSchedule.push({
            title: "Epic Builder - Quest",
            body: reminder.title,
            id: notifId++,
            schedule: { on: { weekday: d, hour: hours, minute: minutes } }
          });
        }
      } 
      else if (reminder.intervalMode && reminder.intervalMinutes) {
        // Just demonstrating an 'every' schedule; capacitor handles this via 'every' param 
        // Note: For real intervals we might use background tasks if complex, but this uses simple native repeating
        notificationsToSchedule.push({
            title: "Epic Builder - Vitality check",
            body: reminder.title,
            id: notifId++,
            schedule: { 
              // Simplistic representation for repeating every hour/minute using standard API options
              // The local notifications plugin supports 'every' but with specific types like 'day', 'week', 'hour', 'minute'.
              // We'll mimic this broadly here for simplicity if intervalMinutes > 0
              every: (reminder.intervalMinutes >= 60 ? 'hour' : 'minute') as 'hour' | 'minute',
              count: reminder.intervalMinutes >= 60 ? Math.floor(reminder.intervalMinutes/60) : reminder.intervalMinutes
            }
        });
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
