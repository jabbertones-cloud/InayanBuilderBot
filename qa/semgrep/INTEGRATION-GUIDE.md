# Semgrep Integration Guide

How to integrate Semgrep into the MorningOps Desktop development workflow.

## Development Workflow

### Pre-Commit Integration

```bash
# Create .husky/pre-commit
#!/bin/sh
cd morningops-desktop/qa/semgrep
./run-semgrep.sh --severity CRITICAL --dry-run || exit 1
```

This prevents commits with CRITICAL issues.

### Local Scanning

Before pushing, run locally:

```bash
cd morningops-desktop/qa/semgrep
./run-semgrep.sh --severity HIGH
```

Review findings in `reports/semgrep/findings_*.json`

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/semgrep.yml`:

```yaml
name: Semgrep Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install Semgrep
        run: pip install semgrep

      - name: Run Semgrep
        working-directory: morningops-desktop/qa/semgrep
        run: ./run-semgrep.sh --severity CRITICAL --format json
        continue-on-error: true

      - name: Upload results to GitHub Security
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: morningops-desktop/reports/semgrep/*.sarif
          category: 'semgrep'

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const path = require('path');
            
            // Find latest report
            const reportsDir = 'morningops-desktop/reports/semgrep';
            const files = fs.readdirSync(reportsDir)
              .filter(f => f.startsWith('findings_') && f.endsWith('.json'))
              .sort()
              .reverse();
            
            if (files.length === 0) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: '✅ Semgrep: No security findings'
              });
              return;
            }
            
            const report = JSON.parse(
              fs.readFileSync(path.join(reportsDir, files[0]), 'utf8')
            );
            
            const critical = report.results.filter(r => r.severity === 'CRITICAL').length;
            const high = report.results.filter(r => r.severity === 'HIGH').length;
            
            let body = `## Semgrep Security Scan\n\n`;
            body += `🔴 **Critical**: ${critical}\n`;
            body += `🟠 **High**: ${high}\n`;
            
            if (critical > 0 || high > 0) {
              body += `\n⚠️ [View Details](../../actions/runs/${context.runId})`;
            }
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

### GitLab CI Integration

Create `.gitlab-ci.yml` section:

```yaml
semgrep:scan:
  stage: test
  image: python:3.11
  before_script:
    - pip install semgrep
  script:
    - cd morningops-desktop/qa/semgrep
    - ./run-semgrep.sh --severity CRITICAL
  artifacts:
    reports:
      sast: morningops-desktop/reports/semgrep/*.sarif
    paths:
      - morningops-desktop/reports/semgrep/
    expire_in: 1 month
  allow_failure: false
  only:
    - merge_requests
    - main
    - develop
```

### Jenkins Integration

```groovy
stage('Security Scan') {
  steps {
    dir('morningops-desktop/qa/semgrep') {
      sh '''
        pip install semgrep
        ./run-semgrep.sh --severity CRITICAL --format json
      '''
    }
    
    // Archive results
    archiveArtifacts artifacts: 'morningops-desktop/reports/semgrep/*.json'
    
    // Fail build on critical findings
    script {
      def report = readJSON file: 'morningops-desktop/reports/semgrep/findings_*.json'
      def critical = report.results.findAll { it.severity == 'CRITICAL' }.size()
      if (critical > 0) {
        currentBuild.result = 'FAILURE'
        error("Found ${critical} CRITICAL security issues")
      }
    }
  }
}
```

---

## IDE Integration

### VS Code

Install Semgrep extension:

1. Open Extensions: `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
2. Search: "Semgrep"
3. Install official Semgrep extension

Config in `.vscode/settings.json`:

```json
{
  "semgrep.rules": ["file:///path/to/morningops-desktop/qa/semgrep/semgrep.yml"],
  "semgrep.severity": "HIGH"
}
```

### JetBrains IDEs (IntelliJ, WebStorm)

1. Install Semgrep plugin from marketplace
2. Configure in Settings → Tools → Semgrep
3. Point to custom config: `morningops-desktop/qa/semgrep/semgrep.yml`
4. Set minimum severity to HIGH

---

## Reporting & Analysis

### Weekly Security Report

```bash
#!/bin/bash
# scripts/security-report.sh

REPORTS_DIR="morningops-desktop/reports/semgrep"

echo "## Weekly Semgrep Security Report"
echo ""

# Count by severity
echo "### Findings by Severity"
for severity in CRITICAL HIGH MEDIUM LOW; do
  count=$(grep -c "\"severity\":\"$severity\"" $(ls -t $REPORTS_DIR/findings_*.json | head -1) || echo 0)
  echo "- $severity: $count"
done

echo ""
echo "### Top 10 Issues"
jq -r '.results[] | "\(.rule.id): \(.path):\(.start.line)"' $(ls -t $REPORTS_DIR/findings_*.json | head -1) | head -10

echo ""
echo "### Trends (Last 5 Runs)"
for f in $(ls -t $REPORTS_DIR/findings_*.json | head -5); do
  count=$(jq '.results | length' $f)
  date=$(echo $f | sed 's/.*findings_//;s/.json//')
  echo "- $date: $count findings"
done
```

### Dashboard Integration

Query results in code:

```javascript
// reports/semgrep-dashboard.js
const fs = require('fs');
const path = require('path');

function getLatestReport() {
  const dir = 'morningops-desktop/reports/semgrep';
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('findings_') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  
  return JSON.parse(
    fs.readFileSync(path.join(dir, files[0]), 'utf8')
  );
}

function getSummary() {
  const report = getLatestReport();
  if (!report) return { critical: 0, high: 0, medium: 0, low: 0 };
  
  return {
    critical: report.results.filter(r => r.severity === 'CRITICAL').length,
    high: report.results.filter(r => r.severity === 'HIGH').length,
    medium: report.results.filter(r => r.severity === 'MEDIUM').length,
    low: report.results.filter(r => r.severity === 'LOW').length,
    timestamp: report.metadata.timestamp
  };
}

module.exports = { getLatestReport, getSummary };
```

---

## Configuration Tuning

### Adjust Rule Severity

Edit `semgrep.yml` to change rule severity:

```yaml
- id: my-rule
  severity: CRITICAL  # Change this: CRITICAL, HIGH, MEDIUM, LOW
```

### Exclude Directories

Add to `semgrep.yml`:

```yaml
paths:
  exclude:
    - tests/**
    - node_modules/**
    - dist/**
    - build/**
```

### Run Only Specific Rules

```bash
semgrep --config=semgrep.yml \
  --include-rule=hardcoded-api-keys \
  --include-rule=sql-injection-better-sqlite3 \
  src/
```

---

## Troubleshooting

### Too Many False Positives

1. Review the false positive
2. Add a `pattern-not` to exclude safe patterns
3. Update `semgrep.yml` and test

```yaml
- id: rule-id
  pattern: dangerousThing(...)
  pattern-not: safeAlternative(...)  # Add this
```

### Performance Issues

Limit scope:

```bash
./run-semgrep.sh  # Only scans src/

# Or manually:
semgrep --config=semgrep.yml src/
```

### No Results Found

Check config is valid:

```bash
semgrep --list-rules --config=semgrep.yml
```

Check file types are supported:

```bash
# Verify .ts/.tsx files exist
find src -name "*.ts" -o -name "*.tsx" | head
```

---

## Best Practices

1. **Run locally before pushing**
   ```bash
   ./run-semgrep.sh --severity HIGH
   ```

2. **Fix CRITICAL immediately**
   - Don't commit code with CRITICAL findings

3. **Review HIGH weekly**
   - Schedule time to address HIGH severity findings

4. **Update rules quarterly**
   - New vulnerabilities emerge
   - Add rules as threats are discovered

5. **Document exceptions**
   - If ignoring a finding, add comment with justification

---

## Support

- [Semgrep Docs](https://semgrep.dev/docs/)
- [Rule Writing](https://semgrep.dev/docs/writing-rules/)
- Local: `./run-semgrep.sh --help`
- Report: `morningops-desktop/reports/semgrep/findings_*.json`
