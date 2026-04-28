import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusBar } from './status-bar';
import { type StatusBarItem } from '../../models/shared/dashboard.model';

describe('StatusBar', () => {
  let component: StatusBar;
  let fixture: ComponentFixture<StatusBar>;

  const mockItems: StatusBarItem[] = [
    {
      label: 'OK',
      value: 50,
      percent: 50,
      barClass: 'progress-bar bg-success',
      itemClass: 'status-chart__item status-chart__item--ok',
    },
    {
      label: 'CAMADA GOLD ATRASADA',
      value: 10,
      percent: 10,
      barClass: 'progress-bar bg-warning text-dark',
      itemClass: 'status-chart__item status-chart__item--warning',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBar],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render empty list by default', () => {
    fixture.detectChanges();
    expect(component.items()).toEqual([]);
  });

  it('should render items when provided', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.status-chart__item').length).toBe(2);
  });
});
