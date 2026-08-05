# Praxis Fail-Safe Production Architecture

## Purpose

Praxis must remain safe even when extraction, user input, source materials, or AI suggestions are incomplete or wrong. The system therefore optimizes for controlled failure, explicit escalation, and reproducibility rather than uninterrupted automation.

## Governing Principle

> AI proposes. Deterministic code validates and blocks. Authorized humans approve.

No AI-generated value, route, clause, or conclusion becomes operative merely because it was generated confidently.

## Canonical Production Pipeline

```text
Source Documents
→ Structured Intake
→ Deterministic Validation
→ Approved Matter Route
→ Approved Template Version
→ Controlled Field Insertion
→ Post-Generation Verification
→ Paralegal Review
→ Attorney Approval
→ External Delivery
→ Immutable Audit Record
```

Each transition is explicit. A matter may not skip stages.

## 1. Structured Intake Boundary

Use typed fields wherever possible:

- party identity and capacity
- case number and caption
- dates and deadlines
- monetary terms
- route selections
- template version
- source references
- approval controls

Free text is limited to source excerpts, unresolved issues, and human notes. Free text may inform review but may not silently populate controlled fields.

## 2. AI Boundary

AI may:

- extract candidate values
- identify possible conflicts
- summarize source materials
- propose routing or questions
- identify likely missing information

AI may not:

- invent missing facts
- reconcile conflicting authorities
- select a nonstandard legal route without approval
- modify approved clauses
- mark a matter PASS
- authorize external delivery

Every AI result must be labeled as a proposal and linked to its source context.

## 3. Deterministic Validation Boundary

The rule engine owns:

- required-field checks
- type and format checks
- exact-value comparisons
- permitted-value checks
- route eligibility
- template eligibility
- STOP conditions
- PASS / YELLOW / RED status
- transition authorization

Unknown, missing, contradictory, unsupported, or out-of-scope conditions fail closed.

## 4. Canonical Matter State Machine

```text
DRAFT
→ INTAKE_COMPLETE
→ VALIDATED
→ READY_FOR_ASSEMBLY
→ ASSEMBLED
→ POST_GENERATION_VERIFIED
→ PARALEGAL_REVIEWED
→ ATTORNEY_REVIEW
→ APPROVED
→ DELIVERED
→ CLOSED
```

Exception states:

```text
STOPPED
ATTORNEY_DECISION_REQUIRED
QUARANTINED
VOIDED
```

Transition rules:

- Only an allowed transition may occur.
- RED moves or keeps the matter in `STOPPED`.
- YELLOW moves or keeps the matter in `ATTORNEY_DECISION_REQUIRED`.
- Generated documents with residue, unresolved placeholders, or verification failures move to `QUARANTINED`.
- External delivery requires `APPROVED` plus an approval record tied to the exact document hash.

## 5. Template Governance

Every approved template must have:

- immutable template ID
- semantic version
- checksum
- effective date
- retired date, if applicable
- approved matter routes
- approved fields
- prohibited edits
- approving attorney and approval timestamp

Assembly may insert values only into declared fields. Clause editing and undeclared placeholders are prohibited in the standard route.

## 6. Controlled Document Assembly

Document assembly must:

1. load an approved template by exact version
2. validate all required fields before insertion
3. reject undeclared fields
4. escape inserted values safely
5. preserve locked text and formatting
6. generate a document hash
7. save the exact input snapshot used for assembly

No generative model should directly rewrite the Word document in the standard production path.

## 7. Post-Generation Verification

Every generated document must be checked for:

- unresolved placeholders
- missing required values
- source-to-output mismatches
- old-matter names, addresses, dates, and monetary terms
- caption/body inconsistencies
- signature-block completeness
- approved template ID and version
- unauthorized text changes
- document hash generation

Any failure quarantines the document and blocks attorney approval.

## 8. Dual-Control Review

Paralegal review confirms mechanical accuracy and completeness.

Attorney review confirms legal sufficiency, exceptions, nonstandard language, and delivery authorization.

The same person may not silently satisfy both roles unless the system records the authorized exception.

## 9. External Delivery Gate

External delivery requires all of the following:

- state is `APPROVED`
- no open RED or YELLOW items
- exact output hash matches the attorney-approved hash
- attorney identity is recorded
- approval timestamp is recorded
- recipient and delivery channel are recorded
- no later document mutation occurred

Praxis should prepare delivery metadata but should not send externally unless a separately authorized delivery action is invoked.

## 10. Audit Record

Append-only audit events must record:

- matter ID
- actor identity and role
- timestamp
- previous and next state
- action performed
- input snapshot or changed fields
- source references
- rule-engine result
- AI proposal metadata, when used
- template ID and version
- generated document hash
- approval hash
- delivery metadata

Audit history must not be overwritten. Corrections are new events.

## 11. Idempotency and Concurrency

Mutation requests must use an idempotency key. Repeated requests with the same key must return the original result rather than create duplicate documents or transitions.

State-changing operations must compare an expected matter version before committing. Stale writes are rejected.

## 12. Error Handling

Errors must be explicit and typed:

- `INPUT_MISSING`
- `INPUT_INVALID`
- `SOURCE_CONFLICT`
- `ROUTE_NOT_APPROVED`
- `TEMPLATE_NOT_APPROVED`
- `TRANSITION_NOT_ALLOWED`
- `PLACEHOLDER_UNRESOLVED`
- `OUTPUT_MISMATCH`
- `DOCUMENT_QUARANTINED`
- `ATTORNEY_APPROVAL_REQUIRED`
- `APPROVAL_HASH_MISMATCH`
- `DELIVERY_BLOCKED`

User-visible messages must state what failed, why production stopped, who owns the next action, and what evidence is required.

## 13. Testing Requirements

Each module must include:

- unit tests for every STOP rule
- state-transition tests
- template-field allowlist tests
- placeholder and old-matter residue tests
- monetary and date mismatch tests
- approval-hash tests
- idempotency tests
- regression fixtures based on sanitized real matters
- end-to-end tests for PASS, YELLOW, RED, and quarantine paths

A new module or rule cannot merge without tests showing both the allowed path and the blocked path.

## 14. Deployment Controls

Required before production use:

- CI lint, typecheck, tests, and build
- branch protection for `main`
- required CI status checks
- no direct production deployment from unreviewed branches
- environment separation for development, staging, and production
- secrets outside source control
- rollback procedure
- template and rule version rollback

## Implementation Order

1. Add canonical state-machine types and transition guard.
2. Add typed audit-event model and append-only event writer interface.
3. Add template manifest and field allowlist.
4. Add document assembly interface with deterministic mock implementation.
5. Add post-generation verification interface and quarantine result.
6. Connect Retainer as the first end-to-end pilot.
7. Add unit and state-transition tests.
8. Add persistence and exact-document approval hashing.
9. Add controlled external-delivery gate.

## Definition of Done

The architecture is operational when a sanitized Retainer matter can move from intake to an attorney-approved Word draft, while every missing, conflicting, nonstandard, stale, duplicated, or mutated condition is stopped, quarantined, or escalated with a complete audit trail.