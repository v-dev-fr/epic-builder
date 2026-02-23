import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Subscription, combineLatest } from 'rxjs';
import { DataService } from '../../services/data.service';
import { WeightLog, Settings } from '../../models/types';

@Component({
  selector: 'app-weight-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './weight-tracker.component.html',
  styleUrl: './weight-tracker.css'
})
export class WeightTrackerComponent implements OnInit, OnDestroy {
  activeTab: 'log' | 'history' = 'log';
  
  newLog: Partial<WeightLog> = {};
  history: WeightLog[] = [];
  settings!: Settings;
  
  private sub: Subscription = new Subscription();

  // Chart
  chartData: ChartData<'line'> = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        display: true, 
        position: 'bottom',
        labels: { color: '#9ca3af', font: { family: 'Inter' } } 
      } 
    },
    scales: {
      x: { grid: { display: false } },
      y: { border: { dash: [4, 4] } }
    }
  };

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.sub = combineLatest([
      this.dataService.weights$,
      this.dataService.settings$
    ]).subscribe(([weights, settings]) => {
      this.history = [...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.settings = settings;
      this.updateChartData();
      
      // Initialize form if uninitialized
      if (!this.newLog.date) {
        this.resetForm();
      } else {
        this.calculateAutoFields();
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  resetForm() {
    const lastWeight = this.history.length > 0 ? this.history[0].weight : this.settings.targetWeight;
    const lastWaist = this.history.length > 0 ? this.history[0].waist : 0;
    
    this.newLog = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      weight: lastWeight,
      waist: lastWaist,
      bmi: 0,
      totalLost: 0,
      notes: ''
    };
    this.calculateAutoFields();
  }

  calculateAutoFields() {
    if (!this.newLog.weight || !this.settings) return;
    
    // BMI = kg / (m * m)
    let weightKg = this.newLog.weight;
    if (this.settings.units === 'lbs') {
      weightKg = this.newLog.weight * 0.453592;
    }
    
    const heightM = this.settings.height / 100;
    this.newLog.bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

    // Total lost: initial weight - current weight
    if (this.history.length > 0) {
      // Find oldest entry
      const initialWeight = [...this.history].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].weight;
      this.newLog.totalLost = parseFloat((initialWeight - this.newLog.weight).toFixed(1));
    } else {
      this.newLog.totalLost = 0;
    }
  }

  saveLog() {
    if (!this.newLog.weight) return;
    this.dataService.addWeight(this.newLog as WeightLog);
    this.resetForm();
    this.activeTab = 'history';
  }

  updateChartData() {
    const recent = [...this.history].reverse().slice(-14); // last 14 entries for chart
    
    // Calculate rolling average
    const rollingAvgData = recent.map((w, index) => {
      const start = Math.max(0, index - 6);
      const slice = recent.slice(start, index + 1);
      const avg = slice.reduce((sum, item) => sum + item.weight, 0) / slice.length;
      return parseFloat(avg.toFixed(1));
    });

    this.chartData = {
      labels: recent.map(w => new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      datasets: [
        {
          data: recent.map(w => w.weight),
          label: 'Daily Weight',
          borderColor: '#8b5cf6', // purple 
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          fill: true,
          tension: 0.4
        },
        {
          data: rollingAvgData,
          label: '7-Entry Average',
          borderColor: '#fbbf24', // epic-gold
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 2
        }
      ]
    };
  }
}
