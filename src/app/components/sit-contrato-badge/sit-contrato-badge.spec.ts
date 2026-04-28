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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return inativo class for null value', () => {
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    expect(component.badgeClass()).toContain('sit-contrato-badge--inativo');
  });

  it('should return ativo class for ATIVO value', () => {
    fixture.componentRef.setInput('value', 'ATIVO');
    fixture.detectChanges();
    expect(component.badgeClass()).toContain('sit-contrato-badge--ativo');
  });

  it('should be case-insensitive', () => {
    fixture.componentRef.setInput('value', 'ativo');
    fixture.detectChanges();
    expect(component.badgeClass()).toContain('sit-contrato-badge--ativo');
  });

  it('should show — for null value', () => {
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    expect(component.label()).toBe('—');
  });
});
