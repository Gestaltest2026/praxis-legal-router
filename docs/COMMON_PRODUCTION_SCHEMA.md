# Praxis Common Production Schema

## Purpose

Praxis defines a repeatable legal operations model for converting source-verified matter data into attorney-review-ready work product.

The schema is designed to improve consistency, exception visibility, review readiness, and operational accountability across recurring legal workflows without displacing attorney judgment.

Each production module follows the same operating model so that legal work can be standardized where appropriate, escalated where necessary, and audited after the fact.

## Legal Operations Objectives

Praxis is designed around several core legal operations objectives:

- reduce dependence on tacit process knowledge
- standardize recurring matter workflows
- surface missing, conflicting, or nonstandard conditions early
- improve handoff quality between legal support staff and attorneys
- separate routine execution from legal judgment
- govern templates, rules, and workflow changes explicitly
- preserve source provenance and review history
- create a foundation for future process measurement and continuous improvement

These are intended design outcomes. This repository does not claim production-level performance improvements unless supported by validated data.

## Common Operating Model

Every production module must define the same five control domains:

1. **Required Inputs** — information required before work may proceed
2. **Routing Conditions** — rules that determine the appropriate workflow path
3. **Exception / STOP Controls** — conditions that block, pause, or escalate production
4. **Approved Knowledge Assets** — attorney-approved templates, clauses, and controlled reference materials
5. **Attorney Decision Support Packet** — structured information prepared for attorney review

AI may extract, compare, summarize, identify potential conflicts, and propose next steps. It may not invent missing facts, resolve conflicting sources, approve nonstandard legal language, create operative legal rules, or authorize external delivery.

## Common Module Contract

```ts
type ProductionModule = {
  id: string;
  name: string;
  requiredInputs: RequiredInput[];
  routingConditions: RoutingCondition[];
  stopConditions: StopCondition[];
  approvedTemplates: ApprovedTemplate[];
  attorneyReviewPacket: ReviewPacketField[];
};
```

The technical contract remains intentionally simple. The legal operations meaning of each field is defined by the operating model above.

## Triage and Escalation Framework

Each module produces one of three operational statuses:

- `PASS` — deterministic controls cleared; matter is ready for the next authorized review stage
- `YELLOW` — attorney decision, human confirmation, or nonstandard-condition review is required
- `RED` — production is blocked until the identified issue is resolved

This framework is intended to make exceptions visible rather than allowing unresolved issues to move silently downstream.

---

## Module 1 — NDA / Mutual Release

### Required Inputs

- Matter type
- Current parties and capacities
- Signers and authority
- Party addresses
- Current deal terms
- Source and provenance for each deal term
- Existing template or prior agreement
- Attorney instructions, when supplied
- Deadline or intentional confirmation that no deadline is known
- Current draft, when reviewing an existing draft

### Routing Conditions

- New NDA from scratch
- Prior agreement converted to a new matter
- Counterparty draft review
- Mutual release plus NDA
- Entity party versus individual party
- Multiple individual signers
- Equity or membership-interest issue
- Restrictive covenant or non-compete
- Urgent deadline

### Exception / STOP Controls

- Missing party identity, capacity, address, or signer authority
- Current matter data contaminated by unresolved prior-matter terms
- Unknown or conflicting deal-term provenance
- Caption and body inconsistency not checked
- Equity issue not routed to attorney
- External delivery without attorney approval
- Unresolved conflicting source documents

### Approved Knowledge Assets

- Attorney-approved NDA template version
- Attorney-approved mutual release plus NDA template version
- Counterparty draft review route does not replace the counterparty document

### Attorney Decision Support Packet

- Executive status
- Matter snapshot
- Current parties and individuals
- Selected workflow
- Deal-term table with provenance
- Critical blocks
- Confirmation items
- Attorney decision cards
- Attorney questions
- Source-to-issue map
- Paralegal work queue
- Internal STOP conditions

---

## Module 2 — Retainer Agreement

### Required Inputs

- Client legal name
- Exact case caption
- Case number, when available
- Exact opening sentence for page one
- Authoritative source record
- Retainer amount from source
- Retainer amount in draft
- Hourly rate from source
- Hourly rate in draft
- Fixed route classification
- Unresolved issues

### Routing Conditions

Initial controlled route:

- Matter: Attorney's Fee Hearing
- Side: Plaintiff
- Engagement: Morrie I. Levine, individually
- Client type: Attorney

Future routes must be added only after attorney approval.

### Exception / STOP Controls

- Client legal name missing
- Case caption missing
- Opening sentence missing
- Authoritative source missing
- Source and draft retainer amounts differ
- Source and draft hourly rates differ
- Monetary value missing from either side of the double-entry check
- Unresolved issue remains open
- Route differs from the approved controlled route

### Approved Knowledge Assets

- Attorney-approved Executing Letter template
- Attorney-approved Retainer Agreement template
- Exact formatting and pinned clause language must remain unchanged except for approved variable fields

### Attorney Decision Support Packet

- Fixed classification
- Matter identity
- Exact opening sentence
- Monetary verification table
- Authoritative source
- Unresolved issues
- Deterministic blocker list
- Production status

---

## Module 3 — Fee Expert Engagement

### Required Inputs

- Matter label
- Case number
- Court or county
- Retaining party
- Contracting entity
- Fee position
- Deposit classification
- Deposit amount
- Expert hourly rate
- Approved pinned clause version confirmation
- Source-verification confirmation

### Routing Conditions

- Support fee claim versus challenge fee claim
- Refundable advance deposit
- True retainer
- Earned-upon-receipt flat fee
- Nonstandard deposit classification
- Standard clauses versus nonstandard language
- Guarantor present versus none

### Exception / STOP Controls

- Deposit amount absent or invalid
- Expert rate absent or invalid
- Approved pinned clause version not confirmed
- Matter variables not source-verified
- Required matter identity field missing

A nonstandard deposit classification is `YELLOW`, not automatically `RED`, unless the attorney rejects it or the necessary trust treatment cannot be established.

### Approved Knowledge Assets

- Attorney-approved Fee Expert Engagement template
- Pinned standard clause version
- Any nonstandard language requires explicit attorney approval

### Attorney Decision Support Packet

- Matter summary
- Case and court information
- Retaining and contracting parties
- Fee position
- Deposit amount and classification
- Expert rate
- Automated checklist
- Attorney decisions required
- PASS / YELLOW / RED status

---

## Shared Service-Delivery Sequence

```text
Source Materials
    ↓
Structured Matter Data
    ↓
Approved Route Selection
    ↓
Required-Input Validation
    ↓
Exception / STOP Evaluation
    ↓
Approved Knowledge Asset Selection
    ↓
Human Document Assembly or Controlled Field Insertion
    ↓
Paralegal Quality Review
    ↓
Attorney Decision Support Packet
    ↓
Attorney Review and Approval
```

This sequence separates routine workflow execution from legal judgment and makes each handoff explicit.

## Knowledge and Change Governance

New branches, exceptions, templates, clauses, and decision rules follow this governance sequence:

```text
AI proposes
    ↓
Attorney reviews
    ↓
Rule or knowledge asset is approved and versioned
    ↓
Praxis enforces the approved version
```

Praxis must never silently convert an AI suggestion into an operative legal rule.

This governance model treats legal knowledge as a controlled operational asset rather than an informal instruction embedded in individual memory.

## CLOC-Style Capability Mapping

Praxis currently touches several legal operations capability areas:

### Practice Operations

- recurring workflow standardization
- matter routing
- escalation and exception handling
- review-stage handoffs
- attorney decision preparation

### Technology

- typed workflow configuration
- deterministic validation
- structured state and control logic
- controlled document assembly
- human-in-the-loop workflow design

### Knowledge Management

- approved templates and clauses
- versioned legal knowledge assets
- source provenance
- route-specific workflow rules

### Information Governance

- source verification
- controlled fields
- auditable status and review history
- separation of proposals from approved operative rules

### Project / Program Management

- explicit workflow stages
- ownership of next actions
- repeatable module structure
- standardized implementation sequence

### Business Intelligence / Continuous Improvement

The current schema creates the structure required to measure future operational metrics such as:

- exception frequency
- rework frequency
- review readiness
- processing time by workflow stage
- recurring failure categories
- template and route usage

These metrics are future measurement targets, not current validated performance claims.

## Immediate Implementation Target

The next implementation step is to represent these three modules as typed configuration objects and move shared PASS / YELLOW / RED evaluation into one validation engine.

Existing user interfaces should remain intact until the shared engine can reproduce current outputs consistently. The implementation should preserve the distinction between operational automation, quality controls, and attorney decision-making.
