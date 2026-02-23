import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'exercise', loadComponent: () => import('./pages/exercise-log/exercise-log.component').then(m => m.ExerciseLogComponent) },
      { path: 'diet', loadComponent: () => import('./pages/diet-log/diet-log.component').then(m => m.DietLogComponent) },
      { path: 'weight', loadComponent: () => import('./pages/weight-tracker/weight-tracker.component').then(m => m.WeightTrackerComponent) },
      { path: 'foods', loadComponent: () => import('./pages/food-reference/food-reference.component').then(m => m.FoodReferenceComponent) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'reminders', loadComponent: () => import('./pages/reminders/reminders').then(m => m.Reminders) },
      { path: 'habits', loadComponent: () => import('./pages/habits/habits').then(m => m.Habits) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },
    ]
  },
  { path: '**', redirectTo: '' }
];
