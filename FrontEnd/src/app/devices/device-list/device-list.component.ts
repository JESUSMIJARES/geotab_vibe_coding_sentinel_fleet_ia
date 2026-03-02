import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { GeotabApiService } from '../../services/geotab-api.service';
import { forkJoin } from 'rxjs';

export interface Device {
  id: string;
  name: string;
  serialNumber: string;
  licensePlate?: string;
  lastCommunication?: string;
}

export interface DeviceStatusInfo {
  device: { id: string };
  dateTime: string;
}

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatMenuModule,
    FormsModule
  ],
  templateUrl: './device-list.component.html',
  styleUrl: './device-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceListComponent implements OnInit {
  private geotabApi = inject(GeotabApiService);
  private router = inject(Router);

  devices = signal<Device[]>([]);
  isLoading = signal(true);
  filterText = signal('');
  isFullscreen = signal(false);

  displayedColumns: string[] = ['name', 'licensePlate', 'serialNumber', 'lastCommunication', 'aiAnalysis'];

  filteredDevices = computed(() => {
    const filter = this.filterText().toLowerCase();
    return this.devices().filter(d => d.name.toLowerCase().includes(filter));
  });

  ngOnInit() {
    this.loadDevices();
  }

  toggleFullscreen() {
    this.isFullscreen.update(v => !v);
  }

  loadDevices() {
    this.isLoading.set(true);

    forkJoin({
      devices: this.geotabApi.get<Device>('Device'),
      statusInfo: this.geotabApi.get<DeviceStatusInfo>('DeviceStatusInfo')
    }).subscribe({
      next: ({ devices, statusInfo }) => {
        const statusMap = new Map(statusInfo.map(s => [s.device.id, s.dateTime]));

        const mappedData = devices.map((d: Device) => ({
          id: d.id,
          name: d.name,
          serialNumber: d.serialNumber,
          licensePlate: d.licensePlate || '--',
          lastCommunication: statusMap.get(d.id) || '--'
        })).filter((d: Device) => d.serialNumber !== '' && d.serialNumber !== '000-000-0000');

        this.devices.set(mappedData);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading devices', err);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filterText.set(input.value);
  }

  analyze(device: Device) {
    this.router.navigate(['/detail', device.id], {
      queryParams: { serialNumber: device.serialNumber, name: device.name }
    });
  }
}
