import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

describe('App shell', () => {
  async function navigateAndRender(
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
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders shell with navbar and main content area', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const host = await navigateAndRender(fixture, router, '/dashboard');

    expect(host.querySelector('[data-testid="app-shell"]')).toBeTruthy();
    expect(host.querySelector('app-sidebar')).toBeTruthy();
    expect(host.querySelector('main[data-testid="app-main"]')).toBeTruthy();
    expect(router.url).toBe('/dashboard');
  });

  it('redirects unknown routes to /dashboard', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await navigateAndRender(fixture, router, '/rota-invalida');

    expect(router.url).toBe('/dashboard');
  });
});
