import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SitContratoBadge } from './sit-contrato-badge';

describe('SitContratoBadge', () => {
  let component: SitContratoBadge;
  let fixture: ComponentFixture<SitContratoBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SitContratoBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(SitContratoBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve retornar a classe inativo para valor null', () => {
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    expect(component.badgeClass()).toContain('sit-contrato-badge--inativo');
  });

  it('deve retornar a classe ativo para o valor ATIVO', () => {
    fixture.componentRef.setInput('value', 'ATIVO');
    fixture.detectChanges();
    expect(component.badgeClass()).toContain('sit-contrato-badge--ativo');
  });

  it('deve ignorar diferencas entre maiusculas e minusculas', () => {
    fixture.componentRef.setInput('value', 'ativo');
    fixture.detectChanges();
    expect(component.badgeClass()).toContain('sit-contrato-badge--ativo');
  });

  it('deve exibir — para valor null', () => {
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    expect(component.label()).toBe('—');
  });
});
