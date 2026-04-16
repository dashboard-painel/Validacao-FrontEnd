import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

type RouteSurface = {
  requestedPath: string;
  resolvedPath: string;
  sectionTestId: string;
  headingTestId: string;
  heading: string;
};

describe('App routing contract', () => {
  const dashboardSurface: RouteSurface = {
    requestedPath: '/dashboard',
    resolvedPath: '/dashboard',
    sectionTestId: 'page-dashboard',
    headingTestId: 'heading-dashboard',
    heading: 'Dashboard',
  };

  const directRoutes: RouteSurface[] = [
    dashboardSurface,
    {
      requestedPath: '/gastos',
      resolvedPath: '/gastos',
      sectionTestId: 'page-gastos',
      headingTestId: 'heading-gastos',
      heading: 'Gastos',
    },
    {
      requestedPath: '/categorias',
      resolvedPath: '/categorias',
      sectionTestId: 'page-categorias',
      headingTestId: 'heading-categorias',
      heading: 'Categorias',
    },
    {
      requestedPath: '/enviar-extrato',
      resolvedPath: '/enviar-extrato',
      sectionTestId: 'page-enviar-extrato',
      headingTestId: 'heading-enviar-extrato',
      heading: 'Enviar extrato',
    },
  ];

  async function navigateAndRender(url: string): Promise<{ router: Router; host: HTMLElement }> {
    const fixture: ComponentFixture<App> = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    if (fixture.ngZone) {
      await fixture.ngZone.run(() => router.navigateByUrl(url));
    } else {
      await router.navigateByUrl(url);
    }

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { router, host: fixture.nativeElement as HTMLElement };
  }

  function expectSurface(host: HTMLElement, expected: RouteSurface): void {
    const pageSection = host.querySelector(`[data-testid="${expected.sectionTestId}"]`);
    const heading = host.querySelector(`[data-testid="${expected.headingTestId}"]`);

    expect(pageSection).toBeTruthy();
    expect(heading?.textContent).toContain(expected.heading);
    expect(host.querySelectorAll('[data-testid^="page-"]').length).toBe(1);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('redirects empty path to /dashboard and renders dashboard surface', async () => {
    const { router, host } = await navigateAndRender('/');

    expect(router.url).toBe('/dashboard');
    expectSurface(host, dashboardSurface);
  });

  for (const route of directRoutes) {
    it(`renders ${route.requestedPath} with the expected section markers`, async () => {
      const { router, host } = await navigateAndRender(route.requestedPath);

      expect(router.url).toBe(route.resolvedPath);
      expectSurface(host, route);
    });
  }

  it('redirects unknown paths to /dashboard and keeps dashboard markers', async () => {
    const { router, host } = await navigateAndRender('/rota-nao-mapeada');

    expect(router.url).toBe('/dashboard');
    expectSurface(host, dashboardSurface);
  });
});
