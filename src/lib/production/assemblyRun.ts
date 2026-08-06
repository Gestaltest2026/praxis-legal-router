import type { ApprovedTemplateDefinition } from "./templateRegistry";
import {
  buildRetainerAssemblyPlan,
  type RetainerAssemblyRequest,
} from "./retainerAssembly";
import {
  renderRetainerDocx,
  type DocxRenderResult,
  type DocxTemplateBinary,
} from "./docxRenderingAdapter";

export type AssemblyRunStatus =
  | "BLOCKED"
  | "QUARANTINED"
  | "READY_FOR_ATTORNEY_REVIEW";

export type AssemblyRunRecord = {
  runId: string;
  matterId: string;
  moduleId: "retainer";
  status: AssemblyRunStatus;
  startedAt: string;
  completedAt: string;
  expectedMatterRevision: number;
  templateVersion: string;
  templateId?: string;
  templateSha256?: string;
  outputFileName?: string;
  outputSha256?: string;
  errorCode?: string;
  errors: string[];
  quarantineRequired: boolean;
};

export type RetainerAssemblyRunInput = {
  runId: string;
  startedAt: string;
  completedAt: string;
  request: RetainerAssemblyRequest;
  templates: readonly ApprovedTemplateDefinition[];
  templateBinary?: DocxTemplateBinary;
};

export function executeRetainerAssemblyRun(
  input: RetainerAssemblyRunInput
): AssemblyRunRecord {
  const plan = buildRetainerAssemblyPlan(input.request, [...input.templates]);

  if (!plan.ok) {
    return {
      runId: input.runId,
      matterId: input.request.matterId,
      moduleId: "retainer",
      status: "BLOCKED",
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      expectedMatterRevision: input.request.expectedMatterRevision,
      templateVersion: input.request.templateVersion,
      errorCode: plan.code,
      errors: [...plan.errors],
      quarantineRequired: false,
    };
  }

  const rendered = renderRetainerDocx(plan, input.templateBinary);
  return toAssemblyRunRecord(input, plan.template, rendered);
}

function toAssemblyRunRecord(
  input: RetainerAssemblyRunInput,
  template: ApprovedTemplateDefinition,
  rendered: DocxRenderResult
): AssemblyRunRecord {
  if (!rendered.ok) {
    return {
      runId: input.runId,
      matterId: input.request.matterId,
      moduleId: "retainer",
      status: rendered.quarantineRequired ? "QUARANTINED" : "BLOCKED",
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      expectedMatterRevision: input.request.expectedMatterRevision,
      templateVersion: template.version,
      templateId: template.id,
      templateSha256: template.sha256,
      errorCode: rendered.code,
      errors: [...rendered.errors],
      quarantineRequired: rendered.quarantineRequired,
    };
  }

  return {
    runId: input.runId,
    matterId: input.request.matterId,
    moduleId: "retainer",
    status: "READY_FOR_ATTORNEY_REVIEW",
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    expectedMatterRevision: input.request.expectedMatterRevision,
    templateVersion: template.version,
    templateId: template.id,
    templateSha256: template.sha256,
    outputFileName: rendered.fileName,
    outputSha256: rendered.sha256,
    errors: [],
    quarantineRequired: false,
  };
}
