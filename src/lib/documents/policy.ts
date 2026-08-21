import type {
  DocumentKind,
  DocumentRecord,
  DocumentSensitivity,
} from "./types";

const HIGHLY_SENSITIVE_KINDS = new Set<DocumentKind>([
  "BANK_STATEMENT",
  "TAX_RECORD",
  "MEDICAL_RECORD",
  "INSURANCE_RECORD",
  "IDENTITY_DOCUMENT",
]);

const CONFIDENTIAL_KINDS = new Set<DocumentKind>([
  "CORRESPONDENCE",
  "PROPERTY_RECORD",
]);

const HIGHLY_SENSITIVE_SIGNALS = [
  "ssn",
  "social security",
  "account number",
  "routing number",
  "passport",
  "driver license",
  "tax return",
  "medical",
  "health insurance",
];

export function inferSensitivity(
  kind: DocumentKind,
  signals: readonly string[] = []
): DocumentSensitivity {
  const normalizedSignals = signals.map((signal) => signal.toLowerCase());
  if (
    HIGHLY_SENSITIVE_KINDS.has(kind) ||
    normalizedSignals.some((signal) =>
      HIGHLY_SENSITIVE_SIGNALS.some((needle) => signal.includes(needle))
    )
  ) {
    return "HIGHLY_SENSITIVE";
  }
  if (CONFIDENTIAL_KINDS.has(kind)) return "CONFIDENTIAL";
  return "STANDARD";
}

export function requiresSecureStorage(
  sensitivity: DocumentSensitivity
): boolean {
  return sensitivity === "CONFIDENTIAL" || sensitivity === "HIGHLY_SENSITIVE";
}

export function canRemoveEmailDuplicate(record: DocumentRecord): Readonly<{
  allowed: boolean;
  reason: string;
}> {
  if (!record.secureCopyConfirmed) {
    return { allowed: false, reason: "Secure copy has not been confirmed." };
  }
  if (record.retentionStatus !== "REVIEWED_FOR_DUPLICATE_REMOVAL") {
    return { allowed: false, reason: "Retention review is incomplete." };
  }
  if (record.state === "RECEIVED" || record.state === "QUARANTINED") {
    return { allowed: false, reason: "Document is not in a stable governed state." };
  }
  return {
    allowed: true,
    reason: "Secure copy and retention review are confirmed; duplicate removal may be considered by office policy.",
  };
}

export function nextRequiredControl(record: DocumentRecord): string {
  if (record.state === "QUARANTINED") return "Resolve quarantine before use.";
  if (record.state === "RECEIVED") return "Classify document and sensitivity.";
  if (requiresSecureStorage(record.sensitivity) && !record.secureCopyConfirmed) {
    return "Confirm secure storage before further use.";
  }
  if (record.state === "CLASSIFIED") return "Record secure copy or verify standard-storage handling.";
  if (record.state === "SECURE_COPY_RECORDED") return "Verify document facts and provenance.";
  if (record.state === "VERIFIED") return "Link document to the matter and legal use.";
  if (record.state === "LINKED_TO_MATTER") return "Mark ready only after review controls are satisfied.";
  return "Ready for governed legal use.";
}
