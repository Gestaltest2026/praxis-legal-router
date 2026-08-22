export type RetainerStatus =
  | "READY_FOR_ATTORNEY_REVIEW"
  | "ATTORNEY_DECISION_REQUIRED"
  | "DO_NOT_GENERATE";

export type FailureType =
  | "Missing Information"
  | "Mapping Conflict"
  | "Template Ambiguity"
  | "Attorney Decision Required"
  | "Do Not Generate";

export type RetainerSlotType =
  | "identity"
  | "matter"
  | "scope"
  | "fee"
  | "cost"
  | "exclusion"
  | "signature"
  | "date"
  | "attorney-review"
  | "unknown";

export type TemplateSlot = {
  raw: string;
  key: string;
  normalizedKey: string;
  type: RetainerSlotType;
};

export type CanonicalFact = {
  key: string;
  label: string;
  value: string;
  source: string;
  confidence: "high" | "medium" | "low";
};

export type MappingResult = {
  slot: TemplateSlot;
  value?: string;
  source?: string;
  status: "filled" | "missing" | "ambiguous" | "conflict" | "attorney-review";
  message?: string;
};

export type RetainerBuilderInput = {
  templateText: string;
  intakeText: string;
  attorneyInstructions?: string;
  sourceRecord?: string;
  forbiddenTerms?: string[];
};

export type RetainerBuilderOutput = {
  completedDraft: string;
  fieldsFilled: string[];
  missingInformation: string[];
  mappingConflicts: string[];
  templateAmbiguities: string[];
  customizationNotes: string[];
  attorneyReviewFlags: string[];
  clientFacingQuestions: string[];
  verificationFindings: string[];
  status: RetainerStatus;
  failureType?: FailureType;
};

export type RetainerFailure = {
  status: "DO_NOT_GENERATE";
  failureType: FailureType;
  message: string;
  details: string[];
};
