import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { type FarmaciaHistorico } from '../models/shared/farmacia.model';

@Injectable({ providedIn: 'root' })
export class HistoricoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8000';

  getHistorico(): Observable<FarmaciaHistorico[]> {
    return this.http.get<FarmaciaHistorico[]>(`${this.apiUrl}/historico`);
  }

  getUltimaAtualizacao(): Observable<{ atualizado_em: string }> {
    return this.http.get<{ atualizado_em: string }>(`${this.apiUrl}/ultima-atualizacao`);
  }
}
