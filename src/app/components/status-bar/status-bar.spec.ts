import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusBar } from './status-bar';
import { type StatusBarItem } from '../../models/shared/dashboard.model';

describe('StatusBar', () => {
  let component: StatusBar;
  let fixture: ComponentFixture<StatusBar>;

  const itensMock: StatusBarItem[] = [
    {
      label: 'OK',
      value: 50,
      percent: 50,
      barClass: 'progress-bar bg-success',
      itemClass: 'status-chart__item status-chart__item--ok',
    },
    {
      label: 'CAMADA GOLD ATRASADA',
      value: 10,
      percent: 10,
      barClass: 'progress-bar bg-warning text-dark',
      itemClass: 'status-chart__item status-chart__item--warning',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBar],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar lista vazia por padrao', () => {
    fixture.detectChanges();
    expect(component.items()).toEqual([]);
  });

  it('deve renderizar os itens quando forem informados', () => {
    fixture.componentRef.setInput('items', itensMock);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelectorAll('.status-chart__item').length).toBe(2);
  });
});
