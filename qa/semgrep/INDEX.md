# Semgrep Configuration - Complete Index

**Location**: `/morningops-desktop/qa/semgrep/`

**Last Updated**: 2026-03-12

**Status**: Ready for deployment

---

## Files in This Directory

### Core Configuration

| File | Size | Purpose |
|------|------|---------|
| **semgrep.yml** | 20 KB | Main configuration with 25+ custom rules |
| **run-semgrep.sh** | 6.4 KB | Bash script to run scans with filtering & reporting |

### Documentation

| File | Size | Purpose |
|------|------|---------|
| **README.md** | 14 KB | Complete guide with examples for each rule |
| **QUICK-START.md** | 1.6 KB | Get running in 1 minute |
| **RULES-SUMMARY.md** | 5.5 KB | Table of all 25+ rules with metadata |
| **INTEGRATION-GUIDE.md** | 8 KB | CI/CD, IDE, and workflow integration |
| **INDEX.md** | This file | Navigation guide |

---

## Quick Navigation

### I want to...

**...run a security scan**
→ `./run-semgrep.sh`
→ See [QUICK-START.md](QUICK-START.md)

**...understand the rules**
→ Read [README.md](README.md)
→ Quick ref: [RULES-SUMMARY.md](RULES-SUMMARY.md)

**...integrate into CI/CD**
→ [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md)

**...add a new rule**
→ Edit `semgrep.yml` following existing patterns
→ Test with: `./run-semgrep.sh --dry-run`

**...fix a specific finding**
→ Find rule ID in [RULES-SUMMARY.md](RULES-SUMMARY.md)
→ Read detailed example in [README.md](README.md)

---

## Rule Categories

### Security (9 rules)

Detects critical vulnerabilities:
- Hardcoded secrets
- SQL injection
- XSS via dangerouslySetInnerHTML
- Electron security misconfigs

See: [README.md#security-rules](README.md#security-rules)

### Anti-Patterns (7 rules)

Prevents operational landmines from CLAUDE.md:
- execSync on hot paths (Landmine #2)
- const in try blocks (Landmine #3)
- File descriptor leaks (Landmine #5)
- Race conditions on JSON files (Landmine #1)

See: [README.md#anti-pattern-rules](README.md#anti-pattern-rules)

### Code Quality (6 rules)

Improves maintainability:
- Unhandled promise rejections
- Empty catch blocks
- Type safety (any assertions)
- Null checks

See: [README.md#code-quality-rules](README.md#code-quality-rules)

### Electron-Specific (2 rules)

Electron hardening:
- IPC validation
- WebPreferences security

See: [README.md#electron-specific-rules](README.md#electron-specific-rules)

---

## Usage Examples

### Run all rules
```bash
./run-semgrep.sh
```

### Only CRITICAL issues
```bash
./run-semgrep.sh --severity CRITICAL
```

### JSON output for CI/CD
```bash
./run-semgrep.sh --format json
```

### Preview without running
```bash
./run-semgrep.sh --dry-run
```

See: [QUICK-START.md](QUICK-START.md) for more

---

## Integration Paths

### Development Workflow
- Pre-commit hook: Block CRITICAL findings
- Local scan: `./run-semgrep.sh --severity HIGH`

### CI/CD Pipelines
- GitHub Actions: Upload to SARIF, comment on PRs
- GitLab CI: Block on CRITICAL, archive reports
- Jenkins: Fail build, archive artifacts

See: [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md)

### IDE Integration
- VS Code: Semgrep extension
- JetBrains: Plugin from marketplace

See: [INTEGRATION-GUIDE.md#ide-integration](INTEGRATION-GUIDE.md#ide-integration)

---

## Reports

Findings are saved to: `morningops-desktop/reports/semgrep/`

Report files:
- `findings_YYYYMMDD_HHMMSS.json` - Full JSON output
- `findings_YYYYMMDD_HHMMSS.sarif` - SARIF format (for GitHub Code Scanning)

Query example:
```bash
# Count CRITICAL findings
jq '[.results[] | select(.severity == "CRITICAL")] | length' findings_*.json
```

---

## Rule Statistics

- **Total Rules**: 25+
- **CRITICAL Severity**: 7
- **HIGH Severity**: 6
- **MEDIUM Severity**: 11+
- **Languages**: JavaScript, TypeScript, JSX, TSX
- **Frameworks**: Electron, React, Node.js

---

## Updates & Maintenance

### Add New Rule

1. Edit `semgrep.yml`
2. Add rule following existing format
3. Test: `./run-semgrep.sh --dry-run`
4. Run full scan: `./run-semgrep.sh --verbose`
5. Document in README.md

### Update Existing Rule

1. Edit `semgrep.yml`
2. Adjust pattern, message, or metadata
3. Test: `./run-semgrep.sh --dry-run`
4. Run scan to verify changes
5. Update README.md if needed

### Rule Review Cadence

- **Weekly**: Review CRITICAL and HIGH findings
- **Monthly**: Review all findings, update rules if needed
- **Quarterly**: Add new rules based on threat landscape

---

## Performance Notes

Typical scan times:
- Small codebase (< 100 files): 5-10 seconds
- Medium codebase (100-1000 files): 30-60 seconds
- Large codebase (1000+ files): 2-5 minutes

To optimize:
- Exclude node_modules, dist, build in semgrep.yml
- Run with `--timeout 30` for faster results
- Scan src/ only instead of entire project

---

## Troubleshooting

### Semgrep not found
```bash
pip install semgrep
semgrep --version
```

### No rules loaded
```bash
semgrep --list-rules --config=semgrep.yml
```

### Too many false positives
- Review rule in README.md
- Add `pattern-not` exclusion to semgrep.yml
- Test with `--dry-run`

### Performance issues
- Limit to specific directory: `semgrep --config=semgrep.yml src/`
- Exclude large directories in semgrep.yml

See: [README.md#troubleshooting](README.md#troubleshooting)

---

## External References

- [Semgrep Official Docs](https://semgrep.dev/docs/)
- [Rule Writing Guide](https://semgrep.dev/docs/writing-rules/overview/)
- [Pattern Syntax](https://semgrep.dev/docs/writing-rules/pattern-syntax/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Electron Security](https://www.electronjs.org/docs/tutorial/security)
- [CWE List](https://cwe.mitre.org/)

---

## Support & Issues

For questions:
1. Check [README.md](README.md) for rule explanations
2. Review [QUICK-START.md](QUICK-START.md) for usage
3. See [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md) for CI/CD help
4. Run `./run-semgrep.sh --help` for script options

---

## Checklist for New Developers

- [ ] Install semgrep: `pip install semgrep`
- [ ] Run local scan: `./run-semgrep.sh`
- [ ] Read QUICK-START.md
- [ ] Review RULES-SUMMARY.md
- [ ] Check findings in reports/semgrep/
- [ ] Add pre-commit hook if using git
- [ ] Bookmark README.md for reference

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-12 | 1.0 | Initial release with 25+ rules |

---

**Total Files**: 6
**Total Lines**: 1,760+
**Last Scan**: (Run `./run-semgrep.sh` to generate)
