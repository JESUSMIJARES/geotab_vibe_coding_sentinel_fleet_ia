import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GeotabApiService } from '../../services/geotab-api.service';
import { SafeUrlPipe } from './safe-url.pipe';

export interface AIAnalysis {
  deviceId: string;
  events: object[];
  drivingHours: string;
  summary: string;
  risk: 'HIGH' | 'MIDDLE' | 'SLOW';
  timestamp: string;
  recommendation: string;
  visual_evidence_url: string[];
}

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  dateTime: string;
}

@Component({
  selector: 'app-device-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    SafeUrlPipe
  ],
  templateUrl: './device-detail.component.html',
  styleUrl: './device-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private geotabApi = inject(GeotabApiService);

  deviceId = signal<string | null>(null);
  serialNumber = signal<string | null>(null);
  analysis = signal<AIAnalysis | null>(null);
  name = signal<string | null>(null);
  location = signal<DeviceLocation | null>(null);
  isLoading = signal(true);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const serialNumber = this.route.snapshot.queryParamMap.get('serialNumber');
    const name = this.route.snapshot.queryParamMap.get('name');

    if (id) {
      this.deviceId.set(id);
      this.serialNumber.set(serialNumber);
      this.name.set(name);
      this.fetchData(id, serialNumber);
    }
  }

  fetchData(id: string, serialNumber: any) {
    this.isLoading.set(true);

    // Fetch location and analysis
    this.geotabApi.get<DeviceLocation>('DeviceStatusInfo', { deviceSearch: { id } }).subscribe({
      next: (status) => {
        if (status && status.length > 0) {
          this.location.set({
            latitude: status[0].latitude,
            longitude: status[0].longitude,
            dateTime: status[0].dateTime
          });
        }
      }
    });

    this.fetchAnalysis(id, serialNumber);
  }

  fetchAnalysis(id: string, serialNumber: string) {
    this.geotabApi.analyzeDevice(id, serialNumber).subscribe({
      next: (data) => {
        this.analysis.set(data as AIAnalysis);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching AI analysis', err);
        // Fallback mock for demo if API fails
        this.analysis.set({
          deviceId: id,
          events: [
            { eventType: 'Non events', count: 0 }
          ],
          drivingHours: '8.5 horas en las últimas 24h (Límite excedido)',
          summary: 'Alto riesgo debido a fatiga del conductor y condiciones climáticas adversas en la ruta actual.',
          risk: 'HIGH',
          timestamp: new Date().toISOString(),
          recommendation: '',
          visual_evidence_url: []
        });
        this.isLoading.set(false);
      }
    });
  }

  getRiskColor(level: string | undefined): string {
    switch (level) {
      case 'HIGH': return 'text-red-600';
      case 'MIDDLE': return 'text-yellow-600';
      case 'SLOW': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }

  reanalyze() {
    if (this.deviceId()) {
      this.fetchAnalysis(this.deviceId()!, this.serialNumber()!);
    }
  }

  goBack() {
    this.router.navigate(['/devices']);
  }
}
