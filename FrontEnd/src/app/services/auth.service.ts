import { Injectable, signal } from '@angular/core';

export interface GeotabCredentials {
  database: string;
  sessionId: string;
  userName: string;
}

export interface GeotabSession {
  credentials: GeotabCredentials;
  path: string;
  server: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly SESSION_KEY = 'geotab_session';
  
  session = signal<GeotabSession | null>(this.loadSession());

  setSession(session: GeotabSession) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    this.session.set(session);
  }

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    this.session.set(null);
  }

  isAuthenticated(): boolean {
    return this.session() !== null;
  }

  private loadSession(): GeotabSession | null {
    const saved = localStorage.getItem(this.SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  }
}
