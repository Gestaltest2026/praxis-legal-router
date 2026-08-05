import type { ValidationStatus } from "./types";

export type MatterState =
  | "DRAFT"
  | "INTAKE_COMPLETE"
  | "VALIDATED"
  | "READY_FOR_ASSEMBLY"
  | "ASSEMBLED"
  | "PARALEGAL_REVIEWED"
  | "ATTORNEY_REVIEW"
  | "APPROVED"
  | "DELIVERED"
  | "QUARANTINED";

export type TransitionActor = "Paralegal" | "Attorney" | "System";

export type TransitionContext = {
  actor: TransitionActor;
  validationStatus: ValidationStatus;
  unresolvedIssueCount: number;
  approvedTemplateVersion?: string;
  assembledDocumentHash?: string;
  approvedDocumentHash?: string;
  expectedRevision: number;
  currentRevision: number;
  deliveryAuthorized: boolean;
};

export type TransitionDecision =
  | {
      allowed: true;
      from: MatterState;
      to: MatterState;
    }
  | {
      allowed: false;
      from: MatterState;
      to: MatterState;
      code:
        | "TRANSITION_NOT_ALLOWED"
        | "STALE_WRITE"
        | "VALIDATION_NOT_PASS"
        | "UNRESOLVED_ISSUES"
        | "TEMPLATE_NOT_PINNED"
        | "DOCUMENT_HASH_MISSING"
        | "ATTORNEY_REQUIRED"
        | "APPROVED_HASH_MISMATCH"
        | "DELIVERY_NOT_AUTHORIZED";
      message: string;
    };

const ALLOWED_TRANSITIONS: Record<MatterState, MatterState[]> = {
  DRAFT: ["INTAKE_COMPLETE", "QUARANTINED"],
  INTAKE_COMPLETE: ["VALIDATED", "DRAFT", "QUARANTINED"],
  VALIDATED: ["READY_FOR_ASSEMBLY", "DRAFT", "QUARANTINED"],
  READY_FOR_ASSEMBLY: ["ASSEMBLED", "DRAFT", "QUARANTINED"],
  ASSEMBLED: ["PARALEGAL_REVIEWED", "READY_FOR_ASSEMBLY", "QUARANTINED"],
  PARALEGAL_REVIEWED: ["ATTORNEY_REVIEW", "READY_FOR_ASSEMBLY", "QUARANTINED"],
  ATTORNEY_REVIEW: ["APPROVED", "READY_FOR_ASSEMBLY", "QUARANTINED"],
  APPROVED: ["DELIVERED", "READY_FOR_ASSEMBLY", "QUARANTINED"],
  DELIVERED: [],
  QUARANTINED: ["DRAFT"],
};

export function evaluateTransition(
  from: MatterState,
  to: MatterState,
  context: TransitionContext
): TransitionDecision {
  if (context.expectedRevision !== context.currentRevision) {
    return denied(
      from,
      to,
      "STALE_WRITE",
      "The matter changed after this operation began. Reload before continuing."
    );
  }

  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    return denied(
      from,
      to,
      "TRANSITION_NOT_ALLOWED",
      `Transition from ${from} to ${to} is not allowed.`
    );
  }

  if (to === "READY_FOR_ASSEMBLY") {
    if (context.validationStatus !== "PASS") {
      return denied(
        from,
        to,
        "VALIDATION_NOT_PASS",
        "Document assembly requires PASS validation."
      );
    }

    if (context.unresolvedIssueCount > 0) {
      return denied(
        from,
        to,
        "UNRESOLVED_ISSUES",
        "All unresolved issues must be cleared before assembly."
      );
    }

    if (!context.approvedTemplateVersion?.trim()) {
      return denied(
        from,
        to,
        "TEMPLATE_NOT_PINNED",
        "An attorney-approved pinned template version is required."
      );
    }
  }

  if (to === "PARALEGAL_REVIEWED" && !context.assembledDocumentHash) {
    return denied(
      from,
      to,
      "DOCUMENT_HASH_MISSING",
      "The assembled document must be hashed before paralegal review is recorded."
    );
  }

  if (to === "APPROVED") {
    if (context.actor !== "Attorney") {
      return denied(
        from,
        to,
        "ATTORNEY_REQUIRED",
        "Only an attorney may approve the final document."
      );
    }

    if (!context.assembledDocumentHash) {
      return denied(
        from,
        to,
        "DOCUMENT_HASH_MISSING",
        "The exact document being approved must have a recorded hash."
      );
    }
  }

  if (to === "DELIVERED") {
    if (context.actor !== "Attorney") {
      return denied(
        from,
        to,
        "ATTORNEY_REQUIRED",
        "External delivery requires attorney-controlled authorization."
      );
    }

    if (!context.deliveryAuthorized) {
      return denied(
        from,
        to,
        "DELIVERY_NOT_AUTHORIZED",
        "External delivery has not been authorized."
      );
    }

    if (
      !context.assembledDocumentHash ||
      !context.approvedDocumentHash ||
      context.assembledDocumentHash !== context.approvedDocumentHash
    ) {
      return denied(
        from,
        to,
        "APPROVED_HASH_MISMATCH",
        "The document selected for delivery is not the exact document approved by the attorney."
      );
    }
  }

  return { allowed: true, from, to };
}

function denied(
  from: MatterState,
  to: MatterState,
  code: Extract<TransitionDecision, { allowed: false }>["code"],
  message: string
): TransitionDecision {
  return { allowed: false, from, to, code, message };
}
