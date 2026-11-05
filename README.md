# Demand Gateway — Public Demo (synthetic only)

Sales presentation prototype for Shinjuku × dental. Not a real patient system, not an actual appointment scheduler, and not approved for any real patient information.

- Three hardcoded synthetic test records: D001 (English), D002 (Simplified Chinese), D003 (mixed).
- Runs entirely in-browser without a backend, network access, external analytics, or persistence.
- Editable response draft is a demonstration control only. Do not input personal information.
- Requires simulated reviewer approval to activate simulated sending. Editing revokes approval.
- No emails, messages, payment requests, or appointments are transmitted.
- Noindex/nofollow and CSP restrict network requests, but this site is **publicly accessible by anyone with the URL**.
- Publishing source: `gh-pages` branch root. The repository's `main` branch is unchanged.
- Source: `prototype/demand-gateway-core-v1-20261105/demand-gateway-core-v1/web-demo/index.html`.

Published site (only after enabling GitHub Pages and verifying deployment):
https://gestaltest2026.github.io/praxis-legal-router/

For current restrictions and details refer to the source prototype README.
