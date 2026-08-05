export type ProductionStatus = "PASS" | "YELLOW" | "RED";

export type FieldValueType =
  | "text"
  | "money"
  | "boolean"
  | "date"
  | "selection"
  | "multiline";

export type RequiredInput = {
  key: string;
  label: string;
  valueType: FieldValueType;
  required: boolean;
};

export type RoutingCondition = {
  id: string;
  label: string;
  attorneyApproved: boolean;
};

export type StopCondition = {
  id: string;
  severity: "YELLOW" | "RED";
  message: string;
};

export type ApprovedTemplate = {
  id: string;
  label: string;
  version: string;
  attorneyApproved: boolean;
};

export type ReviewPacketField = {
  key: string;
  label: string;
};

export type ProductionModule = {
  id: "nda" | "retainer" | "fee-expert";
  name: string;
  requiredInputs: RequiredInput[];
  routingConditions: RoutingCondition[];
  stopConditions: StopCondition[];
  approvedTemplates: ApprovedTemplate[];
  attorneyReviewPacket: ReviewPacketField[];
};

export type ValidationIssue = {
  id: string;
  severity: "YELLOW" | "RED";
  message: string;
};

export type ValidationResult = {
  status: ProductionStatus;
  issues: ValidationIssue[];
};
