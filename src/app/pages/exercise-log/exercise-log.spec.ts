import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExerciseLog } from './exercise-log';

describe('ExerciseLog', () => {
  let component: ExerciseLog;
  let fixture: ComponentFixture<ExerciseLog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExerciseLog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExerciseLog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
