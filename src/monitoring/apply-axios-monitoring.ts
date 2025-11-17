// src/monitoring/apply-axios-monitoring.ts
import { AxiosError, AxiosResponse, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { axios_client_requests_total, axios_client_request_duration_seconds } from './axios-metrics';

interface AxiosRequestConfigWithMetadata extends InternalAxiosRequestConfig {
  metadata: { startTime: bigint };
}

function normalizePath(path: string): string {
  if (!path || path === '/') {
    return '/';
  }

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const numericRegex = /^\d+$/;

  // Split into segments, ignoring leading/trailing slashes
  const parts = path.split('/').filter((p) => p.length > 0);

  const normalizedParts = parts.map((part) => {
    // /12345  -> /#id
    if (numericRegex.test(part)) {
      return '#id';
    }

    // /550e8400-e29b-41d4-a716-446655440000 -> /#uuid
    if (uuidRegex.test(part)) {
      return '#uuid';
    }

    // If it *contains* a UUID somewhere (like id<uuid>), treat it as a variable
    if (/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(part)) {
      return '#var';
    }

    // Long opaque tokens (hashes, tokens, weird IDs) → #var
    if (part.length > 16 && /^[0-9a-zA-Z_-]+$/.test(part)) {
      return '#var';
    }

    // Everything else stays as-is (e.g. api, v5, query, by-user)
    return part;
  });

  return '/' + normalizedParts.join('/');
}

function recordMetrics(config: AxiosRequestConfigWithMetadata, status: number | string) {
  try {
    const endTime = process.hrtime.bigint();
    const durationInSeconds = Number(endTime - config.metadata.startTime) / 1_000_000_000;

    const url = new URL(config.url, config.baseURL);
    const host = url.hostname;
    const route = normalizePath(url.pathname);

    const labels = {
      method: config.method.toUpperCase(),
      host: host,
      route: route,
      status: status.toString(),
    };

    axios_client_request_duration_seconds.observe(labels, durationInSeconds);
    axios_client_requests_total.inc(labels);
  } catch (e) {
    axios_client_requests_total.inc({
      method: config?.method?.toUpperCase() || 'UNKNOWN',
      host: 'UNKNOWN_HOST',
      route: 'UNKNOWN_ROUTE',
      status: status.toString(),
    });
    console.error('Failed to record axios metrics:', e.message);
  }
}

export function applyAxiosMonitoring(axiosInstance: AxiosInstance) {
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      (config as AxiosRequestConfigWithMetadata).metadata = {
        startTime: process.hrtime.bigint(),
      };
      return config;
    },
    (error) => {
      axios_client_requests_total.inc({
        method: 'UNKNOWN',
        host: 'UNKNOWN',
        route: 'UNKNOWN_ROUTE',
        status: 'REQUEST_ERROR',
      });
      return Promise.reject(error);
    },
  );

  // Response Interceptor
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      recordMetrics(response.config as AxiosRequestConfigWithMetadata, response.status);
      return response;
    },
    (error: AxiosError) => {
      if (error.response) {
        recordMetrics(error.response.config as AxiosRequestConfigWithMetadata, error.response.status);
      } else if (error.request) {
        recordMetrics(error.config as AxiosRequestConfigWithMetadata, 'NETWORK_ERROR');
      } else {
        axios_client_requests_total.inc({
          method: 'UNKNOWN',
          host: 'UNKNOWN',
          route: 'UNKNOWN_ROUTE',
          status: 'CLIENT_ERROR',
        });
      }
      return Promise.reject(error);
    },
  );
}
