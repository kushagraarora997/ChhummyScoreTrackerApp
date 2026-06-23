# Chhummy Tracker — E2E Tests

Playwright-based end-to-end tests. Require a running dev server on port 5173.

## Setup

```bash
# One-time: install Playwright (do this in this directory or a sibling temp dir)
cd tests/e2e
npm init -y
npm install playwright
```

## Run

```bash
# Start dev server first
npm run dev   # from repo root

# Then run any test file
node tests/e2e/batch17-fixes.mjs
node tests/e2e/batch14.mjs
node tests/e2e/module-tests.mjs
# etc.
```

## Test Files

| File | Tests | What it covers |
|---|---|---|
| `batch14.mjs` | 67 | Core game flow, score boundaries, undo/redo, player mgmt, dealer picker, history sheet, stats |
| `module-tests.mjs` | 80 | Score entry, round boundaries, undo/redo, player mgmt, achievements |
| `multi-player-tests.mjs` | 53 | 2–6 player games, all-out edge case |
| `features-e2e.mjs` | 16 | Quick Rematch, PlayerHistorySheet, Share Standings, Head-to-Head |
| `comprehensive-scenarios.mjs` | 48 | 2-device sync, room isolation, bidirectional |
| `firebase-e2e.mjs` | 16 | Room code UI, Create/Join, dual-write confirmation |
| `firebase-phase2-e2e.mjs` | 12 | Real-time onSnapshot propagation (Device A → B) |
| `firebase-multi-device-e2e.mjs` | 34 | 3–4 device sync, late joiner, room isolation |
| `double-write-tests.mjs` | 39 | Composite Firestore key, 6-device fan-out, duplicate rejection |
| `batch17-fixes.mjs` | 17 | **All 2026-06-23 audit fixes** (join validation, ARORAS, undo bugs) |

## Total: 382+ tests across all suites

## Notes
- All tests use Chromium headless, viewport 390×844 (iPhone 14 Pro)
- Firebase tests use the real Firestore project (`chummyscoretracker`) — no mocks
- Firestore REST API key in tests is a public web API key (not a secret)
- Tests for multi-device scenarios open multiple browser pages simultaneously
