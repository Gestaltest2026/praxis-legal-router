import { NextResponse } from "next/server";

type RequestBody = {
  mode: string;
  matterTypes: string[];
  rawMaterials: string;
  currentDraft: string;
  processNotes: string;
  oldMatterTerms: string;
  partyInfo: string;
  dealTerms: string;
  deadline: string;
  deadlineIntentionallyBlank: boolean;
  reviewerType: string;
};

type DealTermRow = {
  term: string;
  value: string;
  provenance: string;
  raw: string;
};

type StopStatus = "OPEN" | "CLEARED" | "MODEL CHECK REQUIRED";

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
  whyItMatters: string;
  decisionNeeded: string;
  evidence: string;
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
  confirmationNeeded: ConfirmationItem[];
  attorneyDecisionCards: AttorneyDecisionCard[];
  paralegalWorkQueue: ParalegalWorkItem[];
  watchlistSummary: WatchlistSummary;
  draftResponse: string;
  sourceDocuments: SourceDocument[];
  internalStopConditions: StopCondition[];
};

type RawSection = {
  heading: string;
  content: string;
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

function isUnresolvedProvenance(provenance: string): boolean {
  const value = normalizeText(provenance);

  if (!value) return true;

  return [
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
  ].includes(value);
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
        index + 1 < matches.length ? matches[index + 1].index || text.length : text.length;
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
    return /attorney|instruction/.test(heading) && section.content.trim().length > 0;
  });
}

function findEquityLanguageHits(body: RequestBody): string[] {
  const haystack = normalizeText(
    [
      body.rawMaterials,
      body.currentDraft,
      body.dealTerms,
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
      status: "MODEL CHECK REQUIRED",
      message:
        "Evaluate whether any source caption/title parties differ from body parties.",
    },
    {
      id: "S3",
      condition:
        "Deal term provenance is Unknown, Inherited, blank, or unresolved",
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
      condition: "Deadline empty and not marked intentionally blank",
      status:
        !body.deadline && !body.deadlineIntentionallyBlank
          ? "OPEN"
          : "CLEARED",
      message:
        !body.deadline && !body.deadlineIntentionallyBlank
          ? "Deadline is blank and not marked intentionally blank."
          : "Deadline supplied or intentionally blank.",
    },
    {
      id: "S5",
      condition: "Party missing name, address, or capacity",
      status: "MODEL CHECK REQUIRED",
      message:
        "Evaluate whether any current party is missing name, address, or capacity.",
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
      status: "OPEN",
      message: "Draft not confirmed attorney-approved for external delivery.",
    },
    {
      id: "S8",
      condition: "Equity or membership-interest language appears",
      status: equityLanguageHits.length > 0 ? "OPEN" : "CLEARED",
      message:
        equityLanguageHits.length > 0
          ? equityLanguageHits.join(", ")
          : "No equity or membership-interest language found.",
    },
  ];
}

function buildDraftResponse(stopConditions: StopCondition[]): string {
  const doNotSendStops = stopConditions.filter(
    (stop) =>
      stop.status === "OPEN" && (stop.id === "S1" || stop.id === "S7")
  );

  if (doNotSendStops.length === 0) {
    return "Not produced — external response generation is disabled in this workflow.";
  }

  const reason = doNotSendStops
    .map((stop) => `${stop.id} ${stop.message}`)
    .join("; ");

  return `Not produced — ${reason}`;
}

function buildExecutiveStatus(
  stopConditions: StopCondition[]
): ExecutiveStatus {
  const s1Open = stopConditions.some(
    (stop) => stop.id === "S1" && stop.status === "OPEN"
  );
  const s7Open = stopConditions.some(
    (stop) => stop.id === "S7" && stop.status === "OPEN"
  );

  if (s1Open || s7Open) {
    return {
      status: "Do Not Send",
      reason:
        "Blocked by old-matter residue and/or lack of attorney-approved draft status.",
    };
  }

  const reviewRequired = stopConditions.some(
    (stop) =>
      stop.status === "OPEN" || stop.status === "MODEL CHECK REQUIRED"
  );

  if (reviewRequired) {
    return {
      status: "Attorney Review Required",
      reason:
        "Open or model-check-required workflow items remain before external delivery.",
    };
  }

  return {
    status: "Ready for Attorney Review",
    reason: "No open deterministic blocks were detected.",
  };
}

function buildCriticalBlocks(stopConditions: StopCondition[]): CriticalBlock[] {
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

    if (stop.id === "S7") {
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

function isEntityType(value: string): boolean {
  return /entity|llc|company|corporation|corp|法人/i.test(value);
}

function isIndividualType(value: string): boolean {
  return /individual|person|natural person|個人/i.test(value);
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
    selectedWorkflows: body.matterTypes,
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
  const s5 = stopConditions.find((stop) => stop.id === "S5");

  if (s4?.status === "OPEN") {
    items.push({
      item: "Deadline",
      owner: "Client Follow-Up",
      source: "S4 OPEN",
    });
  }

  if (s2?.status === "MODEL CHECK REQUIRED") {
    items.push({
      item: "Caption/body party consistency",
      owner: "Internal Cross-Check",
      source: "S2 MODEL CHECK REQUIRED",
    });
  }

  if (s5?.status === "MODEL CHECK REQUIRED") {
    items.push({
      item: "Party name/address/capacity completeness",
      owner: "Internal Cross-Check",
      source: "S5 MODEL CHECK REQUIRED",
    });
  }

  unresolvedDealTerms.forEach((row) => {
    items.push({
      item: `${row.term} provenance`,
      owner: "Attorney Review",
      source: `S3 OPEN — ${row.provenance || "blank"}`,
    });
  });

  if (equityLanguageHits.length > 0) {
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
}): AttorneyDecisionCard[] {
  const { stopConditions, unresolvedDealTerms, equityLanguageHits } = args;
  const cards: AttorneyDecisionCard[] = [];

  const s4Open = stopConditions.some(
    (stop) => stop.id === "S4" && stop.status === "OPEN"
  );

  if (s4Open) {
    cards.push({
      issue: "Deadline handling",
      whyItMatters:
        "The draft contains a blank deadline, and the application has not been told that the blank is intentional.",
      decisionNeeded:
        "Confirm whether the deadline should be supplied now, held pending client follow-up, or intentionally left blank with attorney approval.",
      evidence: "S4 OPEN — Deadline is blank and not marked intentionally blank.",
      routing: "Human Confirmation Required",
    });
  }

  unresolvedDealTerms.forEach((row) => {
    cards.push({
      issue: `Deal-term provenance: ${row.term}`,
      whyItMatters:
        "Praxis cannot treat this term as confirmed because its provenance is unresolved.",
      decisionNeeded:
        "Confirm whether this term should be used as stated, held pending confirmation, or routed for attorney drafting review.",
      evidence: `${row.term} = ${row.value}; Provenance = ${
        row.provenance || "blank"
      }.`,
      routing: "Attorney Review",
    });
  });

  if (equityLanguageHits.length > 0) {
    cards.push({
      issue: "Membership-certificate / ownership-interest-adjacent language",
      whyItMatters:
        "This language may fall outside a standard NDA-only preparation workflow and may require separate attorney routing.",
      decisionNeeded:
        "Should this be treated as ordinary return-of-property language, or routed as an equity / ownership-interest issue outside the standard NDA workflow?",
      evidence: equityLanguageHits.join(", "),
      routing: "Attorney Review",
    });
  }

  return cards;
}

function buildParalegalWorkQueue(args: {
  stopConditions: StopCondition[];
  oldMatterHits: string[];
  unresolvedDealTerms: DealTermRow[];
}): ParalegalWorkItem[] {
  const { stopConditions, oldMatterHits, unresolvedDealTerms } = args;
  const items: ParalegalWorkItem[] = [];

  const s1Open = stopConditions.some(
    (stop) => stop.id === "S1" && stop.status === "OPEN"
  );
  const s7Open = stopConditions.some(
    (stop) => stop.id === "S7" && stop.status === "OPEN"
  );
  const s2NeedsCheck = stopConditions.some(
    (stop) => stop.id === "S2" && stop.status === "MODEL CHECK REQUIRED"
  );
  const s4Open = stopConditions.some(
    (stop) => stop.id === "S4" && stop.status === "OPEN"
  );
  const s5NeedsCheck = stopConditions.some(
    (stop) => stop.id === "S5" && stop.status === "MODEL CHECK REQUIRED"
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

  if (s5NeedsCheck) {
    items.push({
      task: "Run party name, address, capacity, signer, and initials completeness check.",
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
  if (body.matterTypes.includes("Mutual release + NDA")) {
    return "Mutual release + NDA";
  }

  return body.matterTypes[0] || body.mode || "Attorney Review";
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

  const sourceDocuments = buildDefaultSourceDocuments(body, oldMatterHits);

  return {
    matterTitle: buildMatterTitle(body),
    executiveStatus: buildExecutiveStatus(stopConditions),
    criticalBlocks: buildCriticalBlocks(stopConditions),
    matterSnapshot: buildMatterSnapshot(body),
    confirmationNeeded: buildConfirmationNeeded({
      stopConditions,
      unresolvedDealTerms,
      equityLanguageHits,
    }),
    attorneyDecisionCards: buildAttorneyDecisionCards({
      stopConditions,
      unresolvedDealTerms,
      equityLanguageHits,
    }),
    paralegalWorkQueue: buildParalegalWorkQueue({
      stopConditions,
      oldMatterHits,
      unresolvedDealTerms,
    }),
    watchlistSummary: buildWatchlistSummary(oldMatterTerms, oldMatterHits),
    draftResponse: buildDraftResponse(stopConditions),
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

function renderConfirmationNeeded(items: ConfirmationItem[]): string[] {
  if (items.length === 0) return ["- None."];

  return items.map(
    (item) => `- ${item.item} — ${item.owner} — ${item.source}`
  );
}

function renderAttorneyDecisionCards(cards: AttorneyDecisionCard[]): string[] {
  if (cards.length === 0) return ["1. None."];

  return cards.flatMap((card, index) => [
    `${index + 1}. **${card.issue}**`,
    `   - Why it matters: ${card.whyItMatters}`,
    `   - Decision needed: ${card.decisionNeeded}`,
    `   - Evidence: ${card.evidence}`,
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
    `## 4. Confirmation Needed`,
    ...renderConfirmationNeeded(memo.confirmationNeeded),
    ``,
    `## 5. Attorney Decision Cards`,
    ...renderAttorneyDecisionCards(memo.attorneyDecisionCards),
    ``,
    `## 6. Paralegal Work Queue`,
    ...renderParalegalWorkQueue(memo.paralegalWorkQueue),
    ``,
    `## 7. Watchlist Summary`,
    ...renderWatchlistSummary(memo.watchlistSummary),
    ``,
    `## 8. Draft Response`,
    memo.draftResponse,
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

  const missing: string[] = [];

  if (!body.mode || typeof body.mode !== "string") missing.push("mode");

  if (!Array.isArray(body.matterTypes) || body.matterTypes.length === 0) {
    missing.push("matterTypes");
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

  body.currentDraft =
    typeof body.currentDraft === "string" ? body.currentDraft : "";

  body.processNotes =
    typeof body.processNotes === "string" ? body.processNotes : "";

  body.oldMatterTerms =
    typeof body.oldMatterTerms === "string" ? body.oldMatterTerms : "";

  body.dealTerms = typeof body.dealTerms === "string" ? body.dealTerms : "";

  body.deadline = typeof body.deadline === "string" ? body.deadline : "";

  body.deadlineIntentionallyBlank = Boolean(body.deadlineIntentionallyBlank);

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
