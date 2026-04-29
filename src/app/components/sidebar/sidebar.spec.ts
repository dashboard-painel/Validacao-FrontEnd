import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routes } from '../../app.routes';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
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
      imports: [Sidebar],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renderiza o link da marca e o link do dashboard', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;

    const linkMarca = elemento.querySelector<HTMLAnchorElement>('[data-testid="brand-link"]');
    expect(linkMarca).toBeTruthy();
    expect(linkMarca?.getAttribute('href')).toBe('/dashboard');

    const linkDashboard = elemento.querySelector('[data-testid="nav-link-dashboard"]');
    expect(linkDashboard).toBeTruthy();
    expect(linkDashboard?.textContent?.trim()).toContain('Dashboard');
  });

  it('renderiza o badge de ultima atualizacao', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;

    const badge = elemento.querySelector('.update-badge');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('Última atualização');
  });
});
