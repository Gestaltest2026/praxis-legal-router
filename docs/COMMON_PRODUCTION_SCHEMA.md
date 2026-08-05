# Praxis Common Production Schema

## Purpose

Praxis converts source-verified matter data into a controlled, attorney-review-ready production package.

Every production module must define the same five elements:

1. Required Inputs
2. Routing Conditions
3. STOP Conditions
4. Approved Template
5. Attorney Review Packet Fields

AI may extract, compare, summarize, and propose. It may not invent missing facts, resolve conflicting sources, approve nonstandard language, or authorize external delivery.

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

Each module must produce one of three states:

- `PASS` — deterministic checks cleared; ready for attorney review.
- `YELLOW` — attorney decision or human confirmation required.
- `RED` — production blocked.

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

### STOP Conditions

- Missing party identity, capacity, address, or signer authority
- Current matter data contaminated by unresolved prior-matter terms
- Unknown or conflicting deal-term provenance
- Caption and body inconsistency not checked
- Equity issue not routed to attorney
- External delivery without attorney approval
- Unresolved conflicting source documents

### Approved Template

- Attorney-approved NDA template version
- Attorney-approved mutual release plus NDA template version
- Counterparty draft review route does not replace the counterparty document

### Attorney Review Packet Fields

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

### STOP Conditions

- Client legal name missing
- Case caption missing
- Opening sentence missing
- Authoritative source missing
- Source and draft retainer amounts differ
- Source and draft hourly rates differ
- Monetary value missing from either side of the double-entry check
- Unresolved issue remains open
- Route differs from the approved controlled route

### Approved Template

- Attorney-approved Executing Letter template
- Attorney-approved Retainer Agreement template
- Exact formatting and pinned clause language must remain unchanged except for approved variable fields

### Attorney Review Packet Fields

- Fixed classification
- Matter identity
- Exact opening sentence
- Monetary verification table
- Authoritative source
- Unresolved issues
- Deterministic blocker list
- Production status

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

### STOP Conditions

- Deposit amount absent or invalid
- Expert rate absent or invalid
- Approved pinned clause version not confirmed
- Matter variables not source-verified
- Required matter identity field missing

A nonstandard deposit classification is `YELLOW`, not automatically `RED`, unless the attorney rejects or the necessary trust treatment cannot be established.

### Approved Template

- Attorney-approved Fee Expert Engagement template
- Pinned standard clause version
- Any nonstandard language requires explicit attorney approval

### Attorney Review Packet Fields

- Matter summary
- Case and court information
- Retaining and contracting parties
- Fee position
- Deposit amount and classification
- Expert rate
- Automated checklist
- Attorney decisions required
- PASS / YELLOW / RED status

## Shared Processing Sequence

```text
Source Materials
    ↓
Structured Matter Data
    ↓
Approved Route Selection
    ↓
Required-Input Validation
    ↓
STOP / Exception Evaluation
    ↓
Approved Template Selection
    ↓
Human Document Assembly or Controlled Field Insertion
    ↓
Paralegal Self-Review
    ↓
Attorney Review Packet
    ↓
Attorney Approval
```

## Governance Rule

New branches, exceptions, templates, and decision rules follow this sequence:

```text
AI proposes
    ↓
Attorney reviews
    ↓
Rule is approved and versioned
    ↓
Praxis enforces the approved rule
```

Praxis must never silently convert an AI suggestion into an operative legal rule.

## Immediate Implementation Target

The next code step is to represent these three modules as typed configuration objects and move shared PASS / YELLOW / RED evaluation into one validation engine. Existing user interfaces should remain intact until the shared engine can reproduce their current outputs.