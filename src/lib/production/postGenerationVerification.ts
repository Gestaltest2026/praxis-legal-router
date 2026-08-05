export type VerificationSeverity = "YELLOW" | "RED";

export type VerificationFinding = {
  id: string;
  severity: VerificationSeverity;
  message: string;
  evidence?: string;
};

export type PostGenerationVerificationInput = {
  renderedText: string;
  expectedValues: Record<string, string>;
  forbiddenTerms?: string[];
  unresolvedPlaceholderPatterns?: RegExp[];
  requiredPhrases?: string[];
};

export type PostGenerationVerificationResult = {
  status: "PASS" | "YELLOW" | "RED";
  quarantineRequired: boolean;
  findings: VerificationFinding[];
};

const DEFAULT_PLACEHOLDER_PATTERNS = [
  /\{\{[^}]+\}\}/g,
  /\[INSERT[^\]]*\]/gi,
  /<<[^>]+>>/g,
  /\bTBD\b/gi,
  /\bTO BE PROVIDED\b/gi,
];

export function verifyGeneratedDocument(
  input: PostGenerationVerificationInput
): PostGenerationVerificationResult {
  const findings: VerificationFinding[] = [];
  const text = normalize(input.renderedText);

  if (!text) {
    findings.push({
      id: "document:empty",
      severity: "RED",
      message: "The generated document is empty.",
    });
  }

  for (const [field, expected] of Object.entries(input.expectedValues)) {
    const normalizedExpected = normalize(expected);
    if (!normalizedExpected) continue;

    if (!text.includes(normalizedExpected)) {
      findings.push({
        id: `expected:${field}`,
        severity: "RED",
        message: `Expected value for ${field} was not found in the generated document.`,
        evidence: expected,
      });
    }
  }

  for (const term of input.forbiddenTerms ?? []) {
    const normalizedTerm = normalize(term);
    if (normalizedTerm && text.includes(normalizedTerm)) {
      findings.push({
        id: `forbidden:${normalizedTerm}`,
        severity: "RED",
        message: "Forbidden or prior-matter language was detected.",
        evidence: term,
      });
    }
  }

  for (const phrase of input.requiredPhrases ?? []) {
    const normalizedPhrase = normalize(phrase);
    if (normalizedPhrase && !text.includes(normalizedPhrase)) {
      findings.push({
        id: `required:${normalizedPhrase}`,
        severity: "YELLOW",
        message: "A required review phrase was not detected.",
        evidence: phrase,
      });
    }
  }

  for (const pattern of input.unresolvedPlaceholderPatterns ?? DEFAULT_PLACEHOLDER_PATTERNS) {
    const matches = input.renderedText.match(pattern);
    if (matches?.length) {
      findings.push({
        id: `placeholder:${pattern.source}`,
        severity: "RED",
        message: "Unresolved template placeholders were detected.",
        evidence: matches.slice(0, 5).join(", "),
      });
    }
  }

  const status = findings.some((finding) => finding.severity === "RED")
    ? "RED"
    : findings.some((finding) => finding.severity === "YELLOW")
      ? "YELLOW"
      : "PASS";

  return {
    status,
    quarantineRequired: status === "RED",
    findings,
  };
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
