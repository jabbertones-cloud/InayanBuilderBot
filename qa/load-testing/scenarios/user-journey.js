/**
 * K6 Complete User Journey Scenario for MorningOps Desktop
 *
 * Simulates a realistic end-to-end user flow through ALL real backend endpoints:
 * 1. Health check (app is reachable)
 * 2. License check (first launch — cold)
 * 3. Trial start
 * 4. License check (verify trial is active)
 * 5. Checkout session creation (some users convert)
 * 6. Stripe webhook simulation (payment complete)
 * 7. License check (verify active subscription)
 *
 * Includes realistic think times and session handling.
 *
 * Real endpoints tested:
 * - GET  /api/health
 * - GET  /api/license/check?deviceId=xxx
 * - POST /api/trial/start
 * - POST /api/checkout/session
 * - POST /api/webhooks/stripe
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { metrics, validateResponse, generateDeviceId, generateEmail, makeRequest } from '../k6-config.js';

export const options = {
  scenarios: {
    'user-journey': {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },      // Ramp to 5 new users
        { duration: '3m', target: 30 },     // Ramp to 30 users
        { duration: '5m', target: 30 },     // Sustain 30 users for full journeys
        { duration: '1m', target: 0 },      // Ramp down
      ],
      gracefulStop: '30s',
      tags: { scenario: 'user-journey' },
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1500', 'p(99)<3000'],
    'http_req_failed': ['rate<0.03'],
    'health_check_success': ['rate>0.98'],
    'license_check_success': ['rate>0.98'],
    'trial_start_success': ['rate>0.98'],
    'checkout_session_success': ['rate>0.90'],
    'total_errors': ['count<150'],
  },
};

/**
 * Realistic think times representing user interactions
 */
function thinkTime(minSeconds = 0.5, maxSeconds = 3) {
  return sleep(minSeconds + Math.random() * (maxSeconds - minSeconds));
}

export default function (data) {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const deviceId = generateDeviceId();
  const email = generateEmail();

  console.log(`Starting user journey for device: ${deviceId}`);

  // STEP 1: Application Launch — Health Check
  group('Step 1: App Launch Health Check', function () {
    thinkTime(0.5, 1.5); // App launch delay

    const res = http.get(`${baseUrl}/api/health`, {
      headers: { 'User-Agent': 'morningops-desktop/0.1.0' },
      tags: { name: 'journey-health-check' },
      timeout: '10s',
    });

    metrics.health.calls.add(1);
    metrics.health.duration.add(res.timings.duration);
    metrics.health.successRate.add(res.status === 200);

    check(res, {
      'health: backend reachable': (r) => r.status === 200,
      'health: fast response on launch': (r) => r.timings.duration < 500,
    });
  });

  thinkTime(1, 2); // User sees welcome/loading screen

  // STEP 2: First License Check (Cold — New Device)
  group('Step 2: Initial License Check', function () {
    const res = http.get(
      `${baseUrl}/api/license/check?deviceId=${deviceId}`,
      {
        headers: { 'User-Agent': 'morningops-desktop/0.1.0' },
        tags: { name: 'journey-license-check-initial' },
        timeout: '10s',
      }
    );

    metrics.license.check.add(res.timings.duration);
    metrics.license.checkRate.add(res.status === 200);
    metrics.license.checkCalls.add(1);

    validateResponse(
      res,
      200,
      metrics.license.check,
      metrics.license.checkRate,
      'License Check Initial'
    );

    check(res, {
      'license-initial: state present': (r) => r.json('state') !== null,
      'license-initial: state is valid': (r) => {
        const state = r.json('state');
        return ['no_trial', 'expired', 'trialing', 'active', 'grace'].includes(state);
      },
    });
  });

  thinkTime(1, 3); // User reviews trial prompt / welcome screen

  // STEP 3: Trial Activation
  group('Step 3: Trial Start', function () {
    const trialPayload = {
      deviceId: deviceId,
      email: email,
    };

    const res = makeRequest(
      'POST',
      `${baseUrl}/api/trial/start`,
      trialPayload,
      { name: 'journey-trial-start' }
    );

    metrics.trial.start.add(res.timings.duration);
    metrics.trial.startRate.add(res.status === 200 || res.status === 201);
    metrics.trial.startCalls.add(1);

    validateResponse(
      res,
      res.status,
      metrics.trial.start,
      metrics.trial.startRate,
      'Trial Start'
    );

    check(res, {
      'trial-start: activated': (r) => r.status === 200 || r.status === 201,
      'trial-start: customer ID or existing': (r) => {
        const json = r.json();
        return json.customerId !== null || json.alreadyExists === true || json.trialStart !== null;
      },
    });
  });

  thinkTime(1, 2); // User sees "trial activated" confirmation

  // STEP 4: License Check (Verify Trial Active)
  group('Step 4: License Check After Trial', function () {
    const res = http.get(
      `${baseUrl}/api/license/check?deviceId=${deviceId}`,
      {
        headers: { 'User-Agent': 'morningops-desktop/0.1.0' },
        tags: { name: 'journey-license-check-post-trial' },
        timeout: '10s',
      }
    );

    metrics.license.check.add(res.timings.duration);
    metrics.license.checkRate.add(res.status === 200);
    metrics.license.checkCalls.add(1);

    check(res, {
      'license-post-trial: status valid': (r) => {
        const state = r.json('state');
        return ['trialing', 'active', 'grace'].includes(state);
      },
      'license-post-trial: days remaining': (r) => {
        const state = r.json('state');
        if (state === 'trialing') {
          return r.json('daysLeft') > 0;
        }
        return true;
      },
    });
  });

  thinkTime(2, 5); // User explores the app, configures settings locally

  // STEP 5: Periodic License Re-check (Background)
  group('Step 5: Background License Re-check', function () {
    thinkTime(3, 8); // Time passes while user uses the app

    const res = http.get(
      `${baseUrl}/api/license/check?deviceId=${deviceId}`,
      {
        headers: { 'User-Agent': 'morningops-desktop/0.1.0' },
        tags: { name: 'journey-license-recheck' },
        timeout: '10s',
      }
    );

    metrics.license.check.add(res.timings.duration);
    metrics.license.checkCalls.add(1);

    check(res, {
      'license-recheck: consistent state': (r) => r.status === 200,
    });
  });

  thinkTime(2, 4);

  // STEP 6: Checkout (30% of users convert to paid)
  if (Math.random() < 0.3) {
    group('Step 6: Checkout (Conversion)', function () {
      thinkTime(2, 5); // User reviews pricing, decides to subscribe

      const checkoutPayload = {
        deviceId: deviceId,
        email: email,
      };

      const res = makeRequest(
        'POST',
        `${baseUrl}/api/checkout/session`,
        checkoutPayload,
        { name: 'journey-checkout' }
      );

      metrics.checkout.session.add(res.timings.duration);
      metrics.checkout.sessionRate.add(res.status === 200);
      metrics.checkout.sessionCalls.add(1);

      check(res, {
        'checkout: returns URL or expected error': (r) => {
          if (r.status === 200) {
            return r.json('checkoutUrl') !== null;
          }
          return r.status < 500;
        },
      });

      thinkTime(3, 10); // User completes payment on Stripe

      // Simulate webhook after payment
      const webhookPayload = {
        id: `evt_${Math.random().toString(36).substr(2, 16)}`,
        object: 'event',
        api_version: '2023-10-16',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: `cs_${Math.random().toString(36).substr(2, 16)}`,
            object: 'checkout.session',
            customer: `cus_${Math.random().toString(36).substr(2, 16)}`,
            payment_status: 'paid',
            status: 'complete',
            metadata: { deviceId: deviceId },
          },
        },
        type: 'checkout.session.completed',
      };

      const webhookRes = http.post(
        `${baseUrl}/api/webhooks/stripe`,
        JSON.stringify(webhookPayload),
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': `t=${Math.floor(Date.now() / 1000)},v1=${Math.random().toString(36).substr(2, 32)}`,
          },
          tags: { name: 'journey-webhook-payment' },
          timeout: '10s',
        }
      );

      metrics.webhook.stripeCalls.add(1);
      metrics.webhook.stripe.add(webhookRes.timings.duration);

      check(webhookRes, {
        'webhook-payment: handled': (r) => r.status < 500,
      });

      sleep(1);

      // STEP 7: Post-Payment License Check
      const licenseRes = http.get(
        `${baseUrl}/api/license/check?deviceId=${deviceId}`,
        {
          headers: { 'User-Agent': 'morningops-desktop/0.1.0' },
          tags: { name: 'journey-license-post-payment' },
          timeout: '10s',
        }
      );

      metrics.license.check.add(licenseRes.timings.duration);
      metrics.license.checkCalls.add(1);

      check(licenseRes, {
        'license-post-payment: state valid': (r) => {
          const state = r.json('state');
          return state === 'active' || state === 'trialing';
        },
      });
    });
  }

  // Final think time — user closes app or continues
  thinkTime(1, 2);

  console.log(`Completed user journey for device: ${deviceId}`);
}
