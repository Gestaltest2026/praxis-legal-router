import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import { compileRetainerPackage } from "./compiler";
import type { RetainerMatter } from "./rules";

const matter: RetainerMatter = {
  templateVariant: "no-guarantee",
  deliveryMethod: "Adobe Sign",
  recipientName: "Taylor Morgan",
  recipientDesignation: "Esq.",
  clientFirm: "Example Law Office, P.A.",
  addressLine1: "100 Main St.",
  addressLine2: "Ste. 200",
  cityStateZip: "Ft. Lauderdale, FL 33301",
  salutation: "Ms. Morgan",
  clientInitials: "E.L.O.",
  plaintiffName: "Example Plaintiff, Inc.",
  defendantName: "Example Defendant, LLC",
  caseNumber: "COWE26001234",
  officeFileNumber: "26-001 (AF)",
  clientSide: "Plaintiff",
  feeClaimantSide: "Plaintiff",
  feePosition: "Support fee claim",
  expertRate: 425,
  staffRate: 175,
  deposit: 1000,
  acknowledgementDate: "2026-07-30",
  sourceLabel: "Fictional QA source",
  sourceConfirmed: true,
  attorneyAddressConfirmed: true,
  templateConfirmed: true,
};

async function packageFiles(variant: RetainerMatter["templateVariant"]) {
  const output = await compileRetainerPackage({
    ...matter,
    templateVariant: variant,
  });
  const zip = await JSZip.loadAsync(output.bytes);
  return Object.values(zip.files).filter((entry) => !entry.dir);
}

test("compiles the four-file no-guarantee production package", async () => {
  const files = await packageFiles("no-guarantee");
  assert.equal(files.length, 4);
  assert.ok(files.some((file) => file.name.endsWith("_Retainer_Agreement.docx")));
  assert.ok(files.some((file) => file.name.endsWith("_Executing_Cover_Letter.docx")));
  assert.ok(files.some((file) => file.name.endsWith("_Attorney_Review_Packet.docx")));
  assert.ok(files.some((file) => file.name.endsWith("_manifest.json")));

  const agreementEntry = files.find((file) =>
    file.name.endsWith("_Retainer_Agreement.docx")
  );
  assert.ok(agreementEntry);
  const agreement = await JSZip.loadAsync(
    await agreementEntry.async("nodebuffer")
  );
  const documentXml = await agreement.file("word/document.xml")?.async("text");
  assert.ok(documentXml);
  assert.doesNotMatch(documentXml, /\{[A-Z][A-Z0-9_]*\}/);
  assert.doesNotMatch(documentXml, />GUARANTEE</);
});

test("compiles the explicit Guarantee route", async () => {
  const files = await packageFiles("with-guarantee");
  const agreementEntry = files.find((file) =>
    file.name.endsWith("_Retainer_Agreement.docx")
  );
  assert.ok(agreementEntry);
  const agreement = await JSZip.loadAsync(
    await agreementEntry.async("nodebuffer")
  );
  const documentXml = await agreement.file("word/document.xml")?.async("text");
  assert.ok(documentXml);
  assert.match(documentXml, /GUARANTEE/);
  assert.match(documentXml, /jointly and severally responsible/);
});
