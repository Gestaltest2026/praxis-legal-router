export type EvidenceStatus =
  | "documented"
  | "client-report"
  | "inference"
  | "allegation"
  | "to-verify";

export type ClaimStatus = "current" | "reserved" | "investigation";

export const kahnCatinoMatter = {
  title: "Kahn / Catino Pre-Filing Command Center",
  statusDate: "2026-08-01",
  privilegeNotice:
    "Attorney-Client Privileged / Attorney Work Product — Internal Use Only",
  filingStatus:
    "Complaint is being revised and has not been finalized for filing.",
  court:
    "Anticipated filing in the Circuit Court of the Fifteenth Judicial Circuit, in and for Palm Beach County, Florida.",
  plaintiff: "Erin Kahn",
  defendants: [
    "Paula J. Catino a/k/a Paula Catino",
    "Richard Catino — Chapter 726 transfer theory only",
  ],
  currentClaims: [
    {
      name: "Breach of oral contract",
      against: "Paula",
      purpose:
        "Recover repayment obligations not fully covered by enforceable written notes.",
      vulnerability:
        "Terms, consideration, performance, breach, damages, statute-of-frauds and overlap issues.",
      status: "current" as ClaimStatus,
    },
    {
      name: "Breach of $304,000 note",
      against: "Paula",
      purpose: "Enforce the January 28, 2026 promissory note.",
      vulnerability:
        "Original-note custody, entitlement to enforce, default, charges, documentary stamp issue, and double counting.",
      status: "current" as ClaimStatus,
    },
    {
      name: "Breach of $288,942.98 note",
      against: "Paula",
      purpose: "Enforce the March 2, 2026 promissory note.",
      vulnerability:
        "Original-note custody, payoff and tax components, tenant item, charges, and documentary stamp issue.",
      status: "current" as ClaimStatus,
    },
    {
      name: "Unjust enrichment",
      against: "Paula",
      purpose:
        "Alternative recovery for benefits retained if an express-contract theory does not cover them.",
      vulnerability: "Alternative only; express contracts and double recovery.",
      status: "current" as ClaimStatus,
    },
    {
      name: "Fraud / fraudulent inducement",
      against: "Paula",
      purpose:
        "Address specific false representations that caused advances or delayed collection.",
      vulnerability:
        "Particularity, future promises, knowledge or intent, reliance, and separate damages.",
      status: "current" as ClaimStatus,
    },
    {
      name: "Chapter 726 voidable transfer",
      against: "Paula and Richard",
      purpose:
        "Challenge the Paula-to-Richard transfer if statutory requirements are met.",
      vulnerability:
        "Actual consideration, good faith, solvency, retained control, and separation of statutory theories.",
      status: "current" as ClaimStatus,
    },
  ],
  reservedClaims: [
    {
      name: "Civil theft",
      gate:
        "Written presuit demand, 30-day compliance period, attorney approval, and full theft-intent analysis.",
      status: "reserved" as ClaimStatus,
    },
    {
      name: "Punitive damages",
      gate:
        "Discovery, evidentiary proffer or record evidence, motion for leave to amend, and court permission.",
      status: "reserved" as ClaimStatus,
    },
    {
      name: "Civil conspiracy",
      gate:
        "Evidence of an actual agreement and knowing participation; notice or witness status alone is insufficient.",
      status: "reserved" as ClaimStatus,
    },
    {
      name: "Claims against AMERILIQ or Diane Sunderland",
      gate:
        "Complete lender file, payoff accounting, advance history, communications, and attorney liability analysis.",
      status: "investigation" as ClaimStatus,
    },
  ],
  damages: [
    { label: "Gross direct payments / loans", amount: 993500 },
    { label: "Less confirmed repayment", amount: -25000 },
    { label: "Net direct-payment amount", amount: 968500 },
    { label: "AMERILIQ payoff", amount: 272037.09 },
    { label: "2025 property taxes", amount: 9905.89 },
    { label: "Subtotal before property credit", amount: 1250442.98 },
    { label: "Less 1270 property-value credit", amount: -690000 },
    { label: "Conservative actual damages", amount: 560442.98 },
    { label: "Potential civil-theft treble amount — reserved only", amount: 1681328.94 },
  ],
  noDoubleCountingRules: [
    "Do not add the $304,000 note to the $993,500 direct-payment ledger; the note documents transactions already included in that ledger.",
    "Do not include the tenant $7,000 item in the current damages model because Kahn neither received nor paid it.",
  ],
  parties: [
    {
      name: "Erin Kahn",
      role: "Client / proposed Plaintiff",
      caution:
        "She was on title to 1270, but current documents do not show that she signed the 2022 AMERILIQ mortgage.",
    },
    {
      name: "Paula J. Catino",
      role: "Primary proposed Defendant",
      caution:
        "Do not state that every promise was false unless evidence supports knowledge or intent when made.",
    },
    {
      name: "Richard Catino",
      role: "Proposed Chapter 726 Defendant",
      caution:
        "Current theory concerns the transfer; notice and receipt do not automatically establish conspiracy.",
    },
    {
      name: "David Catino",
      role: "Witness / potential fact witness",
      caution:
        "A witness signature alone does not establish receipt, knowledge, agreement, control, or participation.",
    },
    {
      name: "AMERILIQ COMPANY INC.",
      role: "Mortgagee / lender",
      caution:
        "Full loan file and accounting are still required before unsupported fraud or conspiracy allegations are considered.",
    },
    {
      name: "Diane Sunderland",
      role: "AMERILIQ representative / payoff contact",
      caution:
        "Not presently a defendant. Preserve native communications and distinguish written statements from Kahn's recollection.",
    },
  ],
  criticalTasks: [
    "Finalize the $993,500 ledger against primary bank evidence.",
    "Locate both original promissory notes or prepare a custody / lost-note memorandum.",
    "Obtain the complete AMERILIQ loan file and payoff calculation.",
    "Preserve the native payoff email with full headers and attachment.",
    "Complete promissory-note documentary stamp analysis.",
    "Prepare a source-linked fraud representation chart.",
    "Investigate Richard's consideration, property value, Paula's solvency, and retained control.",
    "Track civil-theft demand service, receipt, and 30-day deadline.",
  ],
  evidenceLabels: [
    "Documented fact",
    "Client report",
    "Inference",
    "Allegation",
    "To verify",
  ],
  attorneyDecisionGates: [
    "No substantive filing or external communication without attorney approval.",
    "No civil-theft count before statutory prerequisites and attorney approval.",
    "No punitive-damages request in the initial complaint.",
    "No claim against David based only on his witness signature.",
    "No claim against AMERILIQ or Diane without documentary support and attorney decision.",
    "No damages formula change without source identification, duplication / credit analysis, and review.",
  ],
};
