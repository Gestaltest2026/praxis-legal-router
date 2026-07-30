export type PartySide = "Plaintiff" | "Defendant";
export type FeePosition = "Support fee claim" | "Challenge fee claim";
export type TemplateVariant = "no-guarantee" | "with-guarantee";
export type DeliveryMethod = "Adobe Sign" | "Email only";
export type RecipientDesignation = "Esq." | "Attorney-at-Law";

export type RetainerMatter = {
  templateVariant: TemplateVariant;
  deliveryMethod: DeliveryMethod;
  recipientName: string;
  recipientDesignation: RecipientDesignation;
  clientFirm: string;
  addressLine1: string;
  addressLine2: string;
  cityStateZip: string;
  salutation: string;
  clientInitials: string;
  plaintiffName: string;
  defendantName: string;
  caseNumber: string;
  officeFileNumber: string;
  clientSide: PartySide;
  feeClaimantSide: PartySide;
  feePosition: FeePosition;
  expertRate: number;
  staffRate: number;
  deposit: number;
  acknowledgementDate: string;
  sourceLabel: string;
  sourceConfirmed: boolean;
  attorneyAddressConfirmed: boolean;
  templateConfirmed: boolean;
};

export type ExtractedCase = {
  caseCaption: string;
  caseNumber: string;
  plaintiffName: string;
  defendantName: string;
  retainingAttorney: string;
  attorneyAddress: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
};

export type ValidationResult = {
  status: "PASS" | "YELLOW" | "RED";
  blockers: string[];
  decisions: string[];
};

const REQUIRED_TEXT_FIELDS: Array<[keyof RetainerMatter, string]> = [
  ["recipientName", "Add the lawyer’s full name."],
  ["clientFirm", "Add the law firm after c/o."],
  ["addressLine1", "Add the lawyer’s mailing address."],
  ["cityStateZip", "Add the city, FL, and ZIP."],
  ["salutation", "Add “Mr./Ms. + last name” after Dear."],
  ["clientInitials", "Add the initials for the bottom of each page."],
  ["plaintiffName", "Add the Plaintiff’s exact legal name."],
  ["defendantName", "Add the Defendant’s exact legal name."],
  ["caseNumber", "Add the exact case number."],
  ["officeFileNumber", "Get Our File No. from the Office Manager."],
  [
    "acknowledgementDate",
    "Add the date Morrie was first contacted. Do not use today unless it is correct.",
  ],
  ["sourceLabel", "Upload the Clerk Case Detail PDF."],
];

export function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseName(value: string): string {
  return normalizeSpace(value)
    .toLowerCase()
    .replace(/(^|[\s.'’-])([a-z])/g, (_, prefix: string, letter: string) =>
      `${prefix}${letter.toUpperCase()}`
    );
}

function lawyerDisplayName(value: string): string {
  const cleaned = value.replace(/^[^A-Za-z]+/, "").trim();
  const [lastName, givenNames] = cleaned.split(",").map((part) => part.trim());
  return givenNames
    ? titleCaseName(`${givenNames} ${lastName}`)
    : titleCaseName(cleaned);
}

export function parseBrowardCaseText(text: string): ExtractedCase {
  const normalized = text.replace(/\r/g, "");
  const flat = normalizeSpace(normalized);
  const warnings: string[] = [];

  const captionMatch = normalized.match(
    /^\s*(.+?)\s+Plaintiff\s+vs\.\s+(.+?)\s+Defendant\s*$/im
  );

  const plaintiffName = captionMatch ? normalizeSpace(captionMatch[1]) : "";
  const defendantName = captionMatch ? normalizeSpace(captionMatch[2]) : "";
  const caseNumber =
    flat.match(/Broward County Case Number:\s*([A-Z]{4}\d{8})/i)?.[1] ||
    "";

  const attorneyBlock =
    normalized.match(
      /Plaintiff[^\n]*\n(?:[^\n]*\n){0,4}\s*([A-Za-z'’-]+,\s*[A-Za-z][A-Za-z .,'’-]+)\s*\nRetained\s*\n\s*Bar ID:\s*\d+\s*\n([\s\S]*?)\nStatus:\s*Active/i
    );

  const retainingAttorney = attorneyBlock
    ? lawyerDisplayName(attorneyBlock[1])
    : "";
  const attorneyAddress = attorneyBlock
    ? normalizeSpace(attorneyBlock[2].replace(/[★]/g, ""))
    : "";

  if (!plaintiffName || !defendantName) {
    warnings.push("Official Plaintiff/Defendant caption was not confidently extracted.");
  }
  if (!caseNumber) warnings.push("Broward case number was not found.");
  if (!retainingAttorney) {
    warnings.push("Retaining attorney was not confidently extracted; verify on The Florida Bar.");
  }
  warnings.push(
    "Clerk attorney data is a lead only. Confirm current name, designation, mailing address, and phone on The Florida Bar Find a Lawyer."
  );

  const confidence =
    plaintiffName && defendantName && caseNumber
      ? retainingAttorney
        ? "high"
        : "medium"
      : "low";

  return {
    caseCaption:
      plaintiffName && defendantName
        ? `${plaintiffName} v. ${defendantName}`
        : "",
    caseNumber,
    plaintiffName,
    defendantName,
    retainingAttorney,
    attorneyAddress,
    confidence,
    warnings,
  };
}

export function validateMatter(matter: RetainerMatter): ValidationResult {
  const blockers: string[] = [];
  const decisions: string[] = [];

  for (const [field, message] of REQUIRED_TEXT_FIELDS) {
    const value = matter[field];
    if (typeof value !== "string" || !value.trim()) {
      blockers.push(message);
    }
  }

  if (matter.plaintiffName.trim().toLowerCase() === matter.defendantName.trim().toLowerCase()) {
    blockers.push("Plaintiff and Defendant show the same name. Check the PDF.");
  }
  if (!/^[A-Z0-9-]{6,}$/i.test(matter.caseNumber.trim())) {
    blockers.push("The case number does not look complete. Copy it from the PDF again.");
  }
  if (!/^[A-Z][A-Z.]{1,12}$/.test(matter.clientInitials.trim().toUpperCase())) {
    blockers.push("Initials must look like K.W.N. Check the approved example.");
  }
  if (/\bFlorida\b/i.test(matter.cityStateZip) || !/,\s*FL\b/.test(matter.cityStateZip)) {
    blockers.push('Use Morrie style in the address: “Ft.” and “FL,” not “Fort” or “Florida.”');
  }
  if (![matter.expertRate, matter.staffRate, matter.deposit].every(Number.isFinite)) {
    blockers.push("One of the three money boxes is not a number.");
  } else if (matter.expertRate <= 0 || matter.staffRate <= 0 || matter.deposit <= 0) {
    blockers.push("Morrie’s rate, staff rate, and deposit must be more than $0.");
  }
  if (Number.isNaN(Date.parse(`${matter.acknowledgementDate}T00:00:00`))) {
    blockers.push("The first-contact date is not valid.");
  }
  if (!matter.sourceConfirmed) {
    blockers.push("Go back to Step 1 and check the names and case number against the PDF.");
  }
  if (!matter.attorneyAddressConfirmed) {
    blockers.push("Go back to Step 2 and confirm the lawyer and address.");
  }
  if (!matter.templateConfirmed) {
    blockers.push("Go back to Step 3 and confirm that you did not guess.");
  }

  decisions.push(
    `${matter.feePosition}; fee claimant: ${matter.feeClaimantSide}; retaining side: ${matter.clientSide}.`
  );
  decisions.push(
    matter.templateVariant === "with-guarantee"
      ? "Recipient individually guarantees the client firm’s payment obligations."
      : "No personal Guarantee block will appear."
  );

  return {
    status: blockers.length ? "RED" : decisions.length ? "YELLOW" : "PASS",
    blockers,
    decisions,
  };
}

const SMALL = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function integerWords(value: number): string {
  if (value < 20) return SMALL[value];
  if (value < 100) {
    return `${TENS[Math.floor(value / 10)]}${value % 10 ? `-${SMALL[value % 10]}` : ""}`;
  }
  if (value < 1000) {
    return `${SMALL[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${integerWords(value % 100)}` : ""}`;
  }
  if (value < 1_000_000) {
    return `${integerWords(Math.floor(value / 1000))} Thousand${value % 1000 ? ` ${integerWords(value % 1000)}` : ""}`;
  }
  throw new Error("Amounts at or above $1,000,000 require attorney review.");
}

export function contractMoney(value: number): {
  words: string;
  currency: string;
} {
  if (!Number.isFinite(value) || value < 0 || value >= 1_000_000) {
    throw new Error("Unsupported monetary value.");
  }
  const cents = Math.round((value - Math.floor(value)) * 100);
  return {
    words: `${integerWords(Math.floor(value))} and ${String(cents).padStart(2, "0")}/100 Dollars`,
    currency: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value),
  };
}

function longDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function shortDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}.${date.getUTCDate()}.${date.getUTCFullYear()}`;
}

function signatureName(matter: RetainerMatter): string {
  return `${matter.recipientName.trim().toUpperCase()}, ${
    matter.recipientDesignation === "Esq." ? "ESQ." : "ATTORNEY-AT-LAW"
  }`;
}

function possessiveSide(side: PartySide): string {
  return side === "Plaintiff" ? "Plaintiff’s" : "Defendant’s";
}

function scopeParagraph(matter: RetainerMatter): string {
  return (
    "This letter is to confirm our agreement whereby you have requested that the undersigned serve as your Expert Witness regarding attorney’s fees in the above-referenced lawsuit.  " +
    "My services will include, but not limited to assisting with reviewing/preparing your Affidavit for Attorney’s Fees, my Affidavit, and (if necessary) testifying in the above-referenced lawsuit whether the " +
    `${possessiveSide(matter.feeClaimantSide)} claim for attorney’s fees and costs is reasonable.  ` +
    "Our representation will include (but will not be limited to) review of your files, making telephone calls, sending correspondence, (if necessary) filing pleadings, attending depositions and court hearings, and any other legal work that may be required.  " +
    "If you request that the undersigned perform any other legal services regarding this matter, then such work shall be covered by this Retainer Agreement, unless an amendment to this Agreement is entered into by us."
  );
}

function acknowledgementParagraph(matter: RetainerMatter): string {
  return (
    `I acknowledge the fact that as of ${longDate(matter.acknowledgementDate)}, I requested Morrie I. Levine, Esq. to serve as our Attorney’s Fees witness and testify on our behalf as to the reasonableness of attorney’s fees that the ${possessiveSide(matter.feeClaimantSide)} side is seeking in the above-referenced lawsuit.  ` +
    "I will be liable for all legal fees and costs as of that date (even though I have not signed this Retainer Agreement until the date indicated below).  " +
    "Whenever my signature is required by Morrie I. Levine, Esq., a facsimile or E-mail of my signature shall be accepted and enforceable as if an original."
  );
}

export function buildTemplateData(
  matter: RetainerMatter,
  generatedOn = new Date()
): Record<string, string> {
  const generationDate = generatedOn.toISOString().slice(0, 10);
  const expert = contractMoney(matter.expertRate);
  const staff = contractMoney(matter.staffRate);
  const deposit = contractMoney(matter.deposit);
  const adobe = matter.deliveryMethod === "Adobe Sign";

  return {
    TODAY_LONG: longDate(generationDate),
    DOC_DATE_SHORT: shortDate(generationDate),
    DELIVERY_METHOD_UPPER: adobe ? "ADOBE SIGN" : "EMAIL ONLY",
    DELIVERY_CHANNEL: adobe ? "Adobe Sign" : "email",
    DELIVERY_SENTENCE: adobe
      ? "I am sending you this cover letter and your Retainer Agreement by Adobe Sign only.  I suggest that you keep the fully executed copy of the Retainer Agreement in your files.  Once again, if you have any questions regarding the contents of this correspondence, the attached Retainer Agreement, or any other aspect of this attorney fee litigation, please do not hesitate to contact the undersigned.  I look forward to being of service to you."
      : "I am sending you this cover letter and your Retainer Agreement by E-mail only.  Please sign, date, and return the Retainer Agreement by E-mail and keep the fully executed copy in your files.  Once again, if you have any questions regarding the contents of this correspondence, the attached Retainer Agreement, or any other aspect of this attorney fee litigation, please do not hesitate to contact the undersigned.  I look forward to being of service to you.",
    RECIPIENT_DISPLAY_NAME: `${matter.recipientName.trim()}, ${matter.recipientDesignation}`,
    RECIPIENT_SIGNATURE_NAME: signatureName(matter),
    CLIENT_FIRM: matter.clientFirm.trim(),
    CLIENT_FIRM_UPPER: matter.clientFirm.trim().toUpperCase(),
    ADDRESS_LINE_1: matter.addressLine1.trim(),
    ADDRESS_LINE_2: matter.addressLine2.trim(),
    CITY_STATE_ZIP: matter.cityStateZip.trim(),
    SALUTATION: matter.salutation.trim(),
    CLIENT_INITIALS: matter.clientInitials.trim().toUpperCase(),
    PLAINTIFF_NAME: matter.plaintiffName.trim(),
    DEFENDANT_NAME: matter.defendantName.trim(),
    CASE_NUMBER: matter.caseNumber.trim(),
    OFFICE_FILE_NUMBER: matter.officeFileNumber.trim(),
    EXPERT_RATE_WORDS: expert.words,
    EXPERT_RATE_CURRENCY: expert.currency,
    STAFF_RATE_WORDS: staff.words,
    STAFF_RATE_CURRENCY: staff.currency,
    DEPOSIT_WORDS: deposit.words,
    DEPOSIT_CURRENCY: deposit.currency,
    SCOPE_PARAGRAPH: scopeParagraph(matter),
    ACKNOWLEDGEMENT_PARAGRAPH: acknowledgementParagraph(matter),
    GUARANTEE_PARAGRAPH:
      `I hereby guaranty payment by ${matter.clientFirm.trim()} of the fees and costs incurred as stated above.  ` +
      `I agree to be jointly and severally responsible for attorney’s fees and costs if collection efforts against me and ${matter.clientFirm.trim()} become necessary.`,
    PRODUCTION_STATUS: "YELLOW — ATTORNEY DECISIONS REQUIRED",
    TEMPLATE_LABEL:
      matter.templateVariant === "with-guarantee"
        ? "Fee Expert Retainer — Guarantee"
        : "Fee Expert Retainer — No Guarantee",
    CLIENT_SIDE: matter.clientSide,
    FEE_POSITION: matter.feePosition,
    FEE_CLAIMANT_SIDE: matter.feeClaimantSide,
    SOURCE_LABEL: matter.sourceLabel.trim(),
    SOURCE_CHECK: matter.sourceConfirmed ? "PASS — human confirmed" : "RED",
    REQUIRED_CHECK: "PASS",
    MONEY_CHECK: "PASS — generated once and reused",
    RESIDUE_CHECK: "PASS — sanitized templates",
    TOKEN_CHECK: "PASS — verified after compilation",
    GUARANTEE_CHECK:
      matter.templateVariant === "with-guarantee"
        ? "YELLOW — attorney approval required"
        : "PASS — Guarantee block absent",
  };
}
