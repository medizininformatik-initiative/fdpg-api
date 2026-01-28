import { Logger } from '@nestjs/common';
import { AxiosError, AxiosResponse, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { axios_client_requests_total, axios_client_request_duration_seconds } from './axios-metrics';

const logger = new Logger('OutboundHTTP');
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'apikey', 'password'];

interface AxiosRequestConfigWithMetadata extends InternalAxiosRequestConfig {
  metadata: { startTime: bigint };
  _isRetry?: boolean;
}

// Helper: Hide secrets from headers
function sanitizeHeaders(headers: any): Record<string, string> {
  if (!headers) return {};
  const clean = { ...headers };
  Object.keys(clean).forEach((key) => {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      clean[key] = '***MASKED***';
    }
  });
  return clean;
}

function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const numericRegex = /^\d+$/;
  const parts = path.split('/').filter((p) => p.length > 0);
  const normalizedParts = parts.map((part) => {
    if (numericRegex.test(part)) return '#id';
    if (uuidRegex.test(part)) return '#uuid';
    if (/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(part)) return '#var';
    if (part.length > 16 && /^[0-9a-zA-Z_-]+$/.test(part)) return '#var';
    return part;
  });
  return '/' + normalizedParts.join('/');
}

function getDurationInSeconds(startTime: bigint): number {
  const endTime = process.hrtime.bigint();
  return Number(endTime - startTime) / 1_000_000_000;
}

function recordMetrics(config: AxiosRequestConfigWithMetadata, status: number | string, duration: number) {
  try {
    const url = new URL(config.url, config.baseURL);
    const host = url.hostname;
    const route = normalizePath(url.pathname);

    const labels = {
      method: config.method?.toUpperCase() || 'GET',
      host: host,
      route: route,
      status: status.toString(),
    };

    axios_client_request_duration_seconds.observe(labels, duration);
    axios_client_requests_total.inc(labels);
  } catch (e) {
    axios_client_requests_total.inc({
      method: 'UNKNOWN',
      host: 'UNKNOWN',
      route: 'UNKNOWN',
      status: status.toString(),
    });
  }
}

export function applyAxiosMonitoring(axiosInstance: AxiosInstance) {
  // --- REQUEST INTERCEPTOR ---
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      (config as AxiosRequestConfigWithMetadata).metadata = {
        startTime: process.hrtime.bigint(),
      };
      return config;
    },
    (error) => {
      logger.error({ err: error }, 'Failed to construct outgoing request');
      return Promise.reject(error);
    },
  );

  // --- RESPONSE INTERCEPTOR ---
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      const config = response.config as AxiosRequestConfigWithMetadata;
      const duration = getDurationInSeconds(config.metadata.startTime);

      recordMetrics(config, response.status, duration);

      const originalUrl = config.url;
      const finalUrl = (response.request as any)?.res?.responseUrl || originalUrl;
      const isRedirect = originalUrl !== finalUrl && !finalUrl.endsWith(originalUrl);
      const urlObj = new URL(config.url, config.baseURL);
      const host = urlObj.hostname;

      // --- LOGGING ---
      logger.log(
        {
          host,
          method: config.method?.toUpperCase(),
          status: response.status,
          duration: `${duration.toFixed(3)}s`,
          // URLs
          originalUrl,
          finalUrl: isRedirect ? finalUrl : undefined,
          isRedirect,
          // Headers (Sanitized)
          reqHeaders: sanitizeHeaders(config.headers),
          resHeaders: sanitizeHeaders(response.headers),
          // Tracing
          traceId: response.headers['x-request-id'] || response.headers['traceparent'],
        },
        isRedirect
          ? `Outgoing Redirect: ${config.method} ${originalUrl} -> ${response.status} -> ${finalUrl}`
          : `Outgoing Success: ${config.method} ${originalUrl} - ${response.status}`,
      );

      return response;
    },
    (error: AxiosError) => {
      const config = error.config as AxiosRequestConfigWithMetadata;

      // Calculate duration even for errors (timeouts take time!)
      const duration = config?.metadata?.startTime ? getDurationInSeconds(config.metadata.startTime) : 0;

      const status = error.response?.status || 'NETWORK_ERROR';

      const urlObj = new URL(config.url, config.baseURL);
      const host = urlObj.hostname;

      // Record Metrics
      if (error.response) {
        recordMetrics(error.response.config as AxiosRequestConfigWithMetadata, status, duration);
      } else {
        // Network errors / Timeouts don't have a response config sometimes
        if (config) recordMetrics(config, status, duration);
      }

      // --- ERROR LOGGING ---
      logger.error(
        {
          err: error,
          message: error.message,
          code: error.code,
          method: config?.method?.toUpperCase(),
          url: config?.url,
          host,
          duration: `${duration.toFixed(3)}s`,
          reqHeaders: config ? sanitizeHeaders(config.headers) : {},
          resHeaders: error.response ? sanitizeHeaders(error.response.headers) : {},
        },
        `Outgoing Request Failed: ${config?.method} ${config?.url}`,
      );

      return Promise.reject(error);
    },
  );
}
