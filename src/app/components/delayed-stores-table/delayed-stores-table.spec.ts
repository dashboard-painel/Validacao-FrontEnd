import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { DelayedStoresTable } from './delayed-stores-table';
import { type DelayedStoreRow, type ProblemLayer } from '../../models/shared/dashboard.model';

const MOCK_ROW: DelayedStoreRow = {
  id: '1',
  associationCode: 'ASS001',
  farmaCode: 'F001',
  cnpj: '12345678000195',
  pharmacyName: 'Farma Teste',
  delayHours: 50,
  problemLayers: ['Gold'],
  layerItems: [{ label: 'Gold', className: 'delayed-stores__layer delayed-stores__layer--gold' }],
  sitContrato: 'Ativo',
  classificacao: 'Crítico',
  possivelCausa: 'Pipeline falhou',
  codigoRede: null,
  numVersao: null,
  lastSalesByLayer: { Gold: '2024-01-01 10:00' },
  status: 'Com atraso',
};

describe('DelayedStoresTable', () => {
  let fixture: ComponentFixture<DelayedStoresTable>;
  let component: DelayedStoresTable;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelayedStoresTable],
    }).compileComponents();

    fixture = TestBed.createComponent(DelayedStoresTable);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', []);
    fixture.componentRef.setInput('visibleRows', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('urgencyClass returns "critical" for >=48h, "high" for >=24h, "moderate" otherwise', () => {
    expect(component.urgencyClass(48)).toBe('critical');
    expect(component.urgencyClass(72)).toBe('critical');
    expect(component.urgencyClass(24)).toBe('high');
    expect(component.urgencyClass(30)).toBe('high');
    expect(component.urgencyClass(10)).toBe('moderate');
  });

  it('rowUrgencyClass returns "nodata" for Sem dados rows', () => {
    const nodataRow = { ...MOCK_ROW, problemLayers: ['Sem dados'] as ProblemLayer[], delayHours: 0 };
    expect(component.rowUrgencyClass(nodataRow as DelayedStoreRow)).toBe('nodata');
  });

  it('rowUrgencyClass returns "ok" for zero delay without Sem dados', () => {
    const okRow = { ...MOCK_ROW, problemLayers: [] as ProblemLayer[], delayHours: 0 };
    expect(component.rowUrgencyClass(okRow as DelayedStoreRow)).toBe('ok');
  });

  it('formatDelay returns days for >48h and hours otherwise', () => {
    expect(component.formatDelay(72)).toBe('3 dias');
    expect(component.formatDelay(24)).toBe('24 horas');
  });

  it('multiFilterSummary returns "Todos" when nothing selected', () => {
    expect(component.multiFilterSummary('associationCode')).toBe('Todos');
  });

  it('isMultiFilterOpen returns true only for the matching key', () => {
    fixture.componentRef.setInput('openMultiFilter', 'farmaCode');
    expect(component.isMultiFilterOpen('farmaCode')).toBe(true);
    expect(component.isMultiFilterOpen('cnpj')).toBe(false);
  });

  it('filteredAssociationCodeOptions filters by search term', () => {
    fixture.componentRef.setInput('associationCodeOptions', ['ASS001', 'ASS002', 'XYZ']);
    fixture.componentRef.setInput('multiFilterSearch', {
      associationCode: 'ass',
      farmaCode: '',
      cnpj: '',
    });
    fixture.detectChanges();
    const result = component.filteredAssociationCodeOptions();
    expect(result).toEqual(['ASS001', 'ASS002']);
  });
});
