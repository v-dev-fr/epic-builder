import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { AppData, ExerciseLog, DietLog, WeightLog, FoodItem, Settings, Reminder, HabitLog, CheckIn, Quest, HabitTemplate } from '../models/types';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly FILE_NAME = 'spine_recovery_data.json';
  private readonly STORAGE_KEY = 'spine_recovery_data';

  private defaultData: AppData = {
    exercises: [],
    diets: [],
    weights: [],
    foods: [
      { id: '1', name: 'Almonds', servingSize: '30g', calories: 170, protein: 6 },
      { id: '2', name: 'Chicken Breast', servingSize: '100g', calories: 165, protein: 31 },
      { id: '3', name: 'Brown Rice', servingSize: '1 cup', calories: 216, protein: 5 }
    ],
    settings: { targetWeight: 75, units: 'kg', height: 175, focusMode: 'recovery', theme: 'obsidian' },
    reminders: [
      {
        id: '1',
        title: 'Hydrate - Elixir of Life',
        frequency: 'daily',
        time: '09:00',
        intervalMode: true,
        intervalMinutes: 90,
        startWindow: '08:00',
        endWindow: '20:00',
        snoozeEnabled: true,
        priority: 'high',
        isActive: true
      },
      {
        id: '2',
        title: 'Mobility Routine - Unbind the Spine',
        frequency: 'daily',
        time: '20:30',
        intervalMode: false,
        snoozeEnabled: true,
        priority: 'high',
        isActive: true
      }
    ],
    habits: [],
    checkIns: [],
    quests: [
      { id: 'q1', title: 'Start the Journey', description: 'Complete your first exercise log.', xpPoints: 50, completed: false },
      { id: 'q2', title: 'Hydration Master', description: 'Log drinking water as a Quick Rite.', xpPoints: 75, completed: false },
      { id: 'q3', title: 'Legendary Streak', description: 'Reach a 3-day discipline streak.', xpPoints: 100, completed: false },
      { id: 'q4', title: 'Knowledge is Power', description: 'Add a custom food item to the reference database.', xpPoints: 50, completed: false }
    ],
    level: 1,
    xp: 0,
    habitTemplates: [
      { id: 'water', name: 'Water Goal Met' },
      { id: 'walk', name: 'Daily Walk Completed' },
      { id: 'nopain', name: 'No Pain Flare Today' }
    ]
  };

  private exercisesSubject = new BehaviorSubject<ExerciseLog[]>([]);
  private dietsSubject = new BehaviorSubject<DietLog[]>([]);
  private weightsSubject = new BehaviorSubject<WeightLog[]>([]);
  private foodsSubject = new BehaviorSubject<FoodItem[]>([]);
  private settingsSubject = new BehaviorSubject<Settings>(this.defaultData.settings);
  private remindersSubject = new BehaviorSubject<Reminder[]>([]);
  private habitsSubject = new BehaviorSubject<HabitLog[]>([]);
  private checkInsSubject = new BehaviorSubject<CheckIn[]>([]);
  private questsSubject = new BehaviorSubject<Quest[]>([]);
  private levelSubject = new BehaviorSubject<number>(1);
  private xpSubject = new BehaviorSubject<number>(0);
  private habitTemplatesSubject = new BehaviorSubject<HabitTemplate[]>([]);

  exercises$ = this.exercisesSubject.asObservable();
  diets$ = this.dietsSubject.asObservable();
  weights$ = this.weightsSubject.asObservable();
  foods$ = this.foodsSubject.asObservable();
  settings$ = this.settingsSubject.asObservable();
  reminders$ = this.remindersSubject.asObservable();
  habits$ = this.habitsSubject.asObservable();
  checkIns$ = this.checkInsSubject.asObservable();
  quests$ = this.questsSubject.asObservable();
  level$ = this.levelSubject.asObservable();
  xp$ = this.xpSubject.asObservable();
  habitTemplates$ = this.habitTemplatesSubject.asObservable();

  constructor() {
    this.loadData();
  }

  private async loadData() {
    let data: AppData | null = null;
    try {
      if (Capacitor.isNativePlatform()) {
        const contents = await Filesystem.readFile({
          path: this.FILE_NAME,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        });
        if (typeof contents.data === 'string') {
           data = JSON.parse(contents.data);
        }
      } else {
        const localData = localStorage.getItem(this.STORAGE_KEY);
        if (localData) {
          data = JSON.parse(localData);
        }
      }
    } catch (e) {
      console.log('No local data found, initializing with defaults.');
    }

    if (!data) {
      data = this.defaultData;
      this.saveData(data);
    }

    this.exercisesSubject.next(data.exercises || []);
    this.dietsSubject.next(data.diets || []);
    this.weightsSubject.next(data.weights || []);
    this.foodsSubject.next(data.foods || this.defaultData.foods);
    this.settingsSubject.next(data.settings || this.defaultData.settings);
    this.remindersSubject.next(data.reminders || this.defaultData.reminders);
    this.habitsSubject.next(data.habits || []);
    this.checkInsSubject.next(data.checkIns || []);
    this.questsSubject.next(data.quests || this.defaultData.quests!);
    this.levelSubject.next(data.level || 1);
    this.xpSubject.next(data.xp || 0);
    this.habitTemplatesSubject.next(data.habitTemplates || this.defaultData.habitTemplates!);
  }

  private async saveData(data: AppData) {
    const jsonString = JSON.stringify(data);
    
    try {
      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: this.FILE_NAME,
          data: jsonString,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        });
      } else {
        localStorage.setItem(this.STORAGE_KEY, jsonString);
      }
    } catch (e) {
      console.error('Failed to save data', e);
    }
  }

  private getCurrentData(): AppData {
    return {
      exercises: this.exercisesSubject.getValue(),
      diets: this.dietsSubject.getValue(),
      weights: this.weightsSubject.getValue(),
      foods: this.foodsSubject.getValue(),
      settings: this.settingsSubject.getValue(),
      reminders: this.remindersSubject.getValue(),
      habits: this.habitsSubject.getValue(),
      checkIns: this.checkInsSubject.getValue(),
      quests: this.questsSubject.getValue(),
      level: this.levelSubject.getValue(),
      xp: this.xpSubject.getValue(),
      habitTemplates: this.habitTemplatesSubject.getValue()
    };
  }

  // --- CRUD Operations ---

  addExercise(exercise: ExerciseLog) {
    const data = this.getCurrentData();
    data.exercises.push(exercise);
    this.exercisesSubject.next(data.exercises);
    this.saveData(data);
  }

  addDiet(diet: DietLog) {
    const data = this.getCurrentData();
    data.diets.push(diet);
    this.dietsSubject.next(data.diets);
    this.saveData(data);
  }

  addWeight(weightLog: WeightLog) {
    const data = this.getCurrentData();
    data.weights.push(weightLog);
    data.weights.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this.weightsSubject.next(data.weights);
    this.saveData(data);
  }

  addFood(food: FoodItem) {
    const data = this.getCurrentData();
    data.foods.push(food);
    this.foodsSubject.next(data.foods);
    this.saveData(data);
  }

  updateSettings(settings: Settings) {
    const data = this.getCurrentData();
    data.settings = settings;
    this.settingsSubject.next(settings);
    this.saveData(data);
  }

  updateReminders(reminders: Reminder[]) {
    const data = this.getCurrentData();
    data.reminders = reminders;
    this.remindersSubject.next(reminders);
    this.saveData(data);
  }

  addReminder(reminder: Reminder) {
    const data = this.getCurrentData();
    data.reminders.push(reminder);
    this.remindersSubject.next(data.reminders);
    this.saveData(data);
  }

  addHabitLog(habit: HabitLog) {
    const data = this.getCurrentData();
    data.habits.push(habit);
    this.habitsSubject.next(data.habits);
    this.saveData(data);
  }

  addCheckIn(checkIn: CheckIn) {
    const data = this.getCurrentData();
    const existingIndex = data.checkIns.findIndex(c => c.date === checkIn.date);
    if(existingIndex >= 0) {
      data.checkIns[existingIndex] = checkIn;
    } else {
      data.checkIns.push(checkIn);
    }
    this.checkInsSubject.next(data.checkIns);
    this.saveData(data);
  }

  // --- Quests & Levels ---
  completeQuest(questId: string) {
    const data = this.getCurrentData();
    let quests = [...(data.quests || [])]; // Create a mutable copy
    const index = quests.findIndex(q => q.id === questId);
    if (index >= 0 && !quests[index].completed) {
      quests[index].completed = true;
      quests[index].completedDate = new Date().toISOString();
      data.quests = quests; // Update the data object
      this.questsSubject.next(quests);
      this.addXP(quests[index].xpPoints);
      this.saveData(data); // Save the updated data
    }
  }

  addQuest(quest: Quest) {
    const data = this.getCurrentData();
    let quests = [...(data.quests || [])];
    quests.push(quest);
    data.quests = quests;
    this.questsSubject.next(quests);
    this.saveData(data);
  }

  addXP(points: number) {
    const data = this.getCurrentData();
    let xp = (data.xp || 0) + points;
    let level = data.level || 1;
    
    // Level up logic: 100 XP per level sequentially
    const xpNeeded = level * 100;
    if (xp >= xpNeeded) {
      xp -= xpNeeded;
      level += 1;
    }
    
    data.xp = xp;
    data.level = level;
    this.xpSubject.next(xp);
    this.levelSubject.next(level);
    this.saveData(data);
  }

  // --- Habit Templates ---
  updateHabitTemplates(templates: HabitTemplate[]) {
    const data = this.getCurrentData();
    data.habitTemplates = templates;
    this.habitTemplatesSubject.next(templates);
    this.saveData(data);
  }
}
