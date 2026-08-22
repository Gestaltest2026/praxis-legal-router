import type { ClaimStatus, EvidenceStatus } from "@/lib/kahn-catino-data";

export type GateState = "PASS" | "YELLOW" | "RED" | "BLOCKED";

export type EvidenceRequirement = {
  id: string;
  label: string;
  status: EvidenceStatus;
  source?: string;
  notes?: string;
  required: boolean;
};

export type ClaimReadiness = {
  id: string;
  name: string;
  status: ClaimStatus;
  against: string;
  requirements: EvidenceRequirement[];
  attorneyApproved: boolean;
  proceduralGateSatisfied: boolean;
};

export function evaluateClaimReadiness(claim: ClaimReadiness): {
  state: GateState;
  missingRequired: EvidenceRequirement[];
  rationale: string;
} {
  const missingRequired = claim.requirements.filter(
    (item) => item.required && item.status === "to-verify",
  );

  if (claim.status === "investigation") {
    return {
      state: "BLOCKED",
      missingRequired,
      rationale: "Investigation track only. It is not authorized for pleading.",
    };
  }

  if (claim.status === "reserved" && !claim.proceduralGateSatisfied) {
    return {
      state: "BLOCKED",
      missingRequired,
      rationale: "Reserved remedy remains procedurally unavailable.",
    };
  }

  if (missingRequired.length > 0) {
    return {
      state: "RED",
      missingRequired,
      rationale: "One or more required evidentiary items remain unverified.",
    };
  }

  if (!claim.attorneyApproved) {
    return {
      state: "YELLOW",
      missingRequired,
      rationale: "Evidentiary gates are satisfied, but attorney approval is still required.",
    };
  }

  return {
    state: "PASS",
    missingRequired,
    rationale: "Required evidence, procedural gates, and attorney approval are present.",
  };
}

export function assertNoDoubleCounting(values: {
  grossDirectPayments: number;
  note304IncludedAgain: boolean;
  tenantSevenThousandIncluded: boolean;
}) {
  const violations: string[] = [];

  if (values.note304IncludedAgain) {
    violations.push(
      "The $304,000 note cannot be added again because its underlying transfers are already included in the direct-payment ledger.",
    );
  }

  if (values.tenantSevenThousandIncluded) {
    violations.push(
      "The tenant $7,000 item is excluded from the current conservative damages model.",
    );
  }

  return {
    valid: violations.length === 0,
    violations,
    grossDirectPayments: values.grossDirectPayments,
  };
}
