import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Gauge } from './gauge';

describe('Gauge', () => {
  let component: Gauge;
  let fixture: ComponentFixture<Gauge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gauge],
    }).compileComponents();

    fixture = TestBed.createComponent(Gauge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
