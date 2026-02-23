import { TestBed } from '@angular/core/testing';

import { Reminders } from './reminders';

describe('Reminders', () => {
  let service: Reminders;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Reminders);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
