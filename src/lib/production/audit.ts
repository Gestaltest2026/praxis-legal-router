import type { MatterState, TransitionActor, TransitionDecision } from "./stateMachine";

export type AuditEventType =
  | "MATTER_CREATED"
  | "INPUT_UPDATED"
  | "VALIDATION_COMPLETED"
  | "STATE_TRANSITION_ALLOWED"
  | "STATE_TRANSITION_DENIED"
  | "TEMPLATE_SELECTED"
  | "DOCUMENT_ASSEMBLED"
  | "DOCUMENT_VERIFIED"
  | "DOCUMENT_APPROVED"
  | "DOCUMENT_DELIVERED"
  | "MATTER_QUARANTINED";

export type AuditRecord = {
  id: string;
  matterId: string;
  eventType: AuditEventType;
  actor: TransitionActor;
  occurredAt: string;
  revision: number;
  fromState?: MatterState;
  toState?: MatterState;
  documentHash?: string;
  templateVersion?: string;
  sourceIds?: string[];
  details: Record<string, string | number | boolean | string[] | undefined>;
};

export function createAuditRecord(args: {
  matterId: string;
  eventType: AuditEventType;
  actor: TransitionActor;
  revision: number;
  occurredAt?: Date;
  fromState?: MatterState;
  toState?: MatterState;
  documentHash?: string;
  templateVersion?: string;
  sourceIds?: string[];
  details?: AuditRecord["details"];
}): AuditRecord {
  const occurredAt = (args.occurredAt ?? new Date()).toISOString();

  return Object.freeze({
    id: `${args.matterId}:${args.revision}:${args.eventType}:${occurredAt}`,
    matterId: args.matterId,
    eventType: args.eventType,
    actor: args.actor,
    occurredAt,
    revision: args.revision,
    fromState: args.fromState,
    toState: args.toState,
    documentHash: args.documentHash,
    templateVersion: args.templateVersion,
    sourceIds: args.sourceIds ? [...args.sourceIds] : undefined,
    details: Object.freeze({ ...(args.details ?? {}) }),
  });
}

export function auditTransition(args: {
  matterId: string;
  actor: TransitionActor;
  revision: number;
  decision: TransitionDecision;
  details?: AuditRecord["details"];
}): AuditRecord {
  return createAuditRecord({
    matterId: args.matterId,
    actor: args.actor,
    revision: args.revision,
    eventType: args.decision.allowed
      ? "STATE_TRANSITION_ALLOWED"
      : "STATE_TRANSITION_DENIED",
    fromState: args.decision.from,
    toState: args.decision.to,
    details: {
      ...(args.details ?? {}),
      allowed: args.decision.allowed,
      denialCode: args.decision.allowed ? undefined : args.decision.code,
      denialMessage: args.decision.allowed ? undefined : args.decision.message,
    },
  });
}

export function appendAuditRecord(
  existing: readonly AuditRecord[],
  next: AuditRecord
): readonly AuditRecord[] {
  if (existing.some((record) => record.id === next.id)) return existing;
  return Object.freeze([...existing, next]);
}
