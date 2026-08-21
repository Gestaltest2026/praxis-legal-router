import { requiresSecureStorage } from "./policy";
import type {
  DocumentDecision,
  DocumentRecord,
  DocumentWorkflowState,
} from "./types";

const ALLOWED_TRANSITIONS: Readonly<
  Record<DocumentWorkflowState, readonly DocumentWorkflowState[]>
> = {
  RECEIVED: ["CLASSIFIED", "QUARANTINED"],
  CLASSIFIED: ["SECURE_COPY_RECORDED", "VERIFIED", "QUARANTINED"],
  SECURE_COPY_RECORDED: ["VERIFIED", "QUARANTINED"],
  VERIFIED: ["LINKED_TO_MATTER", "QUARANTINED"],
  LINKED_TO_MATTER: ["READY_FOR_USE", "QUARANTINED"],
  READY_FOR_USE: ["QUARANTINED"],
  QUARANTINED: ["CLASSIFIED"],
};

function deny(
  record: DocumentRecord,
  to: DocumentWorkflowState,
  code: NonNullable<DocumentDecision["code"]>,
  message: string
): DocumentDecision {
  return { allowed: false, from: record.state, to, code, message };
}

export function decideDocumentTransition(
  record: DocumentRecord,
  to: DocumentWorkflowState
): DocumentDecision {
  if (!ALLOWED_TRANSITIONS[record.state].includes(to)) {
    return deny(record, to, "INVALID_TRANSITION", `${record.state} cannot transition directly to ${to}.`);
  }

  if (to === "SECURE_COPY_RECORDED" && !requiresSecureStorage(record.sensitivity)) {
    return { allowed: true, from: record.state, to };
  }

  if (
    (to === "VERIFIED" || to === "LINKED_TO_MATTER" || to === "READY_FOR_USE") &&
    requiresSecureStorage(record.sensitivity) &&
    !record.secureCopyConfirmed
  ) {
    return deny(
      record,
      to,
      "SECURE_COPY_REQUIRED",
      "Confidential or highly sensitive material requires a confirmed secure copy before verification or use."
    );
  }

  if (to === "LINKED_TO_MATTER" && record.state !== "VERIFIED") {
    return deny(record, to, "VERIFICATION_REQUIRED", "Document must be verified before it is linked for legal use.");
  }

  if (to === "READY_FOR_USE") {
    if (record.state !== "LINKED_TO_MATTER") {
      return deny(record, to, "MATTER_LINK_REQUIRED", "Document must be linked to a matter before use.");
    }
    if (!record.legalUse?.trim()) {
      return deny(record, to, "MATTER_LINK_REQUIRED", "Legal use must be stated before the document is ready for use.");
    }
  }

  return { allowed: true, from: record.state, to };
}

export function applyDocumentTransition(
  record: DocumentRecord,
  to: DocumentWorkflowState
): DocumentRecord {
  const decision = decideDocumentTransition(record, to);
  if (!decision.allowed) {
    throw new Error(`${decision.code}: ${decision.message}`);
  }
  return Object.freeze({ ...record, state: to });
}
