import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <div class="app-container bg-gray-50">
      @if (auth.isAuthenticated()) {
        <mat-toolbar class="bg-white border-b border-gray-200 h-14 px-4 flex items-center justify-between sticky top-0 z-50">
          <div class="flex items-center gap-6 cursor-pointer" (click)="goHome()" (keydown.enter)="goHome()" tabindex="0" role="button">
            <span class="text-gray-800 font-medium tracking-tight">Sentinel AI Ecosystem</span>
          </div>
          
          <div class="flex items-center gap-4">
            <div class="flex flex-col items-end">
              <span class="text-[10px] text-gray-500 uppercase tracking-wider">{{ auth.session()?.server }}</span>
            </div>
            <button mat-icon-button (click)="logout()" class="text-gray-400 hover:text-red-600 transition-colors">
              <mat-icon>logout</mat-icon>
            </button>
          </div>
        </mat-toolbar>
      }
      
      <main class="flex-1 overflow-y-auto">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
  `]
})
export class App {
  auth = inject(AuthService);
  router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  goHome() {
    this.router.navigate(['/devices']);
  }
}
