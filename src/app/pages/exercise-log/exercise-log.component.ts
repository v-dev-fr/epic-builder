import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ExerciseLog } from '../../models/types';

interface ExerciseTemplate {
  id: string;
  name: string;
  defaultSets: number;
  defaultReps: number;
  isCardio: boolean;
}

@Component({
  selector: 'app-exercise-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exercise-log.component.html',
  styleUrl: './exercise-log.css'
})
export class ExerciseLogComponent implements OnInit, OnDestroy {
  activeTab: 'log' | 'history' = 'log';
  
  templates: ExerciseTemplate[] = [
    { id: '1', name: 'McGill Big 3', defaultSets: 3, defaultReps: 10, isCardio: false },
    { id: '2', name: 'Modified Curl-Up', defaultSets: 3, defaultReps: 10, isCardio: false },
    { id: '3', name: 'McKenzie Extensions', defaultSets: 3, defaultReps: 15, isCardio: false },
    { id: '4', name: 'Neck Retractions', defaultSets: 3, defaultReps: 10, isCardio: false },
    { id: '5', name: 'Walking (Cardio)', defaultSets: 1, defaultReps: 1, isCardio: true },
    { id: '6', name: 'Swimming (Cardio)', defaultSets: 1, defaultReps: 1, isCardio: true }
  ];

  selectedTemplateId: string = this.templates[0].id;
  currentTemplate: ExerciseTemplate = this.templates[0];

  // Form Model
  newLog: Partial<ExerciseLog> = {};

  // History List
  history: ExerciseLog[] = [];

  constructor(private dataService: DataService) {}

  // Timer State
  timerActive: boolean = false;
  timerInterval: any;
  timeElapsedSeconds: number = 0;

  ngOnInit() {
    this.dataService.exercises$.subscribe(data => {
      this.history = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    this.resetForm();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  onTemplateChange() {
    this.currentTemplate = this.templates.find(t => t.id === this.selectedTemplateId) || this.templates[0];
    this.newLog.name = this.currentTemplate.name;
    this.newLog.sets = this.currentTemplate.defaultSets;
    this.newLog.reps = this.currentTemplate.defaultReps;
    this.newLog.templateId = this.currentTemplate.id;
    
    if (this.currentTemplate.isCardio) {
      this.newLog.cardioType = this.currentTemplate.name;
    } else {
      this.newLog.cardioType = undefined;
      this.newLog.cardioDuration = undefined;
    }
  }

  resetForm() {
    this.newLog = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      templateId: this.currentTemplate.id,
      name: this.currentTemplate.name,
      completed: true,
      sets: this.currentTemplate.defaultSets,
      reps: this.currentTemplate.defaultReps,
      duration: 15,
      painBefore: 0,
      painAfter: 0,
      notes: ''
    };
    if (this.currentTemplate.isCardio) {
      this.newLog.cardioType = this.currentTemplate.name;
      this.newLog.cardioDuration = 30;
    }
  }

  saveLog() {
    this.dataService.addExercise(this.newLog as ExerciseLog);
    this.resetForm();
    this.activeTab = 'history';
  }

  // --- Timer Functions ---
  toggleTimer() {
    if (this.timerActive) {
      clearInterval(this.timerInterval);
      this.timerActive = false;
      // Auto-fill duration if it's a cardio/timed event
      if (this.currentTemplate.isCardio) {
         this.newLog.cardioDuration = Math.round(this.timeElapsedSeconds / 60);
      }
    } else {
      this.timerActive = true;
      this.timerInterval = setInterval(() => {
        this.timeElapsedSeconds++;
      }, 1000);
    }
  }

  resetTimer() {
    clearInterval(this.timerInterval);
    this.timerActive = false;
    this.timeElapsedSeconds = 0;
  }

  get formattedTime(): string {
    const m = Math.floor(this.timeElapsedSeconds / 60);
    const s = this.timeElapsedSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
