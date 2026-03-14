# Semgrep Static Analysis Configuration

Comprehensive static analysis rules for MorningOps Desktop (Electron + TypeScript + React).

## Overview

This configuration includes 25+ custom Semgrep rules covering:
- **Security vulnerabilities** (hardcoded secrets, SQL injection, XSS, Electron-specific issues)
- **Anti-patterns** (from CLAUDE.md operational landmines)
- **Code quality** (unhandled errors, type safety, null checks)
- **Electron-specific security** (IPC validation, preload safety, webPreferences)

## Installation

### Prerequisites

- Python 3.7+
- pip (Python package manager)

### Install Semgrep

```bash
# macOS / Linux
pip install semgrep

# Windows
pip install semgrep
```

Verify installation:
```bash
semgrep --version
```

## Usage

### Basic Scan

Run all rules:
```bash
./run-semgrep.sh
```

### Filter by Severity

```bash
# Only CRITICAL issues
./run-semgrep.sh --severity CRITICAL

# CRITICAL and HIGH
./run-semgrep.sh --severity HIGH

# Include MEDIUM severity
./run-semgrep.sh --severity MEDIUM
```

### Output Formats

```bash
# Text output (default)
./run-semgrep.sh

# JSON output for CI/CD
./run-semgrep.sh --format json

# SARIF format (for GitHub Code Scanning)
./run-semgrep.sh --format sarif

# HTML report
./run-semgrep.sh --format html
```

### Dry Run

Preview rules without scanning:
```bash
./run-semgrep.sh --dry-run
```

This shows:
- Command to be executed
- Available rules
- Rule metadata

### Verbose Mode

```bash
./run-semgrep.sh --verbose
```

Shows detailed output including:
- Rule parsing
- File scanning progress
- Match details

### Combined Example

```bash
# Scan for only CRITICAL and HIGH, output as JSON
./run-semgrep.sh --severity HIGH --format json
```

## Rule Categories

### Security Rules

#### Hardcoded API Keys (`hardcoded-api-keys`)
Detects hardcoded API keys, tokens, and secrets in source code.

**Severity**: CRITICAL

**Example (BAD):**
```typescript
const apiKey = "sk_live_abc123def456";
const dbPassword = "my-secret-password";
```

**Example (GOOD):**
```typescript
const apiKey = process.env.STRIPE_API_KEY;
const dbPassword = process.env.DB_PASSWORD;
```

---

#### SQL Injection in better-sqlite3 (`sql-injection-better-sqlite3`)
Detects string concatenation in database queries instead of parameterized queries.

**Severity**: CRITICAL

**Example (BAD):**
```typescript
const userId = getUserIdFromRequest();
db.prepare("SELECT * FROM users WHERE id = " + userId).all();

// String interpolation is also vulnerable:
db.prepare(`SELECT * FROM users WHERE id = ${userId}`).all();
```

**Example (GOOD):**
```typescript
db.prepare("SELECT * FROM users WHERE id = ?").all(userId);
```

---

#### Unsafe eval() (`unsafe-eval`)
Detects eval() and Function() constructors which execute arbitrary code.

**Severity**: CRITICAL

**Example (BAD):**
```typescript
const result = eval(userInput);
const fn = new Function("return " + userInput)();
```

**Example (GOOD):**
```typescript
const result = JSON.parse(userInput); // If parsing JSON
// Or use a dedicated expression evaluator library
```

---

#### Prototype Pollution (`prototype-pollution`)
Detects patterns that could lead to prototype pollution attacks.

**Severity**: HIGH

**Example (BAD):**
```typescript
const obj = {};
obj["__proto__"] = { isAdmin: true };
Object.assign(target, untrustedInput); // If untrustedInput has __proto__
```

**Example (GOOD):**
```typescript
const obj = Object.create(null); // No prototype
const safeObj = Object.assign({}, JSON.parse(untrustedInput)); // Fresh object
```

---

#### Insecure Electron WebPreferences (`electron-nodeintegration-true`, `electron-contextisolation-false`)
Detects dangerous Electron security misconfigurations.

**Severity**: CRITICAL

**Example (BAD):**
```typescript
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,        // CRITICAL
    contextIsolation: false,       // CRITICAL
    enableRemoteModule: true,      // CRITICAL
  }
});
```

**Example (GOOD):**
```typescript
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,        // Default, but be explicit
    contextIsolation: true,        // MUST be true
    enableRemoteModule: false,     // Default, use IPC instead
    sandbox: true,                 // Enable sandbox
    preload: path.join(__dirname, 'preload.ts') // Safe preload
  }
});
```

---

#### XSS via dangerouslySetInnerHTML (`xss-dangerous-innerhtml`)
Detects unsafe HTML injection without sanitization.

**Severity**: CRITICAL

**Example (BAD):**
```typescript
// User data without sanitization
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

**Example (GOOD):**
```typescript
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

---

#### Shell.openExternal without Validation (`electron-shell-openexternal-unsafe`)
Detects opening arbitrary URLs without validation.

**Severity**: HIGH

**Example (BAD):**
```typescript
import { shell } from 'electron';

const userUrl = getUserInput();
shell.openExternal(userUrl); // Could be javascript: or data: URL
```

**Example (GOOD):**
```typescript
import { shell } from 'electron';

function validateAndOpen(url: string) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    shell.openExternal(url);
  } catch (e) {
    console.error('Invalid URL:', e);
  }
}
```

---

### Anti-Pattern Rules (from CLAUDE.md)

#### execSync on Hot Paths (`execsync-hot-path`)
Detects blocking system calls in handlers (Landmine #2).

**Severity**: HIGH

**Example (BAD):**
```typescript
app.get('/api/health', (req, res) => {
  const result = execSync('some-command'); // Blocks event loop!
  res.json({ result });
});
```

**Example (GOOD):**
```typescript
app.get('/api/health', async (req, res) => {
  const result = await exec('some-command'); // Async, non-blocking
  res.json({ result });
});
```

---

#### const Inside Try Block (`const-in-try-block`)
Detects variables declared in try but used in catch (Landmine #3).

**Severity**: MEDIUM

**Example (BAD):**
```typescript
try {
  const data = parseJSON(input);
} catch (error) {
  console.log(data); // ReferenceError: data is not defined
}
```

**Example (GOOD):**
```typescript
let data; // Declare outside
try {
  data = parseJSON(input);
} catch (error) {
  console.log(data); // Safe to use
}
```

---

#### File Descriptor Leaks (`fd-leak-opensync`)
Detects fd leaks from fs.openSync before spawn (Landmine #5).

**Severity**: MEDIUM

**Example (BAD):**
```typescript
const fd = fs.openSync('file.txt');
const child = spawn('command'); // Child inherits fd, parent never closes
```

**Example (GOOD):**
```typescript
const fd = fs.openSync('file.txt');
try {
  const child = spawn('command');
} finally {
  fs.closeSync(fd); // Explicit close
}

// Or use async:
const file = await fs.promises.open('file.txt');
const child = spawn('command');
await file.close();
```

---

#### JSON Read-Modify-Write Race (`json-rw-race-condition`)
Detects TOCTOU issues in JSON file handling (Landmine #1).

**Severity**: HIGH

**Example (BAD):**
```typescript
const data = JSON.parse(fs.readFileSync('config.json', 'utf8'));
data.userId = 123;
fs.writeFileSync('config.json', JSON.stringify(data)); // Race condition
```

**Example (GOOD):**
```typescript
// Use database (PostgreSQL)
await db.update('config').set({ userId: 123 }).where({ id: 1 });

// Or atomic file write with fs.promises
const data = JSON.parse(await fs.promises.readFile('config.json', 'utf8'));
data.userId = 123;
const tempFile = 'config.json.tmp';
await fs.promises.writeFile(tempFile, JSON.stringify(data));
await fs.promises.rename(tempFile, 'config.json'); // Atomic on most filesystems
```

---

#### console.log in Production (`console-log-production`)
Detects debug logging that should use logger instead.

**Severity**: MEDIUM

**Example (BAD):**
```typescript
console.log('User logged in:', userId);
console.debug('Processing request');
```

**Example (GOOD):**
```typescript
import { logger } from './logger';

logger.info('User logged in', { userId });
logger.debug('Processing request');
```

---

### Code Quality Rules

#### Unhandled Promise Rejection (`unhandled-promise-rejection`)
Detects promises without error handling.

**Severity**: MEDIUM

**Example (BAD):**
```typescript
Promise.all([
  fetchUser(),
  fetchSettings(),
  fetchNotifications()
]); // No .catch() or try/catch
```

**Example (GOOD):**
```typescript
try {
  const [user, settings, notifications] = await Promise.all([
    fetchUser(),
    fetchSettings(),
    fetchNotifications()
  ]);
} catch (error) {
  logger.error('Failed to load user data', { error });
}
```

---

#### Empty Catch Blocks (`empty-catch-block`)
Detects catch blocks that don't handle errors.

**Severity**: MEDIUM

**Example (BAD):**
```typescript
try {
  await risky();
} catch (e) {
  // Silent failure
}
```

**Example (GOOD):**
```typescript
try {
  await risky();
} catch (e) {
  logger.error('Risky operation failed', { error: e });
  // Handle gracefully
}
```

---

#### Any Type Assertion (`type-assertion-any`)
Detects 'as any' which disables TypeScript checking.

**Severity**: MEDIUM

**Example (BAD):**
```typescript
const data = (apiResponse as any).data;
const user = userObj as any;
```

**Example (GOOD):**
```typescript
interface ApiResponse {
  data: unknown;
}
const data = (apiResponse as ApiResponse).data;

const user: User = userObj; // Type-safe
```

---

### Electron-Specific Rules

#### IPC Without Validation (`electron-ipc-no-validation`)
Detects IPC handlers that don't validate renderer input.

**Severity**: MEDIUM

**Example (BAD):**
```typescript
ipcMain.handle('delete-file', async (event, filePath) => {
  fs.unlinkSync(filePath); // filePath is untrusted!
});
```

**Example (GOOD):**
```typescript
ipcMain.handle('delete-file', async (event, filePath) => {
  // Validate input
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid filePath');
  }

  // Validate it's in allowed directory
  const fullPath = path.resolve(filePath);
  const allowedDir = path.resolve(app.getPath('userData'));

  if (!fullPath.startsWith(allowedDir)) {
    throw new Error('Access denied');
  }

  fs.unlinkSync(fullPath);
});
```

---

## Integration with CI/CD

### GitHub Actions

```yaml
name: Semgrep Scan

on: [push, pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Semgrep
        run: pip install semgrep

      - name: Run Semgrep
        working-directory: morningops-desktop/qa/semgrep
        run: ./run-semgrep.sh --severity CRITICAL

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: morningops-desktop/reports/semgrep/*.sarif
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd morningops-desktop/qa/semgrep
./run-semgrep.sh --severity CRITICAL
if [ $? -eq 2 ]; then
  echo "Commit blocked: CRITICAL Semgrep findings"
  exit 1
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Adding New Rules

### Rule Structure

```yaml
- id: unique-rule-id
  patterns:
    - pattern: |
        code_pattern_to_match
  message: >
    Clear explanation of the issue and how to fix it.
  languages: [javascript, typescript]
  severity: MEDIUM
  metadata:
    category: security
    cwe: CWE-NUMBER
    references:
      - https://example.com
```

### Pattern Types

**Single pattern:**
```yaml
pattern: |
  unsafe_function(...)
```

**Multiple patterns (all must match):**
```yaml
patterns:
  - pattern: $OBJ.property
  - metavariable-regex:
      metavariable: $OBJ
      regex: '(foo|bar)'
```

**Pattern alternatives (one must match):**
```yaml
pattern-either:
  - pattern: eval(...)
  - pattern: Function(...)
```

**Negation (pattern must NOT match):**
```yaml
pattern-not: |
  validated_function(...)
```

### Example: Adding a Rule

File: `semgrep.yml`

```yaml
- id: custom-rule-example
  pattern-either:
    - pattern: |
        dangerousFunction($INPUT)
    - pattern: |
        dangerousFunction($INPUT, ...)
  message: >
    dangerousFunction() is insecure. Use safeAlternative() instead.
    Example: safeAlternative(sanitize($INPUT))
  languages: [typescript, javascript]
  severity: HIGH
  metadata:
    category: security
    references:
      - https://docs.example.com/security
```

Test the new rule:
```bash
./run-semgrep.sh --dry-run
```

---

## Troubleshooting

### Semgrep Not Found

```bash
which semgrep
# If not found, install:
pip install semgrep
```

### No Rules Loaded

```bash
# Verify config syntax
semgrep --list-rules --config=semgrep.yml

# Check for YAML errors
python -m yaml semgrep.yml
```

### Too Many False Positives

Refine rule patterns or add exclusions:
```yaml
paths:
  exclude:
    - tests/**
    - node_modules/**
```

### Performance Issues

Limit scanning to specific directories:
```bash
./run-semgrep.sh # Only scans src/ by default
```

Or exclude large directories:
```bash
semgrep --config=semgrep.yml --exclude=node_modules src/
```

---

## Documentation Links

- [Semgrep Docs](https://semgrep.dev/docs/)
- [Rule Writing Guide](https://semgrep.dev/docs/writing-rules/overview/)
- [Pattern Syntax](https://semgrep.dev/docs/writing-rules/pattern-syntax/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Electron Security](https://www.electronjs.org/docs/tutorial/security)
- [CLAUDE.md Landmines](file:///sessions/happy-tender-turing/mnt/claw-architect/CLAUDE.md)

---

## Support

For issues or questions:
1. Check the [Semgrep Documentation](https://semgrep.dev/docs/)
2. Review rule examples in this config
3. Run with `--verbose` for detailed output
4. Test with `--dry-run` before running full scan
