# Semgrep Rules Summary

Generated: 2026-03-12

## All 25+ Custom Rules

### Security Rules (9)

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `hardcoded-api-keys` | CRITICAL | Detects hardcoded API keys, tokens, secrets |
| `sql-injection-better-sqlite3` | CRITICAL | String concatenation in db.prepare() queries |
| `unsafe-eval` | CRITICAL | eval() or Function() constructors |
| `prototype-pollution` | HIGH | Assignment to __proto__, constructor, prototype |
| `unsafe-deserialization` | CRITICAL | Unsafe deserialization patterns |
| `insecure-crypto-password` | HIGH | MD5/SHA1 used for passwords (use bcrypt/scrypt) |
| `electron-nodeintegration-true` | CRITICAL | nodeIntegration: true in webPreferences |
| `electron-contextisolation-false` | CRITICAL | contextIsolation: false in webPreferences |
| `xss-dangerous-innerhtml` | CRITICAL | dangerouslySetInnerHTML without sanitization |

### Anti-Pattern Rules (7)

| Rule ID | Severity | Landmine |
|---------|----------|----------|
| `execsync-hot-path` | HIGH | #2: execSync blocks event loop |
| `const-in-try-block` | MEDIUM | #3: const scoped to try, undefined in catch |
| `fd-leak-opensync` | MEDIUM | #5: fs.openSync without closeSync before spawn |
| `hardcoded-action-ids` | MEDIUM | #6: Hardcoded ID strings vs config |
| `duplicate-constants` | MEDIUM | #7: Same const defined twice, inconsistent updates |
| `json-rw-race-condition` | HIGH | #1: Read-modify-write on JSON files |
| `missing-csrf-protection` | MEDIUM | IPC handlers without CSRF token validation |

### Code Quality Rules (6)

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `unhandled-promise-rejection` | MEDIUM | Promise without .catch() or try/catch |
| `empty-catch-block` | MEDIUM | catch block with no error handling |
| `type-assertion-any` | MEDIUM | 'as any' disables TypeScript checking |
| `missing-null-check` | MEDIUM | Property access before null check |
| `console-log-production` | MEDIUM | console.log/debug in production code |
| `shell-openexternal-unsafe` | HIGH | shell.openExternal() without URL validation |

### Electron-Specific Rules (2)

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `electron-ipc-no-validation` | MEDIUM | IPC handlers don't validate renderer data |
| `electron-insecure-webpreferences` | CRITICAL | sandbox: false or other unsafe settings |

---

## Coverage by Framework

### TypeScript/JavaScript
- All 25+ rules

### React/JSX
- XSS rules (dangerouslySetInnerHTML)
- Type safety rules
- Code quality rules

### Electron
- 9 Electron-specific security rules
- IPC validation
- WebPreferences security

### Database
- SQL injection detection
- better-sqlite3 specific patterns

---

## Coverage by Threat Category

### OWASP Top 10

| OWASP | Rule | CWE |
|-------|------|-----|
| A03:2021 Injection | sql-injection-better-sqlite3 | CWE-89 |
| A03:2021 Injection | unsafe-eval | CWE-95 |
| A02:2021 Cryptographic | insecure-crypto-password | CWE-327 |
| A01:2021 Broken Access | prototype-pollution | CWE-1321 |

### CWE Coverage

- **CWE-20**: Improper Input Validation (IPC)
- **CWE-79**: Improper Neutralization of XSS
- **CWE-89**: SQL Injection
- **CWE-95**: Improper Neutralization of Directives in Dynamically Evaluated Code
- **CWE-327**: Use of Broken or Risky Cryptographic Algorithm
- **CWE-502**: Deserialization of Untrusted Data
- **CWE-798**: Use of Hard-Coded Credentials
- **CWE-1321**: Improperly Controlled Modification of Object Prototype Attributes

---

## Rule Complexity

### High Pattern Complexity
- `sql-injection-better-sqlite3` - Detects string concat and template literals
- `hardcoded-api-keys` - Regex + multi-pattern detection
- `xss-dangerous-innerhtml` - React-specific with negation patterns

### Medium Pattern Complexity
- `json-rw-race-condition` - Detects read-modify-write sequences
- `const-in-try-block` - Control flow sensitive
- `missing-null-check` - Data flow aware

### Simple Pattern Matching
- `unsafe-eval` - Direct function call detection
- `empty-catch-block` - Structural pattern only
- `console-log-production` - Function call matching

---

## False Positive Mitigation

Each rule includes:
1. **Negative patterns** - Excludes safe alternatives
2. **Metavariable validation** - Type/name based filtering
3. **Message clarity** - Explains when to ignore (if ever)

Example:
```yaml
- id: xss-dangerous-innerhtml
  patterns:
    - pattern: dangerouslySetInnerHTML={{ __html: $DATA }}
    - pattern-not: dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize($DATA) }}
    - pattern-not: dangerouslySetInnerHTML={{ __html: sanitizeHtml($DATA) }}
```

This prevents false positives when using known sanitization libraries.

---

## Maintenance

### When to Update

- New Electron security advisories → Update Electron rules
- New vulnerability patterns discovered → Add security rules
- New anti-patterns identified → Add to anti-pattern section
- Code standards change → Update quality rules

### How to Add Rules

1. Edit `semgrep.yml`
2. Add rule following template
3. Test with: `./run-semgrep.sh --dry-run`
4. Run full scan: `./run-semgrep.sh --verbose`
5. Commit with PR description

### Review Cadence

- **Weekly**: Run full scan, review HIGH and CRITICAL
- **Monthly**: Review all findings, update rules
- **Quarterly**: Add new rules based on threat landscape

---

## Related Documentation

- CLAUDE.md - Operational context and landmines
- README.md - Detailed rule documentation with examples
- QUICK-START.md - Get running in 1 minute
- semgrep.yml - Full rule configuration

