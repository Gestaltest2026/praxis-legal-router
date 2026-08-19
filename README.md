# Praxis Legal Router

Praxis is an AI-assisted legal operations workflow prototype for converting recurring legal work into structured, reviewable operating processes.

It is designed around a simple principle:

> Automate what can be standardized, make exceptions visible, and preserve attorney judgment where it is required.

Rather than treating AI as an autonomous legal decision-maker, Praxis treats AI as one component inside a governed legal service-delivery system.

## Executive Summary

Legal work often depends on tacit knowledge, manual handoffs, inconsistent intake, and late-stage escalation. These conditions increase rework, reduce process visibility, and make it harder to scale routine matters without increasing risk.

Praxis addresses that problem by structuring legal work as an explicit operating model with defined inputs, workflow states, control points, escalation rules, approved templates, human review boundaries, and auditable events.

The prototype is intended to improve:

- intake completeness
- workflow consistency
- exception visibility
- review readiness
- template and clause control
- handoff quality
- auditability
- knowledge reuse
- process integrity

## Legal Operations Problem

Recurring legal work is often operationally fragile even when the underlying legal task is familiar.

Common failure modes include:

- incomplete or inconsistent intake
- undocumented reliance on individual memory
- unclear ownership between legal support staff and attorneys
- unresolved issues moving downstream
- uncontrolled template reuse
- inconsistent escalation
- avoidable rework during attorney review
- poor visibility into matter status and prior decisions

These are not purely legal-analysis problems. They are legal operations problems involving process design, information governance, quality control, knowledge management, and service delivery.

## Operating Model

Praxis converts recurring legal work into a controlled workflow with the following sequence:

```text
Source Materials
    ↓
Structured Intake
    ↓
Required-Input Validation
    ↓
Approved Route Selection
    ↓
STOP / Exception Evaluation
    ↓
Approved Template Selection
    ↓
Controlled Document Assembly
    ↓
Post-Generation Verification
    ↓
Paralegal Review
    ↓
Attorney Review
    ↓
Approval
    ↓
External Delivery Gate
    ↓
Audit Record
```

Each stage has a defined purpose, owner, and control boundary.

## Core Controls

Praxis uses explicit operational controls rather than relying on free-form AI judgment.

### Intake Controls

- required-field checks
- typed matter data where possible
- source provenance for material facts
- unresolved-issue capture
- conflict detection

### Workflow Controls

- permitted state transitions
- route eligibility checks
- STOP conditions
- escalation paths
- role-based approval boundaries

### Knowledge and Template Controls

- approved template versions
- declared variable fields
- prohibited edits
- pinned standard language
- version and approval metadata

### Quality Controls

- post-generation verification
- placeholder detection
- old-matter residue checks
- source-to-output comparisons
- monetary and date mismatch checks
- document hashing
- quarantine on failed verification

### Approval and Delivery Controls

- separate paralegal and attorney review stages
- attorney approval tied to the exact document hash
- delivery blocked when RED or YELLOW issues remain open
- append-only audit events

## Human-in-the-Loop Governance

Praxis is intentionally not designed for autonomous legal decision-making.

The governing rule is:

> AI proposes. Deterministic code validates and blocks. Authorized humans approve.

AI may:

- extract candidate values
- compare source materials
- summarize information
- identify likely conflicts or missing information
- propose routing questions

AI may not:

- invent missing facts
- resolve conflicting authorities
- approve nonstandard legal language
- mark a matter PASS
- authorize external delivery

This preserves human judgment while still allowing automation to reduce repetitive operational work.

## Legal Operations Capability Mapping

Praxis is designed as a cross-functional legal operations prototype spanning several capabilities commonly associated with modern legal operations teams.

### Practice Operations

- standardized matter workflows
- explicit handoffs
- review stages
- exception management
- repeatable service delivery

### Technology

- workflow orchestration
- typed validation logic
- state-machine controls
- document verification
- audit-event generation

### Project and Program Management

- visible workflow states
- ownership of next actions
- escalation logic
- standardized production sequences
- repeatable module design

### Knowledge Management

- approved templates
- structured matter data
- reusable routing logic
- versioned standard clauses and rules
- attorney-approved decision patterns

### Information Governance

- source provenance
- controlled document states
- immutable audit events
- document hashes
- approval metadata
- explicit retention of decision context

### Business Intelligence and Continuous Improvement

The current prototype is designed to make future measurement possible, including:

- time spent by workflow stage
- exception frequency
- rework frequency
- attorney-review readiness
- recurring failure points
- route volume
- template usage
- escalation patterns

These metrics are not yet presented as validated production outcomes. They are intended measurement targets for evaluating future workflow performance.

## Current Modules

Praxis currently models three recurring legal workflows:

1. NDA / Mutual Release
2. Retainer Agreement
3. Fee Expert Engagement

Each module defines:

- Required Inputs
- Routing Conditions
- STOP Conditions
- Approved Templates
- Attorney Review Packet Fields

Each module resolves to one of three operational states:

- `PASS` — deterministic checks cleared; ready for attorney review
- `YELLOW` — human confirmation or attorney decision required
- `RED` — production blocked

## Technical Architecture

Praxis is a working prototype built with Next.js and TypeScript.

The architecture includes:

- typed production modules
- deterministic validation rules
- canonical workflow states
- transition guards
- post-generation verification
- review packet generation
- audit events
- template and approval controls
- unit and workflow tests

The technical design favors controlled failure, explicit escalation, and reproducibility over uninterrupted automation.

## Intended Outcomes

Praxis is designed to test whether structured legal operations can improve the quality and reliability of recurring legal work by making operational dependencies explicit.

Intended outcomes include:

- fewer incomplete matters reaching attorney review
- earlier identification of exceptions
- more consistent use of approved templates
- clearer responsibility for next actions
- reduced avoidable rework
- improved auditability
- better reuse of institutional knowledge

No production performance claims are made in this repository unless supported by validated data.

## Documentation

See:

- `docs/COMMON_PRODUCTION_SCHEMA.md` — shared module contract, routing, STOP conditions, templates, and review-packet structure
- `docs/FAIL_SAFE_PRODUCTION_ARCHITECTURE.md` — governance, state transitions, document controls, auditability, testing, and deployment safeguards

## Current Status

Praxis is a working prototype and public case study in AI-assisted legal operations, workflow design, process control, and human-in-the-loop review.

It is being developed to explore how legal support work can become more structured and scalable without obscuring exceptions or displacing attorney judgment.

## Disclaimer

Praxis is an experimental workflow prototype. It does not provide legal advice and is not presented as a substitute for attorney review or professional legal judgment.
