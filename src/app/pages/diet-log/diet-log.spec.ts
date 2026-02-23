import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DietLog } from './diet-log';

describe('DietLog', () => {
  let component: DietLog;
  let fixture: ComponentFixture<DietLog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DietLog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DietLog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
