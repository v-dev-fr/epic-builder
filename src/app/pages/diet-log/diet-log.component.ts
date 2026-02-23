import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { DietLog } from '../../models/types';

@Component({
  selector: 'app-diet-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diet-log.component.html',
  styleUrl: './diet-log.css'
})
export class DietLogComponent implements OnInit {
  activeTab: 'log' | 'history' = 'log';
  
  categories = ['Morning', 'Breakfast', 'Lunch', 'Snack', 'Dinner'] as const;
  
  newLog: Partial<DietLog> = {};
  history: DietLog[] = [];
  todayTotalCalories: number = 0;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.diets$.subscribe(data => {
      this.history = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.calculateTodayCalories();
    });
    this.resetForm();
  }

  resetForm() {
    this.newLog = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      category: 'Breakfast',
      foodName: '',
      portion: '',
      calories: 0,
      notes: ''
    };
  }

  saveLog() {
    if (!this.newLog.foodName || !this.newLog.calories) return;
    this.dataService.addDiet(this.newLog as DietLog);
    this.resetForm();
    this.activeTab = 'history';
  }

  calculateTodayCalories() {
    const today = new Date().toISOString().split('T')[0];
    this.todayTotalCalories = this.history
      .filter(log => log.date === today)
      .reduce((sum, log) => sum + log.calories, 0);
  }
}
