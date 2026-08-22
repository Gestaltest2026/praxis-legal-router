import { NextResponse } from "next/server";
import { assembleRetainerDraft, buildClientFacingQuestions, buildCustomizationNotes } from "@/lib/retainer/assemble";
import { buildDocxFromTemplateBase64, extractTextFromDocxBase64 } from "@/lib/retainer/docx";
import { extractCanonicalFacts, extractTemplateSlots } from "@/lib/retainer/extract";
import { mapSlotsToFacts, summarizeMappings } from "@/lib/retainer/map";
import type { RetainerBuilderOutput } from "@/lib/retainer/schema";
import { determineRetainerStatus, verifyRetainerDraft } from "@/lib/retainer/verify";

type UploadedFile = {
  name: string;
  contentType?: string;
  base64: string;
};

type RequestBody = {
  templateFile?: UploadedFile;
  intakeFile?: UploadedFile;
  attorneyInstructions?: string;
  forbiddenTerms?: string[];
};

type FileBuildOutput = RetainerBuilderOutput & {
  outputFileName?: string;
  outputDocxBase64?: string;
  attorneyReviewPacket: string;
  templateTextPreview: string;
  intakeTextPreview: string;
};

function fail(message: string, details: string[], status = 400) {
  return NextResponse.json(
    {
      completedDraft: "",
      fieldsFilled: [],
      missingInformation: details,
      mappingConflicts: [],
      templateAmbiguities: [],
      customizationNotes: [],
      attorneyReviewFlags: [message],
      clientFacingQuestions: [],
      verificationFindings: [],
      status: "DO_NOT_GENERATE",
      failureType: "Do Not Generate",
      attorneyReviewPacket: renderPacket({
        status: "DO_NOT_GENERATE",
        reason: message,
        fieldsFilled: [],
        missingInformation: details,
        mappingConflicts: [],
        templateAmbiguities: [],
        customizationNotes: [],
        attorneyReviewFlags: [message],
        clientFacingQuestions: [],
        verificationFindings: [],
      }),
      templateTextPreview: "",
      intakeTextPreview: "",
    } satisfies FileBuildOutput,
    { status }
  );
}

function cleanTerms(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function isDocx(file: UploadedFile): boolean {
  return file.name.toLowerCase().endsWith(".docx") || file.contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function isText(file: UploadedFile): boolean {
  return file.name.toLowerCase().endsWith(".txt") || file.contentType?.startsWith("text/") === true;
}

function decodeTextFile(file: UploadedFile): string {
  return Buffer.from(file.base64, "base64").toString("utf8");
}

function extractFileText(file: UploadedFile): string {
  if (isDocx(file)) return extractTextFromDocxBase64(file.base64);
  if (isText(file)) return decodeTextFile(file);
  throw new Error(`Unsupported file type for ${file.name}. Use .docx or .txt.`);
}

function renderPacket(args: {
  status: string;
  reason: string;
  fieldsFilled: string[];
  missingInformation: string[];
  mappingConflicts: string[];
  templateAmbiguities: string[];
  customizationNotes: string[];
  attorneyReviewFlags: string[];
  clientFacingQuestions: string[];
  verificationFindings: string[];
}) {
  const list = (items: string[]) => (items.length ? items.map((item) => `- ${item}`).join("\n") : "- None");
  return `PRAXIS ATTORNEY REVIEW PACKET — RETAINER AGREEMENT\n\nSTATUS\n${args.status}\n\nREASON\n${args.reason}\n\nFIELDS FILLED\n${list(args.fieldsFilled)}\n\nMISSING INFORMATION\n${list(args.missingInformation)}\n\nMAPPING CONFLICTS\n${list(args.mappingConflicts)}\n\nTEMPLATE AMBIGUITIES\n${list(args.templateAmbiguities)}\n\nCUSTOMIZATION NOTES\n${list(args.customizationNotes)}\n\nATTORNEY REVIEW FLAGS\n${list(args.attorneyReviewFlags)}\n\nCLIENT-FACING QUESTIONS\n${list(args.clientFacingQuestions)}\n\nPOST-BUILD VERIFICATION\n${list(args.verificationFindings)}\n\nBOUNDARY\nPraxis assembled a template-controlled draft from uploaded files. It did not decide legal validity, redesign legal terms, approve scope/fee clauses, or authorize external delivery. Attorney review is required before use.`;
}

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return fail("Invalid JSON request body.", ["Request body must contain templateFile and intakeFile."]);
  }

  if (!body.templateFile?.base64) return fail("Retainer Agreement template file is missing.", ["Upload a .docx or .txt Retainer Agreement template file."]);
  if (!body.intakeFile?.base64) return fail("Filled intake form file is missing.", ["Upload a .docx or .txt filled intake form file."]);

  let templateText: string;
  let intakeText: string;

  try {
    templateText = extractFileText(body.templateFile);
    intakeText = extractFileText(body.intakeFile);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "File parsing failed.", ["Use .docx or .txt files for v0.1 file build."]);
  }

  const slots = extractTemplateSlots(templateText);
  if (!slots.length) {
    return fail("No fillable slots were detected in the uploaded Retainer Agreement template.", ["The Word template must contain explicit placeholders such as {{clientName}}, [CLIENT NAME], or <<CLIENT_NAME>> for v0.1."]);
  }

  const facts = extractCanonicalFacts(intakeText, body.intakeFile.name);
  if (!facts.length) {
    return fail("No structured facts were detected in the uploaded intake file.", ["Use labeled intake lines such as Client Legal Name: Jane Doe, Retainer Amount: $3,000, Scope of Representation: ..."]);
  }

  const mappings = mapSlotsToFacts(slots, facts);
  const summary = summarizeMappings(mappings);
  const attorneyReviewFlags = [
    ...summary.attorneyReviewFlags,
    ...(body.attorneyInstructions?.trim() ? ["Attorney/source instructions were provided. Confirm whether they authorize changes beyond field completion."] : []),
  ];

  let completedDraft = assembleRetainerDraft(templateText, mappings);
  let outputDocxBase64: string | undefined;
  let outputFileName: string | undefined;
  const verificationFindings = verifyRetainerDraft({
    draft: completedDraft,
    mappings,
    forbiddenTerms: cleanTerms(body.forbiddenTerms),
  });

  if (isDocx(body.templateFile)) {
    try {
      const docx = buildDocxFromTemplateBase64({ templateBase64: body.templateFile.base64, mappings });
      outputDocxBase64 = docx.base64;
      outputFileName = body.templateFile.name.replace(/\.docx$/i, "") + " - Praxis Draft.docx";
      completedDraft = extractTextFromDocxBase64(outputDocxBase64);
      if (docx.unresolvedXmlPlaceholders.length) {
        verificationFindings.push(`RED: Unresolved DOCX placeholders remain: ${docx.unresolvedXmlPlaceholders.slice(0, 12).join(", ")}`);
      }
    } catch (error) {
      verificationFindings.push(`RED: DOCX assembly failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  const status = determineRetainerStatus({
    missingInformation: summary.missingInformation,
    mappingConflicts: summary.mappingConflicts,
    templateAmbiguities: summary.templateAmbiguities,
    attorneyReviewFlags,
    verificationFindings,
  });

  const reason = status === "READY_FOR_ATTORNEY_REVIEW"
    ? "Uploaded file template was assembled and deterministic verification passed."
    : status === "ATTORNEY_DECISION_REQUIRED"
      ? "Draft was assembled, but attorney decision or human clarification is required."
      : "Blocking issue detected. Do not use generated output until resolved.";

  const output: FileBuildOutput = {
    completedDraft,
    fieldsFilled: summary.fieldsFilled,
    missingInformation: summary.missingInformation,
    mappingConflicts: summary.mappingConflicts,
    templateAmbiguities: summary.templateAmbiguities,
    customizationNotes: buildCustomizationNotes(mappings, body.attorneyInstructions),
    attorneyReviewFlags,
    clientFacingQuestions: buildClientFacingQuestions(summary.missingInformation, summary.templateAmbiguities, summary.mappingConflicts),
    verificationFindings,
    status,
    failureType: status === "DO_NOT_GENERATE" ? "Do Not Generate" : status === "ATTORNEY_DECISION_REQUIRED" ? "Attorney Decision Required" : undefined,
    outputFileName,
    outputDocxBase64,
    attorneyReviewPacket: renderPacket({
      status,
      reason,
      fieldsFilled: summary.fieldsFilled,
      missingInformation: summary.missingInformation,
      mappingConflicts: summary.mappingConflicts,
      templateAmbiguities: summary.templateAmbiguities,
      customizationNotes: buildCustomizationNotes(mappings, body.attorneyInstructions),
      attorneyReviewFlags,
      clientFacingQuestions: buildClientFacingQuestions(summary.missingInformation, summary.templateAmbiguities, summary.mappingConflicts),
      verificationFindings,
    }),
    templateTextPreview: templateText.slice(0, 5000),
    intakeTextPreview: intakeText.slice(0, 5000),
  };

  return NextResponse.json(output);
}
