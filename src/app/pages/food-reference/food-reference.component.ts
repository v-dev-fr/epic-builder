import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FoodItem } from '../../models/types';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-food-reference',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './food-reference.component.html',
  styleUrl: './food-reference.css'
})
export class FoodReferenceComponent implements OnInit {
  activeTab: 'search' | 'add' = 'search';
  
  searchTerm = new BehaviorSubject<string>('');
  filteredFoods: FoodItem[] = [];
  
  newFood: Partial<FoodItem> = {};

  constructor(private dataService: DataService) {}

  ngOnInit() {
    combineLatest([
      this.dataService.foods$,
      this.searchTerm.pipe(startWith(''))
    ]).pipe(
      map(([foods, term]) => {
        const lowerTerm = term.toLowerCase();
        return foods.filter(f => f.name.toLowerCase().includes(lowerTerm));
      })
    ).subscribe(filtered => {
      this.filteredFoods = filtered.sort((a,b) => a.name.localeCompare(b.name));
    });

    this.resetForm();
  }

  onSearchChange(event: any) {
    this.searchTerm.next(event.target.value);
  }

  resetForm() {
    this.newFood = {
      id: Date.now().toString(),
      name: '',
      servingSize: '100g',
      calories: 0,
      protein: 0
    };
  }

  saveFood() {
    if (!this.newFood.name || this.newFood.calories === undefined) return;
    this.dataService.addFood(this.newFood as FoodItem);
    this.resetForm();
    this.activeTab = 'search';
    this.searchTerm.next('');
  }
}
