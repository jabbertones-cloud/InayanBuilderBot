# K6 Load Testing - Quick Start Guide

Get up and running with K6 load testing for MorningOps Desktop in 5 minutes.

## 1. Install K6

### macOS
```bash
brew install k6
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6-stable.list
sudo apt-get update
sudo apt-get install k6
```

### Verify Installation
```bash
k6 version
# Should output: k6 v1.40.0 or higher
```

## 2. Configure Environment

```bash
cd morningops-desktop/qa/load-testing

# Copy environment template
cp .env.example .env

# Edit .env to set your BASE_URL (default: http://localhost:3000)
# BASE_URL=http://localhost:3000
```

## 3. Run Tests

### Option A: Using the Convenience Script (Recommended)

```bash
# Make script executable (one-time)
chmod +x run-tests.sh

# Run smoke test
./run-tests.sh smoke

# Run against staging
./run-tests.sh load --env BASE_URL=https://staging.morningops.app

# Run all tests
./run-tests.sh all

# Show usage
./run-tests.sh help
```

### Option B: Direct K6 Commands

```bash
# Smoke test (1 VU, ~50 seconds)
k6 run scenarios/api-smoke.js

# Email sync load test (50 VU peak, ~10 minutes)
k6 run scenarios/email-sync-load.js

# Stripe payment stress test (200 VU peak, ~11 minutes)
k6 run scenarios/stripe-checkout-stress.js

# Complete user journey (30 VU peak, ~10 minutes)
k6 run scenarios/user-journey.js
```

## 4. Interpret Results

A successful test shows:
```
✓ All checks passed
checks.........................: 100% ✓ 1000   ✗ 0
http_req_duration...............: avg=245ms  min=50ms   p(95)=400ms p(99)=500ms
http_req_failed.................: 0.00%
```

Key metrics:
- **✓ All checks passed**: Assertions worked correctly
- **http_req_duration p(95)**: 95th percentile latency (lower is better)
- **http_req_failed**: Error rate (should be < 1%)
- **checks rate**: Assertion success rate (should be 100%)

## 5. File Structure

```
qa/load-testing/
├── k6-config.js                 # Main config, metrics, thresholds
├── scenarios/
│   ├── api-smoke.js             # Smoke test (1 VU)
│   ├── email-sync-load.js       # Email sync stress (50 VU)
│   ├── stripe-checkout-stress.js # Payment stress (200 VU)
│   └── user-journey.js          # User flow (30 VU)
├── run-tests.sh                 # Convenience test runner
├── README.md                    # Full documentation
├── QUICKSTART.md                # This file
└── .env.example                 # Configuration template
```

## Common Tasks

### Test local backend
```bash
# Terminal 1: Start backend
cd backend
npm install
npm run dev

# Terminal 2: Run tests
cd qa/load-testing
./run-tests.sh smoke
```

### Test against staging
```bash
./run-tests.sh load --env BASE_URL=https://staging.morningops.app
```

### Run in background
```bash
# Unix/Linux/macOS
nohup k6 run scenarios/email-sync-load.js > test-results.log 2>&1 &

# Or in screen
screen -S k6-test
k6 run scenarios/email-sync-load.js
# Press Ctrl+A then D to detach
```

### Generate HTML report
First, install the HTML extension:
```bash
k6 install extensions
```

Then run tests with HTML output:
```bash
k6 run \
  --out html=results/report.html \
  scenarios/api-smoke.js
```

### Run with custom parameters
```bash
# Run with 100 VUs for 5 minutes
k6 run --vus 100 --duration 5m scenarios/email-sync-load.js

# Run with custom timeout
k6 run --http-timeout 30s scenarios/api-smoke.js
```

## Troubleshooting

### "Connection refused" error
```bash
# Make sure backend is running
curl http://localhost:3000/api/health

# Or test against different URL
k6 run --env BASE_URL=https://api.example.com scenarios/api-smoke.js
```

### "Too many open files" error
```bash
# Increase file descriptor limit
ulimit -n 65536

# Then run test again
k6 run scenarios/stripe-checkout-stress.js
```

### Slow response times
- Check backend performance: `curl -i http://localhost:3000/api/health`
- Monitor database: Check PostgreSQL slow query log
- Review Vercel analytics if using production
- Run smoke test first to establish baseline

### Tests failing with 5xx errors
- Check backend error logs
- Verify database is running: `psql -d morningops_db -c "SELECT 1"`
- Restart backend: `npm restart` or docker restart

## Next Steps

1. **Read Full Documentation**: See `README.md` for comprehensive guide
2. **Customize Thresholds**: Edit `k6-config.js` to match your performance targets
3. **Add to CI/CD**: Integrate tests into GitHub Actions, GitLab CI, or Jenkins
4. **Monitor Production**: Use K6 Cloud for scheduled tests

## K6 Cloud (Optional)

For distributed load testing from multiple regions:

```bash
# Set up free account
k6 login cloud

# Run test in cloud
k6 run --cloud scenarios/api-smoke.js

# View results at https://cloud.k6.io
```

## Performance Targets

Expected response times (local development):

| Endpoint | p95 Target |
|----------|-----------|
| GET /api/health | 40ms |
| POST /api/auth/device-register | 250ms |
| GET /api/license/check | 200ms |
| POST /api/trial/start | 450ms |
| POST /api/checkout/session | 600ms |
| POST /api/email/sync/start | 2000ms |
| POST /api/brief/generate | 5000ms |

## Need Help?

1. **K6 Documentation**: https://k6.io/docs
2. **K6 Community**: https://community.k6.io
3. **MorningOps Docs**: See `/mnt/claw-architect/README.md`
4. **Backend Logs**: Check Vercel dashboard or local logs

---

Happy load testing! 🚀
