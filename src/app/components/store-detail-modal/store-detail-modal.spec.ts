import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreDetailModal } from './store-detail-modal';
import { type DelayedStoreRow } from '../../models/shared/dashboard.model';

const farmaciaMock: DelayedStoreRow = {
  id: 'ASS01-FAR01',
  associationCode: 'ASS01',
  farmaCode: 'FAR01',
  cnpj: '12345678000195',
  pharmacyName: 'Farma Teste',
  delayHours: 72,
  problemLayers: ['Gold'],
  sitContrato: 'ATIVO',
  codigoRede: null,
  numVersao: '4.0.1',
  classificacao: 'GOLD',
  possivelCausa: 'Pipeline falhou',
  status: 'Com atraso',
  layerItems: [{ label: 'Gold em atraso', className: 'delayed-stores__layer--gold' }],
};

describe('StoreDetailModal', () => {
  let component: StoreDetailModal;
  let fixture: ComponentFixture<StoreDetailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreDetailModal],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve permanecer fechado quando store for null', () => {
    fixture.componentRef.setInput('store', null);
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('deve abrir quando store for informada', () => {
    fixture.componentRef.setInput('store', farmaciaMock);
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);
  });

  it('deve emitir closed ao chamar close()', () => {
    const emissoes: number[] = [];
    component.closed.subscribe(() => emissoes.push(1));
    component.close();
    expect(emissoes.length).toBe(1);
  });

  it('deve formatar o atraso corretamente para valores acima de 48h', () => {
    expect(component.formatDelay(72)).toBe('3 dias');
  });

  it('deve classificar a urgencia corretamente', () => {
    expect(component.urgencyClass(72)).toBe('critical');
    expect(component.urgencyClass(36)).toBe('high');
    expect(component.urgencyClass(12)).toBe('moderate');
  });

  it('deve retornar Sem dados para uma camada desconhecida', () => {
    expect(component.layerLastSale(farmaciaMock, 'Silver')).toBe('Sem dados');
  });
});
