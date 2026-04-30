import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DashboardFilterState } from './dashboard-filter.state';

describe('DashboardFilterState', () => {
  let state: DashboardFilterState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardFilterState],
    });

    state = TestBed.inject(DashboardFilterState);
  });

  it('usa os padroes atuais do dashboard', () => {
    expect(state.sortColumn()).toBe('delayHours');
    expect(state.sortDir()).toBe('desc');
    expect(state.selectedGlobalFilters()).toEqual({
      associationCode: [],
      sitContrato: ['Ativo'],
      classificacao: ['Padrão'],
    });
    expect(state.hasActiveGlobalFilters()).toBe(true);
    expect(state.hasActiveFilters()).toBe(false);
  });

  it('sortBy mantem atraso decrescente por padrao e alterna as outras colunas', () => {
    state.sortBy('associationCode');
    expect(state.sortColumn()).toBe('associationCode');
    expect(state.sortDir()).toBe('asc');

    state.sortBy('associationCode');
    expect(state.sortDir()).toBe('desc');

    state.sortBy('delayHours');
    expect(state.sortColumn()).toBe('delayHours');
    expect(state.sortDir()).toBe('desc');
  });

  it('setMinDelayHoursFilter atualiza o filtro rapido e reseta a paginacao', () => {
    state.renderedRowsCount.set(120);

    state.setMinDelayHoursFilter(48);

    expect(state.minDelayHoursFilter()).toBe(48);
    expect(state.hasActiveFilters()).toBe(true);
    expect(state.renderedRowsCount()).toBe(60);
  });

  it('clearFilters reseta o estado local e preserva os padroes globais atuais', () => {
    state.renderedRowsCount.set(120);
    state.toggleMultiCheckbox('associationCode', 'ASS01', true);
    state.setPharmacyNameFilter('Farma Centro');
    state.toggleProblemLayer('Gold', true);
    state.toggleStoreStatus('Com atraso', true);
    state.toggleSitContratoLocal('Ativo', true);
    state.setPossivelCausaFilter('Pipeline falhou');
    state.setMinDelayHoursFilter(24);

    state.clearFilters();

    expect(state.selectedMultiFilters()).toEqual({
      associationCode: [],
      farmaCode: [],
      cnpj: [],
    });
    expect(state.pharmacyNameFilter()).toBe('');
    expect(state.selectedProblemLayers()).toEqual([]);
    expect(state.selectedStoreStatuses()).toEqual([]);
    expect(state.selectedSitContratosLocal()).toEqual([]);
    expect(state.possivelCausaFilter()).toBe('');
    expect(state.minDelayHoursFilter()).toBe(0);
    expect(state.openMultiFilter()).toBeNull();
    expect(state.renderedRowsCount()).toBe(60);
    expect(state.selectedGlobalFilters()).toEqual({
      associationCode: [],
      sitContrato: ['Ativo'],
      classificacao: ['Padrão'],
    });
  });

  it('clearGlobalFilters remove o escopo global padrao', () => {
    state.renderedRowsCount.set(120);

    state.clearGlobalFilters();

    expect(state.selectedGlobalFilters()).toEqual({
      associationCode: [],
      sitContrato: [],
      classificacao: [],
    });
    expect(state.hasActiveGlobalFilters()).toBe(false);
    expect(state.globalFilterSearch()).toBe('');
    expect(state.openGlobalFilter()).toBeNull();
    expect(state.renderedRowsCount()).toBe(60);
  });
});
