import { createHash } from "node:crypto";
import type { RetainerAssemblyPlan } from "./retainerAssembly";
import { verifyGeneratedDocument, type VerificationResult } from "./postGenerationVerification";

export type DocxTemplateBinary = {
  templateId: string;
  version: string;
  sha256: string;
  bytes: Uint8Array;
  extractedText: string;
};

export type DocxRenderSuccess = {
  ok: true;
  matterId: string;
  fileName: string;
  bytes: Uint8Array;
  sha256: string;
  verification: VerificationResult;
};

export type DocxRenderFailure = {
  ok: false;
  code:
    | "ASSEMBLY_PLAN_INVALID"
    | "TEMPLATE_BINARY_MISSING"
    | "TEMPLATE_ID_MISMATCH"
    | "TEMPLATE_VERSION_MISMATCH"
    | "TEMPLATE_HASH_MISMATCH"
    | "PLACEHOLDER_NOT_FOUND"
    | "POST_GENERATION_VERIFICATION_FAILED";
  errors: string[];
  quarantineRequired: boolean;
};

export type DocxRenderResult = DocxRenderSuccess | DocxRenderFailure;

export function renderRetainerDocx(
  plan: RetainerAssemblyPlan,
  templateBinary?: DocxTemplateBinary
): DocxRenderResult {
  if (!plan.ok) {
    return fail("ASSEMBLY_PLAN_INVALID", plan.errors, false);
  }

  if (!templateBinary || templateBinary.bytes.byteLength === 0) {
    return fail(
      "TEMPLATE_BINARY_MISSING",
      ["The approved DOCX template binary has not been registered."],
      false
    );
  }

  if (templateBinary.templateId !== plan.template.id) {
    return fail("TEMPLATE_ID_MISMATCH", ["Template binary ID does not match the pinned template."], true);
  }

  if (templateBinary.version !== plan.template.version) {
    return fail(
      "TEMPLATE_VERSION_MISMATCH",
      ["Template binary version does not match the pinned template version."],
      true
    );
  }

  const binaryHash = sha256(templateBinary.bytes);
  if (binaryHash !== plan.template.sha256 || binaryHash !== templateBinary.sha256) {
    return fail(
      "TEMPLATE_HASH_MISMATCH",
      ["The DOCX binary hash does not match the attorney-approved template hash."],
      true
    );
  }

  const renderedTextResult = replaceAllowlistedPlaceholders(
    templateBinary.extractedText,
    plan.replacements
  );

  if (!renderedTextResult.ok) {
    return fail("PLACEHOLDER_NOT_FOUND", renderedTextResult.errors, true);
  }

  const verification = verifyGeneratedDocument({
    renderedText: renderedTextResult.text,
    expectedValues: plan.replacements,
  });

  if (verification.status !== "PASS") {
    return fail(
      "POST_GENERATION_VERIFICATION_FAILED",
      verification.findings.map((finding) => finding.message),
      verification.quarantineRequired
    );
  }

  // Binary mutation is intentionally not performed until the approved DOCX package
  // transformer is registered. Returning original bytes would falsely imply assembly.
  return fail(
    "TEMPLATE_BINARY_MISSING",
    ["A controlled DOCX package transformer is required before binary output is permitted."],
    false
  );
}

export function replaceAllowlistedPlaceholders(
  text: string,
  replacements: Record<string, string>
): { ok: true; text: string } | { ok: false; errors: string[] } {
  let rendered = text;
  const errors: string[] = [];

  for (const [key, value] of Object.entries(replacements)) {
    const token = `{{${key}}}`;
    if (!rendered.includes(token)) {
      errors.push(`Approved placeholder ${token} was not found in the template.`);
      continue;
    }
    rendered = rendered.split(token).join(escapeXml(value));
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, text: rendered };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(
  code: DocxRenderFailure["code"],
  errors: string[],
  quarantineRequired: boolean
): DocxRenderFailure {
  return { ok: false, code, errors, quarantineRequired };
}
