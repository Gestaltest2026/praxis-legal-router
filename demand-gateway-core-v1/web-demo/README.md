# Demand Gateway — Mobile Sales Demo v1.1

**Shinjuku × Dental · synthetic demonstration only**

Open `index.html` in a modern browser. This is a self-contained static demo: no API keys, network requests, analytics, actual email sending, or persistent records.

## What is demonstrated

- D001 English, D002 Simplified Chinese, and D003 mixed-language synthetic cases.
- Source extraction, Japanese summaries, and multilingual reply drafts were precomputed using the Python Core v1.
- A separate browser-only review workflow: `未対応 → 対応中 → 承認 → 模擬送信 → 予約確定（模擬）`.
- Human approval unlocks simulated dispatch; editing revokes approval and requires reapproval.
- No live booking, actual messages, production patient information, medical advice, actual clinic integration, CRM, or payment processing.
- Everything resets when the page refreshes. The input inquiry fixtures are fixed and cannot be replaced with patient text.

## Sales demo walkthrough

1. Choose D001, tap **① 対応開始** and observe that simulated sending is disabled.
2. Tap **② 人間が承認** after reviewing the draft.
3. Tap **③ 模擬送信**; an event says `NO EXTERNAL MESSAGE SENT`.
4. Tap **④ 模擬予約確定**; no real appointment is made.
5. Select D002 for human medical-cost escalation; D003 for mixed input and a request outside fictional opening hours.
6. Edit a draft to observe that prior approval is revoked.

## Source boundary

The webpage **does not run the Python Core Engine live**. It shows its verified, precomputed outputs plus a lightweight, in-memory JavaScript approval-state simulation. Update the browser fixture outputs and re-test whenever the Python engine is revised.

This is a demonstration for sales conversations, not a deployed healthcare service, medical safety certification, or a statement of real customers or revenue.

## Publishing

This file has been committed to the GitHub prototype branch. A GitHub source-file `blob` link is not a hosted demo URL. Hosting on GitHub Pages or another authorized static service must be configured and verified separately.
