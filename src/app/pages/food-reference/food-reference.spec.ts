import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FoodReference } from './food-reference';

describe('FoodReference', () => {
  let component: FoodReference;
  let fixture: ComponentFixture<FoodReference>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoodReference]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FoodReference);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
