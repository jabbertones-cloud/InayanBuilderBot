# K6 Load Testing Suite for MorningOps Desktop

Comprehensive load testing setup for the MorningOps Desktop application backend (Vercel serverless with PostgreSQL, Stripe, email providers).

## Table of Contents

- [Installation](#installation)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Scenarios](#test-scenarios)
- [Interpreting Results](#interpreting-results)
- [Performance Baselines](#performance-baselines)
- [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites

- Node.js 14+ (for running K6 with custom libraries)
- K6 1.40+ ([Installation Guide](https://k6.io/docs/getting-started/installation))
- Bash or similar shell

### Install K6

**macOS (using Homebrew):**
```bash
brew install k6
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6-stable.list
sudo apt-get update
sudo apt-get install k6
```

**macOS/Windows (Docker):**
```bash
docker pull grafana/k6:latest
```

**Other platforms:** See [K6 installation docs](https://k6.io/docs/getting-started/installation)

### Verify Installation

```bash
k6 version
# Should output: k6 v1.40.0 and above
```

### Project-specific Setup

```bash
# Navigate to the load testing directory
cd morningops-desktop/qa/load-testing

# (Optional) Install Node dependencies if using custom K6 modules
# npm install

# Create .env file with test configuration
cp .env.example .env  # If provided, otherwise create manually
```

## Project Structure

```
qa/load-testing/
├── README.md                           # This file
├── k6-config.js                        # Main K6 configuration with metrics and thresholds
│
├── scenarios/
│   ├── api-smoke.js                    # Smoke test: core API endpoints (1 VU, 1 min)
│   ├── email-sync-load.js              # Email sync under load (10-50 VU, 10 min)
│   ├── stripe-checkout-stress.js       # Payment processing stress test (0-200 VU, 11 min)
│   └── user-journey.js                 # Complete user flow (0-30 VU, 10 min)
│
├── .env.example                        # Environment variables template
└── results/                            # Test results directory (created after runs)
    ├── smoke-2025-03-12.html           # HTML report
    └── smoke-2025-03-12.json           # JSON summary
```

## Configuration

### Environment Variables

Create `.env` file in the load-testing directory:

```bash
# Backend URL to test (local, staging, or production)
BASE_URL=http://localhost:3000

# K6 Cloud options (optional)
K6_CLOUD=false
K6_CLOUD_TOKEN=your_token_here

# Test parallelism (advanced)
K6_VUS=1
K6_DURATION=1m

# Logging
K6_LOG_LEVEL=info
```

### K6 Configuration Reference (k6-config.js)

Key metrics tracked by scenario:

| Metric | Type | Threshold |
|--------|------|-----------|
| `http_req_duration` | Trend | p95 < 500ms |
| `http_req_failed` | Rate | < 1% |
| `auth_device_register_duration_ms` | Trend | p95 < 300ms |
| `auth_device_register_success` | Rate | > 99% |
| `license_check_duration_ms` | Trend | p95 < 250ms |
| `trial_start_duration_ms` | Trend | p95 < 500ms |
| `checkout_session_duration_ms` | Trend | p95 < 600ms |
| `webhook_stripe_duration_ms` | Trend | p95 < 200ms |
| `email_sync_start_duration_ms` | Trend | p95 < 2000ms |
| `brief_generate_duration_ms` | Trend | p95 < 5000ms |
| `total_errors` | Counter | < 100 |

## Running Tests

### Quick Start: Smoke Test

```bash
# Run smoke test (1 VU for 50 seconds)
k6 run scenarios/api-smoke.js

# Expected output:
# ✓ All checks passed
# ✓ All thresholds satisfied
```

### Run All Scenarios

```bash
# Smoke test (baseline - 1 VU, ~1 min)
k6 run scenarios/api-smoke.js

# Email sync load test (50 VU ramp, ~10 min)
k6 run scenarios/email-sync-load.js

# Stripe checkout stress test (200 VU peak, ~11 min)
k6 run scenarios/stripe-checkout-stress.js

# Complete user journey (30 VU peak, ~10 min)
k6 run scenarios/user-journey.js
```

### Run with Custom Base URL

```bash
# Test against staging
k6 run --env BASE_URL=https://staging.morningops.app scenarios/api-smoke.js

# Test against production
k6 run --env BASE_URL=https://api.morningops.app scenarios/api-smoke.js
```

### Run with Custom VU and Duration

```bash
# Override defaults in config
k6 run --vus 50 --duration 5m scenarios/email-sync-load.js
```

### Generate HTML Report

```bash
# Run and generate HTML summary (requires xk6-html extension)
# First install: k6 install extensions
k6 run \
  --out html=results/smoke-$(date +%Y-%m-%d-%H%M%S).html \
  scenarios/api-smoke.js
```

### Run via Docker

```bash
docker run --rm \
  -e BASE_URL=http://host.docker.internal:3000 \
  -v $(pwd):/workspace \
  grafana/k6:latest run /workspace/scenarios/api-smoke.js
```

### Run in K6 Cloud

```bash
# Set up K6 Cloud account at https://cloud.k6.io
# Authenticate
k6 login cloud

# Run test in cloud infrastructure
k6 run --cloud scenarios/api-smoke.js
```

### Run Multiple Scenarios Sequentially

```bash
#!/bin/bash
# save as run-all.sh

echo "Running MorningOps Load Tests..."

echo "1. Smoke Test..."
k6 run scenarios/api-smoke.js || exit 1

echo "2. Email Sync Load Test..."
k6 run scenarios/email-sync-load.js || exit 1

echo "3. Stripe Checkout Stress Test..."
k6 run scenarios/stripe-checkout-stress.js || exit 1

echo "4. User Journey Test..."
k6 run scenarios/user-journey.js || exit 1

echo "All tests completed!"
```

Then run:
```bash
chmod +x run-all.sh
./run-all.sh
```

## Test Scenarios

### 1. API Smoke Test (`api-smoke.js`)

**Purpose:** Baseline validation of core API endpoints with minimal load.

**Duration:** ~50 seconds
**VU Profile:** 0 → 1 → 0

**Tests:**
- Health check (GET /api/health)
- Device registration (POST /api/auth/device-register)
- License check (GET /api/license/check)
- Trial start (POST /api/trial/start)
- Checkout session (POST /api/checkout/session)
- Stripe webhook (POST /api/webhooks/stripe)

**Success Criteria:**
- All endpoints return expected status codes
- Response time p95 < 500ms
- Error rate < 1%

**When to use:** Before each release, as a smoke test in CI/CD pipeline.

### 2. Email Sync Load Test (`email-sync-load.js`)

**Purpose:** Validate email sync pipeline under realistic concurrent load.

**Duration:** ~10 minutes
**VU Profile:** 0 → 10 → 50 → 0

**Tests:**
- Device setup (register, trial start)
- Email sync initiation (POST /api/email/sync/start)
- Calendar sync concurrent with email (POST /api/calendar/sync)
- Sync status checks (GET /api/email/sync/status)
- Brief generation under load (POST /api/brief/generate)
- License verification in background

**Success Criteria:**
- Email sync latency p95 < 2000ms
- Calendar sync latency p95 < 3000ms
- Brief generation p95 < 5000ms
- Success rate > 90%
- Error rate < 5%

**When to use:** Before syncing features go to production, weekly stress testing.

### 3. Stripe Checkout Stress Test (`stripe-checkout-stress.js`)

**Purpose:** Validate payment processing and webhook handling under stress.

**Duration:** ~11 minutes
**VU Profile:** 0 → 20 → 100 → 200 → 50 → 0

**Tests:**
- Device registration
- Trial activation
- Checkout session creation (POST /api/checkout/session)
- Webhook delivery simulation (checkout.session.completed)
- License verification after payment
- Subscription update webhooks
- Subscription status queries
- Error scenarios (invalid webhooks)

**Success Criteria:**
- Checkout session latency p95 < 1000ms
- Webhook processing p95 < 200ms
- Webhook success rate > 99%
- Payment flow success rate > 95%
- Total errors < 500

**When to use:** Before Stripe integration changes, before payment-critical releases.

### 4. Complete User Journey (`user-journey.js`)

**Purpose:** Validate realistic user flows including setup, sync, and brief generation.

**Duration:** ~10 minutes
**VU Profile:** 0 → 5 → 30 → 0

**Tests:**
1. Application launch & device registration
2. Trial activation
3. License verification
4. Email account connection setup
5. Initial email sync
6. Calendar sync
7. Morning brief generation
8. Settings configuration
9. License renewal check
10. Optional checkout (30% of users)

**Success Criteria:**
- Device registration success > 98%
- Trial start success > 98%
- Email sync success > 90%
- Brief generation success > 85%
- Overall response times p95 < 1500ms
- Error rate < 3%

**When to use:** Before major releases, regression testing, user experience validation.

## Interpreting Results

### Standard K6 Output

```
✓ auth: status is 200
✓ auth: deviceId in response
✓ auth: token in response

█ api_smoke
  ✓ (3 checks passed)
  checks.........................: 100% ✓ 1234   ✗ 0
  data_sent.......................: 234 kB
  data_received...................: 567 kB
  http_req_blocked................: avg=10ms   min=5ms    med=8ms    max=50ms
  http_req_connecting.............: avg=5ms    min=0s     med=0s     max=20ms
  http_req_duration...............: avg=245ms  min=50ms   med=200ms  p(95)=400ms p(99)=500ms
  http_req_failed.................: 0.00%
  http_req_receiving..............: avg=50ms   min=10ms   med=40ms   max=200ms
  http_req_sending................: avg=20ms   min=5ms    med=15ms   max=100ms
  http_req_tls_handshaking........: avg=15ms   min=0s     med=0s     max=80ms
  http_req_waiting................: avg=175ms  min=30ms   med=150ms  p(95)=350ms
  http_reqs.......................: 150      (2.96/s)
  http_req_wait_blocked...........: 0
  iteration_duration..............: avg=5.2s   min=4.1s   med=5.0s   p(95)=6.1s
  iterations.......................: 30       (0.59/s)
  vus............................: 1        (min: 0, max: 1)
  vus_max..........................: 1        (min: 1, max: 1)
```

### Key Metrics Explained

| Metric | Interpretation | Concern |
|--------|----------------|---------|
| `http_req_duration[p95]` | 95th percentile response time | > 500ms for auth endpoints |
| `http_req_failed` | Error rate | > 1% indicates issues |
| `http_req_tls_handshaking[p95]` | SSL handshake latency | > 200ms suggests network issues |
| `http_req_waiting[p95]` | Server processing time | > 400ms for brief generation |
| `checks` | Custom assertions passing | < 100% indicates logic failures |
| `iterations` | Complete user flows | Track throughput |
| `vus` | Concurrent virtual users | Should match scenario target |

### Threshold Failures

**If a test fails:**

1. **Check error messages:**
   ```
   threshold "http_req_duration" has failed
   at p95 (476.50ms) >= 500ms
   ```
   → Response times are borderline. Add caching or optimize slow queries.

2. **Review error rate:**
   ```
   threshold "http_req_failed" has failed
   at rate (2.34%) > 1%
   ```
   → Some endpoints are failing. Check logs for 5xx errors.

3. **Analyze specific metric:**
   ```
   threshold "email_sync_start_duration_ms" has failed
   at p95 (2100ms) >= 2000ms
   ```
   → Email sync is slower than expected. Check database performance.

## Performance Baselines

### Expected Performance Targets (Local Development)

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| GET /api/health | 20ms | 40ms | 60ms |
| POST /api/auth/device-register | 100ms | 250ms | 350ms |
| GET /api/license/check | 80ms | 200ms | 300ms |
| POST /api/trial/start | 200ms | 450ms | 600ms |
| POST /api/checkout/session | 300ms | 600ms | 900ms |
| POST /api/webhooks/stripe | 50ms | 150ms | 200ms |
| POST /api/email/sync/start | 500ms | 2000ms | 3000ms |
| POST /api/brief/generate | 2000ms | 5000ms | 8000ms |

### Production Baselines (Vercel + Postgres)

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| GET /api/health | 50ms | 80ms | 150ms |
| POST /api/auth/device-register | 200ms | 350ms | 500ms |
| GET /api/license/check | 150ms | 300ms | 400ms |
| POST /api/trial/start | 400ms | 700ms | 1000ms |
| POST /api/checkout/session | 600ms | 1200ms | 1500ms |
| POST /api/webhooks/stripe | 100ms | 250ms | 350ms |
| POST /api/email/sync/start | 1000ms | 3000ms | 5000ms |
| POST /api/brief/generate | 3000ms | 8000ms | 12000ms |

## Troubleshooting

### Common Issues

#### 1. "Connection refused" / "ECONNREFUSED"

**Symptom:**
```
error code="1046" error message="1046 dial: connection refused"
```

**Cause:** Backend is not running or wrong BASE_URL

**Solution:**
```bash
# Check backend is running
curl http://localhost:3000/api/health

# Run with correct URL
k6 run --env BASE_URL=https://api.example.com scenarios/api-smoke.js
```

#### 2. "Too many open files" error

**Symptom:**
```
error "Too many open files" error.type="io"
```

**Cause:** System file descriptor limit too low

**Solution:**
```bash
# Check current limit
ulimit -n

# Increase to 65536
ulimit -n 65536

# Then run test
k6 run scenarios/stripe-checkout-stress.js
```

#### 3. High error rate during spike test

**Symptom:**
```
http_req_failed: 25%
```

**Cause:** Backend can't handle 500 concurrent VU spike

**Solution:**
- Reduce initial spike to 200 VU instead of 500
- Enable database connection pooling
- Check Vercel scaling settings
- Review database slow query logs

#### 4. DNS timeouts

**Symptom:**
```
http_req_connecting[p95] = 5000ms
```

**Cause:** DNS resolution is slow

**Solution:**
```bash
# Use IP address directly if possible
k6 run --env BASE_URL=http://192.168.1.100:3000 scenarios/api-smoke.js

# Or test local DNS: nslookup api.example.com
```

#### 5. Certificate errors

**Symptom:**
```
error code="1058" error message="x509: certificate signed by unknown authority"
```

**Cause:** Self-signed certificate

**Solution:**
```bash
# Skip SSL verification (development only!)
k6 run --insecure-skip-tls-verify scenarios/api-smoke.js
```

#### 6. Memory issues on macOS

**Symptom:**
```
Error: Cannot allocate memory
```

**Cause:** K6 running out of memory during stress test

**Solution:**
```bash
# Reduce VU ramp for stress test
# Edit stripe-checkout-stress.js and change stages to:
# { duration: '2m', target: 100 }  # Instead of 200
# { duration: '3m', target: 100 }

k6 run scenarios/stripe-checkout-stress.js
```

### Getting Help

1. **Check K6 documentation:**
   - [K6 Troubleshooting Guide](https://k6.io/docs/troubleshooting/)
   - [Common Issues](https://community.k6.io/t/common-errors)

2. **Review backend logs:**
   ```bash
   # Vercel logs
   vercel logs --follow

   # Docker logs
   docker logs backend-container
   ```

3. **Test backend directly:**
   ```bash
   curl -X GET http://localhost:3000/api/health -H "User-Agent: test"
   curl -X POST http://localhost:3000/api/trial/start \
     -H "Content-Type: application/json" \
     -d '{"deviceId":"test-123","email":"test@example.com"}'
   ```

### Performance Debugging

#### Profile a single endpoint

```bash
# Create simple debug scenario
cat > scenarios/debug.js << 'EOF'
import http from 'k6/http';
import { group, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    'http_req_duration': ['p(95)<500'],
  },
};

export default function() {
  group('debug', () => {
    const res = http.get('http://localhost:3000/api/health');
    console.log('Status:', res.status, 'Time:', res.timings.duration + 'ms');
  });
  sleep(1);
}
EOF

k6 run scenarios/debug.js
```

#### Enable verbose logging

```bash
k6 run -v scenarios/api-smoke.js 2>&1 | head -100
```

#### Use browser for manual testing

While K6 tests endpoints directly, sometimes it helps to test with actual browser:
```bash
# Run your app and navigate to it
open http://localhost:3000

# Check Network tab in DevTools for response times
```

## Advanced Features

### Custom Metrics

Add custom metrics to k6-config.js:

```javascript
import { Counter, Trend } from 'k6/metrics';

export const myMetric = new Trend('my_metric_name');
export const myCounter = new Counter('my_counter_name');

// In test:
myMetric.add(response.timings.duration);
myCounter.add(1);
```

### Conditional Logic

```javascript
if (__VU % 2 === 0) {
  // 50% of VUs do something different
}

if (__ITER === 0) {
  // Only on first iteration
}
```

### InfluxDB Integration

```bash
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  scenarios/api-smoke.js
```

### Datadog Integration

```bash
K6_DATADOG_API_KEY=your_key k6 run --out datadog scenarios/api-smoke.js
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Tests
on: [push]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: grafana/setup-k6-action@v1
      - run: k6 run qa/load-testing/scenarios/api-smoke.js
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
```

## License

This load testing suite is part of MorningOps Desktop and follows the same license as the main project.

## Support

For issues or questions:
1. Check this README and troubleshooting section
2. Review K6 documentation: https://k6.io/docs
3. Check K6 community forum: https://community.k6.io
4. Open an issue in the repository
