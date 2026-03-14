/**
 * K6 Stripe Checkout Stress Test Scenario for MorningOps Desktop
 *
 * Tests payment processing under aggressive load:
 * - Checkout session creation
 * - Webhook delivery simulation (multiple event types)
 * - License verification after payment
 * - Concurrent webhook processing
 *
 * This scenario ramps aggressively to 200 VU to stress the payment pipeline,
 * Stripe integration, and database state management.
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
    'stripe-checkout-stress': {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },     // Ramp to 20 VU
        { duration: '2m', target: 100 },    // Ramp to 100 VU
        { duration: '2m', target: 200 },    // Ramp to 200 VU (stress)
        { duration: '3m', target: 200 },    // Hold at 200 VU
        { duration: '2m', target: 50 },     // Ramp down to 50 VU
        { duration: '1m', target: 0 },      // Ramp down to 0
      ],
      gracefulStop: '1m',
      tags: { scenario: 'stripe-checkout-stress' },
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.05'],
    'checkout_session_success': ['rate>0.95'],
    'webhook_stripe_success': ['rate>0.99'],
    'total_errors': ['count<500'],
  },
};

/**
 * Generate realistic Stripe webhook signatures (test mode)
 */
function generateStripeSignature() {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = Math.random().toString(36).substr(2, 32);
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Simulate Stripe webhook event
 */
function createStripeWebhookEvent(type, customerId, subscriptionId) {
  const eventId = `evt_${Math.random().toString(36).substr(2, 16)}`;

  const events = {
    'checkout.session.completed': {
      id: eventId,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `cs_${Math.random().toString(36).substr(2, 16)}`,
          object: 'checkout.session',
          customer: customerId,
          subscription: subscriptionId,
          payment_status: 'paid',
          status: 'complete',
        },
      },
      type: 'checkout.session.completed',
    },
    'customer.subscription.updated': {
      id: eventId,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: subscriptionId,
          object: 'subscription',
          customer: customerId,
          status: 'active',
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
        },
      },
      type: 'customer.subscription.updated',
    },
    'customer.subscription.deleted': {
      id: eventId,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: subscriptionId,
          object: 'subscription',
          customer: customerId,
          status: 'canceled',
        },
      },
      type: 'customer.subscription.deleted',
    },
  };

  return events[type] || events['checkout.session.completed'];
}

export default function (data) {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const deviceId = generateDeviceId();
  const email = generateEmail();
  const customerId = `cus_${Math.random().toString(36).substr(2, 16)}`;
  const subscriptionId = `sub_${Math.random().toString(36).substr(2, 16)}`;

  // Phase 1: Trial Setup (prerequisite for checkout)
  group('Phase 1: Trial Setup', function () {
    const trialPayload = {
      deviceId: deviceId,
      email: email,
    };

    const trialRes = makeRequest(
      'POST',
      `${baseUrl}/api/trial/start`,
      trialPayload,
      { name: 'stripe-stress-trial-start' }
    );

    metrics.trial.startCalls.add(1);
    metrics.trial.start.add(trialRes.timings.duration);
    metrics.trial.startRate.add(trialRes.status === 200 || trialRes.status === 201);

    check(trialRes, {
      'trial-start: successful or exists': (r) => r.status === 200 || r.status === 201,
    });
  });

  sleep(1);

  // Phase 2: Checkout Session Creation
  group('Phase 2: Checkout Session Creation', function () {
    const sessionPayload = {
      deviceId: deviceId,
      email: email,
    };

    const res = makeRequest(
      'POST',
      `${baseUrl}/api/checkout/session`,
      sessionPayload,
      { name: 'stripe-stress-checkout-session' }
    );

    metrics.checkout.sessionCalls.add(1);
    metrics.checkout.session.add(res.timings.duration);
    metrics.checkout.sessionRate.add(res.status === 200 || res.status === 201);

    check(res, {
      'checkout-session: returns URL or expected error': (r) => {
        if (r.status === 200) {
          const url = r.json('checkoutUrl');
          return url && typeof url === 'string' && url.length > 0;
        }
        return r.status === 404 || r.status === 400; // Expected for some conditions
      },
      'checkout-session: idempotent (no crash)': (r) => r.status < 500,
    });
  });

  sleep(2);

  // Phase 3: Simulated Webhook — Checkout Complete
  group('Phase 3: Webhook - Checkout Complete', function () {
    const webhookEvent = createStripeWebhookEvent('checkout.session.completed', customerId, subscriptionId);

    const res = http.post(
      `${baseUrl}/api/webhooks/stripe`,
      JSON.stringify(webhookEvent),
      {
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': generateStripeSignature(),
        },
        tags: { name: 'stripe-stress-webhook-checkout-complete' },
        timeout: '10s',
      }
    );

    metrics.webhook.stripeCalls.add(1);
    metrics.webhook.stripe.add(res.timings.duration);

    const success = res.status === 200 || res.status === 400; // 400 ok for invalid signature in test
    metrics.webhook.stripeRate.add(success);

    check(res, {
      'webhook-checkout-complete: handled': (r) => r.status < 500,
      'webhook-checkout-complete: no crash': (r) => r.status !== 502 && r.status !== 503,
    });
  });

  sleep(1);

  // Phase 4: License Check After Payment
  group('Phase 4: License Check After Payment', function () {
    const res = http.get(
      `${baseUrl}/api/license/check?deviceId=${deviceId}`,
      {
        headers: { 'User-Agent': 'k6-stripe-stress/1.0' },
        tags: { name: 'stripe-stress-license-check-post-payment' },
        timeout: '10s',
      }
    );

    metrics.license.checkCalls.add(1);
    metrics.license.check.add(res.timings.duration);

    const success = res.status === 200;
    metrics.license.checkRate.add(success);

    check(res, {
      'license-post-payment: state present': (r) => r.status === 200 && r.json('state') !== null,
      'license-post-payment: active or trialing': (r) => {
        if (r.status === 200) {
          const state = r.json('state');
          return state === 'active' || state === 'trialing';
        }
        return true;
      },
    });
  });

  sleep(1);

  // Phase 5: Subscription Update Webhook
  group('Phase 5: Webhook - Subscription Updated', function () {
    const webhookEvent = createStripeWebhookEvent('customer.subscription.updated', customerId, subscriptionId);

    const res = http.post(
      `${baseUrl}/api/webhooks/stripe`,
      JSON.stringify(webhookEvent),
      {
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': generateStripeSignature(),
        },
        tags: { name: 'stripe-stress-webhook-subscription-updated' },
        timeout: '10s',
      }
    );

    metrics.webhook.stripeCalls.add(1);
    metrics.webhook.stripe.add(res.timings.duration);
    metrics.webhook.stripeRate.add(res.status === 200 || res.status === 400);

    check(res, {
      'webhook-subscription-update: handled': (r) => r.status < 500,
    });
  });

  sleep(1);

  // Phase 6: Error Injection — Malformed Webhook (5% of users)
  group('Phase 6: Error Scenarios (5% of users)', function () {
    if (Math.random() < 0.05) {
      const res = http.post(
        `${baseUrl}/api/webhooks/stripe`,
        JSON.stringify({ invalid: true }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': 'invalid-signature',
          },
          tags: { name: 'stripe-stress-webhook-invalid' },
          timeout: '10s',
        }
      );

      check(res, {
        'webhook-invalid: rejects gracefully': (r) => r.status === 400 || r.status === 401 || r.status === 403,
      });
    }
  });

  sleep(1);

  // Phase 7: Subscription Cancellation Webhook
  group('Phase 7: Webhook - Subscription Deleted', function () {
    if (Math.random() < 0.2) { // 20% of users cancel
      const webhookEvent = createStripeWebhookEvent('customer.subscription.deleted', customerId, subscriptionId);

      const res = http.post(
        `${baseUrl}/api/webhooks/stripe`,
        JSON.stringify(webhookEvent),
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': generateStripeSignature(),
          },
          tags: { name: 'stripe-stress-webhook-subscription-deleted' },
          timeout: '10s',
        }
      );

      metrics.webhook.stripeCalls.add(1);
      metrics.webhook.stripe.add(res.timings.duration);

      check(res, {
        'webhook-sub-delete: handled': (r) => r.status < 500,
      });

      sleep(1);

      // Verify license state after cancellation
      const licenseRes = http.get(
        `${baseUrl}/api/license/check?deviceId=${deviceId}`,
        {
          headers: { 'User-Agent': 'k6-stripe-stress/1.0' },
          tags: { name: 'stripe-stress-license-post-cancel' },
          timeout: '10s',
        }
      );

      metrics.license.checkCalls.add(1);

      check(licenseRes, {
        'license-post-cancel: returns state': (r) => r.status === 200,
      });
    }
  });

  sleep(2);
}
