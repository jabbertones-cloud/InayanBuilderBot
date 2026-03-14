# K6 Load Testing Suite - File Index

Complete reference guide to all files in the load testing suite.

## 📄 Documentation Files

### 1. **README.md** (678 lines)
Comprehensive documentation covering:
- Installation instructions for all platforms
- Project structure overview
- Environment configuration reference
- Detailed scenario descriptions
- Result interpretation guide with examples
- Performance baseline tables (local vs production)
- Troubleshooting guide with 6 common issues
- Advanced features (custom metrics, CI/CD, monitoring)

**When to read**: First time setup, understanding what tests do, interpreting results

**Key sections**:
- [Installation](#installation)
- [Test Scenarios](#test-scenarios)
- [Interpreting Results](#interpreting-results)
- [Performance Baselines](#performance-baselines)
- [Troubleshooting](#troubleshooting)

---

### 2. **QUICKSTART.md** (234 lines)
5-minute getting started guide:
- Quick K6 installation (macOS, Linux)
- Environment configuration
- Running tests with example commands
- Quick result interpretation
- Common tasks and troubleshooting tips

**When to read**: First time, quick reference, familiar with load testing

**Key sections**:
- [Install K6](#install-k6)
- [Run Tests](#run-tests)
- [Common Tasks](#common-tasks)

---

### 3. **SETUP_SUMMARY.md** (289 lines)
High-level overview of what was created:
- Complete file structure
- Features summary
- Quick commands
- Performance targets table
- API endpoints tested
- CI/CD integration examples
- Next steps

**When to read**: Understanding what's included, what to do next

---

### 4. **INDEX.md** (This file)
Quick reference index of all files and their purposes.

---

## 💻 Configuration Files

### 5. **k6-config.js** (335 lines)
Main K6 configuration with shared functionality:

**Exports**:
- `metrics`: Object containing 25+ custom metrics organized by endpoint
- `options`: K6 configuration with 5 scenario definitions and thresholds
- `validateResponse()`: Helper to check responses and update metrics
- `generateDeviceId()`: Creates realistic test device IDs
- `generateEmail()`: Creates unique test emails
- `makeRequest()`: Makes HTTP requests with error handling
- `setup()`: Pre-test health check
- `teardown()`: Post-test cleanup
- `default`: Default test function

**Scenarios defined**:
1. **smoke** - 1 VU, 50 seconds (baseline validation)
2. **load** - 10→50 VU ramp, 9 minutes (realistic load)
3. **stress** - 50→100→200 VU ramp, 11 minutes (breaking point)
4. **spike** - 20 baseline → 500 burst, 4 minutes (sudden traffic)
5. **soak** - 50 VU, 30 minutes (stability test)

**Thresholds** (test passes if ALL met):
- `http_req_duration[p95]`: < 500ms (global)
- `http_req_failed`: < 1% (global)
- Endpoint-specific: auth < 300ms, license < 250ms, trial < 500ms, etc.

**When to edit**:
- Changing performance targets (thresholds)
- Adding new custom metrics
- Adjusting scenario VU profiles
- Modifying helper functions

---

### 6. **.env.example** (102 lines)
Configuration template for environment variables:

**Variables**:
- `BASE_URL`: Backend to test (default: http://localhost:3000)
- `K6_CLOUD`: Enable K6 Cloud (default: false)
- `K6_VUS`: Default VU count
- `K6_LOG_LEVEL`: Logging verbosity
- Stripe test configuration
- Performance target variables
- Advanced options (DNS, proxy, SSL)

**Usage**:
```bash
cp .env.example .env
# Edit .env with your values
```

---

### 7. **run-tests.sh** (352 lines)
Convenience test runner script with colored output:

**Features**:
- Pre-configured test commands
- Backend health check
- Environment variable passing
- Result collection and summary
- Help/usage documentation

**Commands**:
- `./run-tests.sh smoke` - Run smoke test
- `./run-tests.sh load` - Run email sync load test
- `./run-tests.sh stress` - Run payment stress test
- `./run-tests.sh user-journey` - Run end-to-end flow
- `./run-tests.sh all` - Run all tests sequentially
- `./run-tests.sh help` - Show usage

**Options**:
- `--env BASE_URL=<url>` - Override backend URL
- `--quick` - Abbreviated test duration
- `--cloud` - Run in K6 Cloud
- `--no-health-check` - Skip backend verification
- `--results-only` - Show latest results

**When to use**: Most common way to run tests

---

## 🧪 Test Scenario Files

### 8. **scenarios/api-smoke.js** (301 lines)
Smoke test for core API endpoints.

**Profile**: 1 VU ramping for 50 seconds

**Tests** (in order):
1. **Health Check** - GET /api/health
2. **Device Registration** - POST /api/auth/device-register
3. **License Check** - GET /api/license/check (before trial)
4. **Trial Start** - POST /api/trial/start
5. **License Check** - GET /api/license/check (after trial)
6. **Checkout Session** - POST /api/checkout/session
7. **Stripe Webhook** - POST /api/webhooks/stripe

**Metrics tracked**:
- Auth latency (device register, verify token)
- License check latency
- Trial start latency
- Checkout session latency
- Webhook latency

**Success criteria**:
- All endpoints return expected status codes
- Response time p95 < 500ms
- Error rate < 1%

**Use case**: Quick validation before each release, CI/CD pipeline

**Run**: `./run-tests.sh smoke`

---

### 9. **scenarios/email-sync-load.js** (276 lines)
Email synchronization under realistic load.

**Profile**: Ramps 0 → 10 → 50 VU over 10 minutes

**Tests** (per virtual user):
1. **Initialize Device** - Register device
2. **Start Trial** - Activate trial
3. **Email Sync Start** - POST /api/email/sync/start
4. **Calendar Sync Concurrent** - POST /api/calendar/sync (during email sync)
5. **Sync Status Check** - GET /api/email/sync/status
6. **Brief Generation** - POST /api/brief/generate
7. **Sync Retry Simulation** - Retry logic for 10% of users
8. **License Check** - Background verification

**Metrics tracked**:
- Email sync start latency (target p95: 2000ms)
- Calendar sync latency (target p95: 3000ms)
- Brief generation latency (target p95: 5000ms)
- Queue depth (simulated gauge)
- Memory pressure (simulated gauge)

**Success criteria**:
- Email sync success rate > 90%
- Calendar sync success rate > 85%
- Brief generation success rate > 80%
- Overall response times p95 < 2000ms
- Error rate < 5%

**Use case**: Validating email sync features, weekly stress testing

**Run**: `./run-tests.sh load`

---

### 10. **scenarios/stripe-checkout-stress.js** (349 lines)
Payment processing under extreme load.

**Profile**: Ramps 0 → 20 → 100 → 200 VU peak (11 minutes)

**Phases** (per virtual user):
1. **Phase 1: Setup** - Device registration + trial activation
2. **Phase 2: Checkout Session** - POST /api/checkout/session
3. **Phase 3: Webhook Checkout Complete** - POST /api/webhooks/stripe (simulation)
4. **Phase 4: License Check** - Verify license state post-payment
5. **Phase 5: Webhook Subscription Update** - POST /api/webhooks/stripe
6. **Phase 6: Subscription Status Check** - Background status queries
7. **Phase 7: Error Scenarios** - 5% malformed webhook injection

**Metrics tracked**:
- Checkout session latency (target p95: 1000ms)
- Webhook processing latency (target p95: 200ms)
- Webhook success rate (target: > 99%)
- Payment flow success rate (target: > 95%)

**Success criteria**:
- Checkout success rate > 95%
- Webhook success rate > 99%
- Response times p95 < 1000ms
- Error rate < 5%
- Total errors < 500

**Use case**: Payment feature validation, pre-release testing, Stripe integration

**Run**: `./run-tests.sh stress`

---

### 11. **scenarios/user-journey.js** (438 lines)
Complete end-to-end user flow from app launch to conversion.

**Profile**: Ramps 0 → 5 → 30 VU over 10 minutes

**Steps** (with realistic think times):
1. **Device Registration** - App launch & device registration (0.5-1.5s think)
2. **Trial Activation** - Start free trial (1-3s think)
3. **License Check** - Verify trial is active
4. **Email Account Setup** - Connect email provider (2-5s think)
5. **First Email Sync** - Initial sync (1-3s think, 3-8s background)
6. **Calendar Sync** - Calendar import (1-3s think, 3s background)
7. **Brief Generation** - AI morning brief (2-4s think, 2-5s generation)
8. **Settings Configuration** - User preferences (1-3s think)
9. **License Renewal Check** - Check status before trial ends (1-2s think)
10. **Optional Checkout** - 30% of users proceed to payment (2-5s think, 3-10s flow)

**Metrics tracked**:
- Device register success rate (target: > 98%)
- Trial start success rate (target: > 98%)
- Email sync success rate (target: > 90%)
- Brief generation success rate (target: > 85%)
- Checkout conversion (tracked, not required)

**Success criteria**:
- Device registration success > 98%
- Trial start success > 98%
- Email sync success > 90%
- Brief generation success > 85%
- Overall response times p95 < 1500ms
- Error rate < 3%

**Use case**: Regression testing, UX validation, pre-release checklist

**Run**: `./run-tests.sh user-journey`

---

## 📊 File Statistics

```
Total files:              11
Total JavaScript:         1699 lines
Total Documentation:      1201 lines
Test scenarios:           4
Custom metrics:           25+
API endpoints tested:     15+
Scenario profiles:        5 (smoke, load, stress, spike, soak)
```

---

## 🚀 Quick Start File Map

For different user types:

### I want to... **get started in 5 minutes**
→ Read: `QUICKSTART.md` (234 lines)
→ Then: `./run-tests.sh smoke`

### I want to... **understand the test suite**
→ Read: `SETUP_SUMMARY.md` (289 lines)
→ Then: `README.md` sections on scenarios

### I want to... **run a specific test**
→ Check: `run-tests.sh` (example commands in help)
→ Or: Direct K6 commands in README.md

### I want to... **modify thresholds**
→ Edit: `k6-config.js` (look for `thresholds:` section)
→ Reference: README.md Performance Baselines

### I want to... **add a new metric**
→ Edit: `k6-config.js` (add to `metrics` export)
→ Then: Use in scenarios with `metrics.<category>.<name>`

### I want to... **debug a failing test**
→ Read: README.md Troubleshooting section
→ Try: `./run-tests.sh smoke --no-health-check`

### I want to... **integrate with CI/CD**
→ Read: README.md Advanced Features / CI/CD Integration
→ Copy: GitHub Actions example

---

## 🔗 File Dependencies

```
k6-config.js
├── Imported by: all scenarios
├── Exports: metrics, options, helpers
└── Requires: k6 v1.40+

scenarios/
├── api-smoke.js ──→ imports k6-config.js
├── email-sync-load.js ──→ imports k6-config.js
├── stripe-checkout-stress.js ──→ imports k6-config.js
└── user-journey.js ──→ imports k6-config.js

run-tests.sh
├── Requires: k6 executable
├── Runs: any scenario
└── Reads: .env file

.env (from .env.example)
├── Read by: run-tests.sh
└── Variables: BASE_URL, K6_CLOUD, etc.
```

---

## ✅ Implementation Checklist

- [x] K6 configuration with 5 scenarios
- [x] 25+ custom metrics by endpoint
- [x] 4 comprehensive test scenarios
- [x] Realistic VU profiles
- [x] Proper error handling
- [x] Response validation
- [x] Stripe webhook simulation
- [x] Email/calendar sync testing
- [x] Brief generation under load
- [x] Complete user journey flow
- [x] Performance baselines documentation
- [x] Troubleshooting guide
- [x] Convenience test runner
- [x] Environment configuration template
- [x] Quick start guide
- [x] Comprehensive README

---

## 📞 Support Resources

**This Suite**:
- README.md - Comprehensive documentation
- QUICKSTART.md - Quick reference
- SETUP_SUMMARY.md - Overview
- Troubleshooting sections in each doc

**K6**:
- [K6 Documentation](https://k6.io/docs)
- [K6 Community Forum](https://community.k6.io)
- [K6 GitHub](https://github.com/grafana/k6)

**MorningOps**:
- Backend logs: Check Vercel dashboard
- API endpoints: See backend/api/ directory
- Architecture: See CLAUDE.md

---

**Created**: 2025-03-12
**Status**: ✅ Production Ready
**Location**: `/sessions/happy-tender-turing/mnt/claw-architect/morningops-desktop/qa/load-testing/`
