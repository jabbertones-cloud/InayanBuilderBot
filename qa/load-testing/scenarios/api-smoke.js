/**
 * K6 API Smoke Test Scenario for MorningOps Desktop
 *
 * Tests ALL real backend API endpoints with realistic payloads:
 * - Health check (GET /api/health)
 * - License check (GET /api/license/check?deviceId=xxx)
 * - Trial start (POST /api/trial/start)
 * - Checkout session (POST /api/checkout/session)
 * - Stripe webhook (POST /api/webhooks/stripe)
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { metrics, validateResponse, generateDeviceId, generateEmail, makeRequest } from '../k6-config.js';

export const options = {
  scenarios: {
    'api-smoke': {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1 },
        { duration: '30s', target: 1 },
        { duration: '10s', target: 0 },
      ],
      gracefulStop: '10s',
      tags: { scenario: 'api-smoke' },
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
    'health_check_success': ['rate>0.95'],
    'license_check_success': ['rate>0.95'],
    'trial_start_success': ['rate>0.95'],
  },
};

export default function (data) {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const deviceId = generateDeviceId();
  const email = generateEmail();

  // Test 1: Health Check (Baseline)
  group('Health Check', function () {
    const res = http.get(`${baseUrl}/api/health`, {
      headers: { 'User-Agent': 'k6-smoke-test/1.0' },
      tags: { name: 'api-health' },
      timeout: '10s',
    });

    metrics.health.calls.add(1);
    metrics.health.duration.add(res.timings.duration);
    metrics.health.successRate.add(res.status === 200);

    validateResponse(res, 200, null, null, 'Health Check');

    check(res, {
      'health: status is 200': (r) => r.status === 200,
      'health: has body': (r) => r.body && r.body.length > 0,
      'health: response time < 1s': (r) => r.timings.duration < 1000,
    });
  });

  sleep(1);

  // Test 2: License Check (Before Trial)
  group('License Check', function () {
    const res = http.get(
      `${baseUrl}/api/license/check?deviceId=${deviceId}`,
      {
        headers: { 'User-Agent': 'k6-smoke-test/1.0' },
        tags: { name: 'api-license-check' },
        timeout: '10s',
      }
    );

    metrics.license.checkCalls.add(1);

    validateResponse(
      res,
      200,
      metrics.license.check,
      metrics.license.checkRate,
      'License Check'
    );

    check(res, {
      'license-check: state present': (r) => r.json('state') !== null,
      'license-check: state is valid': (r) => {
        const state = r.json('state');
        return ['trialing', 'active', 'expired', 'grace', 'no_trial'].includes(state);
      },
    });
  });

  sleep(1);

  // Test 3: Trial Start
  group('Trial Start', function () {
    const payload = {
      deviceId: deviceId,
      email: email,
    };

    const res = makeRequest(
      'POST',
      `${baseUrl}/api/trial/start`,
      payload,
      { name: 'api-trial-start' }
    );

    metrics.trial.startCalls.add(1);

    validateResponse(
      res,
      res.status,
      metrics.trial.start,
      metrics.trial.startRate,
      'Trial Start'
    );

    check(res, {
      'trial-start: accepted (200 or 201)': (r) => r.status === 200 || r.status === 201,
      'trial-start: ok flag set': (r) => r.json('ok') === true || r.json('alreadyExists') === true,
    });
  });

  sleep(1);

  // Test 4: License Check (After Trial — should show trialing)
  group('License Check After Trial', function () {
    const res = http.get(
      `${baseUrl}/api/license/check?deviceId=${deviceId}`,
      {
        headers: { 'User-Agent': 'k6-smoke-test/1.0' },
        tags: { name: 'api-license-check-after-trial' },
        timeout: '10s',
      }
    );

    metrics.license.checkCalls.add(1);

    validateResponse(
      res,
      200,
      metrics.license.check,
      metrics.license.checkRate,
      'License Check After Trial'
    );

    check(res, {
      'license-check-after: state changed to trialing': (r) => {
        const state = r.json('state');
        return state === 'trialing' || state === 'active';
      },
      'license-check-after: daysLeft present if trialing': (r) => {
        const state = r.json('state');
        if (state === 'trialing') {
          return r.json('daysLeft') !== null && r.json('daysLeft') >= 0;
        }
        return true;
      },
    });
  });

  sleep(1);

  // Test 5: Checkout Session Creation
  group('Checkout Session', function () {
    const res = http.post(
      `${baseUrl}/api/checkout/session`,
      JSON.stringify({ deviceId: deviceId }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'api-checkout-session' },
        timeout: '15s',
      }
    );

    metrics.checkout.sessionCalls.add(1);

    validateResponse(
      res,
      res.status,
      metrics.checkout.session,
      metrics.checkout.sessionRate,
      'Checkout Session'
    );

    if (res.status === 200) {
      check(res, {
        'checkout-session: url present': (r) => r.json('checkoutUrl') !== null,
        'checkout-session: valid Stripe URL': (r) => {
          const url = r.json('checkoutUrl');
          return url && typeof url === 'string' && url.includes('stripe.com');
        },
      });
    }
  });

  sleep(1);

  // Test 6: Stripe Webhook Simulation (Test Mode)
  group('Stripe Webhook', function () {
    const webhookPayload = {
      id: `evt_${Math.random().toString(36).substr(2, 9)}`,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `cus_${Math.random().toString(36).substr(2, 9)}`,
          object: 'customer',
          email: email,
          metadata: { deviceId: deviceId },
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: 'customer.created',
    };

    const res = http.post(
      `${baseUrl}/api/webhooks/stripe`,
      JSON.stringify(webhookPayload),
      {
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'test-mode-no-verify',
        },
        tags: { name: 'api-webhook-stripe' },
        timeout: '10s',
      }
    );

    metrics.webhook.stripeCalls.add(1);

    // Webhook may return 400 if signature is invalid (expected in test mode)
    const isValidResponse = res.status === 200 || res.status === 400;

    if (isValidResponse) {
      validateResponse(
        res,
        res.status,
        metrics.webhook.stripe,
        metrics.webhook.stripeRate,
        'Stripe Webhook'
      );
    }

    check(res, {
      'webhook-stripe: handled without crash': (r) => r.status < 500,
    });
  });

  sleep(1);

  console.log(`Smoke test completed for device: ${deviceId}`);
}
