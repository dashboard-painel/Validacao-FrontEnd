import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { routes } from '../../app.routes';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders brand link and dashboard nav link', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const brand = host.querySelector<HTMLAnchorElement>('[data-testid="brand-link"]');
    expect(brand).toBeTruthy();
    expect(brand?.getAttribute('href')).toBe('/dashboard');

    const dashboardLink = host.querySelector('[data-testid="nav-link-dashboard"]');
    expect(dashboardLink).toBeTruthy();
    expect(dashboardLink?.textContent?.trim()).toContain('Dashboard');
  });

  it('renders the last update badge', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const badge = host.querySelector('.update-badge');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('Última atualização');
  });
});
