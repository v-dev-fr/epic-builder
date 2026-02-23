import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Settings } from '../../models/types';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.css'
})
export class SettingsComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  settings: Settings = { targetWeight: 75, units: 'kg', height: 175 };
  private sub: Subscription = new Subscription();

  isSaving: boolean = false;
  saveMessage: string = '';

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.sub = this.dataService.settings$.subscribe(s => {
      // Clone to avoid mutating data service state before saving
      this.settings = { ...s };
      if (!this.settings.focusMode) this.settings.focusMode = 'recovery';
      if (!this.settings.theme) this.settings.theme = 'obsidian';
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  saveSettings() {
    this.isSaving = true;
    this.dataService.updateSettings(this.settings);
    
    setTimeout(() => {
      this.isSaving = false;
      this.saveMessage = 'Settings saved successfully!';
      setTimeout(() => this.saveMessage = '', 3000);
    }, 500);
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async handleFileUpload(event: Event) {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const contents = e.target?.result as string;
          const data = JSON.parse(contents);
          if (data && data.settings && data.foods) {
            localStorage.setItem('spine_recovery_data', contents);
            window.location.reload(); // Reload app to pick up new data
          } else {
            alert('Invalid backup file format.');
          }
        } catch(err) {
          alert('Failed to parse backup file.');
        }
      };
      reader.readAsText(file);
    }
  }

  exportData() {
    // Basic web export logic
    const dataString = localStorage.getItem('spine_recovery_data');
    if (!dataString) {
      alert('No data found to export.');
      return;
    }
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epic_builder_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportCSV() {
    const dataString = localStorage.getItem('spine_recovery_data');
    if (!dataString) return alert('No data found.');
    const parsed = JSON.parse(dataString);
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Exercises
    csvContent += "=== EXERCISES ===\n";
    csvContent += "Date,Name,Completed,Sets,Reps,Duration,PainBefore,PainAfter\n";
    if (parsed.exercises) {
      parsed.exercises.forEach((e: any) => {
        csvContent += `${e.date},${e.name},${e.completed},${e.sets||0},${e.reps||0},${e.duration||0},${e.painBefore||0},${e.painAfter||0}\n`;
      });
    }

    csvContent += "\n=== WEIGHTS ===\n";
    csvContent += "Date,Weight,TotalLost\n";
    if (parsed.weights) {
      parsed.weights.forEach((w: any) => {
        csvContent += `${w.date},${w.weight},${w.totalLost||0}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `epic_builder_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
