import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CausaBadge } from './causa-badge';

describe('CausaBadge', () => {
  let component: CausaBadge;
  let fixture: ComponentFixture<CausaBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CausaBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(CausaBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show — for null value', () => {
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    expect(component.label()).toBe('—');
    expect(component.hasValue()).toBe(false);
  });

  it('should show trimmed value when present', () => {
    fixture.componentRef.setInput('value', '  Pipeline falhou  ');
    fixture.detectChanges();
    expect(component.label()).toBe('Pipeline falhou');
    expect(component.hasValue()).toBe(true);
  });
});
