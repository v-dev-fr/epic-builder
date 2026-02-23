import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Preferences } from '@capacitor/preferences';

import { DataService } from '../../services/data.service';
import { ExerciseLog, WeightLog, Settings, DietLog, HabitLog, Quest } from '../../models/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private sub: Subscription = new Subscription();
  
  // Summary Data
  currentWeight: number = 0;
  targetWeight: number = 0;
  totalLost: number = 0;
  latestPainScore: number | string = '-';
  weeklyExerciseCompletion: string = '0/0';
  units: string = 'kg';
  recoveryScore: number = 0;
  recoveryScoreColor: string = 'text-green-400';
  
  // Weekly Insights
  insightTitle: string = 'Analyzing...';
  insightText: string = 'Gathering enough data to forge insights.';
  insightIcon: string = 'book'; // 'alert', 'star', 'book'

  // RPG Leveling & Quests
  quests: Quest[] = [];
  heroLevel: number = 1;
  heroXp: number = 0;

  // Chart Data
  weightChartData: ChartData<'line'> = { labels: [], datasets: [] };
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

  painChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  
  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.sub = combineLatest([
      this.dataService.weights$,
      this.dataService.exercises$,
      this.dataService.settings$,
      this.dataService.habits$,
      this.dataService.quests$,
      this.dataService.level$,
      this.dataService.xp$
    ]).subscribe(([weights, exercises, settings, habits, quests, level, xp]) => {
      this.processSummaryData(weights, exercises, settings);
      this.processChartData(weights, exercises);
      this.calculateRecoveryScore(exercises, habits);
      this.generateInsights(exercises, weights);
      this.quests = quests;
      this.heroLevel = level;
      this.heroXp = xp;
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  private processSummaryData(weights: WeightLog[], exercises: ExerciseLog[], settings: Settings) {
    this.targetWeight = settings.targetWeight;
    this.units = settings.units;
    
    if (weights.length > 0) {
      const latest = weights[0]; // Assuming descending order in DataService
      this.currentWeight = latest.weight;
      this.totalLost = latest.totalLost;
    }

    if (exercises.length > 0) {
      // Get latest pain score
      const latestExercise = [...exercises].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      this.latestPainScore = latestExercise.painAfter;

      // Calculate weekly completion
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const lastWeekExercises = exercises.filter(e => new Date(e.date) >= oneWeekAgo);
      const completed = lastWeekExercises.filter(e => e.completed).length;
      this.weeklyExerciseCompletion = `${completed}/${lastWeekExercises.length}`;
    }
  }

  private processChartData(weights: WeightLog[], exercises: ExerciseLog[]) {
    // Weight Chart (Last 7 entries, reversed to ascending for chart)
    const recentWeights = weights.slice(0, 7).reverse();
    
    // Calculate rolling average
    const rollingAvgData = recentWeights.map((w, index) => {
      const start = Math.max(0, index - 6);
      const slice = recentWeights.slice(start, index + 1);
      const avg = slice.reduce((sum, item) => sum + item.weight, 0) / slice.length;
      return parseFloat(avg.toFixed(1));
    });

    this.weightChartData = {
      labels: recentWeights.map(w => new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      datasets: [
        {
          data: recentWeights.map(w => w.weight),
          label: 'Daily Weight',
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
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

    // Pain Chart (Last 7 exercises)
    const recentExercises = [...exercises]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7)
      .reverse();

    this.painChartData = {
      labels: recentExercises.map(e => new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      datasets: [
        {
          data: recentExercises.map(e => e.painAfter),
          label: 'Pain After',
          backgroundColor: '#ef4444'
        },
        {
          data: recentExercises.map(e => e.painBefore),
          label: 'Pain Before',
          backgroundColor: '#fca5a5'
        }
      ]
    };
  }

  private calculateRecoveryScore(exercises: ExerciseLog[], habits: HabitLog[]) {
    // 0 to 100 Score
    let score = 0;

    // 1. Pain Factor (Max 40 points) - Lower pain = higher score
    const recentExercise = [...exercises].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    let pain = 5; // Default if no data
    if (recentExercise) pain = recentExercise.painAfter;
    // 0 pain = 40 pts, 10 pain = 0 pts
    score += Math.max(0, 40 - (pain * 4));

    // 2. Exercise Consistency (Max 40 points)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentExs = exercises.filter(e => new Date(e.date) >= oneWeekAgo && e.completed).length;
    // 3+ exercises a week = full 40 pts
    score += Math.min(40, (recentExs / 3) * 40);

    // 3. Habit Consistency (Max 20 points)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const recentHabits = habits.filter(h => new Date(h.date) >= oneDayAgo && h.completed).length;
    // 2+ habits in last 2 days = full 20 pts
    score += Math.min(20, (recentHabits / 2) * 20);

    this.recoveryScore = Math.round(score);

    if (this.recoveryScore >= 80) this.recoveryScoreColor = 'text-green-400';
    else if (this.recoveryScore >= 50) this.recoveryScoreColor = 'text-yellow-400';
    else this.recoveryScoreColor = 'text-red-400';

    // Broadcast to native Android App Widget via SharedPreferences
    Preferences.set({ key: 'epic_builder_recovery_score', value: this.recoveryScore.toString() });
    Preferences.set({ key: 'epic_builder_weekly_status', value: this.weeklyExerciseCompletion });
  }

  // --- Quick Logs ---
  quickLogWater() {
    const log: DietLog = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      category: 'Snack',
      foodName: 'Water (250ml)',
      portion: '250ml',
      calories: 0,
      notes: 'Quick Log'
    };
    this.dataService.addDiet(log);
    // Optional: show a mini toast or pulse effect
  }

  quickLogWalk() {
    const log: ExerciseLog = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      name: 'Quick Hit Walk',
      completed: true,
      sets: 1,
      reps: 1,
      duration: 10,
      painBefore: 0,
      painAfter: 0,
      notes: '1-Tap 10 Min Recovery Walk'
    };
    this.dataService.addExercise(log);
  }

  // --- Weekly Insights Engine ---
  private generateInsights(exercises: ExerciseLog[], weights: WeightLog[]) {
    if (exercises.length === 0) {
      this.insightTitle = 'Embark on your Journey';
      this.insightText = 'Begin logging your rites to receive guidance from the scribes.';
      this.insightIcon = 'book';
      return;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentExercises = exercises.filter(e => new Date(e.date) >= oneWeekAgo);

    // Insight 1: Inactivity alert
    if (recentExercises.length === 0) {
      this.insightTitle = 'The Forge is Cold';
      this.insightText = 'You haven’t logged any activity in the last 7 days. Start small: try the 10-minute Quick Walk to rekindle the fires.';
      this.insightIcon = 'alert';
      return;
    }

    // Insight 2: Pain correlation
    const avgRecentPain = recentExercises.reduce((sum, e) => sum + e.painAfter, 0) / recentExercises.length;
    if (avgRecentPain > 6) {
      this.insightTitle = 'High Suffering Detected';
      this.insightText = 'Your recent pain levels average above 6. Prioritize light mobility, McKenzie Extensions, and rest over intensity today.';
      this.insightIcon = 'alert';
      return;
    } else if (avgRecentPain <= 3 && recentExercises.length > 2) {
      this.insightTitle = 'Green Zone Achieved';
      this.insightText = 'Your pain is under control. It is an excellent time to focus on core strengthening like the McGill Big 3.';
      this.insightIcon = 'star';
      return;
    }

    // Insight 3: Consistency Praise
    if (recentExercises.length >= 4) {
      this.insightTitle = 'Unbreakable Will';
      this.insightText = `You've completed ${recentExercises.length} sessions this week. This is how legends are forged. Maintain this momentum with steady state cardio.`;
      this.insightIcon = 'star';
      return;
    }

    // Default neutral insight
    this.insightTitle = 'Steady Progress';
    this.insightText = `You are maintaining your discipline. Consider pushing slightly harder in your next session if your body permits.`;
    this.insightIcon = 'book';
  }

  completeQuest(questId: string) {
    this.dataService.completeQuest(questId);
  }
}
