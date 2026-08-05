import { NextResponse } from "next/server";
import { formatAttorneyReviewPacket } from "@/lib/production/reviewPacket";
import type { ValidationIssue, ValidationResult } from "@/lib/production/types";

type PackageType = "firstPass" | "reviewPackage" | "externalDelivery";

type RequestBody = {
  matterTypes: string[];
  packageType?: PackageType;
  primaryMatterType?: string;
  riskFlags?: string[];
  rawMaterials: string;
  currentDraft: string;
  processNotes: string;
  oldMatterTerms: string;
  partyInfo: string;
  dealTerms: string;
  deadline: string;
  deadlineIntentionallyBlank: boolean;
  reviewerType: string;
  attorneyApprovedForExternalDelivery: boolean;
  captionBodyConsistencyChecked: boolean;
  equityIssueRoutedToAttorney: boolean;
};

type DealTermRow = {
  term: string;
  value: string;
  provenance: string;
  raw: string;
};

type StopStatus = "OPEN" | "CLEARED" | "HUMAN CONFIRMATION REQUIRED";

type StopCondition = {
  id: "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8";
  condition: string;
  status: StopStatus;
  message: string;
};

type SourceDocument = {
  document: string;
  internalDate: string;
  label:
    | "REFERENCE"
    | "QUARANTINED"
    | "CLIENT EMAIL"
    | "ATTORNEY INSTRUCTION"
    | "UNKNOWN";
  evidence: string;
};

type ExecutiveStatus = {
  status:
    | "Do Not Send"
    | "Attorney Review Required"
    | "Ready for Attorney Review";
  reason: string;
};

type CriticalBlock = {
  id: string;
  issue: string;
  impact: string;
  owner: string;
};

type MatterSnapshot = {
  currentEntities: string[];
  currentIndividuals: string[];
  selectedWorkflows: string[];
  dealTerms: DealTermRow[];
};

type RouteOwner =
  | "Paralegal"
  | "Internal QA"
  | "Attorney"
  | "Client Follow-Up";

type RoutePriority = "Critical" | "High" | "Normal";

type RouteId =
  | "R1_QUARANTINE_CLEANUP"
  | "R3_CAPTION_BODY_CHECK"
  | "R4_DEAL_TERM_CONFIRMATION"
  | "R5_DEADLINE_RESOLUTION"
  | "R6_ATTORNEY_INSTRUCTION_CAPTURE"
  | "R7_EQUITY_ROUTING"
  | "R8_RESTRICTIVE_COVENANT_REVIEW"
  | "R9_MULTI_SIGNER_EXECUTION"
  | "R10_MISSING_PARTY_FOLLOWUP"
  | "R12_EXTERNAL_DELIVERY_CHECK"
  | "R0_READY_FOR_ATTORNEY_REVIEW";

type PackageReadiness =
  | "CLEANUP_REQUIRED"
  | "CONFIRMATIONS_PENDING"
  | "ATTORNEY_ISSUE_LIST_READY"
  | "ATTORNEY_REVIEW_PACKAGE_READY"
  | "EXTERNAL_DELIVERY_CHECK_REQUIRED";

type WorkflowRoute = {
  id: RouteId;
  route: string;
  owner: RouteOwner;
  priority: RoutePriority;
  reason: string;
  nextAction: string;
  triggeredBy: string[];
};

type WorkflowRoutePlan = {
  primary: WorkflowRoute;
  secondary: WorkflowRoute[];
  readiness: PackageReadiness;
  packageContext: PackageType;
};

type ConfirmationOwner =
  | "Client Follow-Up"
  | "Internal Cross-Check"
  | "Attorney Review"
  | "Human Confirmation Required";

type ConfirmationItem = {
  item: string;
  owner: ConfirmationOwner;
  source: string;
};

type AttorneyDecisionCard = {
  issue: string;
  priority: RoutePriority;
  constraint: string;
  evidence: string;
  application: string;
  praxisDidNotDecide: string;
  attorneyDecisionNeeded: string;
  safeNextStep: string;
  routing: "Attorney Review" | "Human Confirmation Required";
};

type AttorneyQuestion = {
  question: string;
  sourceIssue: string;
  priority: RoutePriority;
  routing: "Attorney Review" | "Human Confirmation Required";
};

type DecisionTableRow = {
  issue: string;
  evidence: string;
  options: string;
  safeDefault: string;
  owner: "Attorney" | "Paralegal" | "Client Follow-Up" | "Internal QA";
};

type SourceToIssueMapRow = {
  issue: string;
  sourceArea:
    | "Current Draft"
    | "Old Matter Terms"
    | "Deal Terms"
    | "Raw Materials"
    | "Party Information"
    | "Review Controls"
    | "Risk Flags";
  sourceDetail: string;
  trigger: string;
  confidence: "High" | "Medium" | "Low";
};

type ParalegalWorkItem = {
  task: string;
  owner: "Paralegal" | "Internal QA" | "Attorney";
  priority: "Critical" | "High" | "Normal";
};

type WatchlistSummary = {
  totalChecked: number;
  detected: string[];
  clearCount: number;
};

type EscalationMemoOutput = {
  matterTitle: string;
  executiveStatus: ExecutiveStatus;
  criticalBlocks: CriticalBlock[];
  matterSnapshot: MatterSnapshot;
  workflowRoutePlan: WorkflowRoutePlan;
  confirmationNeeded: ConfirmationItem[];
  attorneyDecisionCards: AttorneyDecisionCard[];
  attorneyQuestions: AttorneyQuestion[];
  decisionTable: DecisionTableRow[];
  sourceToIssueMap: SourceToIssueMapRow[];
  paralegalWorkQueue: ParalegalWorkItem[];
  watchlistSummary: WatchlistSummary;
  draftResponse: string;
  processNotes: string;
  sourceDocuments: SourceDocument[];
  internalStopConditions: StopCondition[];
};

type RawSection = {
  heading: string;
  content: string;
};

type StructuredValidationIssue = {
  field: "partyInfo" | "dealTerms";
  line: number;
  message: string;
  value: string;
};

const ROUTE_ORDER: RouteId[] = [
  "R1_QUARANTINE_CLEANUP",
  "R12_EXTERNAL_DELIVERY_CHECK",
  "R10_MISSING_PARTY_FOLLOWUP",
  "R4_DEAL_TERM_CONFIRMATION",
  "R5_DEADLINE_RESOLUTION",
  "R7_EQUITY_ROUTING",
  "R3_CAPTION_BODY_CHECK",
  "R6_ATTORNEY_INSTRUCTION_CAPTURE",
  "R8_RESTRICTIVE_COVENANT_REVIEW",
  "R9_MULTI_SIGNER_EXECUTION",
  "R0_READY_FOR_ATTORNEY_REVIEW",
];

const PRIORITY_RANK: Record<RoutePriority, number> = {
  Critical: 0,
  High: 1,
  Normal: 2,
};

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isPlaceholderValue(value: string): boolean {
  const normalized = normalizeText(value);
  return ["-", "—", "–", "tbd", "unknown", "n/a", "na", "none", "blank"].includes(
    normalized
  );
}

function excerpt(value: string, max = 180): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function normalizePackageType(value?: PackageType): PackageType {
  return value === "reviewPackage" || value === "externalDelivery"
    ? value
    : "firstPass";
}

function isExternalDeliveryContext(packageType: PackageType): boolean {
  return packageType === "externalDelivery";
}

function getPrimaryMatterType(body: RequestBody): string {
  return body.primaryMatterType?.trim() || body.matterTypes[0] || "";
}

function parsePipeTable(value: string): string[][] {
  return splitLines(value)
    .filter((line) => line.includes("|"))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length > 1);
}

function parseDealTerms(value: string): DealTermRow[] {
  const rows = parsePipeTable(value);
  return rows
    .filter((cells) => normalizeText(cells[0] || "") !== "term")
    .map((cells) => ({
      term: cells[0] || "",
      value: cells[1] || "",
      provenance: cells[2] || "",
      raw: cells.join(" | "),
    }));
}

function validateStructuredInputs(body: RequestBody): StructuredValidationIssue[] {
  const issues: StructuredValidationIssue[] = [];
  const partyRows = parsePipeTable(body.partyInfo);
  const dealRows = parsePipeTable(body.dealTerms);

  partyRows.forEach((cells, index) => {
    if (index === 0 && normalizeText(cells[0] || "") === "name") return;
    if (cells.length < 6 || cells.some((cell) => !cell.trim())) {
      issues.push({
        field: "partyInfo",
        line: index + 1,
        message: "Each party row must contain six nonblank columns.",
        value: cells.join(" | "),
      });
    }
  });

  dealRows.forEach((cells, index) => {
    if (index === 0 && normalizeText(cells[0] || "") === "term") return;
    if (cells.length < 3 || cells.some((cell) => !cell.trim())) {
      issues.push({
        field: "dealTerms",
        line: index + 1,
        message: "Each deal-term row must contain term, value, and provenance.",
        value: cells.join(" | "),
      });
    }
  });

  return issues;
}

function findOldMatterHits(currentDraft: string, oldMatterTerms: string): string[] {
  const normalizedDraft = normalizeText(currentDraft);
  return splitLines(oldMatterTerms).filter((term) => {
    const normalized = normalizeText(term);
    return normalized.length >= 2 && normalizedDraft.includes(normalized);
  });
}

function findUnresolvedDealTerms(value: string): DealTermRow[] {
  return parseDealTerms(value).filter((row) => {
    const provenance = normalizeText(row.provenance);
    return !provenance || ["unknown", "inherited", "tbd", "blank"].includes(provenance);
  });
}

function parseRawSections(value: string): RawSection[] {
  const pattern = /^---\s*(.+?)\s*---$/gm;
  const matches = [...value.matchAll(pattern)];
  if (!matches.length) return [];

  return matches.map((match, index) => ({
    heading: match[1].trim(),
    content: value
      .slice(match.index! + match[0].length, matches[index + 1]?.index ?? value.length)
      .trim(),
  }));
}

function detectAttorneyInstruction(value: string): boolean {
  return parseRawSections(value).some(
    (section) =>
      normalizeText(section.heading).includes("attorney instruction") &&
      section.content.trim().length > 0
  );
}

function findEquityLanguageHits(body: RequestBody): string[] {
  const text = normalizeText(
    [body.rawMaterials, body.currentDraft, ...(body.riskFlags ?? [])].join(" ")
  );
  return ["equity", "membership interest", "ownership interest"].filter((term) =>
    text.includes(term)
  );
}

function buildStopConditions(args: {
  body: RequestBody;
  oldMatterHits: string[];
  unresolvedDealTerms: DealTermRow[];
  hasAttorneyInstruction: boolean;
  equityLanguageHits: string[];
}): StopCondition[] {
  const { body, oldMatterHits, unresolvedDealTerms, hasAttorneyInstruction, equityLanguageHits } = args;
  const packageType = normalizePackageType(body.packageType);
  const external = isExternalDeliveryContext(packageType);

  return [
    {
      id: "S1",
      condition: "Old-matter residue",
      status: oldMatterHits.length ? "OPEN" : "CLEARED",
      message: oldMatterHits.length
        ? `Current draft contains old/excluded terms: ${oldMatterHits.join(", ")}.`
        : "No old/excluded terms detected in the current draft.",
    },
    {
      id: "S2",
      condition: "Caption/body consistency",
      status: body.captionBodyConsistencyChecked ? "CLEARED" : "HUMAN CONFIRMATION REQUIRED",
      message: body.captionBodyConsistencyChecked
        ? "Human reviewer confirmed caption/body consistency."
        : "Human reviewer must confirm that caption/title parties match body parties.",
    },
    {
      id: "S3",
      condition: "Deal-term provenance",
      status: unresolvedDealTerms.length ? "OPEN" : "CLEARED",
      message: unresolvedDealTerms.length
        ? "One or more deal terms have unresolved provenance."
        : "Deal-term provenance is resolved.",
    },
    {
      id: "S4",
      condition: "Deadline status",
      status: body.deadline.trim() || body.deadlineIntentionallyBlank ? "CLEARED" : "OPEN",
      message: body.deadline.trim()
        ? `Deadline recorded: ${body.deadline}.`
        : body.deadlineIntentionallyBlank
          ? "Deadline intentionally confirmed blank or not applicable."
          : "Deadline is blank without responsible-reviewer confirmation.",
    },
    {
      id: "S5",
      condition: "Required structured inputs",
      status: "CLEARED",
      message: "Structured party and deal-term input validation cleared.",
    },
    {
      id: "S6",
      condition: "Attorney instruction",
      status: hasAttorneyInstruction ? "CLEARED" : "OPEN",
      message: hasAttorneyInstruction
        ? "Attorney instruction section found."
        : "No populated ATTORNEY INSTRUCTION section was found.",
    },
    {
      id: "S7",
      condition: "External-delivery approval",
      status:
        external && !(body.reviewerType === "Attorney" && body.attorneyApprovedForExternalDelivery)
          ? "OPEN"
          : "CLEARED",
      message: external
        ? body.reviewerType === "Attorney" && body.attorneyApprovedForExternalDelivery
          ? "Attorney approval for this exact external-delivery draft is recorded."
          : "External delivery is not cleared by an Attorney reviewer."
        : "Not in external-delivery context.",
    },
    {
      id: "S8",
      condition: "Equity issue routing",
      status:
        equityLanguageHits.length && !body.equityIssueRoutedToAttorney ? "OPEN" : "CLEARED",
      message:
        equityLanguageHits.length && !body.equityIssueRoutedToAttorney
          ? `Equity-adjacent language detected: ${equityLanguageHits.join(", ")}.`
          : "No unrouted equity-adjacent issue remains.",
    },
  ];
}

function buildExecutiveStatus(stops: StopCondition[], packageType: PackageType): ExecutiveStatus {
  const red = stops.some((stop) => stop.status === "OPEN" && ["S1", "S4", "S7", "S8"].includes(stop.id));
  const yellow = stops.some((stop) => stop.status !== "CLEARED");

  if (red) {
    return {
      status: packageType === "externalDelivery" ? "Do Not Send" : "Attorney Review Required",
      reason: "One or more blocking or attorney-controlled conditions remain open.",
    };
  }

  if (yellow) {
    return {
      status: "Attorney Review Required",
      reason: "Human confirmation or attorney decision remains required.",
    };
  }

  return {
    status: "Ready for Attorney Review",
    reason: "Deterministic and recorded human controls are cleared.",
  };
}

function buildCriticalBlocks(stops: StopCondition[], packageType: PackageType): CriticalBlock[] {
  return stops
    .filter((stop) => stop.status === "OPEN" && (packageType === "externalDelivery" || stop.id !== "S7"))
    .map((stop) => ({
      id: stop.id,
      issue: stop.condition,
      impact: stop.message,
      owner: ["S7", "S8"].includes(stop.id) ? "Attorney" : "Paralegal / Internal QA",
    }));
}

function buildMatterSnapshot(body: RequestBody): MatterSnapshot {
  const rows = parsePipeTable(body.partyInfo).filter(
    (cells) => normalizeText(cells[0] || "") !== "name"
  );

  return {
    currentEntities: rows
      .filter((cells) => normalizeText(cells[1] || "").includes("entity"))
      .map((cells) => cells[0]),
    currentIndividuals: rows
      .filter((cells) => normalizeText(cells[1] || "").includes("individual"))
      .map((cells) => cells[0]),
    selectedWorkflows: [getPrimaryMatterType(body), ...(body.riskFlags ?? [])].filter(Boolean),
    dealTerms: parseDealTerms(body.dealTerms),
  };
}

function buildWorkflowRoutePlan(args: {
  body: RequestBody;
  stopConditions: StopCondition[];
  unresolvedDealTerms: DealTermRow[];
  equityLanguageHits: string[];
}): WorkflowRoutePlan {
  const { body, stopConditions, unresolvedDealTerms, equityLanguageHits } = args;
  const routes: WorkflowRoute[] = [];

  const add = (route: WorkflowRoute) => routes.push(route);
  const open = (id: StopCondition["id"]) =>
    stopConditions.some((stop) => stop.id === id && stop.status !== "CLEARED");

  if (open("S1"))
    add({ id: "R1_QUARANTINE_CLEANUP", route: "Quarantine and cleanup", owner: "Internal QA", priority: "Critical", reason: "Old-matter residue detected.", nextAction: "Remove or quarantine old-matter terms before drafting.", triggeredBy: ["S1"] });
  if (open("S7"))
    add({ id: "R12_EXTERNAL_DELIVERY_CHECK", route: "External delivery hold", owner: "Attorney", priority: "Critical", reason: "Attorney approval is not recorded.", nextAction: "Do not send externally until approval is recorded.", triggeredBy: ["S7"] });
  if ((body.riskFlags ?? []).includes("Missing party or address information"))
    add({ id: "R10_MISSING_PARTY_FOLLOWUP", route: "Missing party follow-up", owner: "Client Follow-Up", priority: "High", reason: "Party or address information is flagged missing.", nextAction: "Obtain and source-verify missing identity information.", triggeredBy: ["Risk flag"] });
  if (unresolvedDealTerms.length)
    add({ id: "R4_DEAL_TERM_CONFIRMATION", route: "Deal-term confirmation", owner: "Attorney", priority: "High", reason: "Deal-term provenance remains unresolved.", nextAction: "Approve, revise, remove, or request confirmation for each term.", triggeredBy: ["S3"] });
  if (open("S4"))
    add({ id: "R5_DEADLINE_RESOLUTION", route: "Deadline resolution", owner: "Paralegal", priority: "High", reason: "Deadline status is unresolved.", nextAction: "Supply or responsibly confirm blank/not applicable.", triggeredBy: ["S4"] });
  if (open("S8") || equityLanguageHits.length)
    add({ id: "R7_EQUITY_ROUTING", route: "Equity issue routing", owner: "Attorney", priority: "High", reason: "Equity-adjacent language is present.", nextAction: "Determine whether separate ownership-rights review is required.", triggeredBy: ["S8"] });
  if (open("S2"))
    add({ id: "R3_CAPTION_BODY_CHECK", route: "Caption/body consistency check", owner: "Paralegal", priority: "High", reason: "Human confirmation is not recorded.", nextAction: "Compare caption/title parties against body parties.", triggeredBy: ["S2"] });
  if (open("S6"))
    add({ id: "R6_ATTORNEY_INSTRUCTION_CAPTURE", route: "Attorney instruction capture", owner: "Attorney", priority: "Normal", reason: "Attorney instruction is absent.", nextAction: "Record the instruction governing this package.", triggeredBy: ["S6"] });
  if ((body.riskFlags ?? []).includes("Restrictive covenant / non-compete"))
    add({ id: "R8_RESTRICTIVE_COVENANT_REVIEW", route: "Restrictive-covenant review", owner: "Attorney", priority: "High", reason: "Restrictive covenant is flagged.", nextAction: "Review scope and enforceability separately.", triggeredBy: ["Risk flag"] });
  if ((body.riskFlags ?? []).includes("Multiple individual signers"))
    add({ id: "R9_MULTI_SIGNER_EXECUTION", route: "Multi-signer execution", owner: "Paralegal", priority: "Normal", reason: "Multiple individual signers are present.", nextAction: "Confirm capacities, signature blocks, and initials.", triggeredBy: ["Risk flag"] });

  if (!routes.length) {
    routes.push({ id: "R0_READY_FOR_ATTORNEY_REVIEW", route: "Ready for attorney review", owner: "Attorney", priority: "Normal", reason: "No unresolved production route was detected.", nextAction: "Review the controlled package.", triggeredBy: ["All checks cleared"] });
  }

  routes.sort((a, b) => {
    const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return priority || ROUTE_ORDER.indexOf(a.id) - ROUTE_ORDER.indexOf(b.id);
  });

  const packageType = normalizePackageType(body.packageType);
  const readiness: PackageReadiness = open("S1")
    ? "CLEANUP_REQUIRED"
    : open("S7")
      ? "EXTERNAL_DELIVERY_CHECK_REQUIRED"
      : routes.some((route) => route.owner === "Attorney")
        ? "ATTORNEY_ISSUE_LIST_READY"
        : routes.length > 1
          ? "CONFIRMATIONS_PENDING"
          : "ATTORNEY_REVIEW_PACKAGE_READY";

  return { primary: routes[0], secondary: routes.slice(1), readiness, packageContext: packageType };
}

function buildConfirmationNeeded(args: {
  stopConditions: StopCondition[];
  unresolvedDealTerms: DealTermRow[];
  equityLanguageHits: string[];
}): ConfirmationItem[] {
  const { stopConditions, unresolvedDealTerms, equityLanguageHits } = args;
  const items: ConfirmationItem[] = [];

  stopConditions
    .filter((stop) => stop.status !== "CLEARED")
    .forEach((stop) => {
      items.push({
        item: stop.message,
        owner: ["S7", "S8"].includes(stop.id) ? "Attorney Review" : "Human Confirmation Required",
        source: stop.id,
      });
    });

  unresolvedDealTerms.forEach((row) =>
    items.push({ item: `${row.term}: confirm provenance and approved value.`, owner: "Attorney Review", source: row.raw })
  );

  if (equityLanguageHits.length)
    items.push({ item: `Route equity-adjacent language: ${equityLanguageHits.join(", ")}.`, owner: "Attorney Review", source: "Raw materials / risk flags" });

  return items;
}

function stopMessage(stops: StopCondition[], id: StopCondition["id"]): string {
  return stops.find((stop) => stop.id === id)?.message ?? "Condition not found.";
}

function sortAttorneyDecisionCards(cards: AttorneyDecisionCard[]): AttorneyDecisionCard[] {
  return cards.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

function buildAttorneyDecisionCards(args: {
  stopConditions: StopCondition[];
  unresolvedDealTerms: DealTermRow[];
  equityLanguageHits: string[];
  packageType: PackageType;
}): AttorneyDecisionCard[] {
  const { stopConditions, unresolvedDealTerms, equityLanguageHits, packageType } = args;
  const cards: AttorneyDecisionCard[] = [];
  const open = (id: StopCondition["id"]) =>
    stopConditions.some((stop) => stop.id === id && stop.status !== "CLEARED");

  const push = (card: AttorneyDecisionCard) => cards.push(card);

  if (open("S1"))
    push({ issue: "Old-matter residue in current draft", priority: "Critical", constraint: "Prior-matter terms cannot remain in the current matter draft.", evidence: stopMessage(stopConditions, "S1"), application: "The current draft is contaminated by old/excluded terms.", praxisDidNotDecide: "Praxis did not decide whether any detected term should be retained.", attorneyDecisionNeeded: "Confirm cleanup or quarantine before further review.", safeNextStep: "Remove or quarantine the detected terms and rerun Praxis.", routing: "Human Confirmation Required" });
  if (open("S2"))
    push({ issue: "Caption/body party consistency not confirmed", priority: "High", constraint: "Party consistency requires human verification.", evidence: stopMessage(stopConditions, "S2"), application: "Praxis cannot establish that the caption and body identify the same parties.", praxisDidNotDecide: "Praxis did not determine party identity from context.", attorneyDecisionNeeded: "Confirm whether correction is required.", safeNextStep: "Run a caption/title versus body-party check, record the result, and rerun the memo.", routing: "Human Confirmation Required" });
  if (open("S4"))
    push({ issue: "Deadline handling", priority: "High", constraint: "A blank deadline cannot be treated as intentional without confirmation.", evidence: stopMessage(stopConditions, "S4"), application: "Praxis cannot distinguish an intentional blank from missing information.", praxisDidNotDecide: "Praxis did not decide whether a deadline is required.", attorneyDecisionNeeded: "Confirm whether to supply, hold, or mark blank/not applicable.", safeNextStep: "Obtain deadline direction before external delivery.", routing: "Human Confirmation Required" });

  unresolvedDealTerms.forEach((row) =>
    push({ issue: `Deal-term provenance: ${row.term || "(blank term)"}`, priority: "High", constraint: "Unresolved terms cannot be treated as confirmed drafting inputs.", evidence: `${row.term || "(blank term)"} = ${row.value || "(blank value)"}; Provenance = ${row.provenance || "blank"}.`, application: "The term is present but not established as approved for use.", praxisDidNotDecide: "Praxis did not decide enforceability or business reasonableness.", attorneyDecisionNeeded: "Decide whether to include, revise, remove, or request confirmation.", safeNextStep: "Hold the term in the attorney-review queue.", routing: "Attorney Review" })
  );

  if (open("S6"))
    push({ issue: "Attorney instruction missing", priority: "Normal", constraint: "The intended drafting objective must be documented.", evidence: stopMessage(stopConditions, "S6"), application: "The package lacks the expected attorney instruction.", praxisDidNotDecide: "Praxis did not infer attorney intent.", attorneyDecisionNeeded: "Provide the instruction governing the package.", safeNextStep: "Add an ATTORNEY INSTRUCTION section and rerun.", routing: "Human Confirmation Required" });
  if (isExternalDeliveryContext(packageType) && open("S7"))
    push({ issue: "External-delivery approval not confirmed", priority: "Critical", constraint: "External delivery requires approval by an Attorney reviewer.", evidence: stopMessage(stopConditions, "S7"), application: "The draft is not cleared for external delivery.", praxisDidNotDecide: "Praxis did not decide whether the draft is legally complete or ready to send.", attorneyDecisionNeeded: "Confirm approval of this exact draft.", safeNextStep: "Do not send until approval is recorded.", routing: "Attorney Review" });
  if (open("S8") && equityLanguageHits.length)
    push({ issue: "Equity or membership-interest-adjacent language", priority: "High", constraint: "Ownership-adjacent language must be routed before use.", evidence: equityLanguageHits.join(", "), application: "The language should not be treated as ordinary NDA language without review.", praxisDidNotDecide: "Praxis did not decide whether ownership rights are affected.", attorneyDecisionNeeded: "Decide whether separate ownership-rights review is required.", safeNextStep: "Hold the language for attorney review.", routing: "Attorney Review" });

  return sortAttorneyDecisionCards(cards);
}

function buildAttorneyQuestions(cards: AttorneyDecisionCard[]): AttorneyQuestion[] {
  return cards.map((card) => ({
    question: card.attorneyDecisionNeeded,
    sourceIssue: card.issue,
    priority: card.priority,
    routing: card.routing,
  }));
}

function decisionOptionsForCard(card: AttorneyDecisionCard): string {
  if (card.issue.startsWith("Deal-term provenance:")) return "Include as stated / revise / remove / request confirmation";
  if (card.issue === "External-delivery approval not confirmed") return "Approve external delivery / reject / return for revision";
  if (card.issue === "Old-matter residue in current draft") return "Confirm cleanup / require further cleanup / quarantine";
  if (card.issue === "Caption/body party consistency not confirmed") return "Confirm match / correct parties / escalate";
  if (card.issue === "Deadline handling") return "Supply deadline / confirm blank or not applicable / request follow-up";
  if (card.issue === "Attorney instruction missing") return "Provide instruction / request instruction / hold package";
  if (card.issue === "Equity or membership-interest-adjacent language") return "Treat as ordinary return-of-property / revise / route separately";
  return "Approve / revise / remove / request confirmation";
}

function buildDecisionTable(cards: AttorneyDecisionCard[]): DecisionTableRow[] {
  return cards.map((card) => ({
    issue: card.issue,
    evidence: card.evidence,
    options: decisionOptionsForCard(card),
    safeDefault: card.safeNextStep,
    owner: card.routing === "Attorney Review" ? "Attorney" : "Paralegal",
  }));
}

function sourceAreaForCard(card: AttorneyDecisionCard): SourceToIssueMapRow["sourceArea"] {
  if (card.issue === "Old-matter residue in current draft") return "Current Draft";
  if (card.issue.startsWith("Deal-term provenance:")) return "Deal Terms";
  if (card.issue === "Attorney instruction missing" || card.issue === "Equity or membership-interest-adjacent language") return "Raw Materials";
  return "Review Controls";
}

function buildSourceToIssueMap(cards: AttorneyDecisionCard[]): SourceToIssueMapRow[] {
  return cards.map((card) => ({
    issue: card.issue,
    sourceArea: sourceAreaForCard(card),
    sourceDetail: card.evidence,
    trigger: "Derived from attorney decision card",
    confidence: "High",
  }));
}

function buildParalegalWorkQueue(args: {
  stopConditions: StopCondition[];
  oldMatterHits: string[];
  unresolvedDealTerms: DealTermRow[];
  packageType: PackageType;
}): ParalegalWorkItem[] {
  const { stopConditions, oldMatterHits, unresolvedDealTerms, packageType } = args;
  const items: ParalegalWorkItem[] = [];
  const open = (id: StopCondition["id"]) => stopConditions.some((stop) => stop.id === id && stop.status !== "CLEARED");

  if (open("S1")) items.push({ task: `Quarantine the current draft and identify old/excluded terms: ${oldMatterHits.join(", ")}.`, owner: "Internal QA", priority: "Critical" });
  if (isExternalDeliveryContext(packageType) && open("S7")) items.push({ task: "Confirm attorney approval before any external delivery.", owner: "Attorney", priority: "Critical" });
  if (open("S2")) items.push({ task: "Run caption/title versus body party consistency check.", owner: "Paralegal", priority: "High" });
  if (open("S4")) items.push({ task: "Confirm deadline status.", owner: "Paralegal", priority: "High" });
  if (unresolvedDealTerms.length)
    items.push({ task: `Prepare unresolved deal-term list: ${unresolvedDealTerms.map((row) => `${row.term} (${row.provenance || "blank"})`).join(", ")}.`, owner: "Paralegal", priority: "High" });

  return items;
}

function buildWatchlistSummary(oldMatterTerms: string[], oldMatterHits: string[]): WatchlistSummary {
  return { totalChecked: oldMatterTerms.length, detected: oldMatterHits, clearCount: Math.max(oldMatterTerms.length - oldMatterHits.length, 0) };
}

function sectionDocumentName(heading: string): string {
  return heading.trim() || "Raw Materials";
}

function sectionLabel(heading: string): SourceDocument["label"] {
  const normalized = normalizeText(heading);
  if (normalized.includes("client email")) return "CLIENT EMAIL";
  if (normalized.includes("attorney instruction")) return "ATTORNEY INSTRUCTION";
  return "REFERENCE";
}

function buildDefaultSourceDocuments(body: RequestBody, oldMatterHits: string[]): SourceDocument[] {
  const docs: SourceDocument[] = [];

  parseRawSections(body.rawMaterials).forEach((section) => {
    docs.push({ document: sectionDocumentName(section.heading), internalDate: "", label: sectionLabel(section.heading), evidence: excerpt(section.content) });
  });

  if (!docs.length && body.rawMaterials.trim()) docs.push({ document: "Raw Materials", internalDate: "", label: "REFERENCE", evidence: "Provided by user." });
  if (body.dealTerms.trim()) docs.push({ document: "Deal Terms", internalDate: "", label: "REFERENCE", evidence: "Provided by user." });
  if (body.currentDraft.trim()) docs.push({ document: "Current Draft", internalDate: "", label: oldMatterHits.length ? "QUARANTINED" : "UNKNOWN", evidence: oldMatterHits.length ? "Contains old/excluded matter residue." : "Provided by user." });

  const seen = new Set<string>();
  return docs.filter((doc) => {
    const key = normalizeText(`${doc.document} ${doc.label} ${doc.evidence}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function buildMatterTitle(body: RequestBody): string {
  return getPrimaryMatterType(body) || "NDA / Mutual Release";
}

function buildEscalationMemo(args: {
  body: RequestBody;
  stopConditions: StopCondition[];
  oldMatterHits: string[];
  oldMatterTerms: string[];
  unresolvedDealTerms: DealTermRow[];
  equityLanguageHits: string[];
}): EscalationMemoOutput {
  const { body, stopConditions, oldMatterHits, oldMatterTerms, unresolvedDealTerms, equityLanguageHits } = args;
  const packageType = normalizePackageType(body.packageType);
  const attorneyDecisionCards = buildAttorneyDecisionCards({ stopConditions, unresolvedDealTerms, equityLanguageHits, packageType });

  return {
    matterTitle: buildMatterTitle(body),
    executiveStatus: buildExecutiveStatus(stopConditions, packageType),
    criticalBlocks: buildCriticalBlocks(stopConditions, packageType),
    matterSnapshot: buildMatterSnapshot(body),
    workflowRoutePlan: buildWorkflowRoutePlan({ body, stopConditions, unresolvedDealTerms, equityLanguageHits }),
    confirmationNeeded: buildConfirmationNeeded({ stopConditions, unresolvedDealTerms, equityLanguageHits }),
    attorneyDecisionCards,
    attorneyQuestions: buildAttorneyQuestions(attorneyDecisionCards),
    decisionTable: buildDecisionTable(attorneyDecisionCards),
    sourceToIssueMap: buildSourceToIssueMap(attorneyDecisionCards),
    paralegalWorkQueue: buildParalegalWorkQueue({ stopConditions, oldMatterHits, unresolvedDealTerms, packageType }),
    watchlistSummary: buildWatchlistSummary(oldMatterTerms, oldMatterHits),
    draftResponse: "Praxis does not generate external-send language in this workflow.",
    processNotes: body.processNotes,
    sourceDocuments: buildDefaultSourceDocuments(body, oldMatterHits),
    internalStopConditions: stopConditions,
  };
}

function validationFromMemo(memo: EscalationMemoOutput): ValidationResult {
  const issues: ValidationIssue[] = memo.internalStopConditions
    .filter((stop) => stop.status !== "CLEARED")
    .map((stop) => ({
      id: stop.id,
      severity: ["S1", "S4", "S7", "S8"].includes(stop.id) && stop.status === "OPEN" ? "RED" : "YELLOW",
      message: stop.message,
    }));

  return {
    status: issues.some((issue) => issue.severity === "RED")
      ? "RED"
      : issues.length
        ? "YELLOW"
        : "PASS",
    issues,
  };
}

function renderEscalationMemo(memo: EscalationMemoOutput): string {
  return formatAttorneyReviewPacket({
    title: `Praxis Attorney Review Packet — ${memo.matterTitle}`,
    matterSummary: [
      `Executive status: ${memo.executiveStatus.status}`,
      `Reason: ${memo.executiveStatus.reason}`,
      `Entities: ${memo.matterSnapshot.currentEntities.join("; ") || "None identified"}`,
      `Individuals/signers: ${memo.matterSnapshot.currentIndividuals.join("; ") || "None identified"}`,
      `Workflow: ${memo.matterSnapshot.selectedWorkflows.join("; ") || "None selected"}`,
    ],
    sources: memo.sourceDocuments.map(
      (doc) => `${doc.document} — ${doc.label} — ${doc.evidence}`
    ),
    validation: validationFromMemo(memo),
    attorneyDecisions: memo.attorneyDecisionCards.map(
      (card) => `[${card.priority}] ${card.issue}: ${card.attorneyDecisionNeeded}`
    ),
    paralegalNextActions: memo.paralegalWorkQueue.map(
      (item) => `[${item.priority}] ${item.task} — Owner: ${item.owner}`
    ),
    additionalSections: [
      {
        heading: "Critical Blocks",
        items: memo.criticalBlocks.length
          ? memo.criticalBlocks.map(
              (block) => `${block.id} — ${block.issue}: ${block.impact} — Owner: ${block.owner}`
            )
          : ["None."],
      },
      {
        heading: "Professional Workflow Route",
        items: [
          `Readiness: ${memo.workflowRoutePlan.readiness}`,
          `Primary: ${memo.workflowRoutePlan.primary.route} — ${memo.workflowRoutePlan.primary.nextAction}`,
          ...memo.workflowRoutePlan.secondary.map(
            (route) => `Secondary: ${route.route} — ${route.nextAction}`
          ),
        ],
      },
      {
        heading: "Confirmation Needed",
        items: memo.confirmationNeeded.length
          ? memo.confirmationNeeded.map(
              (item) => `${item.item} — ${item.owner} — Source: ${item.source}`
            )
          : ["None."],
      },
      {
        heading: "Deal Terms",
        items: memo.matterSnapshot.dealTerms.length
          ? memo.matterSnapshot.dealTerms.map(
              (row) => `${row.term || "(blank term)"} = ${row.value || "(blank value)"}; Provenance: ${row.provenance || "blank"}`
            )
          : ["None identified."],
      },
      {
        heading: "Watchlist Summary",
        items: [
          `Old/excluded terms checked: ${memo.watchlistSummary.totalChecked}`,
          `Detected: ${memo.watchlistSummary.detected.join(", ") || "None"}`,
          `Clear: ${memo.watchlistSummary.clearCount}`,
        ],
      },
      {
        heading: "Internal STOP Conditions",
        items: memo.internalStopConditions.map(
          (stop) => `${stop.id} ${stop.condition} — ${stop.status} — ${stop.message}`
        ),
      },
      {
        heading: "Human Process Notes",
        items: splitLines(memo.processNotes).length ? splitLines(memo.processNotes) : ["None."],
      },
    ],
  });
}

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  body.matterTypes = Array.isArray(body.matterTypes) ? body.matterTypes : [];
  body.riskFlags = Array.isArray(body.riskFlags) ? body.riskFlags : [];
  body.packageType = normalizePackageType(body.packageType);
  body.primaryMatterType = typeof body.primaryMatterType === "string" ? body.primaryMatterType : "";

  const missing: string[] = [];
  if (!body.primaryMatterType && body.matterTypes.length === 0) missing.push("primaryMatterType or matterTypes");
  if (!body.rawMaterials || !body.rawMaterials.trim()) missing.push("rawMaterials");
  if (!body.partyInfo || !body.partyInfo.trim()) missing.push("partyInfo");
  if (!body.dealTerms || !body.dealTerms.trim()) missing.push("dealTerms");
  if (!body.oldMatterTerms || !body.oldMatterTerms.trim()) missing.push("oldMatterTerms");
  if (!body.reviewerType || !body.reviewerType.trim()) missing.push("reviewerType");

  if (missing.length) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
  }

  body.rawMaterials = typeof body.rawMaterials === "string" ? body.rawMaterials : "";
  body.currentDraft = typeof body.currentDraft === "string" ? body.currentDraft : "";
  body.processNotes = typeof body.processNotes === "string" ? body.processNotes : "";
  body.oldMatterTerms = typeof body.oldMatterTerms === "string" ? body.oldMatterTerms : "";
  body.partyInfo = typeof body.partyInfo === "string" ? body.partyInfo : "";
  body.dealTerms = typeof body.dealTerms === "string" ? body.dealTerms : "";
  body.deadline = typeof body.deadline === "string" ? body.deadline : "";
  body.deadlineIntentionallyBlank = Boolean(body.deadlineIntentionallyBlank);
  body.attorneyApprovedForExternalDelivery = Boolean(body.attorneyApprovedForExternalDelivery);
  body.captionBodyConsistencyChecked = Boolean(body.captionBodyConsistencyChecked);
  body.equityIssueRoutedToAttorney = Boolean(body.equityIssueRoutedToAttorney);

  const structuredIssues = validateStructuredInputs(body);
  if (structuredIssues.length) {
    return NextResponse.json({ error: "Input validation failed.", issues: structuredIssues }, { status: 400 });
  }

  const oldMatterHits = findOldMatterHits(body.currentDraft, body.oldMatterTerms);
  const oldMatterTerms = splitLines(body.oldMatterTerms);
  const unresolvedDealTerms = findUnresolvedDealTerms(body.dealTerms);
  const hasAttorneyInstruction = detectAttorneyInstruction(body.rawMaterials);
  const equityLanguageHits = findEquityLanguageHits(body);
  const stopConditions = buildStopConditions({ body, oldMatterHits, unresolvedDealTerms, hasAttorneyInstruction, equityLanguageHits });
  const memo = buildEscalationMemo({ body, stopConditions, oldMatterHits, oldMatterTerms, unresolvedDealTerms, equityLanguageHits });

  return NextResponse.json({ output: renderEscalationMemo(memo) });
}
