import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { type VendasParceirosResponse } from '../models/shared/venda-parceiro.model';

@Injectable({ providedIn: 'root' })
export class VendasParceirosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8000';

  getHistorico(): Observable<VendasParceirosResponse> {
    return this.http.get<VendasParceirosResponse>(`${this.apiUrl}/vendas-parceiros/historico`);
  }

  atualizar(): Observable<VendasParceirosResponse> {
    return this.http.get<VendasParceirosResponse>(`${this.apiUrl}/vendas-parceiros`);
  }

  getUltimaAtualizacao(): Observable<{ atualizado_em: string | null }> {
    return this.http.get<{ atualizado_em: string | null }>(`${this.apiUrl}/vendas-parceiros/ultima-atualizacao`);
  }
}
