"use client";

import { useState } from "react";

const PRIMARY_MATTER_TYPES = [
  "New NDA from scratch",
  "Prior agreement converted to new matter",
  "Counterparty draft review",
  "Mutual release + NDA",
];

const RISK_FLAGS = [
  "Equity / membership interest",
  "Multiple individual signers",
  "Restrictive covenant / non-compete",
  "Urgent deadline",
  "Missing party or address information",
];

const PARTY_TEMPLATE = `Name | Type | Capacity | Address | Signer | Initials
AXION STUDIOS, LLC | Entity | Entity party | 14105 Carissa Meadows Ct, Riverview, FL 33569 | Zane Campbell (AMBR) | A.S.
ZANE CAMPBELL | Individual | individually and as Manager of AXION | same as above | self | Z.C.
FRAMEHOUSE LLC | Entity | Entity party | 189 Lexington Avenue, Dumont, NJ 07628 | Michaela Permuy (AMBR) | F.H.
MICHAELA PERMUY | Individual | individually and as Manager of FRAMEHOUSE | same as above | self | M.P.
DUSTYN BIELSKI | Individual | individually and as Manager of FRAMEHOUSE | same as above | self | D.B.`;

const DEAL_TERMS_TEMPLATE = `Term | Value | Provenance
Payment | $50 | Instructed
Exchange window | 10 days from Effective Date | Inherited
Non-compete radius | 5 miles | Unknown`;

const OLD_MATTER_TERMS_TEMPLATE = `HALL
MICHAEL HALL
M.H.
741 Chatham Walk Drive
$500
2021
2022
8.30.2024`;

const RAW_MATERIALS_PLACEHOLDER = `--- TEMPLATE ---
[paste template or prior form language]

--- CLIENT EMAIL ---
[paste client email or instructions]

--- ATTORNEY INSTRUCTION ---
[paste attorney instruction]`;

type Preset = "firstPass" | "reviewPackage" | "externalDelivery";

type ReviewerType = "Admin" | "Paralegal" | "Attorney";

type FormState = {
  primaryMatterType: string;
  riskFlags: string[];
  rawMaterials: string;
  currentDraft: string;
  processNotes: string;
  oldMatterTerms: string;
  partyInfo: string;
  dealTerms: string;
  deadline: string;
  deadlineIntentionallyBlank: boolean;
  reviewerType: ReviewerType;
  attorneyApprovedForExternalDelivery: boolean;
  captionBodyConsistencyChecked: boolean;
  equityIssueRoutedToAttorney: boolean;
};

type ApiIssue = {
  field: string;
  line: number;
  message: string;
  value: string;
};

type ApiResponse = {
  output?: string;
  error?: string;
  issues?: ApiIssue[];
};

const PACKAGE_COPY: Record<
  Preset,
  {
    label: string;
    context: string;
    purpose: string;
    controls: string;
    safety: string;
  }
> = {
  firstPass: {
    label: "First Pass / Issue Scan",
    context: "firstPass",
    purpose:
      "Internal first-pass triage. Use this when the matter is still being scanned for issues.",
    controls:
      "Package selection does not auto-confirm any review control. Each confirmation must be checked individually by a human reviewer.",
    safety:
      "External delivery is disabled. S7 may remain open internally without creating a Do Not Send block.",
  },
  reviewPackage: {
    label: "Attorney Review Package",
    context: "reviewPackage",
    purpose:
      "Use this when the package is being assembled for attorney review, not for external delivery.",
    controls:
      "Package selection does not assert caption/body review, deadline status, equity routing, or attorney approval. Confirmations must be made separately.",
    safety:
      "External delivery remains disabled. Praxis does not produce external response language.",
  },
  externalDelivery: {
    label: "External Delivery Check",
    context: "externalDelivery",
    purpose:
      "Final safety check before attorney-controlled external delivery.",
    controls:
      "Attorney-approved external delivery status must be confirmed by an Attorney reviewer. Package selection alone does not clear S7.",
    safety:
      "Praxis still does not generate or send an external response. It only reports whether the package is blocked.",
  },
};

const initialForm: FormState = {
  primaryMatterType: "Mutual release + NDA",
  riskFlags: [],
  rawMaterials: "",
  currentDraft: "",
  processNotes: "",
  oldMatterTerms: OLD_MATTER_TERMS_TEMPLATE,
  partyInfo: PARTY_TEMPLATE,
  dealTerms: DEAL_TERMS_TEMPLATE,
  deadline: "",
  deadlineIntentionallyBlank: false,
  reviewerType: "Paralegal",
  attorneyApprovedForExternalDelivery: false,
  captionBodyConsistencyChecked: false,
  equityIssueRoutedToAttorney: false,
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0b0f14",
  color: "#e5e7eb",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "40px 24px 72px",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #273241",
  borderRadius: 10,
  padding: 18,
  background: "#111827",
  marginTop: 18,
};

const cardHeaderStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 4,
  color: "#f9fafb",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 650,
  marginTop: 16,
  marginBottom: 6,
  fontSize: 13,
  color: "#f3f4f6",
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#9ca3af",
  lineHeight: 1.45,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 11px",
  fontSize: 14,
  border: "1px solid #374151",
  borderRadius: 6,
  boxSizing: "border-box",
  background: "#0b1220",
  color: "#f9fafb",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  resize: "vertical",
  lineHeight: 1.45,
};

const segmentedStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 8,
};

const buttonBaseStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid #334155",
  padding: "11px 12px",
  background: "#0b1220",
  color: "#e5e7eb",
  cursor: "pointer",
  textAlign: "left",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  borderRadius: 6,
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#e5e7eb",
  cursor: "pointer",
};

const infoBoxStyle: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid #1d4ed8",
  background: "#0f1f3d",
  borderRadius: 8,
  padding: "12px 14px",
};

const warningBoxStyle: React.CSSProperties = {
  background: "#2a1f0b",
  border: "1px solid #a16207",
  color: "#facc15",
  borderRadius: 6,
  padding: "9px 12px",
  fontSize: 13,
  marginTop: 10,
};

function requiredMark() {
  return <span style={{ color: "#f87171" }}> *</span>;
}

function formatApiError(data: ApiResponse, status: number): string {
  const lines: string[] = [
    data.error || `Request failed with status ${status}`,
  ];

  if (Array.isArray(data.issues) && data.issues.length > 0) {
    lines.push("");
    lines.push("Fix the following input issue(s):");

    data.issues.forEach((issue, index) => {
      const location =
        issue.line > 0
          ? `${issue.field} line ${issue.line}`
          : `${issue.field}`;

      lines.push(`${index + 1}. ${location}: ${issue.message}`);

      if (issue.value) {
        lines.push(`   Value: ${issue.value}`);
      }
    });
  }

  return lines.join("\n");
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [activePreset, setActivePreset] = useState<Preset>("firstPass");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const packageCopy = PACKAGE_COPY[activePreset];
  const attorneyApprovalDisabled = form.reviewerType !== "Attorney";

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const matterTypes = [
    form.primaryMatterType,
    ...form.riskFlags,
  ].filter(Boolean);

  const toggleRiskFlag = (flag: string) =>
    setForm((prev) => ({
      ...prev,
      riskFlags: prev.riskFlags.includes(flag)
        ? prev.riskFlags.filter((item) => item !== flag)
        : [...prev.riskFlags, flag],
    }));

  function applyPreset(preset: Preset) {
    setActivePreset(preset);
  }

  function handleReviewerTypeChange(value: ReviewerType) {
    setForm((prev) => ({
      ...prev,
      reviewerType: value,
      attorneyApprovedForExternalDelivery:
        value === "Attorney" ? prev.attorneyApprovedForExternalDelivery : false,
    }));
  }

  const deadlineWarning =
    form.deadline === "" && !form.deadlineIntentionallyBlank;

  const externalDeliveryWarning =
    activePreset === "externalDelivery" &&
    !form.attorneyApprovedForExternalDelivery;

  const canSubmit =
    form.primaryMatterType.trim() !== "" &&
    form.rawMaterials.trim() !== "" &&
    form.partyInfo.trim() !== "" &&
    form.dealTerms.trim() !== "" &&
    form.oldMatterTerms.trim() !== "" &&
    form.reviewerType.trim() !== "" &&
    !loading;

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setOutput("");
    setCopied(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageType: activePreset,
          primaryMatterType: form.primaryMatterType,
          riskFlags: form.riskFlags,
          matterTypes,
          rawMaterials: form.rawMaterials,
          currentDraft: form.currentDraft,
          processNotes: form.processNotes,
          oldMatterTerms: form.oldMatterTerms,
          partyInfo: form.partyInfo,
          dealTerms: form.dealTerms,
          deadline: form.deadline,
          deadlineIntentionallyBlank: form.deadlineIntentionallyBlank,
          reviewerType: form.reviewerType,
          attorneyApprovedForExternalDelivery:
            form.attorneyApprovedForExternalDelivery,
          captionBodyConsistencyChecked: form.captionBodyConsistencyChecked,
          equityIssueRoutedToAttorney: form.equityIssueRoutedToAttorney,
        }),
      });

      const text = await res.text();

      let data: ApiResponse;

      try {
        data = JSON.parse(text) as ApiResponse;
      } catch {
        throw new Error(
          `Server returned non-JSON response (status ${res.status}): ${text.slice(
            0,
            200
          )}`
        );
      }

      if (!res.ok) {
        throw new Error(formatApiError(data, res.status));
      }

      setOutput(data.output || "(empty response)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy failed. Select the text manually.");
    }
  }

  const presetButton = (
    preset: Preset,
    title: string,
    subtitle: string
  ) => {
    const active = activePreset === preset;

    return (
      <button
        type="button"
        onClick={() => applyPreset(preset)}
        style={{
          ...buttonBaseStyle,
          borderColor: active ? "#93c5fd" : "#334155",
          background: active ? "#172554" : "#0b1220",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 750 }}>{title}</div>
        <div style={{ ...hintStyle, marginTop: 4 }}>{subtitle}</div>
      </button>
    );
  };

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}>
            Praxis Legal Router
          </div>
          <h1 style={{ fontSize: 28, margin: "6px 0 4px" }}>
            NDA Review Package Builder
          </h1>
          <p style={{ ...hintStyle, maxWidth: 760, margin: 0 }}>
            Praxis is a professional workflow router and safety gate for
            legal-document preparation. It prepares attorney-review memos. It
            does not give legal advice, decide enforceability, generate
            external-send language, or send anything externally.
          </p>
          <a
            href="/retainer"
            style={{
              display: "inline-block",
              marginTop: 14,
              padding: "10px 14px",
              border: "1px solid #1d4ed8",
              borderRadius: 8,
              background: "#0f1f3d",
              color: "#bfdbfe",
              fontSize: 13,
              fontWeight: 750,
              textDecoration: "none",
            }}
          >
            Open Retainer Production Pilot →
          </a>
        </header>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Package Type</div>
          <div style={hintStyle}>
            Start here. The package type controls how Praxis interprets open
            workflow items and external-delivery approval. Package type does not
            automatically confirm facts or clear review controls.
          </div>

          <div style={{ ...segmentedStyle, marginTop: 12 }}>
            {presetButton(
              "firstPass",
              "First Pass",
              "Internal issue scan."
            )}
            {presetButton(
              "reviewPackage",
              "Attorney Review Package",
              "Prepare for attorney review."
            )}
            {presetButton(
              "externalDelivery",
              "External Delivery Check",
              "Attorney-controlled send check."
            )}
          </div>

          <div style={infoBoxStyle}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 750,
                color: "#bfdbfe",
                marginBottom: 6,
              }}
            >
              Active package: {packageCopy.label}
            </div>
            <div style={hintStyle}>
              <strong style={{ color: "#dbeafe" }}>Context:</strong>{" "}
              {packageCopy.context}
            </div>
            <div style={{ ...hintStyle, marginTop: 4 }}>
              <strong style={{ color: "#dbeafe" }}>Purpose:</strong>{" "}
              {packageCopy.purpose}
            </div>
            <div style={{ ...hintStyle, marginTop: 4 }}>
              <strong style={{ color: "#dbeafe" }}>Controls:</strong>{" "}
              {packageCopy.controls}
            </div>
            <div style={{ ...hintStyle, marginTop: 4 }}>
              <strong style={{ color: "#dbeafe" }}>Safety rule:</strong>{" "}
              {packageCopy.safety}
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>1. Matter Setup</div>

          <label style={labelStyle}>
            Primary Matter Type{requiredMark()}
          </label>
          <select
            style={inputStyle}
            value={form.primaryMatterType}
            onChange={(e) => set("primaryMatterType", e.target.value)}
          >
            {PRIMARY_MATTER_TYPES.map((matterType) => (
              <option key={matterType} value={matterType}>
                {matterType}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Additional Risk Flags</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 8,
            }}
          >
            {RISK_FLAGS.map((flag) => (
              <label key={flag} style={{ fontSize: 13, color: "#d1d5db" }}>
                <input
                  type="checkbox"
                  checked={form.riskFlags.includes(flag)}
                  onChange={() => toggleRiskFlag(flag)}
                  style={{ marginRight: 7 }}
                />
                {flag}
              </label>
            ))}
          </div>

          <label style={labelStyle}>
            Reviewer Type{requiredMark()}
          </label>
          <select
            style={{ ...inputStyle, maxWidth: 240 }}
            value={form.reviewerType}
            onChange={(e) =>
              handleReviewerTypeChange(e.target.value as ReviewerType)
            }
          >
            <option value="Admin">Admin</option>
            <option value="Paralegal">Paralegal</option>
            <option value="Attorney">Attorney</option>
          </select>
          <div style={{ ...hintStyle, marginTop: 6 }}>
            Reviewer type is used for attestation controls. Attorney external
            delivery approval can only be asserted when reviewer type is
            Attorney.
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>2. Materials</div>

          <label style={labelStyle}>
            Raw Materials{requiredMark()}
          </label>
          <div style={hintStyle}>
            Source text, client email, prior agreement language, and attorney
            instructions.
          </div>
          <textarea
            style={textareaStyle}
            rows={10}
            placeholder={RAW_MATERIALS_PLACEHOLDER}
            value={form.rawMaterials}
            onChange={(e) => set("rawMaterials", e.target.value)}
          />

          <label style={labelStyle}>Final / Current Draft</label>
          <textarea
            style={textareaStyle}
            rows={8}
            placeholder="Paste the current working draft. Leave empty if drafting from scratch."
            value={form.currentDraft}
            onChange={(e) => set("currentDraft", e.target.value)}
          />
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>3. Structured Facts</div>

          <label style={labelStyle}>
            Party Information{requiredMark()}
          </label>
          <div style={hintStyle}>
            Format: Name | Type | Capacity | Address | Signer | Initials
          </div>
          <textarea
            style={textareaStyle}
            rows={6}
            value={form.partyInfo}
            onChange={(e) => set("partyInfo", e.target.value)}
          />

          <label style={labelStyle}>
            Deal Terms with Provenance{requiredMark()}
          </label>
          <div style={hintStyle}>
            Format: Term | Value | Provenance. Resolved: Instructed /
            Confirmed / Attorney Confirmed / Client Confirmed. Unresolved:
            Inherited / Unknown / TBD / Needs confirmation / blank.
          </div>
          <textarea
            style={textareaStyle}
            rows={5}
            value={form.dealTerms}
            onChange={(e) => set("dealTerms", e.target.value)}
          />

          <label style={labelStyle}>
            Old / Excluded Names and Terms{requiredMark()}
          </label>
          <div style={hintStyle}>
            Terms that must not remain in the current draft. One per line.
          </div>
          <textarea
            style={textareaStyle}
            rows={5}
            value={form.oldMatterTerms}
            onChange={(e) => set("oldMatterTerms", e.target.value)}
          />

          <label style={labelStyle}>Deadline</label>
          <input
            type="date"
            style={{ ...inputStyle, maxWidth: 240 }}
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />

          {deadlineWarning && (
            <div style={warningBoxStyle}>
              Blank deadline will be flagged unless blank / not applicable is
              confirmed in Review Controls.
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>4. Review Controls</div>
          <div style={hintStyle}>
            These controls are human attestations. They route the matter for
            attorney review. They do not decide legal correctness,
            enforceability, or external-send content. Package presets do not
            automatically check these boxes.
          </div>

          <label style={{ display: "block", fontSize: 13, marginTop: 12 }}>
            <input
              type="checkbox"
              checked={form.captionBodyConsistencyChecked}
              onChange={(e) =>
                set("captionBodyConsistencyChecked", e.target.checked)
              }
              style={{ marginRight: 7 }}
            />
            Caption/title parties match the body parties.
          </label>

          <label style={{ display: "block", fontSize: 13, marginTop: 10 }}>
            <input
              type="checkbox"
              checked={form.deadlineIntentionallyBlank}
              onChange={(e) =>
                set("deadlineIntentionallyBlank", e.target.checked)
              }
              style={{ marginRight: 7 }}
            />
            Deadline is intentionally blank or not applicable.
          </label>

          <label style={{ display: "block", fontSize: 13, marginTop: 10 }}>
            <input
              type="checkbox"
              checked={form.equityIssueRoutedToAttorney}
              onChange={(e) =>
                set("equityIssueRoutedToAttorney", e.target.checked)
              }
              style={{ marginRight: 7 }}
            />
            Equity / membership-interest language is routed to attorney review.
          </label>

          <div
            style={{
              height: 1,
              background: "#273241",
              margin: "16px 0 14px",
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: 13,
              color: attorneyApprovalDisabled ? "#6b7280" : "#e5e7eb",
            }}
          >
            <input
              type="checkbox"
              disabled={attorneyApprovalDisabled}
              checked={form.attorneyApprovedForExternalDelivery}
              onChange={(e) =>
                set("attorneyApprovedForExternalDelivery", e.target.checked)
              }
              style={{ marginRight: 7 }}
            />
            Attorney approved this draft for external delivery.
          </label>
          <div style={{ ...hintStyle, marginTop: 6 }}>
            This is a send-control status only. It can only be checked when
            Reviewer Type is Attorney. In First Pass and Attorney Review
            Package mode, an unchecked S7 may remain visible internally without
            blocking the package. In External Delivery Check mode, unchecked S7
            creates a Do Not Send block. Praxis still does not generate an
            external response.
          </div>

          {attorneyApprovalDisabled && (
            <div style={warningBoxStyle}>
              Attorney approval is disabled because Reviewer Type is{" "}
              {form.reviewerType}. Change Reviewer Type to Attorney to assert
              attorney-approved external delivery status.
            </div>
          )}

          {externalDeliveryWarning && (
            <div style={warningBoxStyle}>
              External Delivery Check is selected, but attorney-approved
              external delivery has not been confirmed. The memo should route
              this as Do Not Send until attorney approval is confirmed.
            </div>
          )}
        </section>

        <section style={{ marginTop: 18 }}>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            style={smallButtonStyle}
          >
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </button>

          {showAdvanced && (
            <section style={cardStyle}>
              <div style={cardHeaderStyle}>Advanced</div>

              <label style={labelStyle}>Human Process Notes</label>
              <div style={hintStyle}>
                Optional internal notes. These notes are included in the
                attorney-review memo for workflow context.
              </div>
              <textarea
                style={textareaStyle}
                rows={5}
                placeholder="Optional internal notes."
                value={form.processNotes}
                onChange={(e) => set("processNotes", e.target.value)}
              />
            </section>
          )}
        </section>

        <div style={{ marginTop: 24, display: "flex", alignItems: "center" }}>
          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            style={{
              padding: "13px 20px",
              fontSize: 15,
              fontWeight: 750,
              borderRadius: 8,
              border: "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
              background: canSubmit ? "#93c5fd" : "#475569",
              color: canSubmit ? "#0b1220" : "#cbd5e1",
            }}
          >
            {loading ? "Generating..." : "Generate Attorney-Review Memo"}
          </button>

          {!canSubmit && !loading && (
            <span style={{ ...hintStyle, marginLeft: 14 }}>
              Required: primary matter type, raw materials, party information,
              deal terms, old/excluded terms, reviewer type.
            </span>
          )}
        </div>

        {error && (
          <div
            style={{
              background: "#3b0d0d",
              border: "1px solid #ef4444",
              color: "#fecaca",
              borderRadius: 8,
              padding: "11px 14px",
              fontSize: 13,
              marginTop: 16,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}

        {output && (
          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div style={cardHeaderStyle}>Attorney-Review Memo</div>
              <button onClick={handleCopy} style={smallButtonStyle}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#05070a",
                color: "#e5e7eb",
                padding: 18,
                borderRadius: 8,
                border: "1px solid #273241",
                lineHeight: 1.5,
                maxHeight: 720,
                overflowY: "auto",
                fontSize: 13,
              }}
            >
              {output}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}