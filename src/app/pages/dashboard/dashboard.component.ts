import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

import { DataService } from '../../services/data.service';
import { ExerciseLog, WeightLog, Settings, DietLog, HabitLog, Quest, HabitTemplate } from '../../models/types';

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
  insightIcon: string = 'book';

  // RPG Leveling & Quests
  quests: Quest[] = [];
  heroLevel: number = 1;
  heroXp: number = 0;

  // Streak
  streakDays: number = 0;

  // Pain trend
  painTrend: 'up' | 'down' | 'stable' | 'none' = 'none';

  // Toast
  toastMessage: string = '';
  toastVisible: boolean = false;
  private toastTimer: any = null;

  // Quick habits
  habitTemplates: HabitTemplate[] = [];
  habitLogs: HabitLog[] = [];
  todayString = new Date().toISOString().split('T')[0];

  // Stored data for export
  private allExercises: ExerciseLog[] = [];
  private allWeights: WeightLog[] = [];
  private allDiets: DietLog[] = [];
  private allCheckIns: any[] = [];

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
      this.dataService.xp$,
      this.dataService.habitTemplates$,
      this.dataService.diets$,
      this.dataService.checkIns$
    ]).subscribe(([weights, exercises, settings, habits, quests, level, xp, templates, diets, checkIns]) => {
      this.allExercises = exercises;
      this.allWeights = weights;
      this.allDiets = diets;
      this.allCheckIns = checkIns;
      this.habitTemplates = templates;
      this.habitLogs = habits;

      this.processSummaryData(weights, exercises, settings);
      this.processChartData(weights, exercises);
      this.calculateRecoveryScore(exercises, habits);
      this.generateInsights(exercises, weights);
      this.calculateStreak(exercises, habits, diets);
      this.calculatePainTrend(exercises);
      this.quests = quests;
      this.heroLevel = level;
      this.heroXp = xp;
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // -- Toast --
  showToast(message: string) {
    this.toastMessage = message;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, 2000);
  }

  // -- Streak --
  private calculateStreak(exercises: ExerciseLog[], habits: HabitLog[], diets: DietLog[]) {
    const activityDates = new Set<string>();
    exercises.forEach(e => activityDates.add(e.date));
    habits.filter(h => h.completed).forEach(h => activityDates.add(h.date));
    diets.forEach(d => activityDates.add(d.date));

    let streak = 0;
    const check = new Date();
    check.setHours(0, 0, 0, 0);

    const todayStr = check.toISOString().split('T')[0];
    if (!activityDates.has(todayStr)) {
      check.setDate(check.getDate() - 1);
    }

    let dateStr = check.toISOString().split('T')[0];
    while (activityDates.has(dateStr)) {
      streak++;
      check.setDate(check.getDate() - 1);
      dateStr = check.toISOString().split('T')[0];
    }

    this.streakDays = streak;
  }

  // -- Pain Trend --
  private calculatePainTrend(exercises: ExerciseLog[]) {
    const sorted = [...exercises].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sorted.length < 2) {
      this.painTrend = 'none';
      return;
    }

    const recent = sorted.slice(0, 3);
    const latest = recent[0].painAfter;
    const prev = recent[recent.length - 1].painAfter;

    if (latest < prev) this.painTrend = 'down';
    else if (latest > prev) this.painTrend = 'up';
    else this.painTrend = 'stable';
  }

  // -- Quick Habits --
  isHabitDoneToday(habitId: string): boolean {
    return this.habitLogs.some(l => l.habitId === habitId && l.date === this.todayString && l.completed);
  }

  toggleQuickHabit(template: HabitTemplate) {
    const done = this.isHabitDoneToday(template.id);
    this.dataService.addHabitLog({
      id: Date.now().toString(),
      habitId: template.id,
      name: template.name,
      date: this.todayString,
      completed: !done
    });
    this.showToast(done ? `${template.name} undone` : `${template.name} logged!`);
  }

  // -- Export for Doctor --
  async exportForDoctor() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const recentEx = this.allExercises.filter(e => e.date >= weekAgoStr);
    const recentWeights = this.allWeights.filter(w => w.date >= weekAgoStr);
    const recentCheckIns = this.allCheckIns.filter((c: any) => c.date >= weekAgoStr);

    let report = `SPINE RECOVERY - 7 DAY REPORT\n`;
    report += `Generated: ${new Date().toLocaleDateString()}\n`;
    report += `${'='.repeat(35)}\n\n`;

    if (recentEx.length > 0) {
      const avgPain = (recentEx.reduce((s, e) => s + e.painAfter, 0) / recentEx.length).toFixed(1);
      const minPain = Math.min(...recentEx.map(e => e.painAfter));
      const maxPain = Math.max(...recentEx.map(e => e.painAfter));
      report += `PAIN LEVELS\n`;
      report += `  Average: ${avgPain}/10\n`;
      report += `  Range: ${minPain} - ${maxPain}\n`;
      report += `  Sessions: ${recentEx.length}\n\n`;
    }

    if (recentWeights.length > 0) {
      const latest = recentWeights[0];
      report += `WEIGHT\n`;
      report += `  Current: ${latest.weight} ${this.units}\n`;
      report += `  Total lost: ${latest.totalLost} ${this.units}\n\n`;
    }

    if (recentEx.length > 0) {
      report += `EXERCISES (${recentEx.length} sessions)\n`;
      recentEx.forEach(e => {
        report += `  ${e.date}: ${e.name} - Pain ${e.painBefore}->${e.painAfter}`;
        if (e.notes) report += ` (${e.notes})`;
        report += `\n`;
      });
      report += `\n`;
    }

    if (recentCheckIns.length > 0) {
      report += `DAILY CHECK-INS\n`;
      recentCheckIns.forEach((c: any) => {
        report += `  ${c.date}: Pain ${c.painLevel}/10, Energy ${c.energyLevel}/5, Mood: ${c.mood}\n`;
      });
      report += `\n`;
    }

    report += `Recovery Score: ${this.recoveryScore}/100\n`;
    report += `Activity Streak: ${this.streakDays} days\n`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Spine Recovery Report', text: report });
        this.showToast('Report shared!');
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(report);
      this.showToast('Report copied to clipboard!');
    } catch {
      const el = document.createElement('textarea');
      el.value = report;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.showToast('Report copied!');
    }
  }

  private processSummaryData(weights: WeightLog[], exercises: ExerciseLog[], settings: Settings) {
    this.targetWeight = settings.targetWeight;
    this.units = settings.units;

    if (weights.length > 0) {
      const latest = weights[0];
      this.currentWeight = latest.weight;
      this.totalLost = latest.totalLost;
    }

    if (exercises.length > 0) {
      const latestExercise = [...exercises].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      this.latestPainScore = latestExercise.painAfter;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const lastWeekExercises = exercises.filter(e => new Date(e.date) >= oneWeekAgo);
      const completed = lastWeekExercises.filter(e => e.completed).length;
      this.weeklyExerciseCompletion = `${completed}/${lastWeekExercises.length}`;
    }
  }

  private processChartData(weights: WeightLog[], exercises: ExerciseLog[]) {
    const recentWeights = weights.slice(0, 7).reverse();

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
          borderColor: '#fbbf24',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 2
        }
      ]
    };

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
    let score = 0;

    const recentExercise = [...exercises].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    let pain = 5;
    if (recentExercise) pain = recentExercise.painAfter;
    score += Math.max(0, 40 - (pain * 4));

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentExs = exercises.filter(e => new Date(e.date) >= oneWeekAgo && e.completed).length;
    score += Math.min(40, (recentExs / 3) * 40);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const recentHabits = habits.filter(h => new Date(h.date) >= oneDayAgo && h.completed).length;
    score += Math.min(20, (recentHabits / 2) * 20);

    this.recoveryScore = Math.round(score);

    if (this.recoveryScore >= 80) this.recoveryScoreColor = 'text-green-400';
    else if (this.recoveryScore >= 50) this.recoveryScoreColor = 'text-yellow-400';
    else this.recoveryScoreColor = 'text-red-400';

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
    this.showToast('+250ml Water logged!');
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
    this.showToast('+10min Walk logged!');
  }

  async testLocalNotification() {
    if (!Capacitor.isNativePlatform()) {
      alert("Local notifications only work on an Android/iOS device.");
      return;
    }

    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') {
        this.insightTitle = 'Permission Denied';
        this.insightText = 'Notification permission was denied. Enable it in your device Settings > Apps > Epic Builder > Notifications.';
        this.insightIcon = 'alert';
        return;
      }
    }

    await LocalNotifications.createChannel({
      id: 'epic-custom-v4',
      name: 'Custom Reminders',
      description: 'Custom timed notifications with sound',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
    });

    const fireDate = new Date();
    fireDate.setSeconds(fireDate.getSeconds() + 5);

    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Test Successful!",
          body: "If you see and hear this, your notifications are working perfectly.",
          id: 9999,
          channelId: 'epic-custom-v4',
          smallIcon: 'ic_stat_icon',
          iconColor: '#FBBF24',
          schedule: { at: fireDate }
        }
      ]
    });

    this.showToast('Notification firing in 5s...');
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

    if (recentExercises.length === 0) {
      this.insightTitle = 'The Forge is Cold';
      this.insightText = 'You haven\'t logged any activity in the last 7 days. Start small: try the 10-minute Quick Walk to rekindle the fires.';
      this.insightIcon = 'alert';
      return;
    }

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

    if (recentExercises.length >= 4) {
      this.insightTitle = 'Unbreakable Will';
      this.insightText = `You've completed ${recentExercises.length} sessions this week. This is how legends are forged. Maintain this momentum with steady state cardio.`;
      this.insightIcon = 'star';
      return;
    }

    this.insightTitle = 'Steady Progress';
    this.insightText = `You are maintaining your discipline. Consider pushing slightly harder in your next session if your body permits.`;
    this.insightIcon = 'book';
  }

  completeQuest(questId: string) {
    this.dataService.completeQuest(questId);
  }
}
