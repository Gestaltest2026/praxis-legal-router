import type { ProductionModule } from "./types";

export const productionModules: ProductionModule[] = [
  {
    id: "nda",
    name: "NDA / Mutual Release",
    requiredInputs: [
      { key: "matterType", label: "Matter type", valueType: "selection", required: true },
      { key: "partyInfo", label: "Current parties, capacities, signers, and addresses", valueType: "multiline", required: true },
      { key: "dealTerms", label: "Current deal terms with provenance", valueType: "multiline", required: true },
      { key: "sourceMaterials", label: "Template, prior agreement, and source materials", valueType: "multiline", required: true },
      { key: "deadlineStatus", label: "Deadline or intentional no-deadline confirmation", valueType: "text", required: true },
    ],
    routingConditions: [
      { id: "nda-new", label: "New NDA from scratch", attorneyApproved: true },
      { id: "nda-prior", label: "Prior agreement converted to new matter", attorneyApproved: true },
      { id: "nda-counterparty", label: "Counterparty draft review", attorneyApproved: true },
      { id: "nda-mutual-release", label: "Mutual release plus NDA", attorneyApproved: true },
    ],
    stopConditions: [
      { id: "nda-party-missing", severity: "RED", message: "Party identity, capacity, address, or signer authority is missing." },
      { id: "nda-source-conflict", severity: "RED", message: "Source documents conflict or prior-matter terms remain unresolved." },
      { id: "nda-provenance", severity: "YELLOW", message: "Deal-term provenance is unknown or requires confirmation." },
      { id: "nda-attorney-route", severity: "YELLOW", message: "Equity, restrictive-covenant, or other attorney issue requires routing." },
    ],
    approvedTemplates: [
      { id: "nda-standard", label: "Attorney-approved NDA template", version: "PINNED", attorneyApproved: true },
      { id: "nda-mutual-release", label: "Attorney-approved mutual release plus NDA template", version: "PINNED", attorneyApproved: true },
    ],
    attorneyReviewPacket: [
      { key: "executiveStatus", label: "Executive status" },
      { key: "matterSnapshot", label: "Matter snapshot" },
      { key: "dealTermTable", label: "Deal-term table with provenance" },
      { key: "criticalBlocks", label: "Critical blocks" },
      { key: "attorneyDecisions", label: "Attorney decisions and questions" },
      { key: "paralegalQueue", label: "Paralegal work queue" },
    ],
  },
  {
    id: "retainer",
    name: "Retainer Agreement",
    requiredInputs: [
      { key: "clientName", label: "Client legal name", valueType: "text", required: true },
      { key: "caseCaption", label: "Exact case caption", valueType: "text", required: true },
      { key: "openingSentence", label: "Exact page-one opening sentence", valueType: "multiline", required: true },
      { key: "sourceRecord", label: "Authoritative source record", valueType: "multiline", required: true },
      { key: "retainerSource", label: "Retainer amount from source", valueType: "money", required: true },
      { key: "retainerDraft", label: "Retainer amount in draft", valueType: "money", required: true },
      { key: "hourlySource", label: "Hourly rate from source", valueType: "money", required: true },
      { key: "hourlyDraft", label: "Hourly rate in draft", valueType: "money", required: true },
    ],
    routingConditions: [
      { id: "retainer-fee-hearing-plaintiff", label: "Attorney's Fee Hearing / Plaintiff / Morrie I. Levine individually / Attorney client", attorneyApproved: true },
    ],
    stopConditions: [
      { id: "retainer-required", severity: "RED", message: "A required identity or source field is missing." },
      { id: "retainer-money-mismatch", severity: "RED", message: "Source and draft monetary values do not match." },
      { id: "retainer-unresolved", severity: "YELLOW", message: "An unresolved issue requires attorney review." },
      { id: "retainer-route", severity: "RED", message: "The matter falls outside the approved controlled route." },
    ],
    approvedTemplates: [
      { id: "executing-letter", label: "Attorney-approved Executing Letter", version: "PINNED", attorneyApproved: true },
      { id: "retainer-agreement", label: "Attorney-approved Retainer Agreement", version: "PINNED", attorneyApproved: true },
    ],
    attorneyReviewPacket: [
      { key: "fixedClassification", label: "Fixed classification" },
      { key: "matterIdentity", label: "Matter identity" },
      { key: "openingSentence", label: "Exact opening sentence" },
      { key: "moneyVerification", label: "Monetary verification" },
      { key: "blockers", label: "Deterministic blocker list" },
      { key: "productionStatus", label: "Production status" },
    ],
  },
  {
    id: "fee-expert",
    name: "Fee Expert Engagement",
    requiredInputs: [
      { key: "matterLabel", label: "Matter label", valueType: "text", required: true },
      { key: "caseNumber", label: "Case number", valueType: "text", required: true },
      { key: "court", label: "Court or county", valueType: "text", required: true },
      { key: "retainingParty", label: "Retaining party", valueType: "text", required: true },
      { key: "contractingEntity", label: "Contracting entity", valueType: "text", required: true },
      { key: "feePosition", label: "Fee position", valueType: "selection", required: true },
      { key: "depositType", label: "Deposit classification", valueType: "selection", required: true },
      { key: "depositAmount", label: "Deposit amount", valueType: "money", required: true },
      { key: "expertRate", label: "Expert hourly rate", valueType: "money", required: true },
      { key: "standardClauses", label: "Pinned clause version confirmed", valueType: "boolean", required: true },
      { key: "sourceVerified", label: "Source verification confirmed", valueType: "boolean", required: true },
    ],
    routingConditions: [
      { id: "fee-support", label: "Support fee claim", attorneyApproved: true },
      { id: "fee-challenge", label: "Challenge fee claim", attorneyApproved: true },
      { id: "fee-refundable", label: "Refundable advance deposit", attorneyApproved: true },
      { id: "fee-nonstandard", label: "Nonstandard deposit classification", attorneyApproved: false },
    ],
    stopConditions: [
      { id: "fee-money", severity: "RED", message: "Deposit amount or expert rate is absent or invalid." },
      { id: "fee-template", severity: "RED", message: "The pinned clause version is not confirmed." },
      { id: "fee-source", severity: "RED", message: "Matter variables are not source-verified." },
      { id: "fee-nonstandard", severity: "YELLOW", message: "Nonstandard deposit classification or language requires attorney approval." },
    ],
    approvedTemplates: [
      { id: "fee-expert-engagement", label: "Attorney-approved Fee Expert Engagement", version: "PINNED", attorneyApproved: true },
    ],
    attorneyReviewPacket: [
      { key: "matterSummary", label: "Matter summary" },
      { key: "partySummary", label: "Retaining and contracting parties" },
      { key: "feeTerms", label: "Deposit and expert-rate terms" },
      { key: "automatedChecklist", label: "Automated checklist" },
      { key: "attorneyDecisions", label: "Attorney decisions required" },
      { key: "status", label: "PASS / YELLOW / RED status" },
    ],
  },
];

export function getProductionModule(id: ProductionModule["id"]) {
  return productionModules.find((module) => module.id === id);
}
