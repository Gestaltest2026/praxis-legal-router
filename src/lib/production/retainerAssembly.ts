import type { ApprovedTemplateDefinition } from "./templateRegistry";
import { selectApprovedTemplate, validateTemplateData } from "./templateRegistry";

export type RetainerAssemblyData = {
  clientName: string;
  clientAddress: string;
  matterName: string;
  matterNumber: string;
  courtName?: string;
  retainerAmount: string;
  attorneyHourlyRate: string;
  staffHourlyRate: string;
  agreementDate: string;
};

export type RetainerAssemblyRequest = {
  matterId: string;
  templateVersion: string;
  expectedMatterRevision: number;
  currentMatterRevision: number;
  data: RetainerAssemblyData;
};

export type RetainerAssemblyPlan =
  | {
      ok: true;
      matterId: string;
      template: ApprovedTemplateDefinition;
      replacements: Record<string, string>;
      expectedMatterRevision: number;
    }
  | {
      ok: false;
      code:
        | "STALE_WRITE"
        | "TEMPLATE_SELECTION_FAILED"
        | "INVALID_ASSEMBLY_DATA";
      errors: string[];
    };

export function buildRetainerAssemblyPlan(
  request: RetainerAssemblyRequest,
  templates: ApprovedTemplateDefinition[]
): RetainerAssemblyPlan {
  if (request.expectedMatterRevision !== request.currentMatterRevision) {
    return {
      ok: false,
      code: "STALE_WRITE",
      errors: [
        "The matter changed after assembly began. Reload and generate a new assembly request.",
      ],
    };
  }

  const selected = selectApprovedTemplate(
    templates,
    "retainer",
    request.templateVersion
  );

  if (!selected.ok) {
    return {
      ok: false,
      code: "TEMPLATE_SELECTION_FAILED",
      errors: [selected.message],
    };
  }

  const replacements = normalizeRetainerAssemblyData(request.data);
  const validationErrors = validateTemplateData(selected.template, replacements);

  if (validationErrors.length > 0) {
    return {
      ok: false,
      code: "INVALID_ASSEMBLY_DATA",
      errors: validationErrors,
    };
  }

  return {
    ok: true,
    matterId: request.matterId,
    template: selected.template,
    replacements,
    expectedMatterRevision: request.expectedMatterRevision,
  };
}

function normalizeRetainerAssemblyData(
  data: RetainerAssemblyData
): Record<string, string> {
  return {
    clientName: data.clientName.trim(),
    clientAddress: data.clientAddress.trim(),
    matterName: data.matterName.trim(),
    matterNumber: data.matterNumber.trim(),
    courtName: data.courtName?.trim() ?? "",
    retainerAmount: data.retainerAmount.trim(),
    attorneyHourlyRate: data.attorneyHourlyRate.trim(),
    staffHourlyRate: data.staffHourlyRate.trim(),
    agreementDate: data.agreementDate.trim(),
  };
}
