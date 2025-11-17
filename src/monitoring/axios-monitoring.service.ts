// src/monitoring/axios-monitoring.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { applyAxiosMonitoring } from './apply-axios-monitoring'; // <-- Import our new function

@Injectable()
export class AxiosMonitoringService implements OnModuleInit {
  constructor(private readonly httpService: HttpService) {}

  onModuleInit() {
    // Just apply the monitoring to the default instance
    applyAxiosMonitoring(this.httpService.axiosRef);
  }
}
