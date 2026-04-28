import { ComponentFixture, TestBed } from '@angular/core/testing';

import { type GlobalFilterKey } from '../../models/shared/dashboard.model';
import { GlobalFilterBar } from './global-filter-bar';

describe('GlobalFilterBar', () => {
  let component: GlobalFilterBar;
  let fixture: ComponentFixture<GlobalFilterBar>;

  const defaultFilters = { associationCode: [], sitContrato: ['Ativo'], classificacao: ['Padrão'] };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalFilterBar],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalFilterBar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('selectedGlobalFilters', defaultFilters);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show active filters when selections exist', () => {
    expect(component.hasActiveFilters()).toBe(true);
  });

  it('should show no active filters when all empty', () => {
    fixture.componentRef.setInput('selectedGlobalFilters', {
      associationCode: [],
      sitContrato: [],
      classificacao: [],
    });
    fixture.detectChanges();
    expect(component.hasActiveFilters()).toBe(false);
  });

  it('should compute summary correctly', () => {
    expect(component.summary('sitContrato')).toBe('Ativo');
  });

  it('should emit clearAll when onClearAll called', () => {
    const emissions: number[] = [];
    component.clearAll.subscribe(() => emissions.push(1));
    component.onClearAll();
    expect(emissions.length).toBe(1);
  });

  it('should emit filterChange on association checkbox', () => {
    const events: { key: GlobalFilterKey; values: string[] }[] = [];
    component.filterChange.subscribe((e) => events.push(e));
    component.onAssociationCheckbox('ASS01', { target: { checked: true } } as unknown as Event);
    expect(events[0]?.key).toBe('associationCode');
    expect(events[0]?.values).toContain('ASS01');
  });
});
