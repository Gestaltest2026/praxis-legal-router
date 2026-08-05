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

const PACKAGE_COPY: Record<Preset, { label: string; purpose: string; controls: string; safety: string }> = {
  firstPass: {
    label: "First Pass / Issue Scan",
    purpose: "Internal first-pass triage while the matter is still being scanned.",
    controls: "Each confirmation must be checked individually by a human reviewer.",
    safety: "External delivery is disabled.",
  },
  reviewPackage: {
    label: "Attorney Review Package",
    purpose: "Assemble the matter for attorney review, not external delivery.",
    controls: "Package selection does not assert facts or clear review controls.",
    safety: "External delivery remains disabled.",
  },
  externalDelivery: {
    label: "External Delivery Check",
    purpose: "Final safety check before attorney-controlled external delivery.",
    controls: "Attorney-approved delivery status must be confirmed by an Attorney reviewer.",
    safety: "Praxis reports whether the package is blocked; it does not send anything.",
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
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
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
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  resize: "vertical",
  lineHeight: 1.45,
};

const segmentedStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
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

const moduleLinkStyle: React.CSSProperties = {
  display: "block",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 16,
  background: "#0b1220",
  color: "#e5e7eb",
  textDecoration: "none",
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

function requiredMark() {
  return <span style={{ color: "#f87171" }}> *</span>;
}

function formatApiError(data: ApiResponse, status: number): string {
  const lines = [data.error || `Request failed with status ${status}`];
  if (Array.isArray(data.issues) && data.issues.length > 0) {
    lines.push("", "Fix the following input issue(s):");
    data.issues.forEach((issue, index) => {
      const location = issue.line > 0 ? `${issue.field} line ${issue.line}` : issue.field;
      lines.push(`${index + 1}. ${location}: ${issue.message}`);
      if (issue.value) lines.push(`   Value: ${issue.value}`);
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

  const matterTypes = [form.primaryMatterType, ...form.riskFlags].filter(Boolean);

  const toggleRiskFlag = (flag: string) =>
    setForm((prev) => ({
      ...prev,
      riskFlags: prev.riskFlags.includes(flag)
        ? prev.riskFlags.filter((item) => item !== flag)
        : [...prev.riskFlags, flag],
    }));

  function handleReviewerTypeChange(value: ReviewerType) {
    setForm((prev) => ({
      ...prev,
      reviewerType: value,
      attorneyApprovedForExternalDelivery:
        value === "Attorney" ? prev.attorneyApprovedForExternalDelivery : false,
    }));
  }

  const deadlineWarning = form.deadline === "" && !form.deadlineIntentionallyBlank;
  const externalDeliveryWarning =
    activePreset === "externalDelivery" && !form.attorneyApprovedForExternalDelivery;

  const canSubmit =
    form.primaryMatterType.trim() !== "" &&
    form.rawMaterials.trim() !== "" &&
    form.partyInfo.trim() !== "" &&
    form.dealTerms.trim() !== "" &&
    form.oldMatterTerms.trim() !== "" &&
    !loading;

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setOutput("");
    setCopied(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          attorneyApprovedForExternalDelivery: form.attorneyApprovedForExternalDelivery,
          captionBodyConsistencyChecked: form.captionBodyConsistencyChecked,
          equityIssueRoutedToAttorney: form.equityIssueRoutedToAttorney,
        }),
      });

      const text = await res.text();
      let data: ApiResponse;
      try {
        data = JSON.parse(text) as ApiResponse;
      } catch {
        throw new Error(`Server returned non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(formatApiError(data, res.status));
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

  const presetButton = (preset: Preset, title: string, subtitle: string) => {
    const active = activePreset === preset;
    return (
      <button
        type="button"
        onClick={() => setActivePreset(preset)}
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
            Praxis Legal Production System
          </div>
          <h1 style={{ fontSize: 30, margin: "6px 0 4px" }}>Production Console</h1>
          <p style={{ ...hintStyle, maxWidth: 800, margin: 0 }}>
            Select an approved production route. Each module uses the same controlled sequence:
            source-verified input, deterministic validation, STOP or exception routing, and an
            attorney-review-ready packet.
          </p>
        </header>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Production Modules</div>
          <div style={hintStyle}>Three controlled workflows currently share the Praxis production engine.</div>
          <div style={{ ...segmentedStyle, marginTop: 14 }}>
            <a href="#nda-workflow" style={{ ...moduleLinkStyle, borderColor: "#1d4ed8", background: "#0f1f3d" }}>
              <div style={{ fontWeight: 800 }}>NDA / Mutual Release</div>
              <div style={{ ...hintStyle, marginTop: 6 }}>Issue scan, routing, safety gates, and attorney review package.</div>
              <div style={{ marginTop: 12, color: "#bfdbfe", fontSize: 13, fontWeight: 700 }}>Open below ↓</div>
            </a>
            <a href="/retainer" style={moduleLinkStyle}>
              <div style={{ fontWeight: 800 }}>Retainer Agreement</div>
              <div style={{ ...hintStyle, marginTop: 6 }}>Locked fee-hearing route with source-to-draft monetary verification.</div>
              <div style={{ marginTop: 12, color: "#bfdbfe", fontSize: 13, fontWeight: 700 }}>Open module →</div>
            </a>
            <a href="/fee-expert" style={moduleLinkStyle}>
              <div style={{ fontWeight: 800 }}>Fee Expert Engagement</div>
              <div style={{ ...hintStyle, marginTop: 6 }}>PASS / YELLOW / RED intake and five-minute attorney review packet.</div>
              <div style={{ marginTop: 12, color: "#bfdbfe", fontSize: 13, fontWeight: 700 }}>Open module →</div>
            </a>
          </div>
        </section>

        <div id="nda-workflow" />
        <section style={cardStyle}>
          <div style={cardHeaderStyle}>NDA / Mutual Release Module</div>
          <div style={hintStyle}>Existing NDA workflow retained inside the shared Praxis console.</div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Package Type</div>
          <div style={hintStyle}>{packageCopy.purpose}</div>
          <div style={{ ...segmentedStyle, marginTop: 12 }}>
            {presetButton("firstPass", "First Pass", "Scan for open issues")}
            {presetButton("reviewPackage", "Attorney Review", "Prepare the review package")}
            {presetButton("externalDelivery", "Delivery Check", "Confirm attorney-controlled release")}
          </div>
          <div style={{ ...hintStyle, marginTop: 12 }}>{packageCopy.controls} {packageCopy.safety}</div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Matter Classification</div>
          <label style={labelStyle}>Primary Matter Type{requiredMark()}</label>
          <select style={inputStyle} value={form.primaryMatterType} onChange={(e) => set("primaryMatterType", e.target.value)}>
            {PRIMARY_MATTER_TYPES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <label style={labelStyle}>Risk Flags</label>
          <div style={segmentedStyle}>
            {RISK_FLAGS.map((flag) => (
              <label key={flag} style={buttonBaseStyle}>
                <input type="checkbox" checked={form.riskFlags.includes(flag)} onChange={() => toggleRiskFlag(flag)} /> {flag}
              </label>
            ))}
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Source Materials</div>
          <label style={labelStyle}>Raw Materials{requiredMark()}</label>
          <textarea style={{ ...textareaStyle, minHeight: 220 }} placeholder={RAW_MATERIALS_PLACEHOLDER} value={form.rawMaterials} onChange={(e) => set("rawMaterials", e.target.value)} />
          <label style={labelStyle}>Current Draft</label>
          <textarea style={{ ...textareaStyle, minHeight: 150 }} value={form.currentDraft} onChange={(e) => set("currentDraft", e.target.value)} />
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Structured Matter Data</div>
          <label style={labelStyle}>Party Information{requiredMark()}</label>
          <textarea style={{ ...textareaStyle, minHeight: 160 }} value={form.partyInfo} onChange={(e) => set("partyInfo", e.target.value)} />
          <label style={labelStyle}>Deal Terms{requiredMark()}</label>
          <textarea style={{ ...textareaStyle, minHeight: 130 }} value={form.dealTerms} onChange={(e) => set("dealTerms", e.target.value)} />
          <label style={labelStyle}>Old Matter Terms / Quarantine List{requiredMark()}</label>
          <textarea style={{ ...textareaStyle, minHeight: 120 }} value={form.oldMatterTerms} onChange={(e) => set("oldMatterTerms", e.target.value)} />
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Review Controls</div>
          <label style={labelStyle}>Reviewer Type</label>
          <select style={inputStyle} value={form.reviewerType} onChange={(e) => handleReviewerTypeChange(e.target.value as ReviewerType)}>
            <option>Admin</option><option>Paralegal</option><option>Attorney</option>
          </select>
          <label style={labelStyle}>Deadline</label>
          <input style={inputStyle} value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          <label style={buttonBaseStyle}>
            <input type="checkbox" checked={form.deadlineIntentionallyBlank} onChange={(e) => set("deadlineIntentionallyBlank", e.target.checked)} /> Deadline intentionally left blank
          </label>
          {deadlineWarning && <div style={{ marginTop: 10, color: "#facc15", fontSize: 13 }}>Deadline status requires confirmation.</div>}
          <label style={buttonBaseStyle}>
            <input type="checkbox" checked={form.captionBodyConsistencyChecked} onChange={(e) => set("captionBodyConsistencyChecked", e.target.checked)} /> Caption/body consistency checked
          </label>
          <label style={buttonBaseStyle}>
            <input type="checkbox" checked={form.equityIssueRoutedToAttorney} onChange={(e) => set("equityIssueRoutedToAttorney", e.target.checked)} /> Equity issue routed to attorney
          </label>
          <label style={{ ...buttonBaseStyle, opacity: attorneyApprovalDisabled ? 0.6 : 1 }}>
            <input type="checkbox" disabled={attorneyApprovalDisabled} checked={form.attorneyApprovedForExternalDelivery} onChange={(e) => set("attorneyApprovedForExternalDelivery", e.target.checked)} /> Attorney approved external delivery
          </label>
          {externalDeliveryWarning && <div style={{ marginTop: 10, color: "#fca5a5", fontSize: 13 }}>External delivery remains blocked.</div>}
          <button type="button" style={{ ...smallButtonStyle, marginTop: 14 }} onClick={() => setShowAdvanced((value) => !value)}>
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </button>
          {showAdvanced && (
            <>
              <label style={labelStyle}>Process Notes</label>
              <textarea style={{ ...textareaStyle, minHeight: 110 }} value={form.processNotes} onChange={(e) => set("processNotes", e.target.value)} />
            </>
          )}
        </section>

        <section style={cardStyle}>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleGenerate}
            style={{ ...smallButtonStyle, padding: "12px 16px", opacity: canSubmit ? 1 : 0.55 }}
          >
            {loading ? "Generating…" : "Generate Attorney Review Package"}
          </button>
          {error && <pre style={{ whiteSpace: "pre-wrap", color: "#fca5a5", marginTop: 14 }}>{error}</pre>}
        </section>

        {output && (
          <section style={cardStyle}>
            <div style={cardHeaderStyle}>Attorney Review Package</div>
            <button type="button" style={smallButtonStyle} onClick={handleCopy}>{copied ? "Copied" : "Copy"}</button>
            <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 13, background: "#05070a", padding: 16, borderRadius: 8, overflowX: "auto" }}>{output}</pre>
          </section>
        )}
      </div>
    </main>
  );
}
