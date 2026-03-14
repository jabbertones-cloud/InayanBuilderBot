/**
 * K6 Load Testing Configuration for MorningOps Desktop
 *
 * Comprehensive load testing setup with multiple scenarios:
 * - Smoke: Baseline functionality check (1 VU)
 * - Load: Realistic user load (50 VU ramp)
 * - Stress: Push to breaking point (200 VU)
 * - Spike: Sudden traffic burst (500 VU)
 * - Soak: Long-running stability test (50 VU, 30 min)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Gauge, Rate, Histogram } from 'k6/metrics';

/**
 * Custom Metrics by Endpoint Category
 *
 * Only tracks the 5 real backend API endpoints:
 * - GET  /api/health
 * - GET  /api/license/check?deviceId=xxx
 * - POST /api/trial/start
 * - POST /api/checkout/session
 * - POST /api/webhooks/stripe
 */
export const metrics = {
  // Health endpoint
  health: {
    duration: new Trend('health_check_duration_ms'),
    successRate: new Rate('health_check_success'),
    calls: new Counter('health_check_calls'),
  },
  // License endpoints
  license: {
    check: new Trend('license_check_duration_ms'),
    checkRate: new Rate('license_check_success'),
    checkCalls: new Counter('license_check_calls'),
  },
  // Trial endpoints
  trial: {
    start: new Trend('trial_start_duration_ms'),
    startRate: new Rate('trial_start_success'),
    startCalls: new Counter('trial_start_calls'),
  },
  // Checkout endpoints
  checkout: {
    session: new Trend('checkout_session_duration_ms'),
    sessionRate: new Rate('checkout_session_success'),
    sessionCalls: new Counter('checkout_session_calls'),
  },
  // Webhook endpoints
  webhook: {
    stripe: new Trend('webhook_stripe_duration_ms'),
    stripeRate: new Rate('webhook_stripe_success'),
    stripeCalls: new Counter('webhook_stripe_calls'),
  },
  // Global metrics
  global: {
    totalErrors: new Counter('total_errors'),
    totalRequests: new Counter('total_requests'),
    connectionErrors: new Counter('connection_errors'),
    timeoutErrors: new Counter('timeout_errors'),
  },
};

/**
 * Thresholds for Test Pass/Fail
 * Tests pass only if these conditions are met
 */
export const options = {
  // Scenario configurations
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1 },   // Ramp to 1 VU over 10s
        { duration: '30s', target: 1 },   // Stay at 1 VU for 30s
        { duration: '10s', target: 0 },   // Ramp down
      ],
      gracefulStop: '10s',
      tags: { scenario: 'smoke' },
    },

    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },    // Ramp to 10 VU
        { duration: '2m', target: 50 },    // Ramp to 50 VU
        { duration: '5m', target: 50 },    // Stay at 50 VU
        { duration: '1m', target: 0 },     // Ramp down
      ],
      gracefulStop: '30s',
      tags: { scenario: 'load' },
    },

    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },    // Ramp to 50 VU
        { duration: '2m', target: 100 },   // Ramp to 100 VU
        { duration: '2m', target: 200 },   // Ramp to 200 VU
        { duration: '3m', target: 200 },   // Stay at 200 VU
        { duration: '2m', target: 0 },     // Ramp down
      ],
      gracefulStop: '1m',
      tags: { scenario: 'stress' },
    },

    spike: {
      executor: 'ramping-vus',
      startVUs: 20,  // Baseline traffic
      stages: [
        { duration: '1m', target: 20 },    // Baseline: 20 VU
        { duration: '30s', target: 500 },  // Spike to 500 VU in 30s
        { duration: '2m', target: 500 },   // Stay for 2 minutes
        { duration: '1m', target: 20 },    // Back to baseline
        { duration: '10s', target: 0 },    // Cool down
      ],
      gracefulStop: '30s',
      tags: { scenario: 'spike' },
    },

    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },    // Ramp to 50 VU
        { duration: '30m', target: 50 },   // Soak for 30 minutes
        { duration: '2m', target: 0 },     // Ramp down
      ],
      gracefulStop: '1m',
      tags: { scenario: 'soak' },
    },
  },

  /**
   * Pass/Fail Thresholds
   * Stricter on smoke, more lenient on spike/soak
   */
  thresholds: {
    // Global response time: p95 < 500ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],

    // Error rate: < 1%
    http_req_failed: ['rate<0.01'],

    // DNS lookup < 100ms
    http_req_connecting: ['p(95)<100'],

    // TLS handshake < 200ms
    http_req_tls_handshaking: ['p(95)<200'],

    // Request body size limits
    http_req_sending: ['p(95)<100'],
    http_req_waiting: ['p(95)<400'],
    http_req_receiving: ['p(95)<100'],

    // Custom metric thresholds (real endpoints only)
    'health_check_duration_ms': ['p(95)<200', { delim: ',' }],
    'health_check_success': ['rate>0.99', { delim: ',' }],
    'license_check_duration_ms': ['p(95)<250', { delim: ',' }],
    'license_check_success': ['rate>0.99', { delim: ',' }],
    'trial_start_duration_ms': ['p(95)<500', { delim: ',' }],
    'trial_start_success': ['rate>0.98', { delim: ',' }],
    'checkout_session_duration_ms': ['p(95)<600', { delim: ',' }],
    'checkout_session_success': ['rate>0.97', { delim: ',' }],
    'webhook_stripe_duration_ms': ['p(95)<200', { delim: ',' }],
    'webhook_stripe_success': ['rate>0.99', { delim: ',' }],
    'total_errors': ['count<100', { delim: ',' }],
  },

  // VUs and duration
  vus: 1,
  duration: '1m',

  // Graceful ramp-down
  gracefulRampDown: '30s',

  // Cloud settings (if running on k6 Cloud)
  cloud: {
    projectID: 3456789, // Replace with your project ID
    name: 'MorningOps Desktop Load Tests',
  },

  // Extension and fine-tuning
  ext: {
    loadimpact: {
      projectID: 3456789,
      name: 'MorningOps Desktop Load Tests',
    },
  },
};

/**
 * Helper function to check HTTP response and update metrics
 */
export function validateResponse(res, expectedStatus, metricTrend, metricRate, context) {
  const success = check(res, {
    [`${context}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${context}: has body`]: (r) => r.body.length > 0,
    [`${context}: response time < 2s`]: (r) => r.timings.duration < 2000,
  });

  metrics.global.totalRequests.add(1);
  if (!success) {
    metrics.global.totalErrors.add(1);
  }

  if (metricTrend) {
    metricTrend.add(res.timings.duration);
  }
  if (metricRate) {
    metricRate.add(success);
  }

  return success;
}

/**
 * Helper to generate realistic device ID
 */
export function generateDeviceId() {
  return `device-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper to generate realistic email
 */
export function generateEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return `test-${timestamp}-${random}@morningops.test`;
}

/**
 * Helper for request with proper error handling
 */
export function makeRequest(method, url, payload = null, tags = {}) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-test/1.0',
    },
    tags: {
      name: url,
      ...tags,
    },
    timeout: '30s',
  };

  let res;
  try {
    if (method === 'GET') {
      res = http.get(url, params);
    } else if (method === 'POST') {
      res = http.post(url, JSON.stringify(payload), params);
    } else if (method === 'PUT') {
      res = http.put(url, JSON.stringify(payload), params);
    } else if (method === 'DELETE') {
      res = http.del(url, params);
    }

    // Track connection errors
    if (res.status === 0 || res.error) {
      metrics.global.connectionErrors.add(1);
    }

    return res;
  } catch (err) {
    if (err.message.includes('timeout')) {
      metrics.global.timeoutErrors.add(1);
    }
    throw err;
  }
}

/**
 * Setup function: runs once before tests
 */
export function setup() {
  console.log('Setup: Preparing load test environment');

  // Verify backend is reachable
  const healthCheck = http.get(
    `${__ENV.BASE_URL || 'http://localhost:3000'}/api/health`,
    {
      tags: { name: 'health-check-setup' },
      timeout: '5s',
    }
  );

  check(healthCheck, {
    'Backend is healthy': (r) => r.status === 200,
  });

  return {
    baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Teardown function: runs once after tests
 */
export function teardown(data) {
  console.log(`Teardown: Test completed at ${data.timestamp}`);
  console.log(`Teardown: Base URL was ${data.baseUrl}`);
}

export default function (data) {
  // Default test body - can be overridden by specific scenarios
  group('default-check', function () {
    const res = http.get(`${data.baseUrl}/api/health`);
    check(res, {
      'default: status is 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
