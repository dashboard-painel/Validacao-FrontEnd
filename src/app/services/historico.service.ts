import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { type FarmaciaHistorico } from '../models/shared/farmacia.model';

export type ComparacaoResponse = {
  associacao: string;
  total_gold_vendas: number;
  total_silver_stgn_dedup: number;
  total_divergencias: number;
  comparacao_id: number;
  divergencias: unknown[];
  status_farmacias: unknown[];
};

@Injectable({ providedIn: 'root' })
export class HistoricoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8000';

  getHistorico(): Observable<FarmaciaHistorico[]> {
    return this.http.get<FarmaciaHistorico[]>(`${this.apiUrl}/historico`);
  }

  getHistoricoByAssociacao(associacao: string): Observable<FarmaciaHistorico[]> {
    return this.http.get<FarmaciaHistorico[]>(`${this.apiUrl}/historico/${associacao}`);
  }

  postComparar(associacao: string): Observable<ComparacaoResponse> {
    return this.http.post<ComparacaoResponse>(`${this.apiUrl}/comparar`, { associacao });
  }
}
