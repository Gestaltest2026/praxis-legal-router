# Retainer Production

## Success condition

A day-one paralegal can turn one court source and a small set of confirmed
office facts into:

- Executing Cover Letter
- Retainer Agreement
- one-page Attorney Review Packet

The package is ready for attorney review in ten minutes or less. No document is
sent by Praxis.

## User model

The screen uses five concrete steps:

1. **Court PDF** — upload and check Plaintiff, Defendant, and case number.
2. **Lawyer** — copy current name and mailing address from The Florida Bar.
3. **Job** — identify the retaining side, fee claimant, support/challenge
   position, Guarantee, and delivery method.
4. **Money** — enter expert rate, staff rate, and refundable deposit once.
5. **Make Word** — compile and download the three-document package.

Internal words such as `templateVariant`, `feeClaimantSide`, XML tokens, and
provenance states are not part of the day-one user interface.

## Production model

```text
Source upload
  -> deterministic extraction
  -> human confirmation
  -> approved route selection
  -> Word template compilation
  -> residue/token/money checks
  -> Attorney Review Packet
  -> attorney approval
  -> external delivery outside Praxis
```

## Source hierarchy

| Source | Controls |
|---|---|
| Approved Word originals | Language, letterhead, typography, tabs, page breaks, headers, footers, initials, signatures |
| Attorney / Office Manager instruction | Support or challenge, retaining side, Guarantee, delivery, fee terms |
| Clerk record | Exact parties, official caption, case number |
| The Florida Bar | Current lawyer name, designation, mailing address |
| Office Manager | Our File No. |
| First-contact record | Acknowledgement date |

## Why this is a compiler

The agreement is not rebuilt in HTML and is not freely drafted by an LLM.
Praxis opens a sanitized copy of the approved `.docx`, replaces named tokens,
and preserves the remaining OOXML. This keeps the original:

- Tahoma 12
- letterhead
- underlined litigation matter block
- tabs and spacing
- page breaks
- continuation headers
- linked footer and initials
- signature layout

## Stop rules

Compilation is refused when:

- an official party or case number is missing;
- Our File No. is missing;
- the first-contact date is missing;
- current lawyer/address confirmation is absent;
- the selected route is unconfirmed;
- a money term is invalid;
- city/state formatting violates the office rule;
- a Word token remains unresolved.

## Data boundary

- Uploaded source files are parsed in memory by the extraction route.
- The route does not write source files or generated client documents to the
  repository.
- Approved templates contain no prior-client names or case data.
- The generated ZIP is returned with `Cache-Control: no-store`.
- Authentication, server-side authorization, encrypted central storage, and
  a durable audit ledger remain required before real-client production use.

## Template lifecycle

1. Attorney approves a source Word form and route.
2. Prior-matter variables are replaced with named tokens.
3. Template is rendered with a fictional QA matter.
4. Page count and every page are visually compared with the original.
5. Template and code change through reviewable Git history.
6. A changed legal route requires a separate approved template or clause; the
   paralegal never improvises it.
