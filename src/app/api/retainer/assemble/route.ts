import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { executeRetainerAssemblyRun } from "@/lib/production/assemblyRun";
import {
  getRetainerTemplateBinary,
  RETAINER_TEMPLATE_REGISTRY,
} from "@/lib/production/retainerTemplateRegistry";
import type { RetainerAssemblyRequest } from "@/lib/production/retainerAssembly";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = new Date().toISOString();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        status: "BLOCKED",
        errorCode: "INVALID_JSON",
        errors: ["The request body must be valid JSON."],
      },
      { status: 400 }
    );
  }

  if (!isRetainerAssemblyRequest(payload)) {
    return NextResponse.json(
      {
        status: "BLOCKED",
        errorCode: "INVALID_REQUEST",
        errors: ["The Retainer assembly request is incomplete or malformed."],
      },
      { status: 400 }
    );
  }

  const definition = RETAINER_TEMPLATE_REGISTRY.definitions.find(
    (template) =>
      template.moduleId === "retainer" &&
      template.version === payload.templateVersion
  );

  const templateBinary = definition
    ? getRetainerTemplateBinary(
        RETAINER_TEMPLATE_REGISTRY,
        definition.id,
        definition.version
      )
    : undefined;

  const run = executeRetainerAssemblyRun({
    runId: randomUUID(),
    startedAt,
    completedAt: new Date().toISOString(),
    request: payload,
    templates: RETAINER_TEMPLATE_REGISTRY.definitions,
    templateBinary,
  });

  const statusCode =
    run.status === "READY_FOR_ATTORNEY_REVIEW"
      ? 200
      : run.status === "QUARANTINED"
        ? 409
        : 422;

  // Binary output is intentionally omitted until a controlled package transformer
  // returns an exact verified DOCX artifact. The API exposes only the audit-safe run record.
  return NextResponse.json(run, {
    status: statusCode,
    headers: { "Cache-Control": "no-store" },
  });
}

function isRetainerAssemblyRequest(
  value: unknown
): value is RetainerAssemblyRequest {
  if (!value || typeof value !== "object") return false;

  const request = value as Record<string, unknown>;
  const data = request.data;
  if (!data || typeof data !== "object") return false;
  const fields = data as Record<string, unknown>;

  return (
    isNonEmptyString(request.matterId) &&
    isNonEmptyString(request.templateVersion) &&
    isNonNegativeInteger(request.expectedMatterRevision) &&
    isNonNegativeInteger(request.currentMatterRevision) &&
    isNonEmptyString(fields.clientName) &&
    isNonEmptyString(fields.clientAddress) &&
    isNonEmptyString(fields.matterName) &&
    isNonEmptyString(fields.matterNumber) &&
    (fields.courtName === undefined || typeof fields.courtName === "string") &&
    isNonEmptyString(fields.retainerAmount) &&
    isNonEmptyString(fields.attorneyHourlyRate) &&
    isNonEmptyString(fields.staffHourlyRate) &&
    isNonEmptyString(fields.agreementDate)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
