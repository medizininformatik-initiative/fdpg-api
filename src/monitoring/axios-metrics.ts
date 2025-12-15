// src/monitoring/axios-metrics.ts
import { Counter, Histogram } from 'prom-client';

const labelNames = ['method', 'host', 'route', 'status'];

export const axios_client_requests_total = new Counter({
  name: 'axios_client_requests_total',
  help: 'Total number of outgoing HTTP requests sent by axios',
  labelNames: labelNames,
});

export const axios_client_request_duration_seconds = new Histogram({
  name: 'axios_client_request_duration_seconds',
  help: 'Duration of outgoing HTTP requests sent by axios in seconds',
  labelNames: labelNames,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
