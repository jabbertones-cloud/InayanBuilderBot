# ECOINTEL Benchmark Test Harness

## Overview

This test harness (`ecointel-benchmark.test.js`) exposes **four systematic failures** in the current scout scoring system when applied to non-dashboard tools like PDF libraries.

The tests validate that:

1. **UI Evidence Collapse**: PdfEzFill (a sophisticated PDF tool) scores uiEvidence=0
2. **UI Gate Filters All**: Scout's `uiEvidence >= 5` gate rejects almost all PDF tools
3. **No Dependency Analysis**: Tools sharing dependencies (pdf-lib, pdfjs-dist) aren't clustered
4. **Feature Blindness**: Can't distinguish form-fillers from viewers from generators

## What Gets Tested

### Test Data

- **PdfEzFill** (actual product): 45 stars, TypeScript, OCR + form-filling + e-signatures
- **Public PDF Tools** (real GitHub stats):
  - pdf.js (Mozilla): 48k stars, viewer
  - pdfkit: 9.8k stars, generator
  - pdf-lib: 6.5k stars, manipulator
  - react-pdf: 9.2k stars, React viewer
  - pdf2json: 2.1k stars, parser
  - pdf-fill-form: 250 stars, form-filler

### Scoring Functions (Recreated)

All functions faithfully copied from `src/index.js:1223-1620`:
- `computeUiEvidence()` - weights dashboard/chat/react keywords
- `computeBreakPatternEvidence()` - targets Stripe webhooks
- `scoreRepo()` - calculates final repo score
- `benchmarkRepos()` - ranks repos by benchmark score

## Test Results

All 8 tests pass, exposing the failures:

```
ECOINTEL BENCHMARK: FAILURE MODES EXPOSED

[FAILURE 1] UI Evidence Collapse
  PdfEzFill = uiEvidence: 0 (needs >= 5 to avoid filter)
  Reason: No 'dashboard', 'chat', 'webui', 'react' keywords

[FAILURE 2] Scout's UI Gate Filters Out Almost All PDF Tools
  Tools passing uiEvidence >= 5 gate: 1 / 7
  Only react-pdf passes (has "react" keyword)

[FAILURE 3] No Dependency-Based Clustering
  PdfEzFill depends on: pdf-lib, pdfjs-dist, pdfkit
  But scorer never analyzes dependencies
  No similarity clustering possible

[FAILURE 4] Star Count + UI Bias (Not Category-Aware)
  Final ranking:
    #1. pdf.js (48k stars, uiEvidence=0)
    #2. react-pdf (9.2k stars, uiEvidence=1) ← beats pdfkit despite 600 fewer stars!
    #3. pdfkit (9.8k stars, uiEvidence=0)
    #4. pdf-lib (6.5k stars, uiEvidence=0)
    ...
    #7. PdfEzFill (45 stars, uiEvidence=0)
```

## Root Cause

The scoring system is **hardcoded for dashboard/chat repos**:
- `uiEvidence` weights: dashboard (3), chat (3), react (1), nextjs (1)
- `breakPatternEvidence` weights: Stripe webhook (4), signature (3)
- `frameworkOnly` penalty: -22 for libraries without UI

It **cannot distinguish**:
- Form-fillers from viewers from generators (all zero uiEvidence)
- High-quality tools from low-quality (uiEvidence doesn't apply)
- Essential infrastructure (pdf.js, pdf-lib) from niche tools (pdf-fill-form)

## Key Observations

### UI Bias Proof
react-pdf ranks #2 despite having **fewer stars** than pdfkit (#3):
- react-pdf: 9.2k stars, **uiEvidence=1** → benchmarkScore=8.05
- pdfkit: 9.8k stars, **uiEvidence=0** → benchmarkScore=5.66

This proves the UI component dominates over popularity when UI evidence exists.

### Systematic Filtering
All PDF tools except react-pdf are filtered by `uiEvidence < 5`:
- PdfEzFill: 0 (filtered)
- pdfkit: 0 (filtered)
- pdf-lib: 0 (filtered)
- pdf.js: 0 (filtered)
- pdf2json: 0 (filtered)
- pdf-fill-form: 0 (filtered)
- react-pdf: 1 (barely passes, only due to "react" keyword)

### No Feature Recognition
Three different PDF tool types score identically:
- PdfEzFill (form-filler): uiEvidence=0, breakPatternEvidence=0
- pdf.js (viewer): uiEvidence=0, breakPatternEvidence=0
- pdfkit (generator): uiEvidence=0, breakPatternEvidence=0

The system cannot differentiate by function, quality, or ecosystem.

## Running the Tests

```bash
node --test tests/ecointel-benchmark.test.js
```

All 8 tests pass, confirming all four failure modes are present.

## Recommendations

1. **Design domain-specific scorers**: 
   - PDF tools: form-filling capability, field detection, OCR
   - Data tools: query speed, schema support, integrations
   - Backend: API design patterns, webhook handling, job queues
   - Infra: deployment targets, observability, HA features

2. **Implement dependency-based clustering**:
   - Tools sharing dependencies → same category
   - Build dependency graphs for semantic grouping

3. **Add per-category feature extraction**:
   - Scan code for category-specific patterns
   - Weight keywords by domain (not universal)
   - Calibrate evidence thresholds per category

4. **Remove or make optional the dashboard/chat bias**:
   - UI evidence should only apply to UI-focused repos
   - Non-UI tools shouldn't be penalized for lacking dashboards

## Files

- **Test file**: `tests/ecointel-benchmark.test.js` (489 lines)
- **Test count**: 8 subtests, all passing
- **Functions tested**: `computeUiEvidence`, `computeBreakPatternEvidence`, `scoreRepo`, `benchmarkRepos`
- **Coverage**: Recreates entire scoring pipeline from source
