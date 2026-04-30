import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { routes } from './app.routes';

describe('Casca da aplicacao', () => {
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

  async function navegarERenderizar(
    fixture: ComponentFixture<App>,
    router: Router,
    url: string,
  ): Promise<HTMLElement> {
    if (fixture.ngZone) {
      await fixture.ngZone.run(() => router.navigateByUrl(url));
    } else {
      await router.navigateByUrl(url);
    }

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    simularMatchMedia();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renderiza a estrutura principal com a sidebar e a area principal', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const elemento = await navegarERenderizar(fixture, router, '/dashboard');

    expect(elemento.querySelector('[data-testid="app-shell"]')).toBeTruthy();
    expect(elemento.querySelector('app-sidebar')).toBeTruthy();
    expect(elemento.querySelector('main[data-testid="app-main"]')).toBeTruthy();
    expect(router.url).toBe('/dashboard');
  });

  it('redireciona rotas desconhecidas para /dashboard', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await navegarERenderizar(fixture, router, '/rota-invalida');

    expect(router.url).toBe('/dashboard');
  });
});
