# Demand Gateway Core Engine — v1 (DEMO ONLY)

**Shinjuku × dental** synthetic workflow prototype. Five layers: entry → core → language pack → industry pack → output. No external API, LLM, real emails, real payments, or clinic integration.

> **Safety boundary:** synthetic records only. This is not a patient records system, medical device, appointment scheduler, or deployable production application. Not suitable for real patients or real clinics.

## Requirements

Python **3.11+**; Python standard library only. No API keys, packages, or network calls.

## Quick run

```bash
python -m unittest discover -s tests -v
python -m demand_gateway.cli --db state/demo.sqlite3 demo
python -m demand_gateway.cli --db state/demo.sqlite3 list
python -m demand_gateway.cli --db state/demo.sqlite3 show D002
python -m demand_gateway.cli --db state/demo.sqlite3 events D002
```

The `demo` command places three supplied fixtures (`D001` English, `D002` Simplified Chinese, `D003` mixed/long) in the **manual review queue**, printing Japanese summaries and original-language drafts. It does **not** auto-approve or auto-send. Run the `approve`, `send`, and `book` commands for each record to complete the flow; the tests exercise all three end-to-end with explicit reviewer actions. The SQLite DB is local and ignored by git. `send` prints `NO EXTERNAL MESSAGE SENT`.

## Review the approval gate manually

Use a new DB path:

```bash
python -m demand_gateway.cli --db state/review.sqlite3 ingest
python -m demand_gateway.cli --db state/review.sqlite3 show D001
python -m demand_gateway.cli --db state/review.sqlite3 send D001  # BLOCKED
python -m demand_gateway.cli --db state/review.sqlite3 start D001
python -m demand_gateway.cli --db state/review.sqlite3 send D001  # BLOCKED
python -m demand_gateway.cli --db state/review.sqlite3 approve D001 --reviewer "Demo Reviewer"
python -m demand_gateway.cli --db state/review.sqlite3 send D001  # local log, NO email
python -m demand_gateway.cli --db state/review.sqlite3 book D001 --reviewer "Demo Reviewer"
python -m demand_gateway.cli --db state/review.sqlite3 show D001
```

To edit the reply draft, place a synthetic, nonclinical response in a UTF-8 text file and run `edit D001 --file reply.txt` **before** the `send` step. Editing resets approval.

You may import synthetic JSON fixture lists via `ingest --file examples/demo_inquiries.json`, but each record must pass strict demo marker, dummy clinic, dummy ID, dummy name, and reserved example-domain checks. These checks reduce accidental real-data use but are **not a reliable PII detector**. Never input real contact details or patient information.

## Extension points

- `packs/languages.json` — response templates and FAQ, with English / Simplified Chinese packs.
- `packs/industries.json` — dental glossary, fictional business hours, demo appointment durations, escalation trigger terms.
- `demand_gateway/engine.py` — language detection, deterministic extraction, summary, clinic policy and draft generation.
- `demand_gateway/storage.py` — local SQLite ledger, explicit reviewer approval, append-only audit events, status transitions.
- `demand_gateway/cli.py` — local CLI adapter. No HTTP server or network permissions.

**Workflow separation:** `status` tracks `未対応 → 対応中 → 予約確定` (all demonstration states). `approval` and `sent_simulated` separately track whether a person reviewed the drafted reply. Approving never sends; edits revoke approval; `send` performs only a local ledger event; `book` is a manual dummy ledger transition, not a real appointment.

## What v1 does NOT do

No genuine NLP/LLM inference (simple rules and demonstrator fixtures only); no production-grade language detection, Chinese/English translation, real appointment availability, clinician assessment, treatment or price advice, actual email/LINE/WeChat/RED sending, authentication, multi-tenant separation, cloud hosting, CRM/calendar/payment integrations, live personal data, analytics dashboard, or regulatory compliance certification. It deliberately **cannot** claim real clinical or commercial effectiveness.

## Next gates

1. Validate the dummy end-to-end flow and review all failure states.
2. Validate the market, buyer and permissible medical-administrative scope, with qualified legal/data security review before patient data.
3. Add an authorized model provider only after data-handling contracts and deployment controls are established.
4. Introduce separate tenant databases, access logging, human-in-the-loop controls and clinician-defined scripts before contemplating real operations.

**Core ownership:** reusable code, fictional pack templates, and operational knowledge can be owned. A clinic's patient information is not an asset transferred to this software business.
