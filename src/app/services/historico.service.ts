import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { type FarmaciaHistorico } from '../models/farmacia.model';

@Injectable({ providedIn: 'root' })
export class HistoricoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8000';

  getHistorico(): Observable<FarmaciaHistorico[]> {
    return this.http.get<FarmaciaHistorico[]>(`${this.apiUrl}/historico`);
  }
}
