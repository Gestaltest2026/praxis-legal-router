import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTemplateData,
  contractMoney,
  parseBrowardCaseText,
  type RetainerMatter,
  validateMatter,
} from "./rules";

const validMatter: RetainerMatter = {
  templateVariant: "no-guarantee",
  deliveryMethod: "Adobe Sign",
  recipientName: "Karen Williams North",
  recipientDesignation: "Esq.",
  clientFirm: "North Law Office, P.A.",
  addressLine1: "8201 Peters Rd.",
  addressLine2: "Ste. 1000",
  cityStateZip: "Plantation, FL 33324",
  salutation: "Ms. North",
  clientInitials: "N.L.O.",
  plaintiffName: "Travel World Wide Inc",
  defendantName: "Zaacast LLC",
  caseNumber: "COWE23004327",
  officeFileNumber: "26-001 (AF)",
  clientSide: "Plaintiff",
  feeClaimantSide: "Plaintiff",
  feePosition: "Support fee claim",
  expertRate: 425,
  staffRate: 175,
  deposit: 1000,
  acknowledgementDate: "2026-07-30",
  sourceLabel: "Broward Clerk Case Detail PDF",
  sourceConfirmed: true,
  attorneyAddressConfirmed: true,
  templateConfirmed: true,
};

test("extracts the official Broward caption and case number", () => {
  const extracted = parseBrowardCaseText(`
    Case Detail - Public
    Travel World Wide Inc Plaintiff vs. Zaacast LLC Defendant
    Broward County Case Number: COWE23004327
  `);
  assert.equal(extracted.plaintiffName, "Travel World Wide Inc");
  assert.equal(extracted.defendantName, "Zaacast LLC");
  assert.equal(extracted.caseNumber, "COWE23004327");
});

test("uses one monetary source for words and figures", () => {
  assert.deepEqual(contractMoney(425), {
    words: "Four Hundred Twenty-Five and 00/100 Dollars",
    currency: "$425.00",
  });
});

test("blocks unconfirmed sources and Florida-style address drift", () => {
  const result = validateMatter({
    ...validMatter,
    cityStateZip: "Plantation, Florida 33324",
    sourceConfirmed: false,
  });
  assert.equal(result.status, "RED");
  assert.match(result.blockers.join(" "), /Morrie style/);
  assert.match(result.blockers.join(" "), /Step 1/);
});

test("builds the approved no-guarantee template data", () => {
  const data = buildTemplateData(validMatter, new Date("2026-07-30T12:00:00Z"));
  assert.equal(data.DEPOSIT_CURRENCY, "$1,000.00");
  assert.equal(data.TODAY_LONG, "July 30, 2026");
  assert.match(data.SCOPE_PARAGRAPH, /Plaintiff’s claim/);
  assert.equal(data.GUARANTEE_CHECK, "PASS — Guarantee block absent");
});
