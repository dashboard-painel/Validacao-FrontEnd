import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

type ShellScenario = {
  requestedPath: string;
  resolvedPath: string;
  pageTestId: string;
  headingTestId: string;
  heading: string;
  activeNavSelector: string;
};

describe('App shell', () => {
  const scenarios: ShellScenario[] = [
    {
      requestedPath: '/dashboard',
      resolvedPath: '/dashboard',
      pageTestId: 'page-dashboard',
      headingTestId: 'heading-dashboard',
      heading: 'Dashboard',
      activeNavSelector: '[data-testid="nav-link-dashboard"]',
    },
    {
      requestedPath: '/gastos',
      resolvedPath: '/gastos',
      pageTestId: 'page-gastos',
      headingTestId: 'heading-gastos',
      heading: 'Gastos',
      activeNavSelector: '[data-testid="nav-link-gastos"]',
    },
    {
      requestedPath: '/categorias',
      resolvedPath: '/categorias',
      pageTestId: 'page-categorias',
      headingTestId: 'heading-categorias',
      heading: 'Categorias',
      activeNavSelector: '[data-testid="nav-link-categorias"]',
    },
    {
      requestedPath: '/enviar-extrato',
      resolvedPath: '/enviar-extrato',
      pageTestId: 'page-enviar-extrato',
      headingTestId: 'heading-enviar-extrato',
      heading: 'Enviar extrato',
      activeNavSelector: '[data-testid="nav-link-enviar-extrato"]',
    },
    {
      requestedPath: '/rota-invalida',
      resolvedPath: '/dashboard',
      pageTestId: 'page-dashboard',
      headingTestId: 'heading-dashboard',
      heading: 'Dashboard',
      activeNavSelector: '[data-testid="nav-link-dashboard"]',
    },
  ];

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

  function getNavLinks(host: HTMLElement): HTMLAnchorElement[] {
    return Array.from(host.querySelectorAll<HTMLAnchorElement>('[data-testid^="nav-link-"]'));
  }

  function expectBrandOutOfSectionActiveState(host: HTMLElement): void {
    const brand = host.querySelector<HTMLAnchorElement>('[data-testid="brand-link"]');

    expect(brand).toBeTruthy();
    expect(brand?.classList.contains('is-active')).toBe(false);
    expect(brand?.getAttribute('aria-current')).toBeNull();
  }

  function expectSingleAccessibleActiveLink(host: HTMLElement, expectedSelector: string): void {
    const navLinks = getNavLinks(host);
    const activeByClass = navLinks.filter((link) => link.classList.contains('is-active'));
    const activeByAria = navLinks.filter((link) => link.getAttribute('aria-current') === 'page');

    expect(navLinks.length).toBe(4);
    expect(activeByClass.length).toBe(1);
    expect(activeByAria.length).toBe(1);
    expect(activeByClass[0]).toBe(activeByAria[0]);
    expect(activeByClass[0]?.matches(expectedSelector)).toBe(true);

    expectBrandOutOfSectionActiveState(host);
  }

  function expectShellWrappers(host: HTMLElement): void {
    const shell = host.querySelector('[data-testid="app-shell"].app-shell');
    const navbarHost = host.querySelector('app-navbar');
    const main = host.querySelector('main[data-testid="app-main"].app-main');
    const mainContent = host.querySelector('.app-main__content');

    expect(shell).toBeTruthy();
    expect(navbarHost).toBeTruthy();
    expect(main).toBeTruthy();
    expect(main?.getAttribute('aria-label')).toBe('Conteúdo principal');
    expect(mainContent).toBeTruthy();
    expect(shell?.contains(main as Node)).toBe(true);
    expect(main?.contains(mainContent as Node)).toBe(true);

    expect(host.querySelector('nav.finora-navbar.navbar.navbar-expand-lg.sticky-top')).toBeTruthy();
    expect(host.querySelector('.finora-navbar__content')).toBeTruthy();
    expect(host.querySelector('.finora-navbar__profile')).toBeTruthy();
    expect(host.querySelector('[data-testid="profile-placeholder"]')).toBeTruthy();

    const brandLink = host.querySelector<HTMLAnchorElement>('[data-testid="brand-link"]');
    expect(brandLink).toBeTruthy();
    expect(brandLink?.getAttribute('href')).toBe('/dashboard');
    expectBrandOutOfSectionActiveState(host);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('keeps shell composition and correct active nav semantics across sections and fallback', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    for (const scenario of scenarios) {
      const host = await navigateAndRender(fixture, router, scenario.requestedPath);

      expectShellWrappers(host);

      expect(router.url).toBe(scenario.resolvedPath);
      expect(host.querySelector(`[data-testid="${scenario.pageTestId}"]`)).toBeTruthy();
      expect(host.querySelector(`[data-testid="${scenario.headingTestId}"]`)?.textContent).toContain(
        scenario.heading,
      );
      expect(host.querySelectorAll('[data-testid^="page-"]').length).toBe(1);

      expectSingleAccessibleActiveLink(host, scenario.activeNavSelector);
    }
  });

  it('returns to dashboard via brand link from the last section while preserving shell wrappers', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    const host = await navigateAndRender(fixture, router, '/enviar-extrato');
    const brandLink = host.querySelector<HTMLAnchorElement>('[data-testid="brand-link"]');

    expect(router.url).toBe('/enviar-extrato');
    expectShellWrappers(host);
    expectSingleAccessibleActiveLink(host, '[data-testid="nav-link-enviar-extrato"]');
    expect(brandLink).toBeTruthy();

    if (fixture.ngZone) {
      await fixture.ngZone.run(() => {
        brandLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
      });
    } else {
      brandLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    }

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/dashboard');

    const postClickHost = fixture.nativeElement as HTMLElement;
    expectShellWrappers(postClickHost);
    expect(postClickHost.querySelector('[data-testid="page-dashboard"]')).toBeTruthy();
    expect(postClickHost.querySelector('[data-testid="heading-dashboard"]')?.textContent).toContain('Dashboard');
    expectSingleAccessibleActiveLink(postClickHost, '[data-testid="nav-link-dashboard"]');
  });
});
