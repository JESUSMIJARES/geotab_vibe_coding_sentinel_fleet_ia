import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { AuthService, GeotabSession, GeotabCredentials } from './auth.service';

interface GeotabResponse {
  result: {
    credentials?: GeotabCredentials;
    path?: string;
    [key: string]: unknown;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GeotabApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  authenticate(server: string, database: string, userName: string, password: string): Observable<unknown> {
    const url = `https://${server}/apiv1`;
    const body = {
      method: 'Authenticate',
      params: {
        database,
        userName,
        password
      }
    };

    return this.http.post<GeotabResponse>(url, body).pipe(
      tap((response: GeotabResponse) => {
        if (response.result && response.result.credentials && response.result.path) {
          const session: GeotabSession = {
            credentials: response.result.credentials,
            path: response.result.path,
            server: server
          };
          this.auth.setSession(session);
        }
      })
    );
  }

  get<T>(typeName: string, search: unknown = {}): Observable<T[]> {
    const session = this.auth.session();
    if (!session) throw new Error('No session found');

    const url = `https://my.geotab.com/apiv1`;
    const body = {
      method: 'Get',
      params: {
        typeName,
        search,
        credentials: session.credentials
      }
    };

    return this.http.post<GeotabResponse>(url, body).pipe(
      map((response) => (response && Array.isArray(response.result) ? response.result : []) as T[])
    );
  }

  // AI Agent call
  analyzeDevice(deviceId: string, serialNumber: string): Observable<unknown> {
    // As requested: http://localhost:3000/chat
    return this.http.post('http://localhost:3000/api/send-input', {
      "text": "Information of the deviceId " + deviceId + " and serialNumber " + serialNumber
    });
  }
}
