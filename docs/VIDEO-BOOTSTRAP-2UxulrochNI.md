# Video Bootstrap: 2UxulrochNI

Source video: https://www.youtube.com/watch?v=2UxulrochNI  
Title: This AI Clone Automation Creates Unique Content Daily! (100% Automated!)  
Channel: AI Andy

## Transcript-derived starting point for Inayan Builder

This repository now supports generating a transcript-grounded Inayan starting plan via:

`POST /api/v1/content/video-bootstrap`

Request example:

```json
{
  "videoId": "2UxulrochNI",
  "dailyVideos": 5,
  "platforms": ["youtube", "facebook", "instagram", "tiktok"],
  "mode": "advanced"
}
```

The endpoint reads transcript index data from:

`$YOUTUBE_INDEX_PATH` (or default: `/Users/tatsheen/claw-architect/reports/youtube-transcript-visual-index-latest.json`)

## Signals learned from transcript

- Five videos daily claim: true
- Full automation claim: true
- Airtable referenced: true
- n8n/template workflow referenced: true
- Cross-platform publish referenced: true

## Advanced feature plan generated

- Multi-platform fanout with per-platform adapters
- Template-driven workflow orchestration
- Daily scheduler + batch generation
- Quality and safety guardrails

## Execution phases

1. Transcript-grounded starter build
2. Automation hardening
3. Scale and optimization

