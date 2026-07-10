import { NextResponse } from "next/server";

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

type ValidationIssue = {
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

  return [
    "-",
    "—",
    "–",
    "tbd",
    "n/a",
    "na",
    "unknown",
    "unclear",
    "to be confirmed",
    "needs confirmation",
    "pending confirmation",
    "not confirmed",
    "要確認",
    "不明",
    "未確認",
    "未定",
    "確認中",
  ].includes(normalized);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termToRegex(term: string): RegExp {
  const normalized = normalizeText(term);
  const escaped = escapeRegExp(normalized).replace(/\s+/g, "\\s+");

  const startsWord = /^[a-z0-9]/i.test(normalized);
  const endsWord = /[a-z0-9]$/i.test(normalized);

  const prefix = startsWord ? "(^|[^a-z0-9])" : "";
  const suffix = endsWord ? "($|[^a-z0-9])" : "";

  return new RegExp(`${prefix}${escaped}${suffix}`, "i");
}

function normalizePackageType(value: unknown): PackageType {
  if (
    value === "firstPass" ||
    value === "reviewPackage" ||
    value === "externalDelivery"
  ) {
    return value;
  }

  return "firstPass";
}

function isAttorneyReviewer(reviewerType: string): boolean {
  return normalizeText(reviewerType) === "attorney";
}

function isExternalDeliveryContext(
  bodyOrPackageType: RequestBody | PackageType
): boolean {
  const packageType =
    typeof bodyOrPackageType === "string"
      ? bodyOrPackageType
      : normalizePackageType(bodyOrPackageType.packageType);

  return packageType === "externalDelivery";
}

function getPrimaryMatterType(body: RequestBody): string {
  return body.primaryMatterType || body.matterTypes[0] || "";
}

function getRiskFlags(body: RequestBody): string[] {
  if (Array.isArray(body.riskFlags) && body.riskFlags.length > 0) {
    return body.riskFlags.filter(Boolean);
  }

  const primaryMatterType = getPrimaryMatterType(body);

  return body.matterTypes.filter((item) => item && item !== primaryMatterType);
}

function getSelectedWorkflows(body: RequestBody): string[] {
  const primaryMatterType = getPrimaryMatterType(body);
  const riskFlags = getRiskFlags(body);

  return [primaryMatterType, ...riskFlags].filter(Boolean);
}

function hasRiskFlag(body: RequestBody, flag: string): boolean {
  const normalizedFlag = normalizeText(flag);

  return getRiskFlags(body).some(
    (item) => normalizeText(item) === normalizedFlag
  );
}

function stopStatus(
  stopConditions: StopCondition[],
  id: StopCondition["id"]
): StopStatus | undefined {
  return stopConditions.find((stop) => stop.id === id)?.status;
}

function stopMessage(
  stopConditions: StopCondition[],
  id: StopCondition["id"]
): string {
  return stopConditions.find((stop) => stop.id === id)?.message || "";
}

function findOldMatterHits(
  currentDraft: string,
  oldMatterTerms: string
): string[] {
  if (!currentDraft || !oldMatterTerms) return [];

  const normalizedDraft = normalizeText(currentDraft);

  return splitLines(oldMatterTerms).filter((term) =>
    termToRegex(term).test(normalizedDraft)
  );
}

function isEntityType(value: string): boolean {
  return /entity|llc|company|corporation|corp|法人|会社/i.test(value);
}

function isIndividualType(value: string): boolean {
  return /individual|person|natural person|個人/i.test(value);
}

function validateRequiredPartyCell(args: {
  issues: ValidationIssue[];
  lineNumber: number;
  rowLine: string;
  columnName: string;
  value: string;
}) {
  const { issues, lineNumber, rowLine, columnName, value } = args;

  if (!value) {
    issues.push({
      field: "partyInfo",
      line: lineNumber,
      message: `Party Information row is missing ${columnName}.`,
      value: rowLine,
    });

    return;
  }

  if (isPlaceholderValue(value)) {
    issues.push({
      field: "partyInfo",
      line: lineNumber,
      message: `Party Information row has placeholder ${columnName}.`,
      value: rowLine,
    });
  }
}

function validatePartyInfoTable(partyInfo: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = splitLines(partyInfo);

  const rows = lines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter((row) => !/^name\s*\|/i.test(row.line));

  if (rows.length === 0) {
    issues.push({
      field: "partyInfo",
      line: 0,
      message:
        "Party Information table must include at least one party row after the header.",
      value: partyInfo,
    });

    return issues;
  }

  rows.forEach((row) => {
    const parts = row.line.split("|").map((part) => part.trim());

    if (parts.length < 6) {
      issues.push({
        field: "partyInfo",
        line: row.lineNumber,
        message:
          "Party Information row must have 6 columns: Name | Type | Capacity | Address | Signer | Initials.",
        value: row.line,
      });

      return;
    }

    const [name, type, capacity, address, signer, initials] = parts;

    validateRequiredPartyCell({
      issues,
      lineNumber: row.lineNumber,
      rowLine: row.line,
      columnName: "Name",
      value: name,
    });

    validateRequiredPartyCell({
      issues,
      lineNumber: row.lineNumber,
      rowLine: row.line,
      columnName: "Type",
      value: type,
    });

    if (
      type &&
      !isPlaceholderValue(type) &&
      !isEntityType(type) &&
      !isIndividualType(type)
    ) {
      issues.push({
        field: "partyInfo",
        line: row.lineNumber,
        message:
          "Party Type must be recognizable as entity/company/LLC/corporation or individual/person.",
        value: row.line,
      });
    }

    validateRequiredPartyCell({
      issues,
      lineNumber: row.lineNumber,
      rowLine: row.line,
      columnName: "Capacity",
      value: capacity,
    });

    validateRequiredPartyCell({
      issues,
      lineNumber: row.lineNumber,
      rowLine: row.line,
      columnName: "Address",
      value: address,
    });

    validateRequiredPartyCell({
      issues,
      lineNumber: row.lineNumber,
      rowLine: row.line,
      columnName: "Signer",
      value: signer,
    });

    validateRequiredPartyCell({
      issues,
      lineNumber: row.lineNumber,
      rowLine: row.line,
      columnName: "Initials",
      value: initials,
    });
  });

  return issues;
}

function validateDealTermsTable(dealTerms: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = splitLines(dealTerms);

  const rows = lines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter((row) => !/^term\s*\|/i.test(row.line));

  if (rows.length === 0) {
    issues.push({
      field: "dealTerms",
      line: 0,
      message:
        "Deal Terms table must include at least one deal-term row after the header.",
      value: dealTerms,
    });

    return issues;
  }

  rows.forEach((row) => {
    const parts = row.line.split("|").map((part) => part.trim());

    if (parts.length < 3) {
      issues.push({
        field: "dealTerms",
        line: row.lineNumber,
        message:
          "Deal Terms row must have 3 columns: Term | Value | Provenance.",
        value: row.line,
      });

      return;
    }

    const [term, value] = parts;

    if (!term) {
      issues.push({
        field: "dealTerms",
        line: row.lineNumber,
        message: "Deal Terms row is missing Term.",
        value: row.line,
      });
    }

    if (!value) {
      issues.push({
        field: "dealTerms",
        line: row.lineNumber,
        message: "Deal Terms row is missing Value.",
        value: row.line,
      });
    }
  });

  return issues;
}

function validateStructuredInputs(body: RequestBody): ValidationIssue[] {
  return [
    ...validatePartyInfoTable(body.partyInfo),
    ...validateDealTermsTable(body.dealTerms),
  ];
}

function parseDealTerms(dealTerms: string): DealTermRow[] {
  return splitLines(dealTerms)
    .filter((line) => !/^term\s*\|/i.test(line))
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());

      return {
        term: parts[0] || "",
        value: parts[1] || "",
        provenance: parts[2] || "",
        raw: line,
      };
    })
    .filter((row) => row.term || row.value || row.provenance);
}

function isResolvedProvenance(provenance: string): boolean {
  const value = normalizeText(provenance);

  return [
    "instructed",
    "confirmed",
    "attorney confirmed",
    "client confirmed",
    "responsible reviewer confirmed",
    "drafting instruction",
    "final instruction",
  ].includes(value);
}

function isUnresolvedProvenance(provenance: string): boolean {
  const value = normalizeText(provenance);

  if (!value) return true;

  if (isResolvedProvenance(value)) return false;

  if (
    [
      "unknown",
      "inherited",
      "unclear",
      "tbd",
      "to be confirmed",
      "not confirmed",
      "needs confirmation",
      "pending confirmation",
      "要確認",
      "不明",
      "未確認",
      "未定",
      "確認中",
    ].includes(value)
  ) {
    return true;
  }

  return true;
}

function findUnresolvedDealTerms(dealTerms: string): DealTermRow[] {
  return parseDealTerms(dealTerms).filter((row) =>
    isUnresolvedProvenance(row.provenance)
  );
}

function parseRawSections(rawMaterials: string): RawSection[] {
  const text = rawMaterials || "";
  const markerRegex = /^---\s*([A-Z0-9 _/-]+?)\s*---\s*$/gim;
  const matches = [...text.matchAll(markerRegex)];

  if (matches.length === 0) {
    return text.trim()
      ? [{ heading: "RAW MATERIALS", content: text.trim() }]
      : [];
  }

  return matches
    .map((match, index) => {
      const heading = (match[1] || "").trim();
      const start = (match.index || 0) + match[0].length;
      const end =
        index + 1 < matches.length
          ? matches[index + 1].index || text.length
          : text.length;
      const content = text.slice(start, end).trim();

      return { heading, content };
    })
    .filter((section) => section.heading && section.content);
}

function sectionLabel(heading: string): SourceDocument["label"] {
  const normalized = normalizeText(heading);

  if (/client|email/.test(normalized)) return "CLIENT EMAIL";
  if (/attorney|instruction/.test(normalized)) return "ATTORNEY INSTRUCTION";

  return "REFERENCE";
}

function sectionDocumentName(heading: string): string {
  const normalized = normalizeText(heading);

  if (/template/.test(normalized)) return "Template";
  if (/client|email/.test(normalized)) return "Client Email";
  if (/attorney|instruction/.test(normalized)) return "Attorney Instruction";

  return heading
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function excerpt(value: string, maxLength = 160): string {
  const compact = value.replace(/\s+/g, " ").trim();

  if (!compact) return "Provided by user.";

  if (compact.length <= maxLength) return compact;

  return `${compact.slice(0, maxLength - 1).trim()}…`;
}

function detectAttorneyInstruction(rawMaterials: string): boolean {
  const sections = parseRawSections(rawMaterials);

  return sections.some((section) => {
    const heading = normalizeText(section.heading);

    return (
      /attorney|instruction/.test(heading) && section.content.trim().length > 0
    );
  });
}

function findEquityLanguageHits(body: RequestBody): string[] {
  const haystack = normalizeText(
    [
      body.rawMaterials,
      body.currentDraft,
      body.dealTerms,
      body.primaryMatterType || "",
      getRiskFlags(body).join("\n"),
      body.matterTypes.join("\n"),
    ].join("\n")
  );

  const terms = [
    "membership interest",
    "membership interests",
    "membership certificate",
    "membership certificates",
    "certificates evidencing",
    "equity interest",
    "ownership interest",
    "member interest",
    "llc interest",
  ];

  return terms.filter((term) => termToRegex(term).test(haystack));
}

function buildStopConditions(args: {
  body: RequestBody;
  oldMatterHits: string[];
  unresolvedDealTerms: DealTermRow[];
  hasAttorneyInstruction: boolean;
  equityLanguageHits: string[];
}): StopCondition[] {
  const {
    body,
    oldMatterHits,
    unresolvedDealTerms,
    hasAttorneyInstruction,
    equityLanguageHits,
  } = args;

  const reviewerType = body.reviewerType || "Unknown";
  const reviewerIsAttorney = isAttorneyReviewer(reviewerType);

  const effectiveAttorneyApprovedForExternalDelivery =
    reviewerIsAttorney && body.attorneyApprovedForExternalDelivery;

  const attemptedNonAttorneyExternalApproval =
    !reviewerIsAttorney && body.attorneyApprovedForExternalDelivery;

  const equityIssueOpen =
    equityLanguageHits.length > 0 && !body.equityIssueRoutedToAttorney;

  return [
    {
      id: "S1",
      condition: "Old/excluded matter term appears in the current draft",
      status: oldMatterHits.length > 0 ? "OPEN" : "CLEARED",
      message:
        oldMatterHits.length > 0
          ? oldMatterHits.join(", ")
          : "No old/excluded matter terms found in current draft.",
    },
    {
      id: "S2",
      condition: "Source caption/title parties differ from body parties",
      status: body.captionBodyConsistencyChecked
        ? "CLEARED"
        : "HUMAN CONFIRMATION REQUIRED",
      message: body.captionBodyConsistencyChecked
        ? `Caption/body party consistency check confirmed by ${reviewerType} reviewer input.`
        : "Human confirmation required: evaluate whether any source caption/title parties differ from body parties.",
    },
    {
      id: "S3",
      condition:
        "Deal term provenance is unresolved, unconfirmed, inherited, unknown, or blank",
      status: unresolvedDealTerms.length > 0 ? "OPEN" : "CLEARED",
      message:
        unresolvedDealTerms.length > 0
          ? unresolvedDealTerms
              .map(
                (row) =>
                  `${row.term || "(blank term)"} (${
                    row.provenance || "blank"
                  })`
              )
              .join(", ")
          : "No unresolved deal-term provenance found.",
    },
    {
      id: "S4",
      condition: "Deadline status unresolved",
      status:
        !body.deadline && !body.deadlineIntentionallyBlank
          ? "OPEN"
          : "CLEARED",
      message:
        !body.deadline && !body.deadlineIntentionallyBlank
          ? "Deadline is blank and no responsible reviewer has confirmed that it should remain blank or not applicable."
          : body.deadline
          ? `Deadline supplied by ${reviewerType} reviewer input.`
          : `Blank/not-applicable deadline status confirmed by ${reviewerType} reviewer input.`,
    },
    {
      id: "S5",
      condition: "Party missing name, address, capacity, signer, or initials",
      status: "CLEARED",
      message:
        "Party Information table passed deterministic validation for required columns, non-empty cells, and non-placeholder required values.",
    },
    {
      id: "S6",
      condition: "No attorney instruction found in Raw Materials",
      status: hasAttorneyInstruction ? "CLEARED" : "OPEN",
      message: hasAttorneyInstruction
        ? "ATTORNEY INSTRUCTION section found."
        : "No ATTORNEY INSTRUCTION section found.",
    },
    {
      id: "S7",
      condition: "Draft not confirmed attorney-approved for external delivery",
      status: effectiveAttorneyApprovedForExternalDelivery ? "CLEARED" : "OPEN",
      message: effectiveAttorneyApprovedForExternalDelivery
        ? "Attorney-approved external delivery status confirmed by Attorney reviewer input."
        : attemptedNonAttorneyExternalApproval
        ? `External-delivery approval was checked by ${reviewerType} reviewer input and was not treated as attorney approval.`
        : "Draft not confirmed attorney-approved for external delivery.",
    },
    {
      id: "S8",
      condition: "Equity or membership-interest language appears",
      status: equityIssueOpen ? "OPEN" : "CLEARED",
      message:
        equityLanguageHits.length === 0
          ? "No equity or membership-interest language found."
          : body.equityIssueRoutedToAttorney
          ? `Equity/membership-interest language routed to attorney review by ${reviewerType} reviewer input: ${equityLanguageHits.join(
              ", "
            )}`
          : equityLanguageHits.join(", "),
    },
  ];
}

function makeRoute(args: {
  id: RouteId;
  route: string;
  owner: RouteOwner;
  priority: RoutePriority;
  reason: string;
  nextAction: string;
  triggeredBy: string[];
}): WorkflowRoute {
  return args;
}

function promotePriority(priority: RoutePriority): RoutePriority {
  if (priority === "Normal") return "High";
  if (priority === "High") return "Critical";
  return "Critical";
}

function applyUrgencyModifier(
  routes: WorkflowRoute[],
  body: RequestBody
): WorkflowRoute[] {
  if (!hasRiskFlag(body, "Urgent deadline")) return routes;

  return routes.map((route) => ({
    ...route,
    priority: promotePriority(route.priority),
    triggeredBy: [...route.triggeredBy, "riskFlag: Urgent deadline"],
  }));
}

function routeOrderIndex(id: RouteId): number {
  const index = ROUTE_ORDER.indexOf(id);
  return index === -1 ? ROUTE_ORDER.length : index;
}

function sortRoutes(routes: WorkflowRoute[]): WorkflowRoute[] {
  return [...routes].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

    if (priorityDiff !== 0) return priorityDiff;

    return routeOrderIndex(a.id) - routeOrderIndex(b.id);
  });
}

function sortAttorneyDecisionCards(
  cards: AttorneyDecisionCard[]
): AttorneyDecisionCard[] {
  return [...cards].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  );
}
function buildProfessionalWorkflowRoutes(args: {
  body: RequestBody;
  stopConditions: StopCondition[];
  unresolvedDealTerms: DealTermRow[];
  equityLanguageHits: string[];
}): WorkflowRoute[] {
  const { body, stopConditions, unresolvedDealTerms, equityLanguageHits } =
    args;
  const routes: WorkflowRoute[] = [];
  const packageType = normalizePackageType(body.packageType);

  if (stopStatus(stopConditions, "S1") === "OPEN") {
    routes.push(
      makeRoute({
        id: "R1_QUARANTINE_CLEANUP",
        route: "Draft quarantine / old-matter cleanup",
        owner: "Internal QA",
        priority: "Critical",
        reason: `Old/excluded matter residue was detected in the current draft: ${stopMessage(
          stopConditions,
          "S1"
        )}.`,
        nextAction:
          "Quarantine current draft, identify listed term locations, clean, and rerun safety gate before attorney review.",
        triggeredBy: ["S1 OPEN"],
      })
    );
  }

  if (
    packageType === "externalDelivery" &&
    stopStatus(stopConditions, "S7") === "OPEN"
  ) {
    routes.push(
      makeRoute({
        id: "R12_EXTERNAL_DELIVERY_CHECK",
        route: "External delivery approval check",
        owner: "Attorney",
        priority: "Critical",
        reason:
          "This package is in external delivery context and attorney approval is not confirmed.",
        nextAction:
          "Obtain attorney approval confirmation before any external delivery; no external response generated by Praxis.",
        triggeredBy: ["packageType: externalDelivery", "S7 OPEN"],
      })
    );
  }

  if (hasRiskFlag(body, "Missing party or address information")) {
    routes.push(
      makeRoute({
        id: "R10_MISSING_PARTY_FOLLOWUP",
        route: "Missing party information follow-up",
        owner: "Client Follow-Up",
        priority: "High",
        reason:
          "The matter profile indicates missing party or address information.",
        nextAction:
          "Request missing party details from client; log follow-up date; bracket affected sections until received.",
        triggeredBy: ["riskFlag: Missing party or address information"],
      })
    );
  }

  if (stopStatus(stopConditions, "S3") === "OPEN") {
    routes.push(
      makeRoute({
        id: "R4_DEAL_TERM_CONFIRMATION",
        route: "Deal-term provenance confirmation",
        owner: "Attorney",
        priority: "High",
        reason: `One or more deal terms have unresolved provenance: ${unresolvedDealTerms
          .map((row) => `${row.term} (${row.provenance || "blank"})`)
          .join(", ")}.`,
        nextAction:
          "Route unresolved terms for attorney review; confirm with responsible owner; update provenance and rerun safety gate.",
        triggeredBy: ["S3 OPEN"],
      })
    );
  }

  if (stopStatus(stopConditions, "S4") === "OPEN") {
    routes.push(
      makeRoute({
        id: "R5_DEADLINE_RESOLUTION",
        route: "Deadline resolution",
        owner: "Paralegal",
        priority: "High",
        reason:
          "Deadline is blank and blank/not-applicable status is not confirmed.",
        nextAction:
          "Confirm deadline with responsible owner, or confirm blank/not-applicable status; rerun safety gate.",
        triggeredBy: ["S4 OPEN"],
      })
    );
  }

  if (stopStatus(stopConditions, "S8") === "OPEN") {
    routes.push(
      makeRoute({
        id: "R7_EQUITY_ROUTING",
        route: "Equity/membership issue routing",
        owner: "Attorney",
        priority: "High",
        reason: `Equity or membership-interest language was detected: ${equityLanguageHits.join(
          ", "
        )}.`,
        nextAction:
          "Route detected language for attorney review: return-of-property language, ownership-interest language, or outside NDA workflow.",
        triggeredBy: ["S8 OPEN"],
      })
    );
  }

  if (stopStatus(stopConditions, "S2") === "HUMAN CONFIRMATION REQUIRED") {
    routes.push(
      makeRoute({
        id: "R3_CAPTION_BODY_CHECK",
        route: "Caption/body consistency check",
        owner: "Paralegal",
        priority: "High",
        reason:
          "Caption/title party consistency with body parties has not been confirmed.",
        nextAction:
          "Run caption/title vs. body party comparison; check control when confirmed; rerun safety gate.",
        triggeredBy: ["S2 HUMAN CONFIRMATION REQUIRED"],
      })
    );
  }

  if (stopStatus(stopConditions, "S6") === "OPEN") {
    routes.push(
      makeRoute({
        id: "R6_ATTORNEY_INSTRUCTION_CAPTURE",
        route: "Attorney instruction capture",
        owner: "Paralegal",
        priority: "Normal",
        reason:
          "No ATTORNEY INSTRUCTION section was found in the raw materials.",
        nextAction:
          "Obtain and paste the attorney instruction into Raw Materials so the assumed objective is replaced by a documented one.",
        triggeredBy: ["S6 OPEN"],
      })
    );
  }

  if (hasRiskFlag(body, "Restrictive covenant / non-compete")) {
    routes.push(
      makeRoute({
        id: "R8_RESTRICTIVE_COVENANT_REVIEW",
        route: "Restrictive covenant / non-compete issue list",
        owner: "Attorney",
        priority: "Normal",
        reason:
          "The matter profile includes restrictive covenant or non-compete risk.",
        nextAction:
          "Prepare issue list for restrictive covenant terms; route for attorney review.",
        triggeredBy: ["riskFlag: Restrictive covenant / non-compete"],
      })
    );
  }

  if (hasRiskFlag(body, "Multiple individual signers")) {
    routes.push(
      makeRoute({
        id: "R9_MULTI_SIGNER_EXECUTION",
        route: "Multi-signer execution formatting",
        owner: "Paralegal",
        priority: "Normal",
        reason: "The matter profile includes multiple individual signers.",
        nextAction:
          "Reconcile signature blocks, per-page initials, and capacity language against the party table.",
        triggeredBy: ["riskFlag: Multiple individual signers"],
      })
    );
  }

  if (routes.length === 0) {
    const readyRouteByPackage: Record<
      PackageType,
      {
        route: string;
        reason: string;
        nextAction: string;
      }
    > = {
      firstPass: {
        route: "First-pass scan complete",
        reason:
          "No open deterministic route triggers were detected in the first-pass issue scan.",
        nextAction:
          "Prepare attorney-review package or proceed to the next internal workflow step; no external response generated by Praxis.",
      },
      reviewPackage: {
        route: "Attorney-review package ready",
        reason:
          "No open deterministic route triggers were detected for the attorney-review package.",
        nextAction:
          "Attorney reviews package; no external response generated by Praxis.",
      },
      externalDelivery: {
        route: "External-delivery check ready",
        reason:
          "No open deterministic route triggers were detected for the external-delivery check.",
        nextAction:
          "Confirm final attorney-controlled delivery process outside Praxis; no external response generated by Praxis.",
      },
    };

    const readyRoute = readyRouteByPackage[packageType];

    routes.push(
      makeRoute({
        id: "R0_READY_FOR_ATTORNEY_REVIEW",
        route: readyRoute.route,
        owner: "Attorney",
        priority: "Normal",
        reason: readyRoute.reason,
        nextAction: readyRoute.nextAction,
        triggeredBy: [
          "No workflow route triggers",
          `packageType: ${packageType}`,
        ],
      })
    );
  }

  return sortRoutes(applyUrgencyModifier(routes, body));
}

function deriveReadiness(
  routes: WorkflowRoute[],
  packageType: PackageType
): PackageReadiness {
  if (packageType === "externalDelivery") {
    return "EXTERNAL_DELIVERY_CHECK_REQUIRED";
  }

  if (routes.some((route) => route.id === "R1_QUARANTINE_CLEANUP")) {
    return "CLEANUP_REQUIRED";
  }

  if (
    routes.some((route) =>
      [
        "R3_CAPTION_BODY_CHECK",
        "R5_DEADLINE_RESOLUTION",
        "R6_ATTORNEY_INSTRUCTION_CAPTURE",
        "R9_MULTI_SIGNER_EXECUTION",
        "R10_MISSING_PARTY_FOLLOWUP",
      ].includes(route.id)
    )
  ) {
    return "CONFIRMATIONS_PENDING";
  }

  if (
    routes.some((route) =>
      [
        "R4_DEAL_TERM_CONFIRMATION",
        "R7_EQUITY_ROUTING",
        "R8_RESTRICTIVE_COVENANT_REVIEW",
      ].includes(route.id)
    )
  ) {
    return "ATTORNEY_ISSUE_LIST_READY";
  }

  return "ATTORNEY_REVIEW_PACKAGE_READY";
}

function buildWorkflowRoutePlan(args: {
  body: RequestBody;
  stopConditions: StopCondition[];
  unresolvedDealTerms: DealTermRow[];
  equityLanguageHits: string[];
}): WorkflowRoutePlan {
  const packageContext = normalizePackageType(args.body.packageType);
  const routes = buildProfessionalWorkflowRoutes(args);
  const [primary, ...secondary] = routes;

  return {
    primary,
    secondary,
    readiness: deriveReadiness(routes, packageContext),
    packageContext,
  };
}

function buildDraftResponse(
  stopConditions: StopCondition[],
  packageType: PackageType
): string {
  const doNotSendStops = stopConditions.filter((stop) => {
    if (stop.status !== "OPEN") return false;
    if (stop.id === "S1") return true;
    if (stop.id === "S7") return isExternalDeliveryContext(packageType);
    return false;
  });

  if (doNotSendStops.length === 0) {
    return "Not produced — external response generation is disabled in this workflow.";
  }

  const reason = doNotSendStops
    .map((stop) => `${stop.id} ${stop.message}`)
    .join("; ");

  return `Not produced — ${reason}`;
}

function buildExecutiveStatus(
  stopConditions: StopCondition[],
  packageType: PackageType
): ExecutiveStatus {
  const s1Open = stopConditions.some(
    (stop) => stop.id === "S1" && stop.status === "OPEN"
  );

  const s7ExternalDeliveryOpen =
    isExternalDeliveryContext(packageType) &&
    stopConditions.some(
      (stop) => stop.id === "S7" && stop.status === "OPEN"
    );

  if (s1Open) {
    return {
      status: "Do Not Send",
      reason:
        "Old-matter residue was detected in the current draft. Quarantine and cleanup are required before attorney review or external delivery.",
    };
  }

  if (s7ExternalDeliveryOpen) {
    return {
      status: "Do Not Send",
      reason:
        "External-delivery approval has not been confirmed. Do not use the draft externally until attorney approval is recorded.",
    };
  }

  const reviewRequired = stopConditions.some((stop) => {
    if (
      stop.status !== "OPEN" &&
      stop.status !== "HUMAN CONFIRMATION REQUIRED"
    ) {
      return false;
    }

    if (stop.id === "S7" && !isExternalDeliveryContext(packageType)) {
      return false;
    }

    return true;
  });

  if (reviewRequired && packageType === "firstPass") {
    return {
      status: "Attorney Review Required",
      reason:
        "First-pass issue scan found open or human-confirmation-required workflow items. Triage the routes before drafting or delivery.",
    };
  }

  if (reviewRequired && packageType === "reviewPackage") {
    return {
      status: "Attorney Review Required",
      reason:
        "Attorney-review package has open workflow items that should be resolved or routed before review completion.",
    };
  }

  if (reviewRequired && packageType === "externalDelivery") {
    return {
      status: "Attorney Review Required",
      reason:
        "External-delivery check found open workflow items. Resolve or route these items before external delivery.",
    };
  }

  if (packageType === "firstPass") {
    return {
      status: "Ready for Attorney Review",
      reason:
        "First-pass scan found no open deterministic blocks; an attorney-review package may be prepared.",
    };
  }

  if (packageType === "reviewPackage") {
    return {
      status: "Ready for Attorney Review",
      reason:
        "Attorney-review package is assembled. External delivery remains disabled in this workflow.",
    };
  }

  return {
    status: "Ready for Attorney Review",
    reason:
      "External-delivery check has no open deterministic blocks. Praxis still does not generate an external response.",
  };
}

function buildCriticalBlocks(
  stopConditions: StopCondition[],
  packageType: PackageType
): CriticalBlock[] {
  const blocks: CriticalBlock[] = [];

  stopConditions.forEach((stop) => {
    if (stop.status !== "OPEN") return;

    if (stop.id === "S1") {
      blocks.push({
        id: "S1",
        issue: `Old-matter residue in current draft: ${stop.message}`,
        impact: "Do Not Send.",
        owner: "Internal cleanup and attorney review before external use.",
      });
    }

    if (stop.id === "S7" && isExternalDeliveryContext(packageType)) {
      blocks.push({
        id: "S7",
        issue: "Draft is not confirmed attorney-approved for external delivery.",
        impact: "Do Not Send.",
        owner: "Attorney approval required before any external delivery.",
      });
    }
  });

  return blocks;
}

function partyRows(partyInfo: string): string[][] {
  return splitLines(partyInfo)
    .filter((line) => !/^name\s*\|/i.test(line))
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts[0]);
}

function partyNamesByType(
  partyInfo: string,
  predicate: (value: string) => boolean
): string[] {
  return partyRows(partyInfo)
    .filter((parts) => predicate(parts[1] || ""))
    .map((parts) => parts[0])
    .filter(Boolean);
}

function buildMatterSnapshot(body: RequestBody): MatterSnapshot {
  return {
    currentEntities: partyNamesByType(body.partyInfo, isEntityType),
    currentIndividuals: partyNamesByType(body.partyInfo, isIndividualType),
    selectedWorkflows: getSelectedWorkflows(body),
    dealTerms: parseDealTerms(body.dealTerms),
  };
}

function buildConfirmationNeeded(args: {
  stopConditions: StopCondition[];
  unresolvedDealTerms: DealTermRow[];
  equityLanguageHits: string[];
}): ConfirmationItem[] {
  const { stopConditions, unresolvedDealTerms, equityLanguageHits } = args;
  const items: ConfirmationItem[] = [];

  const s2 = stopConditions.find((stop) => stop.id === "S2");
  const s4 = stopConditions.find((stop) => stop.id === "S4");
  const s8 = stopConditions.find((stop) => stop.id === "S8");

  if (s4?.status === "OPEN") {
    items.push({
      item: "Deadline",
      owner: "Client Follow-Up",
      source: "S4 OPEN",
    });
  }

  if (s2?.status === "HUMAN CONFIRMATION REQUIRED") {
    items.push({
      item: "Caption/body party consistency",
      owner: "Internal Cross-Check",
      source: "S2 HUMAN CONFIRMATION REQUIRED",
    });
  }

  unresolvedDealTerms.forEach((row) => {
    items.push({
      item: `${row.term} provenance`,
      owner: "Attorney Review",
      source: `S3 OPEN — ${row.provenance || "blank"}`,
    });
  });

  if (s8?.status === "OPEN" && equityLanguageHits.length > 0) {
    items.push({
      item: "Equity or membership-interest language",
      owner: "Attorney Review",
      source: `S8 OPEN — ${equityLanguageHits.join(", ")}`,
    });
  }

  return items;
}

function buildAttorneyDecisionCards(args: {
  stopConditions: StopCondition[];
  unresolvedDealTerms: DealTermRow[];
  equityLanguageHits: string[];
  packageType: PackageType;
}): AttorneyDecisionCard[] {
  const { stopConditions, unresolvedDealTerms, equityLanguageHits, packageType } =
    args;
  const cards: AttorneyDecisionCard[] = [];

  const s1Open = stopConditions.some(
    (stop) => stop.id === "S1" && stop.status === "OPEN"
  );

  const s2NeedsConfirmation = stopConditions.some(
    (stop) =>
      stop.id === "S2" && stop.status === "HUMAN CONFIRMATION REQUIRED"
  );

  const s4Open = stopConditions.some(
    (stop) => stop.id === "S4" && stop.status === "OPEN"
  );

  const s6Open = stopConditions.some(
    (stop) => stop.id === "S6" && stop.status === "OPEN"
  );

const s7Open =
  isExternalDeliveryContext(packageType) &&
  stopConditions.some(
    (stop) => stop.id === "S7" && stop.status === "OPEN"
  );

  const s8Open = stopConditions.some(
    (stop) => stop.id === "S8" && stop.status === "OPEN"
  );

  if (s1Open) {
    cards.push({
      issue: "Old-matter residue in current draft",
      priority: "Critical",
      constraint:
        "Old or excluded matter terms detected in the current draft cannot be treated as safe for attorney review or external delivery until removed and rerun.",
      evidence: `S1 OPEN — ${stopMessage(stopConditions, "S1")}`,
      application:
        "The current draft should be quarantined because it may contain residue from a prior matter.",
      praxisDidNotDecide:
        "Praxis did not decide whether the residue is legally material, harmless, or acceptable.",
      attorneyDecisionNeeded:
        "Confirm whether cleanup is complete after the listed terms are removed or otherwise addressed.",
      safeNextStep:
        "Quarantine the draft, clean the listed terms, and rerun the safety gate before attorney review or external use.",
      routing: "Attorney Review",
    });
  }

  if (s2NeedsConfirmation) {
    cards.push({
      issue: "Caption/body party consistency not confirmed",
      priority: "High",
      constraint:
        "Caption or title party consistency must be confirmed by human review before Praxis treats the party structure as checked.",
      evidence: "S2 HUMAN CONFIRMATION REQUIRED — caption/body consistency has not been confirmed.",
      application:
        "The party table may be structurally valid, but Praxis cannot infer that source captions, titles, and body parties match.",
      praxisDidNotDecide:
        "Praxis did not decide whether the caption/title parties actually match the body parties.",
      attorneyDecisionNeeded:
        "Confirm whether the caption/title parties match the body parties or require correction.",
      safeNextStep:
        "Run a caption/title versus body-party check, record the result, and rerun the memo.",
      routing: "Human Confirmation Required",
    });
  }

  if (s4Open) {
    cards.push({
      issue: "Deadline handling",
      priority: "High",
      constraint:
        "A blank deadline cannot be treated as intentionally blank or not applicable unless a responsible reviewer confirms that status.",
      evidence:
        "S4 OPEN — Deadline is blank and no responsible reviewer has confirmed that it should remain blank or not applicable.",
      application:
        "Praxis cannot distinguish between an intentionally blank deadline and a missing deadline from the current input alone.",
      praxisDidNotDecide:
        "Praxis did not decide whether a deadline is legally or commercially required.",
      attorneyDecisionNeeded:
        "Confirm whether the deadline should be supplied, held pending follow-up, or marked blank/not applicable.",
      safeNextStep:
        "Obtain deadline direction or mark blank/not-applicable only after responsible reviewer confirmation.",
      routing: "Human Confirmation Required",
    });
  }

  unresolvedDealTerms.forEach((row) => {
    cards.push({
      issue: `Deal-term provenance: ${row.term || "(blank term)"}`,
      priority: "High",
      constraint:
        "Inherited, unknown, blank, or otherwise unresolved deal terms cannot be treated as confirmed drafting inputs.",
      evidence: `${row.term || "(blank term)"} = ${
        row.value || "(blank value)"
      }; Provenance = ${row.provenance || "blank"}.`,
      application:
        "The term is present in the structured deal table, but its provenance does not establish that it is confirmed for use.",
      praxisDidNotDecide:
        "Praxis did not decide enforceability, business reasonableness, or whether the term should be included.",
      attorneyDecisionNeeded:
        "Decide whether to include as stated, revise, remove, or request confirmation.",
      safeNextStep:
        "Hold this term in the attorney-review queue and do not use it as confirmed external-draft language until direction is recorded.",
      routing: "Attorney Review",
    });
  });

  if (s6Open) {
    cards.push({
      issue: "Attorney instruction missing",
      priority: "Normal",
      constraint:
        "Praxis should not treat the objective of the matter as documented unless an ATTORNEY INSTRUCTION section is present.",
      evidence: "S6 OPEN — No ATTORNEY INSTRUCTION section found.",
      application:
        "The memo can identify routing issues, but the intended drafting objective is not documented in the expected source section.",
      praxisDidNotDecide:
        "Praxis did not infer attorney intent from surrounding materials.",
      attorneyDecisionNeeded:
        "Confirm or provide the attorney instruction that should govern the review package.",
      safeNextStep:
        "Add an ATTORNEY INSTRUCTION section and rerun the memo.",
      routing: "Human Confirmation Required",
    });
  }

  if (s7Open) {
    cards.push({
      issue: "External-delivery approval not confirmed",
      priority: "Critical",
      constraint:
        "External delivery cannot be treated as attorney-approved unless Reviewer Type is Attorney and the attorney approval control is checked.",
      evidence: `S7 OPEN — ${stopMessage(stopConditions, "S7")}`,
      application:
        "The draft may be internally reviewable, but it is not cleared for external delivery.",
      praxisDidNotDecide:
        "Praxis did not decide whether the draft is legally correct, complete, or ready to send.",
      attorneyDecisionNeeded:
        "Confirm whether an attorney has approved this exact draft for external delivery.",
      safeNextStep:
        "Do not send externally until attorney approval is recorded by an Attorney reviewer.",
      routing: "Attorney Review",
    });
  }

  if (s8Open && equityLanguageHits.length > 0) {
    cards.push({
      issue: "Equity or membership-interest-adjacent language",
      priority: "High",
      constraint:
        "Equity, membership-interest, or ownership-interest-adjacent language may fall outside a standard NDA-only preparation workflow and must be routed before use.",
      evidence: equityLanguageHits.join(", "),
      application:
        "The detected language should not be silently treated as ordinary NDA language.",
      praxisDidNotDecide:
        "Praxis did not decide whether the language creates, transfers, waives, or affects any ownership interest.",
      attorneyDecisionNeeded:
        "Decide whether this is ordinary return-of-property language, needs revision, or should be routed outside the standard NDA workflow.",
      safeNextStep:
        "Hold the language for attorney review and do not use it as confirmed drafting language until routed.",
      routing: "Attorney Review",
    });
  }

  return sortAttorneyDecisionCards(cards);
}

function buildParalegalWorkQueue(args: {
  stopConditions: StopCondition[];
  oldMatterHits: string[];
  unresolvedDealTerms: DealTermRow[];
  packageType: PackageType;
}): ParalegalWorkItem[] {
  const { stopConditions, oldMatterHits, unresolvedDealTerms, packageType } =
    args;
  const items: ParalegalWorkItem[] = [];

  const s1Open = stopConditions.some(
    (stop) => stop.id === "S1" && stop.status === "OPEN"
  );
  const s7Open =
    isExternalDeliveryContext(packageType) &&
    stopConditions.some(
      (stop) => stop.id === "S7" && stop.status === "OPEN"
    );
  const s2NeedsCheck = stopConditions.some(
    (stop) =>
      stop.id === "S2" && stop.status === "HUMAN CONFIRMATION REQUIRED"
  );
  const s4Open = stopConditions.some(
    (stop) => stop.id === "S4" && stop.status === "OPEN"
  );

  if (s1Open) {
    items.push({
      task: `Quarantine the current draft and identify old/excluded term locations: ${oldMatterHits.join(
        ", "
      )}.`,
      owner: "Internal QA",
      priority: "Critical",
    });
  }

  if (s7Open) {
    items.push({
      task: "Confirm attorney-approved draft status before any external delivery.",
      owner: "Attorney",
      priority: "Critical",
    });
  }

  if (s2NeedsCheck) {
    items.push({
      task: "Run caption/title versus body party consistency check.",
      owner: "Paralegal",
      priority: "High",
    });
  }

  if (s4Open) {
    items.push({
      task: "Confirm deadline status with the appropriate owner before external delivery.",
      owner: "Paralegal",
      priority: "High",
    });
  }

  if (unresolvedDealTerms.length > 0) {
    items.push({
      task: `Prepare unresolved deal-term provenance list for attorney review: ${unresolvedDealTerms
        .map((row) => `${row.term} (${row.provenance || "blank"})`)
        .join(", ")}.`,
      owner: "Paralegal",
      priority: "High",
    });
  }

  return items;
}
function buildWatchlistSummary(
  oldMatterTerms: string[],
  oldMatterHits: string[]
): WatchlistSummary {
  return {
    totalChecked: oldMatterTerms.length,
    detected: oldMatterHits,
    clearCount: Math.max(oldMatterTerms.length - oldMatterHits.length, 0),
  };
}

function buildDefaultSourceDocuments(
  body: RequestBody,
  oldMatterHits: string[]
): SourceDocument[] {
  const docs: SourceDocument[] = [];

  parseRawSections(body.rawMaterials).forEach((section) => {
    docs.push({
      document: sectionDocumentName(section.heading),
      internalDate: "",
      label: sectionLabel(section.heading),
      evidence: excerpt(section.content),
    });
  });

  if (docs.length === 0 && body.rawMaterials.trim()) {
    docs.push({
      document: "Raw Materials",
      internalDate: "",
      label: "REFERENCE",
      evidence: "Provided by user.",
    });
  }

  if (body.dealTerms.trim()) {
    docs.push({
      document: "Deal Terms",
      internalDate: "",
      label: "REFERENCE",
      evidence: "Provided by user.",
    });
  }

  if (body.currentDraft.trim()) {
    docs.push({
      document: "Current Draft",
      internalDate: "",
      label: oldMatterHits.length > 0 ? "QUARANTINED" : "UNKNOWN",
      evidence:
        oldMatterHits.length > 0
          ? "Contains old/excluded matter residue."
          : "Provided by user.",
    });
  }

  return dedupeSourceDocuments(docs).slice(0, 8);
}

function dedupeSourceDocuments(docs: SourceDocument[]): SourceDocument[] {
  const seen = new Set<string>();

  return docs.filter((doc) => {
    const key = normalizeText(`${doc.document} ${doc.label} ${doc.evidence}`);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function buildMatterTitle(body: RequestBody): string {
  const primaryMatterType = getPrimaryMatterType(body);

  if (primaryMatterType) return primaryMatterType;

  if (body.matterTypes.includes("Mutual release + NDA")) {
    return "Mutual release + NDA";
  }

  return body.matterTypes[0] || "Attorney Review";
}

function buildEscalationMemo(args: {
  body: RequestBody;
  stopConditions: StopCondition[];
  oldMatterHits: string[];
  oldMatterTerms: string[];
  unresolvedDealTerms: DealTermRow[];
  equityLanguageHits: string[];
}): EscalationMemoOutput {
  const {
    body,
    stopConditions,
    oldMatterHits,
    oldMatterTerms,
    unresolvedDealTerms,
    equityLanguageHits,
  } = args;

  const packageType = normalizePackageType(body.packageType);
  const sourceDocuments = buildDefaultSourceDocuments(body, oldMatterHits);

  return {
    matterTitle: buildMatterTitle(body),
    executiveStatus: buildExecutiveStatus(stopConditions, packageType),
    criticalBlocks: buildCriticalBlocks(stopConditions, packageType),
    matterSnapshot: buildMatterSnapshot(body),
    workflowRoutePlan: buildWorkflowRoutePlan({
      body,
      stopConditions,
      unresolvedDealTerms,
      equityLanguageHits,
    }),
    confirmationNeeded: buildConfirmationNeeded({
      stopConditions,
      unresolvedDealTerms,
      equityLanguageHits,
    }),
attorneyDecisionCards: buildAttorneyDecisionCards({
  stopConditions,
  unresolvedDealTerms,
  equityLanguageHits,
  packageType,
}),
    paralegalWorkQueue: buildParalegalWorkQueue({
      stopConditions,
      oldMatterHits,
      unresolvedDealTerms,
      packageType,
    }),
    watchlistSummary: buildWatchlistSummary(oldMatterTerms, oldMatterHits),
    draftResponse: buildDraftResponse(stopConditions, packageType),
    processNotes: body.processNotes,
    sourceDocuments,
    internalStopConditions: stopConditions,
  };
}

function escapeTable(value: string): string {
  return (value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function renderExecutiveStatus(status: ExecutiveStatus): string[] {
  return [
    `**Status:** ${status.status}`,
    ``,
    `**Reason:** ${status.reason}`,
  ];
}

function renderCriticalBlocks(blocks: CriticalBlock[]): string[] {
  if (blocks.length === 0) return ["- None."];

  return blocks.flatMap((block) => [
    `- **${block.id} — ${block.issue}**`,
    `  - Impact: ${block.impact}`,
    `  - Owner: ${block.owner}`,
  ]);
}

function renderMatterSnapshot(snapshot: MatterSnapshot): string[] {
  const lines: string[] = [];

  lines.push(
    `- Current entity parties: ${
      snapshot.currentEntities.length
        ? snapshot.currentEntities.join("; ")
        : "None identified."
    }`
  );

  lines.push(
    `- Current individual parties/signers: ${
      snapshot.currentIndividuals.length
        ? snapshot.currentIndividuals.join("; ")
        : "None identified."
    }`
  );

  lines.push(
    `- Selected workflows: ${
      snapshot.selectedWorkflows.length
        ? snapshot.selectedWorkflows.join("; ")
        : "None selected."
    }`
  );

  if (snapshot.dealTerms.length > 0) {
    snapshot.dealTerms.forEach((row) => {
      lines.push(
        `- Deal term: ${row.term || "(blank term)"} = ${
          row.value || "(blank value)"
        }; Provenance = ${row.provenance || "blank"}`
      );
    });
  } else {
    lines.push("- Deal terms: None identified.");
  }

  return lines;
}

function renderWorkflowRoute(route: WorkflowRoute): string[] {
  return [
    `- **[${route.priority}] ${route.route}** — Owner: ${route.owner}`,
    `  - Reason: ${route.reason}`,
    `  - Next action: ${route.nextAction}`,
    `  - Triggered by: ${route.triggeredBy.join("; ")}`,
  ];
}

function renderProfessionalWorkflowRoutes(plan: WorkflowRoutePlan): string[] {
  const lines: string[] = [
    `**Readiness:** ${plan.readiness}`,
    ``,
    `**Package context:** ${plan.packageContext}`,
    ``,
    `**Primary Route**`,
    ...renderWorkflowRoute(plan.primary),
    ``,
    `**Secondary Routes**`,
  ];

  if (plan.secondary.length === 0) {
    lines.push("- None.");
  } else {
    plan.secondary.forEach((route) => {
      lines.push(...renderWorkflowRoute(route));
    });
  }

  return lines;
}

function renderConfirmationNeeded(items: ConfirmationItem[]): string[] {
  if (items.length === 0) return ["- None."];

  return items.map(
    (item) => `- ${item.item} — ${item.owner} — ${item.source}`
  );
}

function renderAttorneyDecisionCards(cards: AttorneyDecisionCard[]): string[] {
  if (cards.length === 0) return ["1. None."];

  return cards.flatMap((card, index) => [
    `${index + 1}. **[${card.priority}] ${card.issue}**`,
    `   - Issue: ${card.issue}`,
    `   - Constraint: ${card.constraint}`,
    `   - Evidence: ${card.evidence}`,
    `   - Application: ${card.application}`,
    `   - Praxis did not decide: ${card.praxisDidNotDecide}`,
    `   - Attorney decision needed: ${card.attorneyDecisionNeeded}`,
    `   - Safe next step: ${card.safeNextStep}`,
    `   - Routing: ${card.routing}`,
  ]);
}

function renderParalegalWorkQueue(items: ParalegalWorkItem[]): string[] {
  if (items.length === 0) return ["- None."];

  return items.map(
    (item) => `- [${item.priority}] ${item.task} — Owner: ${item.owner}`
  );
}

function renderWatchlistSummary(summary: WatchlistSummary): string[] {
  return [
    `- Old/excluded terms checked: ${summary.totalChecked}`,
    `- Detected in current draft: ${
      summary.detected.length ? summary.detected.join(", ") : "None"
    }`,
    `- Clear: ${summary.clearCount}`,
  ];
}

function renderHumanProcessNotes(processNotes: string): string[] {
  const notes = processNotes.trim();

  if (!notes) return ["- None."];

  return notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`);
}

function renderSourceDocuments(docs: SourceDocument[]): string[] {
  if (docs.length === 0) return ["- None."];

  return [
    `| Document | Internal date | Label | Evidence |`,
    `|---|---|---|---|`,
    ...docs.map(
      (doc) =>
        `| ${escapeTable(doc.document)} | ${escapeTable(
          doc.internalDate || "(blank)"
        )} | ${escapeTable(doc.label)} | ${escapeTable(doc.evidence)} |`
    ),
  ];
}

function renderStopConditions(stops: StopCondition[]): string[] {
  return stops.map(
    (stop) =>
      `- ${stop.id} ${stop.condition} — ${stop.status} — ${stop.message}`
  );
}

function renderEscalationMemo(memo: EscalationMemoOutput): string {
  return [
    `# Praxis Attorney Escalation Memo — ${memo.matterTitle}`,
    ``,
    `## 1. Executive Status`,
    ...renderExecutiveStatus(memo.executiveStatus),
    ``,
    `## 2. Critical Blocks`,
    ...renderCriticalBlocks(memo.criticalBlocks),
    ``,
    `## 3. Matter Snapshot`,
    ...renderMatterSnapshot(memo.matterSnapshot),
    ``,
    `## 4. Professional Workflow Route`,
    ...renderProfessionalWorkflowRoutes(memo.workflowRoutePlan),
    ``,
    `## 5. Confirmation Needed`,
    ...renderConfirmationNeeded(memo.confirmationNeeded),
    ``,
    `## 6. Attorney Decision Brief`,
    ...renderAttorneyDecisionCards(memo.attorneyDecisionCards),
    ``,
    `## 7. Paralegal Work Queue`,
    ...renderParalegalWorkQueue(memo.paralegalWorkQueue),
    ``,
    `## 8. Watchlist Summary`,
    ...renderWatchlistSummary(memo.watchlistSummary),
    ``,
    `## 9. Draft Response`,
    memo.draftResponse,
    ``,
    `## 10. Human Process Notes`,
    ...renderHumanProcessNotes(memo.processNotes),
    ``,
    `## Appendix A. Source Documents`,
    ...renderSourceDocuments(memo.sourceDocuments),
    ``,
    `## Appendix B. Internal Stop Conditions`,
    ...renderStopConditions(memo.internalStopConditions),
  ].join("\n");
}

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  body.matterTypes = Array.isArray(body.matterTypes) ? body.matterTypes : [];
  body.riskFlags = Array.isArray(body.riskFlags) ? body.riskFlags : [];
  body.packageType = normalizePackageType(body.packageType);

  body.primaryMatterType =
    typeof body.primaryMatterType === "string" ? body.primaryMatterType : "";

  const missing: string[] = [];

  if (!body.primaryMatterType && body.matterTypes.length === 0) {
    missing.push("primaryMatterType or matterTypes");
  }

  if (!body.rawMaterials || !body.rawMaterials.trim()) {
    missing.push("rawMaterials");
  }

  if (!body.partyInfo || !body.partyInfo.trim()) {
    missing.push("partyInfo");
  }

  if (!body.dealTerms || !body.dealTerms.trim()) {
    missing.push("dealTerms");
  }

  if (!body.oldMatterTerms || !body.oldMatterTerms.trim()) {
    missing.push("oldMatterTerms");
  }

  if (!body.reviewerType || !body.reviewerType.trim()) {
    missing.push("reviewerType");
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  body.rawMaterials =
    typeof body.rawMaterials === "string" ? body.rawMaterials : "";

  body.currentDraft =
    typeof body.currentDraft === "string" ? body.currentDraft : "";

  body.processNotes =
    typeof body.processNotes === "string" ? body.processNotes : "";

  body.oldMatterTerms =
    typeof body.oldMatterTerms === "string" ? body.oldMatterTerms : "";

  body.partyInfo = typeof body.partyInfo === "string" ? body.partyInfo : "";

  body.dealTerms = typeof body.dealTerms === "string" ? body.dealTerms : "";

  body.deadline = typeof body.deadline === "string" ? body.deadline : "";

  body.deadlineIntentionallyBlank = Boolean(body.deadlineIntentionallyBlank);

  body.attorneyApprovedForExternalDelivery = Boolean(
    body.attorneyApprovedForExternalDelivery
  );

  body.captionBodyConsistencyChecked = Boolean(
    body.captionBodyConsistencyChecked
  );

  body.equityIssueRoutedToAttorney = Boolean(
    body.equityIssueRoutedToAttorney
  );

  const validationIssues = validateStructuredInputs(body);

  if (validationIssues.length > 0) {
    return NextResponse.json(
      {
        error: "Input validation failed.",
        issues: validationIssues,
      },
      { status: 400 }
    );
  }

  const oldMatterHits = findOldMatterHits(
    body.currentDraft,
    body.oldMatterTerms
  );

  const oldMatterTerms = splitLines(body.oldMatterTerms);

  const unresolvedDealTerms = findUnresolvedDealTerms(body.dealTerms);

  const hasAttorneyInstruction = detectAttorneyInstruction(body.rawMaterials);

  const equityLanguageHits = findEquityLanguageHits(body);

  const stopConditions = buildStopConditions({
    body,
    oldMatterHits,
    unresolvedDealTerms,
    hasAttorneyInstruction,
    equityLanguageHits,
  });

  const memo = buildEscalationMemo({
    body,
    stopConditions,
    oldMatterHits,
    oldMatterTerms,
    unresolvedDealTerms,
    equityLanguageHits,
  });

  const output = renderEscalationMemo(memo);

  return NextResponse.json({ output });
}
