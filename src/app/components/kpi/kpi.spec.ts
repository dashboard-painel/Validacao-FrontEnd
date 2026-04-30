import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Kpi } from './kpi';

describe('Kpi', () => {
  let component: Kpi;
  let fixture: ComponentFixture<Kpi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Kpi],
    }).compileComponents();

    fixture = TestBed.createComponent(Kpi);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Total de farmacias');
    fixture.componentRef.setInput('value', 42);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
