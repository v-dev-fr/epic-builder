import { Injectable } from '@angular/core';
import { Reminder } from '../models/types';
import { DataService } from './data.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject, Subscription } from 'rxjs';

// Channel IDs - versioned because Android locks channel settings permanently.
// If sound/vibration is broken, bump the version suffix and old channels get deleted.
const CHANNEL_DAILY = 'epic-daily-v4';
const CHANNEL_CUSTOM = 'epic-custom-v4';

// Old channel IDs to clean up (were created with broken sound settings)
const OLD_CHANNELS = [
  'epic-builder-reminders',
  'epic-builder-custom',
  'epic-daily-v2',
  'epic-custom-v2',
  'epic-daily-v3',
  'epic-custom-v3',
];

export interface AlarmEvent {
  title: string;
  body: string;
}

@Injectable({
  providedIn: 'root'
})
export class RemindersService {
  private reminders: Reminder[] = [];
  private sub: Subscription = new Subscription();
  private initialized = false;

  // Alarm overlay event - layout subscribes to this
  private alarmSubject = new BehaviorSubject<AlarmEvent | null>(null);
  alarm$ = this.alarmSubject.asObservable();

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

    // Delete old broken channels, then create fresh ones
    await this.deleteOldChannels();
    await this.createChannels();

    // Listen for notifications received while app is in foreground
    // This triggers the full-screen alarm overlay
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      // Don't show alarm for test notifications
      if (notification.id === 9999) return;

      this.alarmSubject.next({
        title: notification.title || 'Epic Builder',
        body: notification.body || 'Time for your ritual!',
      });
    });

    // Listen for when user taps on a notification (from background/lock screen)
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      // App was opened from notification - show the alarm overlay too
      if (action.notification.id === 9999) return;

      this.alarmSubject.next({
        title: action.notification.title || 'Epic Builder',
        body: action.notification.body || 'Time for your ritual!',
      });
    });

    // Subscribe to reminder changes and schedule them
    this.sub = this.dataService.reminders$.subscribe(rem => {
      this.reminders = rem;
      this.scheduleAllActiveReminders();
    });
  }

  clearAlarm() {
    this.alarmSubject.next(null);
  }

  private async deleteOldChannels() {
    for (const id of OLD_CHANNELS) {
      try {
        await LocalNotifications.deleteChannel({ id });
      } catch {}
    }
  }

  private async createChannels() {
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_DAILY,
        name: 'Daily Reminders',
        description: 'Daily recovery log reminders with sound',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#FBBF24',
      });

      await LocalNotifications.createChannel({
        id: CHANNEL_CUSTOM,
        name: 'Custom Reminders',
        description: 'Custom timed notifications with sound',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#FBBF24',
      });
    } catch (e) {
      console.warn('Failed to create notification channels', e);
    }
  }

  async scheduleAllActiveReminders() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Cancel all pending (scheduled) notifications
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      // Also clear already-delivered notifications from the tray
      await LocalNotifications.removeAllDeliveredNotifications();

      const notificationsToSchedule: any[] = [];
      let notifId = 1000;

      // Schedule the default daily recovery log reminder (ID 1)
      notificationsToSchedule.push({
        title: 'Daily Recovery Log',
        body: "Don't forget to log your exercises, meals, and pain levels today.",
        id: 1,
        channelId: CHANNEL_DAILY,
        schedule: { on: { hour: 19, minute: 0 } },
        smallIcon: 'ic_stat_icon',
        iconColor: '#3b82f6',
        sound: 'default',
      });

      // Schedule user-defined reminders
      for (const reminder of this.reminders) {
        if (!reminder.isActive) continue;

        const [hours, minutes] = reminder.time.split(':').map(Number);

        if (reminder.intervalMode && reminder.intervalMinutes && reminder.intervalMinutes > 0) {
          notificationsToSchedule.push({
            title: 'Epic Builder',
            body: reminder.title,
            id: notifId++,
            channelId: CHANNEL_CUSTOM,
            smallIcon: 'ic_stat_icon',
            iconColor: '#FBBF24',
            sound: 'default',
            schedule: {
              every: reminder.intervalMinutes >= 60 ? 'hour' : 'minute',
              count: reminder.intervalMinutes >= 60
                ? Math.max(1, Math.floor(reminder.intervalMinutes / 60))
                : Math.max(1, reminder.intervalMinutes),
            },
          });
        } else if (reminder.frequency === 'daily') {
          notificationsToSchedule.push({
            title: 'Epic Builder',
            body: reminder.title,
            id: notifId++,
            channelId: CHANNEL_CUSTOM,
            smallIcon: 'ic_stat_icon',
            iconColor: '#FBBF24',
            sound: 'default',
            schedule: { on: { hour: hours, minute: minutes } },
          });
        } else if (reminder.frequency === 'weekdays') {
          for (let d = 2; d <= 6; d++) {
            notificationsToSchedule.push({
              title: 'Epic Builder',
              body: reminder.title,
              id: notifId++,
              channelId: CHANNEL_CUSTOM,
              smallIcon: 'ic_stat_icon',
              iconColor: '#FBBF24',
              sound: 'default',
              schedule: { on: { weekday: d, hour: hours, minute: minutes } },
            });
          }
        } else if (reminder.frequency === 'once') {
          const now = new Date();
          const scheduleDate = new Date();
          scheduleDate.setHours(hours, minutes, 0, 0);

          if (scheduleDate.getTime() <= now.getTime()) {
            scheduleDate.setDate(scheduleDate.getDate() + 1);
          }

          notificationsToSchedule.push({
            title: 'Epic Builder',
            body: reminder.title,
            id: notifId++,
            channelId: CHANNEL_CUSTOM,
            smallIcon: 'ic_stat_icon',
            iconColor: '#FBBF24',
            sound: 'default',
            schedule: { at: scheduleDate },
          });
        } else if (reminder.frequency === 'custom' && reminder.customDays && reminder.customDays.length > 0) {
          for (const day of reminder.customDays) {
            const capDay = day === 0 ? 1 : day + 1;
            notificationsToSchedule.push({
              title: 'Epic Builder',
              body: reminder.title,
              id: notifId++,
              channelId: CHANNEL_CUSTOM,
              smallIcon: 'ic_stat_icon',
              iconColor: '#FBBF24',
              sound: 'default',
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
