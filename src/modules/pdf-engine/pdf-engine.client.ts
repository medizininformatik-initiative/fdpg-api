import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class PdfEngineClient {
  constructor(private configService: ConfigService) {
    this.configureService();
    this.configureClient();
  }

  public client: AxiosInstance;
  private pdfServiceHost: string;

  private configureService() {
    this.pdfServiceHost = this.configService.get('PDF_SERVICE_HOST');
  }

  private configureClient() {
    this.client = axios.create({
      baseURL: this.pdfServiceHost,
      // headers: {
      //   'Content-Type': 'application/json',
      // },
    });
  }
}
