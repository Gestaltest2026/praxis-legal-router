# MUSE HANDOFF — Demand Gateway Sales Readiness R04

Date: 2026-11-05
From: ChatGPT / Construction
To: Muse / Strategy, Legal, Memory & Monitoring
Related: DG-CORE-20261105-R01; Demand Gateway Strategy v4.0

## Construction completed (A)

- Mobile-responsive, self-contained demonstration HTML added to the existing GitHub prototype branch.
- 3 synthetic inquiry cases: English, Simplified Chinese, and mixed language.
- Displays the Python Core v1's precomputed structured extract, Japanese summary and reply draft.
- Browser-only approval gate, edit-revokes-approval, simulated sending, simulated booking, and audit history.
- No live email, actual booking, API, network, analytics or patient data.
- This is a browser state-machine presentation, not a live Python backend or a medical-production application.

## Muse assignments in parallel (B and C)

**B — Finalize existing sales kit v2, not rewrite it:**
1. Inspect the existing proposal and clinic-director email against what the demo actually does.
2. Reconcile the earlier instruction to determine price from real market demand with the stated current ¥49,000 quote. Record whether ¥49,000 is a confirmed offer, an internal list price, or a price hypothesis.
3. Avoid claims that 24-hour replies, all foreign inquiries, booking conversion, clinic integrations, medical advice, zero losses or other outcomes are guaranteed.
4. Use clear scarcity: Shinjuku × dental = one **contractually defined** service slot, only if actually offered and available. Do not imply competitors have bid unless verified.
5. Complete accurate sender identity, stop-contact route, and case-specific factual personalization; review compliance before sending.

**C — Prepare legal pilot-kit draft, but do not prematurely sign or send:**
1. Scope fixed demo-to-pilot terms, included channels, response window, volume cap, acceptance and approval procedure.
2. Draft prior-review and escalation rules for medical inquiries; disallow diagnosis, treatment recommendations, fee guarantees and unapproved patient information processing.
3. Define data handling, minimization, access control, subcontractors, deletion, liability, cancellation and payment/receipt terms.
4. Define territorial exclusivity narrowly (area, dental specialty, period, exact services and termination). Do not represent market exclusivity.
5. Flag where licensed Japanese medical/privacy/contract review is required before live patient data and external transmissions.

## Clay → Muse data reconciliation: MANDATORY PRE-SEND GATE

Clay's Tokyo Medical Practices result set (7 results reported during setup) may overlap Muse's **19 confirmed clinics with director names** (list v2).

Before any outbound email:
- Obtain both datasets; compare official clinic domain, clinic name, physical address, operator name, and public business contact. Deduplicate by clinic legal/operating entity plus location, not name alone.
- Keep a single outreach row per target; track `source`, `verified_by`, `last_contact_at`, `consent_or_exception_basis`, `do_not_contact`, `send_status` and `sender_account`.
- Mark unknown records `DO NOT SEND — REVIEW`; honor opt-outs and prohibited marketing contacts.
- The assistant has **not** read Muse's 19-clinic list or Clay's saved table rows. Do not claim deduplication completed.
- Do not send automatically; obtain Sawamura's explicit approval after legal review.

## Open decisions

- Whether and where to host the static Web demo for an iPhone-accessible live URL.
- Sales price and currency/fees; invoice/collection route and cash availability.
- Which clinics pass demand and compliance validation, and whether they should be offered a paid pilot.
- Production architecture: patient data, tenancy, hosting, authorization, audit and integrations all remain future gates.

## Hard status boundary

A = demo built and locally tested. No live deployment verified; no real clinic signed; no email sent; no payment received. B/C and dedup remain Muse-side work.