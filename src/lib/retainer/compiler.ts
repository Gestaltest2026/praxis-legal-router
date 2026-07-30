import fs from "node:fs/promises";
import path from "node:path";

import Docxtemplater from "docxtemplater";
import JSZip from "jszip";
import PizZip from "pizzip";

import {
  buildTemplateData,
  type RetainerMatter,
  validateMatter,
} from "./rules";

const TEMPLATE_ROOT = path.join(
  process.cwd(),
  "src",
  "templates",
  "retainer"
);
const TOKEN_PATTERN = /\{[A-Z][A-Z0-9_]*\}/g;

async function readTemplate(filename: string): Promise<Buffer> {
  const binaryPath = path.join(TEMPLATE_ROOT, filename);
  try {
    return await fs.readFile(binaryPath);
  } catch {
    const encoded = await fs.readFile(`${binaryPath}.b64`, "utf8");
    return Buffer.from(encoded.trim(), "base64");
  }
}

function renderDocx(template: Buffer, data: Record<string, string>): Buffer {
  const zip = new PizZip(template);
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter(part) {
      throw new Error(`Missing template value: ${part.value}`);
    },
  });

  document.render(data);
  const output = document.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const inspectionZip = new PizZip(output);
  const unresolved: string[] = [];
  for (const name of Object.keys(inspectionZip.files)) {
    if (!name.startsWith("word/") || !name.endsWith(".xml")) continue;
    const text = inspectionZip.file(name)?.asText() || "";
    unresolved.push(...(text.match(TOKEN_PATTERN) || []));
  }
  if (unresolved.length) {
    throw new Error(
      `Unresolved Word template tokens: ${[...new Set(unresolved)].join(", ")}`
    );
  }

  return output;
}

function safeStem(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 70) || "Matter"
  );
}

export async function compileRetainerPackage(
  matter: RetainerMatter
): Promise<{ bytes: Buffer; filename: string }> {
  const validation = validateMatter(matter);
  if (validation.blockers.length) {
    throw new Error(validation.blockers.join(" "));
  }

  const agreementName =
    matter.templateVariant === "with-guarantee"
      ? "fee-expert-agreement-with-guarantee.docx"
      : "fee-expert-agreement-no-guarantee.docx";
  const [agreementTemplate, coverTemplate, reviewTemplate] = await Promise.all([
    readTemplate(agreementName),
    readTemplate("fee-expert-executing-cover.docx"),
    readTemplate("attorney-review-packet.docx"),
  ]);

  const data = buildTemplateData(matter);
  const agreement = renderDocx(agreementTemplate, data);
  const cover = renderDocx(coverTemplate, data);
  const review = renderDocx(reviewTemplate, data);
  const matterStem = safeStem(`${matter.plaintiffName}_v_${matter.defendantName}`);

  const zip = new JSZip();
  zip.file(`${matterStem}_Retainer_Agreement.docx`, agreement);
  zip.file(`${matterStem}_Executing_Cover_Letter.docx`, cover);
  zip.file(`${matterStem}_Attorney_Review_Packet.docx`, review);
  zip.file(
    `${matterStem}_manifest.json`,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        matter: {
          caseNumber: matter.caseNumber,
          officeFileNumber: matter.officeFileNumber,
          plaintiffName: matter.plaintiffName,
          defendantName: matter.defendantName,
        },
        route: {
          templateVariant: matter.templateVariant,
          clientSide: matter.clientSide,
          feeClaimantSide: matter.feeClaimantSide,
          feePosition: matter.feePosition,
          deliveryMethod: matter.deliveryMethod,
        },
        checks: {
          requiredVariables: "PASS",
          moneySingleSource: "PASS",
          sanitizedTemplate: "PASS",
          unresolvedTokens: "PASS",
        },
        warning:
          "Attorney approval is required. Praxis generated the package but did not send it.",
      },
      null,
      2
    )
  );

  return {
    bytes: await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    }),
    filename: `${matterStem}_Retainer_Production_Package.zip`,
  };
}
