export type TemplateFieldType = "text" | "money" | "date" | "boolean";

export type ApprovedTemplateField = {
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
};

export type ApprovedTemplateDefinition = {
  id: string;
  moduleId: "nda" | "retainer" | "fee-expert";
  version: string;
  fileName: string;
  attorneyApproved: boolean;
  approvedAt: string;
  approvedBy: string;
  sha256: string;
  fields: ApprovedTemplateField[];
};

export type TemplateSelectionResult =
  | { ok: true; template: ApprovedTemplateDefinition }
  | {
      ok: false;
      code:
        | "TEMPLATE_NOT_FOUND"
        | "TEMPLATE_NOT_APPROVED"
        | "TEMPLATE_HASH_MISSING"
        | "TEMPLATE_VERSION_AMBIGUOUS";
      message: string;
    };

export function selectApprovedTemplate(
  registry: readonly ApprovedTemplateDefinition[],
  moduleId: ApprovedTemplateDefinition["moduleId"],
  version?: string
): TemplateSelectionResult {
  const candidates = registry.filter(
    (template) =>
      template.moduleId === moduleId &&
      (!version || template.version === version)
  );

  if (candidates.length === 0) {
    return {
      ok: false,
      code: "TEMPLATE_NOT_FOUND",
      message: `No template was found for ${moduleId}${version ? ` version ${version}` : ""}.`,
    };
  }

  if (!version && candidates.length > 1) {
    return {
      ok: false,
      code: "TEMPLATE_VERSION_AMBIGUOUS",
      message: "A specific approved template version must be selected.",
    };
  }

  const template = candidates[0];

  if (!template.attorneyApproved) {
    return {
      ok: false,
      code: "TEMPLATE_NOT_APPROVED",
      message: "The selected template is not attorney-approved.",
    };
  }

  if (!template.sha256.trim()) {
    return {
      ok: false,
      code: "TEMPLATE_HASH_MISSING",
      message: "The selected template does not have a recorded SHA-256 hash.",
    };
  }

  return { ok: true, template };
}

export function validateTemplateData(
  template: ApprovedTemplateDefinition,
  data: Record<string, unknown>
): string[] {
  const allowed = new Set(template.fields.map((field) => field.key));
  const errors: string[] = [];

  for (const key of Object.keys(data)) {
    if (!allowed.has(key)) {
      errors.push(`Field ${key} is not allowlisted for template ${template.id}@${template.version}.`);
    }
  }

  for (const field of template.fields) {
    const value = data[field.key];
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push(`Required template field ${field.key} is missing.`);
    }
  }

  return errors;
}
