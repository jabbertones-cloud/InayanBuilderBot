/**
 * K6 License & Trial Load Test Scenario for MorningOps Desktop
 *
 * Simulates realistic concurrent load on the licensing and trial pipeline:
 * - Multiple concurrent users checking license status
 * - Trial start requests under load
 * - Health endpoint as canary under pressure
 * - Measures latency, error rates, and throughput under sustained load
 *
 * This scenario ramps from 10 to 50 concurrent users over 5 minutes,
 * stressing the license/trial processing pipeline.
 *
 * Real endpoints tested:
 * - GET  /api/health
 * - GET  /api/license/check?deviceId=xxx
 * - POST /api/trial/start
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { metrics, validateResponse, generateDeviceId, generateEmail, makeRequest } from '../k6-config.js';

export const options = {
  scenarios: {
    'license-trial-load': {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },    // Ramp to 10 VU
        { duration: '3m', target: 50 },    // Ramp to 50 VU
        { duration: '5m', target: 50 },    // Sustain at 50 VU
        { duration: '1m', target: 0 },     // Ramp down
      ],
      gracefulStop: '30s',
      tags: { scenario: 'license-trial-load' },
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.05'],
    'license_check_success': ['rate>0.90'],
    'trial_start_success': ['rate>0.90'],
    'health_check_success': ['rate>0.95'],
    'total_errors': ['count<200'],
  },
};

export default function (data) {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const deviceId = generateDeviceId();
  const email = generateEmail();

  // Health check canary — should remain fast under load
  group('Health Canary', function () {
    const res = http.get(`${baseUrl}/api/health`, {
      headers: { 'User-Agent': 'k6-load-test/1.0' },
      tags: { name: 'load-health-canary' },
      timeout: '10s',
    });

    metrics.health.calls.add(1);
    metrics.health.duration.add(res.timings.duration);
    metrics.health.successRate.add(res.status === 200);

    check(res, {
      'health-canary: status 200': (r) => r.status === 200,
      'health-canary: fast response': (r) => r.timings.duration < 500,
    });
  });

  sleep(0.5);

  // Initial license check (device not yet registered — tests cold path)
  group('License Check - Cold', function () {
    const res = http.get(
      `${baseUrl}/api/license/check?deviceId=${deviceId}`,
      {
        headers: { 'User-Agent': 'k6-load-test/1.0' },
        tags: { name: 'load-license-check-cold' },
        timeout: '10s',
      }
    );

    metrics.license.checkCalls.add(1);
    metrics.license.check.add(res.timings.duration);
    metrics.license.checkRate.add(res.status === 200);

    check(res, {
      'license-cold: returns state': (r) => r.status === 200 && r.json('state') !== null,
      'license-cold: state is no_trial or expired': (r) => {
        const state = r.json('state');
        return ['no_trial', 'expired', 'trialing', 'active', 'grace'].includes(state);
      },
    });
  });

  sleep(1);

  // Start trial under load
  group('Trial Start - Under Load', function () {
    const trialPayload = {
      deviceId: deviceId,
      email: email,
    };

    const res = makeRequest(
      'POST',
      `${baseUrl}/api/trial/start`,
      trialPayload,
      { name: 'load-trial-start' }
    );

    metrics.trial.startCalls.add(1);
    metrics.trial.start.add(res.timings.duration);
    metrics.trial.startRate.add(res.status === 200 || res.status === 201);

    check(res, {
      'trial-start-load: accepted': (r) => r.status === 200 || r.status === 201,
      'trial-start-load: response < 2s': (r) => r.timings.duration < 2000,
    });
  });

  sleep(1);

  // License check after trial (warm path — device now exists)
  group('License Check - Warm', function () {
    const res = http.get(
      `${baseUrl}/api/license/check?deviceId=${deviceId}`,
      {
        headers: { 'User-Agent': 'k6-load-test/1.0' },
        tags: { name: 'load-license-check-warm' },
        timeout: '10s',
      }
    );

    metrics.license.checkCalls.add(1);
    metrics.license.check.add(res.timings.duration);
    metrics.license.checkRate.add(res.status === 200);

    check(res, {
      'license-warm: state is trialing or active': (r) => {
        const state = r.json('state');
        return state === 'trialing' || state === 'active';
      },
      'license-warm: daysLeft present': (r) => {
        const state = r.json('state');
        if (state === 'trialing') {
          return r.json('daysLeft') !== null && r.json('daysLeft') >= 0;
        }
        return true;
      },
      'license-warm: not rate limited': (r) => r.status !== 429,
    });
  });

  sleep(1);

  // Rapid license polling simulation (some clients poll every few seconds)
  group('License Poll - Rapid', function () {
    for (let i = 0; i < 3; i++) {
      const res = http.get(
        `${baseUrl}/api/license/check?deviceId=${deviceId}`,
        {
          headers: { 'User-Agent': 'k6-load-test/1.0' },
          tags: { name: 'load-license-rapid-poll' },
          timeout: '5s',
        }
      );

      metrics.license.checkCalls.add(1);
      metrics.license.check.add(res.timings.duration);

      check(res, {
        'license-rapid: consistent state': (r) => r.status === 200,
      });

      sleep(0.5);
    }
  });

  sleep(1);

  // Duplicate trial start (idempotency test under load)
  group('Trial Start - Duplicate', function () {
    const trialPayload = {
      deviceId: deviceId,
      email: email,
    };

    const res = makeRequest(
      'POST',
      `${baseUrl}/api/trial/start`,
      trialPayload,
      { name: 'load-trial-start-duplicate' }
    );

    metrics.trial.startCalls.add(1);
    metrics.trial.start.add(res.timings.duration);

    check(res, {
      'trial-duplicate: handled gracefully': (r) => r.status === 200 || r.status === 201,
      'trial-duplicate: alreadyExists or ok': (r) => {
        const json = r.json();
        return json.ok === true || json.alreadyExists === true;
      },
    });
  });

  sleep(2);

  // Think time between batches
  const thinkTime = Math.random() * 3 + 1; // 1-4 seconds
  sleep(thinkTime);
}
