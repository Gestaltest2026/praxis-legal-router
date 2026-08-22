import type { MappingResult, RetainerStatus } from "./schema";

const UNRESOLVED_PATTERNS = [
  /\{\{[^}]+\}\}/g,
  /<<[^>]+>>/g,
  /\[(?:INSERT\s+)?[A-Z0-9 _\-/]+\]/g,
  /\bTBD\b/gi,
  /TO BE PROVIDED/gi,
  /_{4,}/g,
];

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function verifyRetainerDraft(args: {
  draft: string;
  mappings: MappingResult[];
  forbiddenTerms?: string[];
}) {
  const findings: string[] = [];
  const normalizedDraft = normalize(args.draft);

  if (!args.draft.trim()) {
    findings.push("Generated draft is empty.");
  }

  args.mappings
    .filter((mapping) => mapping.status === "filled" && mapping.value)
    .forEach((mapping) => {
      const value = mapping.value || "";
      if (!normalizedDraft.includes(normalize(value))) {
        findings.push(`Expected mapped value was not found in draft: ${mapping.slot.key} = ${value}`);
      }
    });

  for (const pattern of UNRESOLVED_PATTERNS) {
    const matches = args.draft.match(pattern);
    if (matches?.length) {
      findings.push(`Unresolved template marker detected: ${matches.slice(0, 5).join(", ")}`);
    }
  }

  for (const term of args.forbiddenTerms ?? []) {
    if (term.trim() && normalizedDraft.includes(normalize(term))) {
      findings.push(`Forbidden or prior-matter term detected: ${term}`);
    }
  }

  return findings;
}

export function determineRetainerStatus(args: {
  missingInformation: string[];
  mappingConflicts: string[];
  templateAmbiguities: string[];
  attorneyReviewFlags: string[];
  verificationFindings: string[];
}): RetainerStatus {
  if (args.mappingConflicts.length || args.verificationFindings.some((finding) => /forbidden|empty/i.test(finding))) {
    return "DO_NOT_GENERATE";
  }

  if (
    args.missingInformation.length ||
    args.templateAmbiguities.length ||
    args.attorneyReviewFlags.length ||
    args.verificationFindings.length
  ) {
    return "ATTORNEY_DECISION_REQUIRED";
  }

  return "READY_FOR_ATTORNEY_REVIEW";
}
