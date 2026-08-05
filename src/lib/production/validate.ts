import type {
  ProductionModule,
  ValidationIssue,
  ValidationResult,
} from "./types";

type MatterValues = Record<string, unknown>;

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

export function validateRequiredInputs(
  module: ProductionModule,
  values: MatterValues
): ValidationResult {
  const issues: ValidationIssue[] = module.requiredInputs
    .filter((field) => field.required && isMissing(values[field.key]))
    .map((field) => ({
      id: `required:${field.key}`,
      severity: "RED" as const,
      message: `${field.label} is required.`,
    }));

  return buildValidationResult(issues);
}

export function buildValidationResult(
  issues: ValidationIssue[]
): ValidationResult {
  if (issues.some((issue) => issue.severity === "RED")) {
    return { status: "RED", issues };
  }

  if (issues.some((issue) => issue.severity === "YELLOW")) {
    return { status: "YELLOW", issues };
  }

  return { status: "PASS", issues: [] };
}

export function combineValidationResults(
  ...results: ValidationResult[]
): ValidationResult {
  return buildValidationResult(results.flatMap((result) => result.issues));
}
