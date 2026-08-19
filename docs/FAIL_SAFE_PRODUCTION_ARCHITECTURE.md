# Praxis Operational Control Architecture

## Purpose

Praxis is designed as a controlled legal-service delivery system, not as an autonomous legal decision-maker. Its architecture is intended to reduce ambiguity in recurring work, make exceptions visible early, preserve authorized human judgment, and create a reproducible audit trail across the matter lifecycle.

The system is therefore optimized for:

- controlled failure rather than silent continuation
- explicit escalation rather than hidden exceptions
- repeatable process execution rather than tacit handoffs
- traceable decisions rather than undocumented judgment
- governed use of AI rather than unconstrained generation

## Governing Principle

> AI proposes. Deterministic controls validate and block. Authorized humans approve.

No AI-generated value, route, clause, or conclusion becomes operative merely because it was generated confidently.

## Legal Operations Context

Praxis applies a legal-operations lens to recurring legal work by combining:

- **Practice Operations** — matter routing, workflow orchestration, handoffs, review readiness, and exception ownership
- **Technology** — typed data structures, rule engines, state transitions, controlled document assembly, and verification
- **Knowledge Management** — approved templates, standard clauses, route definitions, and versioned decision rules
- **Information Governance** — source provenance, audit records, approval evidence, document hashes, and delivery metadata
- **Project / Program Management** — explicit stages, owners, blockers, dependencies, and implementation sequencing
- **Business Intelligence / Continuous Improvement** — structured event data and failure categories that can support future process analysis and improvement

This architecture is intended to make legal work more reviewable and operationally legible without replacing attorney judgment.

## Canonical Service-Delivery Pipeline

```text
Source Documents
→ Structured Intake
→ Deterministic Validation
→ Approved Matter Route
→ Approved Knowledge Asset / Template
→ Controlled Field Insertion
→ Post-Generation Quality Assurance
→ Paralegal Review
→ Attorney Decision / Approval
→ External Delivery Gate
→ Immutable Audit Record
```

Each transition is explicit. A matter may not skip stages.

## 1. Structured Intake and Matter Data Controls

Praxis uses typed fields wherever possible to reduce ambiguity at the beginning of the workflow:

- party identity and capacity
- case number and caption
- dates and deadlines
- monetary terms
- route selections
- template version
- source references
- approval controls

Free text is limited to source excerpts, unresolved issues, and human notes. Free text may inform review, but it may not silently populate controlled fields.

### Legal Operations Objective

Create a consistent matter-intake boundary so that downstream work begins from structured, source-linked information rather than implicit assumptions.

## 2. AI Use Boundary

AI may:

- extract candidate values
- identify possible conflicts
- summarize source materials
- propose routing or follow-up questions
- identify likely missing information

AI may not:

- invent missing facts
- reconcile conflicting authorities
- select a nonstandard legal route without approval
- modify approved clauses
- mark a matter `PASS`
- authorize external delivery

Every AI result must be labeled as a proposal and linked to its source context.

### Legal Operations Objective

Use AI to accelerate analysis and preparation while keeping legal judgment, exception resolution, and delivery authority inside defined human-control boundaries.

## 3. Deterministic Validation and Operational Controls

The rule engine owns:

- required-field checks
- type and format checks
- exact-value comparisons
- permitted-value checks
- route eligibility
- template eligibility
- STOP / exception controls
- `PASS` / `YELLOW` / `RED` status
- transition authorization

Unknown, missing, contradictory, unsupported, or out-of-scope conditions fail closed.

### Control Logic

- `PASS` — deterministic controls cleared; matter may proceed to human review.
- `YELLOW` — attorney decision or human confirmation required.
- `RED` — production is blocked.

### Legal Operations Objective

Separate standard work from exception work so that attorneys spend judgment on the issues that actually require it.

## 4. Matter Workflow Orchestration

Canonical workflow states:

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

- only an allowed transition may occur
- `RED` moves or keeps the matter in `STOPPED`
- `YELLOW` moves or keeps the matter in `ATTORNEY_DECISION_REQUIRED`
- unresolved placeholders, residue, or verification failures move generated documents to `QUARANTINED`
- external delivery requires `APPROVED` plus an approval record tied to the exact document hash

### Legal Operations Objective

Make workflow status, ownership, escalation, and readiness visible instead of relying on informal handoffs.

## 5. Knowledge Asset and Template Governance

Every approved template must have:

- immutable template ID
- semantic version
- checksum
- effective date
- retired date, if applicable
- approved matter routes
- approved fields
- prohibited edits
- approving attorney
- approval timestamp

Assembly may insert values only into declared fields. Clause editing and undeclared placeholders are prohibited in the standard route.

### Change-Governance Rule

New templates, clauses, routes, and decision rules must follow a controlled lifecycle:

```text
Need identified
→ Change proposed
→ Attorney review
→ Rule / template approved
→ Version recorded
→ Praxis enforces approved version
```

Praxis must never silently convert an AI suggestion into an operative legal rule.

### Legal Operations Objective

Convert tacit legal knowledge into governed, reusable knowledge assets while preserving ownership of legal decisions.

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

### Legal Operations Objective

Reduce avoidable variation in recurring document production while retaining controlled paths for nonstandard work.

## 7. Post-Generation Quality Assurance

Every generated document must be checked for:

- unresolved placeholders
- missing required values
- source-to-output mismatches
- prior-matter names, addresses, dates, and monetary terms
- caption/body inconsistencies
- signature-block completeness
- approved template ID and version
- unauthorized text changes
- document hash generation

Any failure quarantines the document and blocks attorney approval.

### Legal Operations Objective

Move quality assurance upstream so mechanical and provenance errors are identified before attorney review or external delivery.

## 8. Dual-Control Review and Decision Ownership

Paralegal review confirms mechanical accuracy, completeness, and workflow readiness.

Attorney review confirms legal sufficiency, resolves exceptions, approves nonstandard language, and authorizes delivery.

The same person may not silently satisfy both roles unless the system records the authorized exception.

### Legal Operations Objective

Clarify role ownership and preserve the distinction between operational execution and legal judgment.

## 9. External Delivery Gate

External delivery requires all of the following:

- state is `APPROVED`
- no open `RED` or `YELLOW` items
- exact output hash matches the attorney-approved hash
- attorney identity is recorded
- approval timestamp is recorded
- recipient and delivery channel are recorded
- no later document mutation occurred

Praxis may prepare delivery metadata, but it should not send externally unless a separately authorized delivery action is invoked.

### Legal Operations Objective

Treat delivery as a controlled business event rather than an informal final step.

## 10. Information Governance and Auditability

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

### Legal Operations Objective

Create a traceable record of how information, decisions, approvals, and outputs moved through the legal-service process.

## 11. Process Integrity: Idempotency and Concurrency

Mutation requests must use an idempotency key. Repeated requests with the same key must return the original result rather than create duplicate documents or transitions.

State-changing operations must compare an expected matter version before committing. Stale writes are rejected.

### Legal Operations Objective

Prevent duplicate work, stale decisions, and inconsistent matter states in concurrent workflows.

## 12. Exception Management and User-Facing Errors

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

User-visible messages must state:

1. what failed
2. why production stopped
3. who owns the next action
4. what evidence or decision is required

### Legal Operations Objective

Make exception ownership explicit so blocked work can be resolved without hidden queues or ambiguous responsibility.

## 13. Quality-Control and Testing Requirements

Each module must include:

- unit tests for every STOP rule
- state-transition tests
- template-field allowlist tests
- placeholder and prior-matter residue tests
- monetary and date mismatch tests
- approval-hash tests
- idempotency tests
- regression fixtures based on sanitized real matters
- end-to-end tests for `PASS`, `YELLOW`, `RED`, and quarantine paths

A new module or rule cannot merge without tests showing both the allowed path and the blocked path.

### Legal Operations Objective

Treat process controls as testable operating requirements rather than informal expectations.

## 14. Deployment and Change Controls

Required before production use:

- CI lint, typecheck, tests, and build
- branch protection for `main`
- required CI status checks
- no direct production deployment from unreviewed branches
- environment separation for development, staging, and production
- secrets outside source control
- rollback procedure
- template and rule version rollback

### Legal Operations Objective

Ensure that changes to workflow logic, templates, and controls enter production through a governed release process.

## 15. Measurement Framework

Praxis does not currently claim validated production performance improvements. The architecture is designed so future pilots can measure operational outcomes such as:

- intake completeness rate
- percentage of matters routed without manual reclassification
- exception frequency by category
- attorney-review readiness rate
- rework frequency
- template deviation frequency
- source-to-output mismatch rate
- average time spent in exception states
- number of blocked unauthorized delivery attempts
- workflow cycle time by matter type

These are measurement targets, not current performance claims.

### Legal Operations Objective

Create structured operational data that can support process improvement, capacity planning, quality management, and future business intelligence.

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
10. Add structured operational metrics for pilot evaluation.

## Definition of Done

The architecture is operational when a sanitized Retainer matter can move from intake to an attorney-approved Word draft while every missing, conflicting, nonstandard, stale, duplicated, or mutated condition is stopped, quarantined, or escalated with a complete audit trail.

The broader legal-operations objective is a workflow that is not merely automated, but governable: standard work is repeatable, exception work is visible, decision ownership is explicit, and process evidence can be reviewed after the fact.
