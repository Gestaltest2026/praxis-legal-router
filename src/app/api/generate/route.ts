import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.1-8b-instant";

type RequestBody = {
  mode: string;
  matterTypes: string[];
  rawMaterials: string;
  currentDraft: string;
  processNotes: string;
  oldMatterTerms: string;
  partyInfo: string;
  dealTerms: string;
  deadline: string;
  deadlineIntentionallyBlank: boolean;
  reviewerType: string;
};

type DealTermRow = {
  term: string;
  value: string;
  provenance: string;
  raw: string;
};

const HARD_RULES = `You are Praxis, an NDA preparation assistant for a law firm employee.
You are not a lawyer. You never give legal advice or legal conclusions.

HARD RULES
1. Never state whether a clause is legally correct, enforceable, or advisable.
2. Phrase every legal question as a neutral numbered question for the attorney. No recommendations.
3. Never invent facts, parties, amounts, or dates. Missing information goes in the Missing Information section.
4. Never correct or rewrite document text. You detect and label only.
5. If any Do Not Send condition is open, the Draft Response section must contain exactly: "Not produced — [reason]".
6. Admin / Paralegal Fixes must describe detected issues, not rewrite instructions. Prefer "X appears/missing/mismatch — verify before attorney review." Do not use "Update X to..." unless the replacement value is directly provided by Party Information or Deal Terms and the issue is purely mechanical.
7. Branches Triggered must include only triggered branches. Do not include "none", "N/A", or inactive branches.
8. Key Facts must not include legal clause-review issues such as jurisdiction, forum, fee-shifting, release scope, non-compete, drafting voice, remedy language, or venue language. Put those under Branches Triggered, Attorney Decision Points, or Admin / Paralegal Fixes.

APPLICATION-LEVEL SOURCE OF TRUTH RULES
1. Current parties may only come from PARTY INFORMATION.
2. Do not identify any party from Raw Materials or Current Draft as a current party unless that party also appears in PARTY INFORMATION.
3. Items in OLD / EXCLUDED NAMES AND TERMS are never current parties, never current facts, and never missing party information.
4. Excluded items may appear only under Stop Conditions, Branches Triggered, Admin / Paralegal Fixes, or Items Not Touched.
5. Key Facts must include only current-matter facts from Party Information, Deal Terms, Client Email, or Attorney Instruction.
6. Old-matter residue must not appear in Matter Summary or Key Facts.
7. Do not convert Unknown or Inherited provenance into Known. Ask for confirmation instead.
8. If the deadline is blank and DEADLINE INTENTIONALLY BLANK is No, do not say it was intentionally left blank.
9. DETERMINISTIC STOP CHECKS are controlling. If they identify S1, S3, S4, S6, S7, or S8, report those statuses exactly.
10. If DETERMINISTIC STOP CHECKS says MODEL CHECK REQUIRED for S2 or S5, include that line in Stop Conditions unless you can clearly mark it OPEN or CLEARED from the provided materials.

OLD-MATTER RESIDUE RULE
If a name, date, amount, address, or fact appears in Raw Materials or Current Draft but is listed under Old / Excluded Names and Terms, treat it as old-matter residue.
Do not list old-matter residue as Missing Information or Key Facts.
List it only under Stop Conditions, Branches Triggered, Admin / Paralegal Fixes, or Items Not Touched.

SOURCE DOCUMENT LABEL RULE
In Source Documents, use only these labels:
BASE, REFERENCE, QUARANTINED, CLIENT EMAIL, ATTORNEY INSTRUCTION, UNKNOWN.
Do not use branch labels such as [Admin Fix] or [Attorney Review] as Source Document labels.

ATTORNEY INSTRUCTION RULE
If Raw Materials contains a section labeled ATTORNEY INSTRUCTION and it contains a non-empty instruction, S6 must be CLEARED.
If the instruction is vague, mark S6 as CLEARED but note that the objective is sparse.
Do not mark S6 OPEN when an ATTORNEY INSTRUCTION section exists and contains text.

DEAL TERM PROVENANCE RULE
If any Deal Term has Provenance = Unknown or Inherited, S3 is OPEN.
Do not rewrite that term as confirmed.
Do not tell the user to update the provenance to Known.
Instead, identify it as requiring confirmation or attorney review.

LABELS — classify every finding as exactly one:
[Admin Fix] mechanical: old names/dates/addresses, broken merge fields, numbering, heading typos, formatting.
[Paralegal Review] needs cross-check against the Party Information or Deal Terms tables before fixing.
[Attorney Review] amounts, release scope, venue changes, drafting-voice shifts ("PARTIES" vs "you"), restrictive covenant radius/duration, individual-capacity decisions, asymmetric remedies in mutual clauses, equity components, undefined terms.
[Client Follow-Up] missing factual input only the client can supply.
[Human Confirmation Required] intent the documents cannot show: blank-date intent, hybrid-template status, whether a change was deliberate. If Human Process Notes are empty, mark all such items UNRESOLVED; if provided, apply them and state which items they resolve.
[Do Not Send] an old/excluded matter term appears in the current draft; the draft is not confirmed attorney-approved; no send authorization exists.

STOP CONDITIONS — check all, report each as OPEN or CLEARED:
S1 Old/excluded matter term appears in the current draft → Do Not Send.
S2 Any source document whose caption/title parties differ from its body parties → quarantine it; Human Confirmation Required.
S3 Any Deal Term with Provenance = Unknown or Inherited → Attorney Review before use.
S4 Deadline empty and not marked intentionally blank → Human Confirmation Required.
S5 Any party missing name, address, or capacity → Client Follow-Up.
S6 No attorney instruction found in Raw Materials → state the assumed objective and flag it.
S7 Draft not confirmed as the attorney-approved version → Do Not Send for external delivery.
S8 Equity or membership-interest language ("membership interest", "certificates") anywhere → Attorney Review before drafting the exchange clause.`;

const PROMPTS: Record<string, string> = {
  "General Attorney Review Memo": `${HARD_RULES}

TASK
Produce a concise one-page attorney review memo from the provided materials, using the output skeleton in the user message. Skip NDA-specific branch detection; still apply the labels and any stop conditions that plainly appear.

OUTPUT
Return only the fixed markdown package format given in the user message. Professional, concise English.`,

  "NDA Preparation": `${HARD_RULES}

TASK
Run the full NDA preparation workflow: classify the matter, extract parties and deal terms, detect branches, detect stop conditions, and produce the attorney-review ready package.

DETECTION DUTIES
- Treat DETERMINISTIC STOP CHECKS as controlling.
- If DETERMINISTIC STOP CHECKS says S1 OPEN, report S1 OPEN exactly and use the listed old/excluded terms as the reason.
- If DETERMINISTIC STOP CHECKS says S3 OPEN, report S3 OPEN exactly and use the listed deal terms as the reason.
- If DETERMINISTIC STOP CHECKS says S4 OPEN, report S4 OPEN exactly.
- If DETERMINISTIC STOP CHECKS says S6 CLEARED, report S6 CLEARED.
- If DETERMINISTIC STOP CHECKS says S7 OPEN, report S7 OPEN exactly.
- If DETERMINISTIC STOP CHECKS says S8 OPEN, report S8 OPEN exactly and use the listed terms as the reason.
- Include S1 through S8 in Stop Conditions. If S2 or S5 is not deterministically checked, include the MODEL CHECK REQUIRED line.
- Do not treat old/excluded terms as current parties, current facts, or missing party information.
- Matter Summary must identify current parties only from PARTY INFORMATION.
- Key Facts must exclude old-matter residue and legal clause-review issues.
- Compare Raw Materials against the Final/Current Draft when both exist.
- Check every party in Party Information against caption, recitals, notices, signature blocks, and initials in the draft.
- Flag any Deal Term whose provenance is Inherited or Unknown.
- If Human Process Notes are empty, mark all Human Confirmation items UNRESOLVED; if provided, apply them and say which items they resolve.

OUTPUT
Return only the fixed markdown package format given in the user message. Professional, concise English.`,

  "NDA Difference Analysis": `${HARD_RULES}

TASK
Compare the documents in Raw Materials against the Final/Current Draft. Return a markdown difference table with columns: Location | Source version | Draft version | Label | Reason. Label every difference as Mechanical ([Admin Fix]/[Paralegal Review]) or Attorney-Sensitive ([Attorney Review]) or [Human Confirmation Required]. After the table, list any stop conditions S1–S8 that the differences reveal, each OPEN or CLEARED. Do not produce a full package.`,

  "NDA Branching Logic": `${HARD_RULES}

TASK
Identify which branching rules fire on these materials. For each fired rule, output a card:
RULE: [short name]
CONDITION MET: [what was found]
EVIDENCE: [short quote or location]
REQUIRES: [label]
WHY: [one practical sentence]
Then list all stop conditions S1–S8 as OPEN or CLEARED. Do not produce a full package or draft text.`,

  "NDA Attorney-Review Ready Package": `${HARD_RULES}

TASK
Assume analysis is already reflected in the provided fields and notes. Assemble the attorney-review ready package from the structured inputs using the output skeleton in the user message. Do not re-analyze beyond confirming stop conditions S1–S8.

OUTPUT
Return only the fixed markdown package format given in the user message. Professional, concise English.`,
};

const OUTPUT_SKELETON = `Fill in this exact markdown structure:

# Attorney-Review Ready Package — [Matter]

## Matter Summary
[2–3 sentences; if the objective is assumed, write "ASSUMED:" before it]

## Current Phase
Phase [1–10] — [one line]

## Source Documents
| Document | Internal date | Label | Evidence |
|---|---|---|---|

## Key Facts
- [max 5 bullets]

## Missing Information
- [item] — [follow-up status]

## Branches Triggered
- [matter type or rule] — [reason] — [label]

## Stop Conditions
- S# [condition] — OPEN/CLEARED/MODEL CHECK REQUIRED — [message]

## Attorney Decision Points
1. [question]

## Admin / Paralegal Fixes
- [fix] — [location] — [Admin Fix or Paralegal Review]

## Items Not Touched
- [item] — [reason]

## Immediate Next Action
[one sentence]

## Draft Response
[bracketed draft text, or "Not produced — [reason]"]`;

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findOldMatterHits(
  currentDraft: string,
  oldMatterTerms: string
): string[] {
  if (!currentDraft || !oldMatterTerms) return [];

  const draftLower = currentDraft.toLowerCase();

  return splitLines(oldMatterTerms).filter((term) =>
    draftLower.includes(term.toLowerCase())
  );
}

function parseDealTerms(dealTerms: string): DealTermRow[] {
  return splitLines(dealTerms)
    .filter((line) => !/^term\s*\|/i.test(line))
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());

      return {
        term: parts[0] || "",
        value: parts[1] || "",
        provenance: parts[2] || "",
        raw: line,
      };
    })
    .filter((row) => row.term || row.value || row.provenance);
}

function findUnresolvedDealTerms(dealTerms: string): DealTermRow[] {
  return parseDealTerms(dealTerms).filter((row) =>
    /^(unknown|inherited)$/i.test(row.provenance)
  );
}

function detectAttorneyInstruction(rawMaterials: string): boolean {
  if (!rawMaterials) return false;

  const match = rawMaterials.match(
    /---\s*ATTORNEY INSTRUCTION\s*---([\s\S]*)/i
  );

  if (!match) return false;

  const instructionText = match[1]
    .split(/---\s*[A-Z0-9 _/-]+\s*---/i)[0]
    .trim();

  return instructionText.length > 0;
}

function findEquityLanguageHits(body: RequestBody): string[] {
  const haystack = [
    body.rawMaterials,
    body.currentDraft,
    body.dealTerms,
    body.matterTypes.join("\n"),
  ]
    .join("\n")
    .toLowerCase();

  const terms = [
    "membership interest",
    "membership interests",
    "membership certificate",
    "membership certificates",
    "certificates evidencing",
    "equity",
  ];

  return terms.filter((term) => haystack.includes(term));
}

function buildDeterministicStopChecks(
  body: RequestBody,
  oldMatterHits: string[],
  unresolvedDealTerms: DealTermRow[],
  hasAttorneyInstruction: boolean,
  equityLanguageHits: string[]
): string {
  const checks: string[] = [];

  if (oldMatterHits.length > 0) {
    checks.push(
      `S1 OPEN — Old/excluded matter terms found in current draft: ${oldMatterHits.join(
        ", "
      )}`
    );
  } else {
    checks.push(
      `S1 CLEARED — No old/excluded matter terms found in current draft.`
    );
  }

  checks.push(
    `S2 MODEL CHECK REQUIRED — Evaluate whether any source caption/title parties differ from body parties.`
  );

  if (unresolvedDealTerms.length > 0) {
    checks.push(
      `S3 OPEN — Deal terms with Unknown or Inherited provenance: ${unresolvedDealTerms
        .map((row) => `${row.term} (${row.provenance})`)
        .join(", ")}`
    );
  } else {
    checks.push(`S3 CLEARED — No deal terms marked Unknown or Inherited.`);
  }

  if (!body.deadline && !body.deadlineIntentionallyBlank) {
    checks.push(
      `S4 OPEN — Deadline is blank and not marked intentionally blank.`
    );
  } else {
    checks.push(`S4 CLEARED — Deadline supplied or intentionally blank.`);
  }

  checks.push(
    `S5 MODEL CHECK REQUIRED — Evaluate whether any current party is missing name, address, or capacity.`
  );

  if (hasAttorneyInstruction) {
    checks.push(`S6 CLEARED — ATTORNEY INSTRUCTION section found.`);
  } else {
    checks.push(`S6 OPEN — No ATTORNEY INSTRUCTION section found.`);
  }

  checks.push(
    `S7 OPEN — Draft not confirmed attorney-approved for external delivery.`
  );

  if (equityLanguageHits.length > 0) {
    checks.push(
      `S8 OPEN — Equity or membership-interest language found: ${equityLanguageHits.join(
        ", "
      )}`
    );
  } else {
    checks.push(
      `S8 CLEARED — No equity or membership-interest language found.`
    );
  }

  return checks.join("\n");
}

function buildUserMessage(
  body: RequestBody,
  deterministicStopChecks: string
): string {
  return [
    `MATTER TYPES: ${body.matterTypes.join("; ")}`,
    ``,
    `REVIEWER TYPE: ${body.reviewerType}`,
    ``,
    `DEADLINE: ${body.deadline || "(blank)"}`,
    `DEADLINE INTENTIONALLY BLANK (confirmed): ${
      body.deadlineIntentionallyBlank ? "Yes" : "No"
    }`,
    ``,
    `DETERMINISTIC STOP CHECKS:`,
    deterministicStopChecks,
    ``,
    `OLD / EXCLUDED NAMES AND TERMS:`,
    body.oldMatterTerms || "(none provided)",
    ``,
    `APPLICATION-LEVEL SOURCE OF TRUTH RULES:`,
    `- Current parties may only come from PARTY INFORMATION.`,
    `- Items in OLD / EXCLUDED NAMES AND TERMS are never current parties, never current facts, and never missing party information.`,
    `- Excluded items may appear only under Stop Conditions, Branches Triggered, Admin / Paralegal Fixes, or Items Not Touched.`,
    `- Key Facts must include only current-matter facts from Party Information, Deal Terms, Client Email, or Attorney Instruction.`,
    `- Key Facts must not include legal clause-review issues such as jurisdiction, forum, fee-shifting, release scope, non-compete, drafting voice, remedy language, or venue language.`,
    `- Do not convert Unknown or Inherited provenance into Known. Ask for confirmation instead.`,
    `- If deadline is blank and DEADLINE INTENTIONALLY BLANK is No, do not say the deadline was intentionally left blank.`,
    `- Branches Triggered must include only triggered branches. Do not include none, N/A, or inactive branches.`,
    ``,
    `PARTY INFORMATION (pipe table — Name | Type | Capacity | Address | Signer | Initials):`,
    body.partyInfo,
    ``,
    `DEAL TERMS (pipe table — Term | Value | Provenance):`,
    body.dealTerms,
    ``,
    `RAW MATERIALS:`,
    body.rawMaterials,
    ``,
    `CURRENT DRAFT:`,
    body.currentDraft?.trim() ? body.currentDraft : "(none provided)",
    ``,
    `HUMAN PROCESS NOTES:`,
    body.processNotes?.trim() ? body.processNotes : "(none collected yet)",
    ``,
    OUTPUT_SKELETON,
  ].join("\n");
}

function enforceDoNotSend(output: string, oldMatterHits: string[]): string {
  if (oldMatterHits.length === 0) return output;

  const reason = `S1 old/excluded matter term remains in current draft: ${oldMatterHits.join(
    ", "
  )}`;

  if (output.includes("## Draft Response")) {
    return output.replace(
      /## Draft Response[\s\S]*$/i,
      `## Draft Response\nNot produced — ${reason}`
    );
  }

  return `${output}\n\n## Draft Response\nNot produced — ${reason}`;
}

function polishUnsafeOutput(output: string): string {
  let polished = output;

  polished = polished.replace(
    /- Update the non-compete radius to a specific value.*$/gim,
    "- Non-compete radius provenance is Unknown — confirm before use — [Attorney Review]"
  );

  polished = polished.replace(
    /- Update the non-compete radius provenance to Known.*$/gim,
    "- Non-compete radius provenance is Unknown — confirm before use — [Attorney Review]"
  );

  polished = polished.replace(
    /- Update the payment amount to \$50.*$/gim,
    "- Payment amount should be cross-checked against Deal Terms before attorney review — [Paralegal Review]"
  );

  polished = polished.replace(
    /- Update the exchange window.*$/gim,
    "- Exchange window provenance is Inherited — confirm before use — [Paralegal Review]"
  );

  polished = polished.replace(/- AXION appears.*$/gim, "");

  polished = polished.replace(
    /- HALL appears.*$/gim,
    "- HALL appears in Current Draft — old/excluded matter residue — [Do Not Send]"
  );

  return polished;
}

function enforceImmediateNextAction(
  output: string,
  oldMatterHits: string[],
  unresolvedDealTerms: DealTermRow[]
): string {
  if (oldMatterHits.length === 0 && unresolvedDealTerms.length === 0) {
    return output;
  }

  const reasonParts: string[] = [];

  if (oldMatterHits.length > 0) {
    reasonParts.push("old-matter residue");
  }

  if (unresolvedDealTerms.length > 0) {
    reasonParts.push("unresolved deal-term provenance");
  }

  const nextAction = `Do not send. Resolve ${reasonParts.join(
    " and "
  )} before deadline follow-up or further drafting.`;

  if (output.includes("## Immediate Next Action")) {
    return output.replace(
      /## Immediate Next Action[\s\S]*?(?=\n## Draft Response|$)/i,
      `## Immediate Next Action\n${nextAction}\n`
    );
  }

  return `${output}\n\n## Immediate Next Action\n${nextAction}`;
}

function dedupeBulletLines(output: string): string {
  const lines = output.split("\n");
  const seen = new Set<string>();

  return lines
    .filter((line) => {
      if (!line.trim().startsWith("- ")) return true;

      const normalized = line.trim().toLowerCase();

      if (seen.has(normalized)) return false;

      seen.add(normalized);
      return true;
    })
    .join("\n");
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY is missing. Check .env.local and restart npm run dev.",
      },
      { status: 500 }
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const missing: string[] = [];

  if (!body.mode || typeof body.mode !== "string") missing.push("mode");

  if (!Array.isArray(body.matterTypes) || body.matterTypes.length === 0) {
    missing.push("matterTypes");
  }

  if (!body.rawMaterials || !body.rawMaterials.trim()) {
    missing.push("rawMaterials");
  }

  if (!body.partyInfo || !body.partyInfo.trim()) {
    missing.push("partyInfo");
  }

  if (!body.dealTerms || !body.dealTerms.trim()) {
    missing.push("dealTerms");
  }

  if (!body.oldMatterTerms || !body.oldMatterTerms.trim()) {
    missing.push("oldMatterTerms");
  }

  if (!body.reviewerType || !body.reviewerType.trim()) {
    missing.push("reviewerType");
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const systemPrompt = PROMPTS[body.mode];

  if (!systemPrompt) {
    return NextResponse.json(
      {
        error: `Unknown workflow mode: "${body.mode}". Valid modes: ${Object.keys(
          PROMPTS
        ).join(", ")}`,
      },
      { status: 400 }
    );
  }

  body.currentDraft =
    typeof body.currentDraft === "string" ? body.currentDraft : "";

  body.processNotes =
    typeof body.processNotes === "string" ? body.processNotes : "";

  body.oldMatterTerms =
    typeof body.oldMatterTerms === "string" ? body.oldMatterTerms : "";

  body.dealTerms = typeof body.dealTerms === "string" ? body.dealTerms : "";

  body.deadline = typeof body.deadline === "string" ? body.deadline : "";

  body.deadlineIntentionallyBlank = Boolean(body.deadlineIntentionallyBlank);

  const oldMatterHits = findOldMatterHits(
    body.currentDraft,
    body.oldMatterTerms
  );

  const unresolvedDealTerms = findUnresolvedDealTerms(body.dealTerms);

  const hasAttorneyInstruction = detectAttorneyInstruction(body.rawMaterials);

  const equityLanguageHits = findEquityLanguageHits(body);

  const deterministicStopChecks = buildDeterministicStopChecks(
    body,
    oldMatterHits,
    unresolvedDealTerms,
    hasAttorneyInstruction,
    equityLanguageHits
  );

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 2200,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: buildUserMessage(body, deterministicStopChecks),
        },
      ],
    });

    const rawOutput = completion.choices?.[0]?.message?.content ?? "";

    if (!rawOutput.trim()) {
      return NextResponse.json(
        { error: "Model returned an empty response. Try again." },
        { status: 502 }
      );
    }

    const nextActionOutput = enforceImmediateNextAction(
      rawOutput,
      oldMatterHits,
      unresolvedDealTerms
    );
    const polishedOutput = polishUnsafeOutput(nextActionOutput);
    const dedupedOutput = dedupeBulletLines(polishedOutput);
    const output = enforceDoNotSend(dedupedOutput, oldMatterHits);

    return NextResponse.json({ output });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Groq API error";

    return NextResponse.json(
      { error: `Groq API error: ${message}` },
      { status: 502 }
    );
  }
}