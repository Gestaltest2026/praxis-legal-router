import { NextResponse } from "next/server";
import { assembleRetainerDraft, buildClientFacingQuestions, buildCustomizationNotes } from "@/lib/retainer/assemble";
import { extractCanonicalFacts, extractTemplateSlots } from "@/lib/retainer/extract";
import { mapSlotsToFacts, summarizeMappings } from "@/lib/retainer/map";
import type { RetainerBuilderInput, RetainerBuilderOutput } from "@/lib/retainer/schema";
import { determineRetainerStatus, verifyRetainerDraft } from "@/lib/retainer/verify";

function cleanForbiddenTerms(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function structuredFailure(message: string, details: string[]) {
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
    } satisfies RetainerBuilderOutput,
    { status: 400 }
  );
}

export async function POST(request: Request) {
  let body: RetainerBuilderInput;

  try {
    const raw = await request.json();
    body = {
      templateText: typeof raw.templateText === "string" ? raw.templateText : "",
      intakeText: typeof raw.intakeText === "string" ? raw.intakeText : "",
      attorneyInstructions: typeof raw.attorneyInstructions === "string" ? raw.attorneyInstructions : "",
      sourceRecord: typeof raw.sourceRecord === "string" ? raw.sourceRecord : "",
      forbiddenTerms: cleanForbiddenTerms(raw.forbiddenTerms),
    };
  } catch {
    return structuredFailure("Invalid JSON request body.", ["Request body must be valid JSON."]);
  }

  const missingInputs: string[] = [];
  if (!body.templateText.trim()) missingInputs.push("Retainer Agreement Template is missing.");
  if (!body.intakeText.trim()) missingInputs.push("Filled Out Intake Form is missing.");

  if (missingInputs.length) {
    return structuredFailure("Praxis cannot generate without both template and intake inputs.", missingInputs);
  }

  const slots = extractTemplateSlots(body.templateText);
  if (!slots.length) {
    return structuredFailure("No fillable template slots were detected.", [
      "Add explicit placeholders such as {{clientName}}, [CLIENT NAME], or <<CLIENT_NAME>> before using the Builder.",
    ]);
  }

  const facts = extractCanonicalFacts(body.intakeText);
  if (!facts.length) {
    return structuredFailure("No structured intake facts were detected.", [
      "Use key-value lines such as Client Name: Jane Doe, Retainer Amount: $3,000, Scope of Representation: Probate administration.",
    ]);
  }

  const mappings = mapSlotsToFacts(slots, facts);
  const summary = summarizeMappings(mappings);
  const completedDraft = assembleRetainerDraft(body.templateText, mappings);
  const verificationFindings = verifyRetainerDraft({
    draft: completedDraft,
    mappings,
    forbiddenTerms: body.forbiddenTerms,
  });

  const attorneyReviewFlags = [
    ...summary.attorneyReviewFlags,
    ...(body.attorneyInstructions?.trim()
      ? ["Attorney/source instructions were provided. Confirm whether they authorize any language changes beyond field completion."]
      : []),
  ];

  const status = determineRetainerStatus({
    missingInformation: summary.missingInformation,
    mappingConflicts: summary.mappingConflicts,
    templateAmbiguities: summary.templateAmbiguities,
    attorneyReviewFlags,
    verificationFindings,
  });

  const output: RetainerBuilderOutput = {
    completedDraft,
    fieldsFilled: summary.fieldsFilled,
    missingInformation: summary.missingInformation,
    mappingConflicts: summary.mappingConflicts,
    templateAmbiguities: summary.templateAmbiguities,
    customizationNotes: buildCustomizationNotes(mappings, body.attorneyInstructions),
    attorneyReviewFlags,
    clientFacingQuestions: buildClientFacingQuestions(
      summary.missingInformation,
      summary.templateAmbiguities,
      summary.mappingConflicts
    ),
    verificationFindings,
    status,
    failureType:
      status === "DO_NOT_GENERATE"
        ? "Do Not Generate"
        : status === "ATTORNEY_DECISION_REQUIRED"
          ? "Attorney Decision Required"
          : undefined,
  };

  return NextResponse.json(output);
}
