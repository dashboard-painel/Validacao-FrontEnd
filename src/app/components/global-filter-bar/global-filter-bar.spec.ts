import { ComponentFixture, TestBed } from '@angular/core/testing';

import { type GlobalFilterKey } from '../../models/shared/dashboard.model';
import { GlobalFilterBar } from './global-filter-bar';

describe('GlobalFilterBar', () => {
  let component: GlobalFilterBar;
  let fixture: ComponentFixture<GlobalFilterBar>;

  const filtrosPadrao = { associationCode: [], sitContrato: ['Ativo'], classificacao: ['Padrão'] };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalFilterBar],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalFilterBar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('selectedGlobalFilters', filtrosPadrao);
    await fixture.whenStable();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve indicar filtros ativos quando houver selecoes', () => {
    expect(component.hasActiveFilters()).toBe(true);
  });

  it('deve indicar ausencia de filtros ativos quando tudo estiver vazio', () => {
    fixture.componentRef.setInput('selectedGlobalFilters', {
      associationCode: [],
      sitContrato: [],
      classificacao: [],
    });
    fixture.detectChanges();
    expect(component.hasActiveFilters()).toBe(false);
  });

  it('deve calcular o resumo corretamente', () => {
    expect(component.summary('sitContrato')).toBe('Ativo');
  });

  it('deve emitir clearAll ao chamar onClearAll', () => {
    const emissoes: number[] = [];
    component.clearAll.subscribe(() => emissoes.push(1));
    component.onClearAll();
    expect(emissoes.length).toBe(1);
  });

  it('deve emitir filterChange ao marcar o checkbox de associacao', () => {
    const eventos: { key: GlobalFilterKey; values: string[] }[] = [];
    component.filterChange.subscribe((evento) => eventos.push(evento));

    const entrada = document.createElement('input');
    entrada.type = 'checkbox';
    entrada.checked = true;
    const eventoMock = new Event('change');
    Object.defineProperty(eventoMock, 'target', { value: entrada });

    component.onAssociationCheckbox('ASS01', eventoMock);
    expect(eventos[0]?.key).toBe('associationCode');
    expect(eventos[0]?.values).toContain('ASS01');
  });
});
