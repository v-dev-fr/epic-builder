import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RemindersService } from './services/reminders';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class App implements OnInit {
  constructor(private remindersService: RemindersService) {}

  async ngOnInit() {
    await this.remindersService.init();
  }
}
