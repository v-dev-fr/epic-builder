export interface ExerciseLog {
  id: string;
  date: string;
  templateId?: string;
  name: string;
  completed: boolean;
  sets: number;
  reps: number;
  duration: number; // minutes
  cardioType?: string;
  cardioDuration?: number; // minutes
  painBefore: number; // 0-10
  painAfter: number; // 0-10
  notes: string;
}

export interface DietLog {
  id: string;
  date: string;
  category: 'Morning' | 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';
  foodName: string;
  portion: string;
  calories: number;
  notes: string;
}

export interface WeightLog {
  id: string;
  date: string;
  weight: number;
  waist: number;
  bmi: number;
  totalLost: number;
  notes: string;
}

export interface FoodItem {
  id: string;
  name: string;
  servingSize: string;
  calories: number;
  protein: number;
}

export interface Settings {
  targetWeight: number;
  units: 'kg' | 'lbs';
  height: number; // for BMI calculation
  focusMode?: 'recovery' | 'weight_loss' | 'maintenance';
  theme?: 'obsidian' | 'crimson' | 'ocean' | 'forest';
}

export interface AppData {
  exercises: ExerciseLog[];
  diets: DietLog[];
  weights: WeightLog[];
  foods: FoodItem[];
  settings: Settings;
  reminders: Reminder[];
  habits: HabitLog[];
  checkIns: CheckIn[];
  quests?: Quest[];
  level?: number;
  xp?: number;
  habitTemplates?: HabitTemplate[];
}

export interface HabitTemplate {
  id: string;
  name: string;
}

export interface Reminder {
  id: string;
  title: string;
  frequency: 'once' | 'daily' | 'weekdays' | 'custom';
  customDays?: number[]; // 0=Sun, 1=Mon, etc.
  time: string; // HH:mm format
  intervalMode: boolean;
  intervalMinutes?: number;
  startWindow?: string;
  endWindow?: string;
  snoozeEnabled: boolean;
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  lastTriggered?: string;
}

export interface HabitLog {
  id: string;
  habitId: string; // ID linking to the type of habit (e.g. 'water', 'walk')
  name: string;
  date: string;
  completed: boolean;
}

export interface CheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  painLevel: number; // 0-10
  energyLevel: number; // 1-5
  mood: 'bad' | 'neutral' | 'good' | 'great';
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpPoints: number;
  completed: boolean;
  completedDate?: string;
}
