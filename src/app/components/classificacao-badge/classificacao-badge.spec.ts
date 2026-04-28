import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClassificacaoBadge } from './classificacao-badge';

describe('ClassificacaoBadge', () => {
  let component: ClassificacaoBadge;
  let fixture: ComponentFixture<ClassificacaoBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassificacaoBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassificacaoBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return --null class for null value', () => {
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    expect(component.badgeClass()).toContain('classificacao-badge--null');
  });

  it('should return --gold class for GOLD value', () => {
    fixture.componentRef.setInput('value', 'GOLD');
    fixture.detectChanges();
    expect(component.badgeClass()).toContain('classificacao-badge--gold');
  });

  it('should be case-insensitive', () => {
    fixture.componentRef.setInput('value', 'gold');
    fixture.detectChanges();
    expect(component.badgeClass()).toContain('classificacao-badge--gold');
  });
});
