import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Gauge } from './gauge';

describe('Gauge', () => {
  let component: Gauge;
  let fixture: ComponentFixture<Gauge>;

  function simularMatchMedia(): void {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  beforeEach(async () => {
    simularMatchMedia();

    await TestBed.configureTestingModule({
      imports: [Gauge],
    }).compileComponents();

    fixture = TestBed.createComponent(Gauge);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
