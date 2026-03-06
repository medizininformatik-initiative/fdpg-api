import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { applyAxiosMonitoring } from './apply-axios-monitoring';

@Injectable()
export class AxiosMonitoringService implements OnModuleInit {
  constructor(private readonly httpService: HttpService) {}

  onModuleInit() {
    applyAxiosMonitoring(this.httpService.axiosRef);
  }
}
