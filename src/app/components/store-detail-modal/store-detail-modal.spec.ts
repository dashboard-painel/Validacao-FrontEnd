import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreDetailModal } from './store-detail-modal';
import { type DelayedStoreRow } from '../../models/shared/dashboard.model';

const mockStore: DelayedStoreRow = {
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not be open when store is null', () => {
    fixture.componentRef.setInput('store', null);
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('should be open when store is provided', () => {
    fixture.componentRef.setInput('store', mockStore);
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);
  });

  it('should emit closed when close() called', () => {
    const emissions: number[] = [];
    component.closed.subscribe(() => emissions.push(1));
    component.close();
    expect(emissions.length).toBe(1);
  });

  it('should format delay correctly for >48h', () => {
    expect(component.formatDelay(72)).toBe('3 dias');
  });

  it('should classify urgency correctly', () => {
    expect(component.urgencyClass(72)).toBe('critical');
    expect(component.urgencyClass(36)).toBe('high');
    expect(component.urgencyClass(12)).toBe('moderate');
  });

  it('should return Sem dados for unknown layer', () => {
    expect(component.layerLastSale(mockStore, 'Silver')).toBe('Sem dados');
  });
});
