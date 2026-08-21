export type DocumentKind =
  | "BANK_STATEMENT"
  | "TAX_RECORD"
  | "MEDICAL_RECORD"
  | "INSURANCE_RECORD"
  | "IDENTITY_DOCUMENT"
  | "COURT_RECORD"
  | "CORRESPONDENCE"
  | "PROPERTY_RECORD"
  | "OTHER";

export type DocumentSensitivity =
  | "STANDARD"
  | "CONFIDENTIAL"
  | "HIGHLY_SENSITIVE";

export type DocumentWorkflowState =
  | "RECEIVED"
  | "CLASSIFIED"
  | "SECURE_COPY_RECORDED"
  | "VERIFIED"
  | "LINKED_TO_MATTER"
  | "READY_FOR_USE"
  | "QUARANTINED";

export type RetentionStatus =
  | "NOT_REVIEWED"
  | "PRESERVE"
  | "REVIEWED_FOR_DUPLICATE_REMOVAL";

export type DocumentSource =
  | "CLIENT_EMAIL"
  | "SECURE_UPLOAD"
  | "COURT_FILE"
  | "PRIOR_COUNSEL"
  | "INTERNAL"
  | "OTHER";

export type DocumentRecord = Readonly<{
  id: string;
  matterId: string;
  displayName: string;
  kind: DocumentKind;
  source: DocumentSource;
  receivedAt: string;
  sensitivity: DocumentSensitivity;
  state: DocumentWorkflowState;
  secureCopyConfirmed: boolean;
  retentionStatus: RetentionStatus;
  legalUse?: string;
  sourceIds?: readonly string[];
  flags?: readonly string[];
}>;

export type DocumentDecision = Readonly<{
  allowed: boolean;
  from: DocumentWorkflowState;
  to: DocumentWorkflowState;
  code?:
    | "INVALID_TRANSITION"
    | "SENSITIVITY_NOT_CLASSIFIED"
    | "SECURE_COPY_REQUIRED"
    | "VERIFICATION_REQUIRED"
    | "MATTER_LINK_REQUIRED";
  message?: string;
}>;
