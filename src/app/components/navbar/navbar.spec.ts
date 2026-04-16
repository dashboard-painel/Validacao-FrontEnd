import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { routes } from '../../app.routes';
import { Navbar } from './navbar';

type NavbarScenario = {
  requestedPath: string;
  resolvedPath: string;
  activeNavSelector: string;
};

describe('Navbar', () => {
  const scenarios: NavbarScenario[] = [
    {
      requestedPath: '/dashboard',
      resolvedPath: '/dashboard',
      activeNavSelector: '[data-testid="nav-link-dashboard"]',
    },
    {
      requestedPath: '/gastos',
      resolvedPath: '/gastos',
      activeNavSelector: '[data-testid="nav-link-gastos"]',
    },
    {
      requestedPath: '/categorias',
      resolvedPath: '/categorias',
      activeNavSelector: '[data-testid="nav-link-categorias"]',
    },
    {
      requestedPath: '/enviar-extrato',
      resolvedPath: '/enviar-extrato',
      activeNavSelector: '[data-testid="nav-link-enviar-extrato"]',
    },
    {
      requestedPath: '/rota-desconhecida',
      resolvedPath: '/dashboard',
      activeNavSelector: '[data-testid="nav-link-dashboard"]',
    },
  ];

  async function navigateAndRender(
    fixture: ComponentFixture<Navbar>,
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

  function getSectionLinks(host: HTMLElement): HTMLAnchorElement[] {
    return Array.from(host.querySelectorAll<HTMLAnchorElement>('[data-testid^="nav-link-"]'));
  }

  function expectBrandOutOfSectionActiveState(host: HTMLElement): void {
    const brand = host.querySelector<HTMLAnchorElement>('[data-testid="brand-link"]');

    expect(brand).toBeTruthy();
    expect(brand?.classList.contains('is-active')).toBe(false);
    expect(brand?.getAttribute('aria-current')).toBeNull();
  }

  function expectSingleAccessibleActiveLink(host: HTMLElement, expectedSelector: string): void {
    const links = getSectionLinks(host);
    const activeByClass = links.filter((link) => link.classList.contains('is-active'));
    const activeByAria = links.filter((link) => link.getAttribute('aria-current') === 'page');

    expect(links.length).toBe(4);
    expect(activeByClass.length).toBe(1);
    expect(activeByAria.length).toBe(1);
    expect(activeByClass[0]).toBe(activeByAria[0]);
    expect(activeByClass[0]?.matches(expectedSelector)).toBe(true);

    expectBrandOutOfSectionActiveState(host);
  }

  function expectPolishedNavbarStructure(host: HTMLElement): void {
    const navbar = host.querySelector('nav.navbar.navbar-expand-lg.sticky-top.finora-navbar');
    const container = host.querySelector('.finora-navbar__container.container-fluid');
    const content = host.querySelector('.finora-navbar__content');
    const linksWrapper = host.querySelector('.finora-navbar__links.navbar-nav.finora-nav-links');
    const profileWrapper = host.querySelector('.finora-navbar__profile');
    const profilePlaceholder = host.querySelector('[data-testid="profile-placeholder"].finora-profile-placeholder');
    const profileAvatar = host.querySelector('.finora-profile-placeholder__avatar');
    const profileName = host.querySelector('.finora-profile-placeholder__name');
    const brand = host.querySelector<HTMLAnchorElement>('[data-testid="brand-link"]');

    expect(navbar).toBeTruthy();
    expect(navbar?.getAttribute('aria-label')).toBe('Navegação principal');

    expect(container).toBeTruthy();
    expect(content).toBeTruthy();
    expect(linksWrapper).toBeTruthy();
    expect(profileWrapper).toBeTruthy();

    expect(profilePlaceholder).toBeTruthy();
    expect(profileAvatar?.textContent?.trim()).toBe('F');
    expect(profileName?.textContent).toContain('Conta demo');

    expect(brand).toBeTruthy();
    expect(brand?.classList.contains('navbar-brand')).toBe(true);
    expect(brand?.classList.contains('finora-brand')).toBe(true);
    expect(brand?.getAttribute('href')).toBe('/dashboard');
    expectBrandOutOfSectionActiveState(host);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('renders the polished shell structure with branding, links and profile placeholder', async () => {
    const fixture = TestBed.createComponent(Navbar);
    const router = TestBed.inject(Router);
    const host = await navigateAndRender(fixture, router, '/dashboard');

    expectPolishedNavbarStructure(host);

    const navLinks = [
      { selector: '[data-testid="nav-link-dashboard"]', path: '/dashboard', text: 'Dashboard' },
      { selector: '[data-testid="nav-link-gastos"]', path: '/gastos', text: 'Gastos' },
      { selector: '[data-testid="nav-link-categorias"]', path: '/categorias', text: 'Categorias' },
      {
        selector: '[data-testid="nav-link-enviar-extrato"]',
        path: '/enviar-extrato',
        text: 'Enviar extrato',
      },
    ];

    for (const link of navLinks) {
      const node = host.querySelector<HTMLAnchorElement>(link.selector);
      expect(node).toBeTruthy();
      expect(node?.classList.contains('nav-link')).toBe(true);
      expect(node?.textContent).toContain(link.text);
      expect(node?.getAttribute('href')).toBe(link.path);
    }
  });

  it('keeps exactly one section link active by class and aria-current for direct and fallback paths', async () => {
    const fixture = TestBed.createComponent(Navbar);
    const router = TestBed.inject(Router);

    for (const scenario of scenarios) {
      const host = await navigateAndRender(fixture, router, scenario.requestedPath);

      expectPolishedNavbarStructure(host);
      expect(router.url).toBe(scenario.resolvedPath);
      expectSingleAccessibleActiveLink(host, scenario.activeNavSelector);
    }
  });

  it('navigates back to /dashboard when clicking the Finora brand link', async () => {
    const fixture = TestBed.createComponent(Navbar);
    const router = TestBed.inject(Router);

    const host = await navigateAndRender(fixture, router, '/enviar-extrato');
    const brandLink = host.querySelector<HTMLAnchorElement>('[data-testid="brand-link"]');

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
    expectPolishedNavbarStructure(fixture.nativeElement as HTMLElement);
    expectSingleAccessibleActiveLink(fixture.nativeElement as HTMLElement, '[data-testid="nav-link-dashboard"]');
  });
});
