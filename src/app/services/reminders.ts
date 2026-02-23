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
  private initialized = false;

  constructor(private dataService: DataService) {}

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    if (!Capacitor.isNativePlatform()) return;

    // Request permissions first
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }

    // Create notification channels (Android 8.0+)
    await this.createChannels();

    // Subscribe to reminder changes and schedule them
    this.sub = this.dataService.reminders$.subscribe(rem => {
      this.reminders = rem;
      this.scheduleAllActiveReminders();
    });
  }

  private async createChannels() {
    try {
      await LocalNotifications.createChannel({
        id: 'epic-builder-reminders',
        name: 'Daily Reminders',
        description: 'Daily recovery log reminders',
        importance: 4,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });

      await LocalNotifications.createChannel({
        id: 'epic-builder-custom',
        name: 'Custom Reminders',
        description: 'Custom timed notifications for logs and habits',
        importance: 4,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
    } catch (e) {
      console.warn('Failed to create notification channels', e);
    }
  }

  async scheduleAllActiveReminders() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Cancel all existing scheduled notifications to avoid duplicates
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const notificationsToSchedule: any[] = [];
      let notifId = 1000;

      // Schedule the default daily recovery log reminder (ID 1)
      notificationsToSchedule.push({
        title: 'Daily Recovery Log',
        body: "Don't forget to log your exercises, meals, and pain levels today.",
        id: 1,
        channelId: 'epic-builder-reminders',
        schedule: { on: { hour: 19, minute: 0 } },
        smallIcon: 'ic_stat_icon',
        iconColor: '#3b82f6',
      });

      // Schedule user-defined reminders
      for (const reminder of this.reminders) {
        if (!reminder.isActive) continue;

        const [hours, minutes] = reminder.time.split(':').map(Number);

        if (reminder.intervalMode && reminder.intervalMinutes && reminder.intervalMinutes > 0) {
          // Interval mode: repeating notifications
          notificationsToSchedule.push({
            title: 'Epic Builder - Vitality Check',
            body: reminder.title,
            id: notifId++,
            channelId: 'epic-builder-custom',
            smallIcon: 'ic_stat_icon',
            iconColor: '#FBBF24',
            schedule: {
              every: reminder.intervalMinutes >= 60 ? 'hour' : 'minute',
              count: reminder.intervalMinutes >= 60
                ? Math.max(1, Math.floor(reminder.intervalMinutes / 60))
                : Math.max(1, reminder.intervalMinutes),
            },
          });
        } else if (reminder.frequency === 'daily') {
          notificationsToSchedule.push({
            title: 'Epic Builder - Ritual',
            body: reminder.title,
            id: notifId++,
            channelId: 'epic-builder-custom',
            smallIcon: 'ic_stat_icon',
            iconColor: '#FBBF24',
            schedule: { on: { hour: hours, minute: minutes } },
          });
        } else if (reminder.frequency === 'weekdays') {
          // Schedule for Monday (2) through Friday (6) - Capacitor uses 1=Sunday
          for (let d = 2; d <= 6; d++) {
            notificationsToSchedule.push({
              title: 'Epic Builder - Quest',
              body: reminder.title,
              id: notifId++,
              channelId: 'epic-builder-custom',
              smallIcon: 'ic_stat_icon',
              iconColor: '#FBBF24',
              schedule: { on: { weekday: d, hour: hours, minute: minutes } },
            });
          }
        } else if (reminder.frequency === 'once') {
          // One-time notification - schedule for today at the specified time
          // If the time has already passed today, schedule for tomorrow
          const now = new Date();
          const scheduleDate = new Date();
          scheduleDate.setHours(hours, minutes, 0, 0);

          if (scheduleDate.getTime() <= now.getTime()) {
            scheduleDate.setDate(scheduleDate.getDate() + 1);
          }

          notificationsToSchedule.push({
            title: 'Epic Builder - Decree',
            body: reminder.title,
            id: notifId++,
            channelId: 'epic-builder-custom',
            smallIcon: 'ic_stat_icon',
            iconColor: '#FBBF24',
            schedule: { at: scheduleDate },
          });
        } else if (reminder.frequency === 'custom' && reminder.customDays && reminder.customDays.length > 0) {
          // Custom days: schedule for each selected day
          for (const day of reminder.customDays) {
            // Capacitor weekday: 1=Sunday, 2=Monday, ..., 7=Saturday
            const capDay = day === 0 ? 1 : day + 1;
            notificationsToSchedule.push({
              title: 'Epic Builder - Ritual',
              body: reminder.title,
              id: notifId++,
              channelId: 'epic-builder-custom',
              smallIcon: 'ic_stat_icon',
              iconColor: '#FBBF24',
              schedule: { on: { weekday: capDay, hour: hours, minute: minutes } },
            });
          }
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      }
    } catch (e) {
      console.error('Failed to schedule notifications', e);
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
