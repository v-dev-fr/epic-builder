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
    const pending = await LocalNotifications.getPending();
    // Assuming ID 1 is our daily reminder
    if (!pending.notifications.find(n => n.id === 1)) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Daily Recovery Log",
            body: "Don't forget to log your exercises, meals, and pain levels today.",
            id: 1,
            schedule: {
              on: { hour: 19, minute: 0 } // 7:00 PM every day
            }
          }
        ]
      });
    }
  }
}
