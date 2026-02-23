import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class App implements OnInit {
  async ngOnInit() {
    if (Capacitor.isNativePlatform()) {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display === 'granted') {
          this.scheduleDailyReminder();
        }
      } else {
        this.scheduleDailyReminder();
      }
    }
  }

  async scheduleDailyReminder() {
    if (!Capacitor.isNativePlatform()) return;

    // Create a notification channel for Android 8.0+
    await LocalNotifications.createChannel({
      id: 'epic-builder-reminders',
      name: 'Daily Reminders',
      description: 'Notifications for daily recovery logs',
      importance: 4, // High importance
      visibility: 1, // Public
    });

    const pending = await LocalNotifications.getPending();
    // Assuming ID 1 is our daily reminder
    if (!pending.notifications.find(n => n.id === 1)) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Daily Recovery Log",
            body: "Don't forget to log your exercises, meals, and pain levels today.",
            id: 1,
            channelId: 'epic-builder-reminders',
            schedule: {
              on: { hour: 19, minute: 0 } // 7:00 PM every day
            }
          }
        ]
      });
    }
  }
}
