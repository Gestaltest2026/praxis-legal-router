# Demand Gateway — Public Sales Demo v1.2

Stage 1: Shinjuku × Dental. **Synthetic demonstration only; not for real patients or clinics.**

## Scope

- Three fixed fictional cases: D001 English, D002 Simplified Chinese, D003 mixed-language.
- Visualizes Core Engine v1 outputs. The browser demo is a separate in-memory simulation; Python does not run in the browser.
- Reviewer approval is required before simulated dispatch; choosing a canned draft revision revokes approval.
- The public variant **disables freeform data entry entirely**. The reply draft is read-only and can be toggled only between fictional, prewritten variants.
- Simulated sending and booking never contact customers or calendars.
- No third-party scripts, analytics, external APIs, payments, backend or browser storage. CSP blocks connect-src.
- The page is **publicly accessible by anyone with the URL**; noindex is not authentication.

## iPhone demo steps

1. Select D001. Tap 対応開始. Simulated sending is disabled.
2. Tap 人間が承認. The simulated-send button unlocks.
3. Tap 定型文で編集（承認取消）. The approval is revoked. Reapprove.
4. Simulate sending and booking; inspect the in-memory history.
5. Switch to D002 for Chinese/staff escalation, D003 for mixed language.
6. Reload the page to reset the demo.

## Production exclusions

No real patient intake, diagnosis, clinical decisions, real communications, appointment scheduling, payment, CRM or production data processing. Legal, security and clinic approval are prerequisites for any live use.

## Hosting

Publishing source: `gh-pages` branch / (root); `main` unchanged.

https://gestaltest2026.github.io/praxis-legal-router/
