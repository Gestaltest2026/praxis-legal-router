"use client";

import { useState } from "react";

const MATTER_TYPES = [
  "New NDA from scratch",
  "Prior agreement converted to new matter",
  "Counterparty draft review",
  "Mutual release + NDA",
  "Equity / membership interest",
  "Multiple individual signers",
  "Restrictive covenant / non-compete",
  "Urgent deadline",
  "Missing party or address information",
];

const WORKFLOW_MODES = [
  "General Attorney Review Memo",
  "NDA Preparation",
  "NDA Difference Analysis",
  "NDA Branching Logic",
  "NDA Attorney-Review Ready Package",
];

const PARTY_TEMPLATE = `Name | Type | Capacity | Address | Signer | Initials
AXION STUDIOS, LLC | Entity | — | 14105 Carissa Meadows Ct, Riverview, FL 33569 | Zane Campbell (AMBR) | A.S.
ZANE CAMPBELL | Individual | individually and as Manager of AXION | same as above | self | Z.C.
FRAMEHOUSE LLC | Entity | — | 189 Lexington Avenue, Dumont, NJ 07628 | Michaela Permuy (AMBR) | F.H.
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

const RAW_MATERIALS_PLACEHOLDER = `Paste source materials. Separate sections like:

--- PRIOR AGREEMENT (name, date) ---
[paste]

--- TEMPLATE ---
[paste]

--- CLIENT EMAIL ---
[paste]

--- ATTORNEY INSTRUCTION ---
[paste]`;

type FormState = {
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
  attorneyApprovedForExternalDelivery: boolean;
};

const initialForm: FormState = {
  mode: "NDA Preparation",
  matterTypes: [],
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
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  marginTop: 18,
  marginBottom: 4,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 8,
  fontSize: 14,
  border: "1px solid #ccc",
  borderRadius: 4,
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "monospace",
  resize: "vertical",
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
  marginTop: 2,
};

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleMatterType = (matterType: string) =>
    setForm((prev) => ({
      ...prev,
      matterTypes: prev.matterTypes.includes(matterType)
        ? prev.matterTypes.filter((item) => item !== matterType)
        : [...prev.matterTypes, matterType],
    }));

  const deadlineWarning =
    form.deadline === "" && !form.deadlineIntentionallyBlank;

  const canSubmit =
    form.mode.trim() !== "" &&
    form.matterTypes.length > 0 &&
    form.rawMaterials.trim() !== "" &&
    form.partyInfo.trim() !== "" &&
    form.dealTerms.trim() !== "" &&
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
          mode: form.mode,
          matterTypes: form.matterTypes,
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
        }),
      });

      const text = await res.text();

      let data: { output?: string; error?: string };

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned non-JSON response (status ${res.status}): ${text.slice(
            0,
            200
          )}`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Select the text manually.");
    }
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 24,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>
        Praxis v0.5.3 — NDA Safety Gate
      </h1>

      <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>
        Internal tool: detect, label, and prepare attorney-review ready NDA
        packages. No legal advice. Nothing is sent externally.
      </p>

      <label style={labelStyle}>
        Workflow Mode <span style={{ color: "#c00" }}>*</span>
      </label>
      <select
        style={inputStyle}
        value={form.mode}
        onChange={(e) => set("mode", e.target.value)}
      >
        {WORKFLOW_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>

      <label style={labelStyle}>
        Matter Type <span style={{ color: "#c00" }}>*</span>
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          border: "1px solid #ccc",
          borderRadius: 4,
          padding: 10,
        }}
      >
        {MATTER_TYPES.map((matterType) => (
          <label key={matterType} style={{ fontSize: 13, fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={form.matterTypes.includes(matterType)}
              onChange={() => toggleMatterType(matterType)}
              style={{ marginRight: 6 }}
            />
            {matterType}
          </label>
        ))}
      </div>

      <label style={labelStyle}>
        Raw Materials <span style={{ color: "#c00" }}>*</span>
      </label>
      <textarea
        style={textareaStyle}
        rows={14}
        placeholder={RAW_MATERIALS_PLACEHOLDER}
        value={form.rawMaterials}
        onChange={(e) => set("rawMaterials", e.target.value)}
      />

      <label style={labelStyle}>Final / Current Draft</label>
      <textarea
        style={textareaStyle}
        rows={10}
        placeholder="Paste the current working draft, if one exists. Leave empty if drafting from scratch."
        value={form.currentDraft}
        onChange={(e) => set("currentDraft", e.target.value)}
      />

      <label style={labelStyle}>Human Process Notes</label>
      <textarea
        style={textareaStyle}
        rows={5}
        placeholder="Paste drafter/attorney answers to process-note questions, if collected. Leave empty if not yet collected."
        value={form.processNotes}
        onChange={(e) => set("processNotes", e.target.value)}
      />

      <label style={labelStyle}>Old / Excluded Names and Terms</label>
      <div style={hintStyle}>
        Terms that must not remain in the current draft. One per line. This is
        used for deterministic S1 detection.
      </div>
      <textarea
        style={textareaStyle}
        rows={6}
        placeholder={"HALL\nMICHAEL HALL\n$500\n2021\n2022\n8.30.2024"}
        value={form.oldMatterTerms}
        onChange={(e) => set("oldMatterTerms", e.target.value)}
      />

      <label style={labelStyle}>
        Party Information <span style={{ color: "#c00" }}>*</span>
      </label>
      <div style={hintStyle}>
        Format: Name | Type | Capacity | Address | Signer | Initials
      </div>
      <textarea
        style={textareaStyle}
        rows={7}
        value={form.partyInfo}
        onChange={(e) => set("partyInfo", e.target.value)}
      />

      <label style={labelStyle}>
        Deal Terms with Provenance <span style={{ color: "#c00" }}>*</span>
      </label>
      <div style={hintStyle}>
        Format: Term | Value | Provenance. Use Instructed / Inherited /
        Unknown.
      </div>
      <textarea
        style={textareaStyle}
        rows={5}
        value={form.dealTerms}
        onChange={(e) => set("dealTerms", e.target.value)}
      />

      <label style={labelStyle}>Deadline</label>
      <input
        type="date"
        style={{ ...inputStyle, maxWidth: 220 }}
        value={form.deadline}
        onChange={(e) => set("deadline", e.target.value)}
      />

      <label
        style={{
          ...labelStyle,
          fontWeight: 400,
          fontSize: 13,
          marginTop: 8,
        }}
      >
        <input
          type="checkbox"
          checked={form.deadlineIntentionallyBlank}
          onChange={(e) => set("deadlineIntentionallyBlank", e.target.checked)}
          style={{ marginRight: 6 }}
        />
        The deadline is intentionally blank, confirmed by attorney/drafter.
      </label>

      {deadlineWarning && (
        <div
          style={{
            background: "#fff8e1",
            border: "1px solid #e6c200",
            borderRadius: 4,
            padding: "8px 12px",
            fontSize: 13,
            marginTop: 6,
          }}
        >
          ⚠ Blank deadline will trigger stop condition S4.
        </div>
      )}

      <label style={labelStyle}>
        Reviewer Type <span style={{ color: "#c00" }}>*</span>
      </label>
      <select
        style={{ ...inputStyle, maxWidth: 220 }}
        value={form.reviewerType}
        onChange={(e) => set("reviewerType", e.target.value)}
      >
        <option value="Admin">Admin</option>
        <option value="Paralegal">Paralegal</option>
        <option value="Attorney">Attorney</option>
      </select>

      <label
        style={{
          ...labelStyle,
          fontWeight: 400,
          fontSize: 13,
          marginTop: 18,
          padding: 12,
          border: "1px solid #d6d6d6",
          borderRadius: 4,
          background: "#f8f8f8",
        }}
      >
        <input
          type="checkbox"
          checked={form.attorneyApprovedForExternalDelivery}
          onChange={(e) =>
            set("attorneyApprovedForExternalDelivery", e.target.checked)
          }
          style={{ marginRight: 6 }}
        />
        Attorney has approved this draft for external delivery.
        <div style={{ ...hintStyle, marginTop: 6 }}>
          This only clears S7. It does not override other open stop conditions
          or authorize automatic external response generation.
        </div>
      </label>

      <div style={{ marginTop: 24 }}>
        <button
          onClick={handleGenerate}
          disabled={!canSubmit}
          style={{
            padding: "12px 22px",
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 4,
            border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            background: canSubmit ? "#1a3a5c" : "#aab4bf",
            color: "#fff",
          }}
        >
          {loading ? "Generating..." : "Generate Attorney-Review Package"}
        </button>

        {!canSubmit && !loading && (
          <span style={{ ...hintStyle, marginLeft: 12 }}>
            Required: Workflow Mode, at least one Matter Type, Raw Materials,
            Party Information, Deal Terms, Reviewer Type.
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            background: "#fdecea",
            border: "1px solid #d93025",
            borderRadius: 4,
            padding: "10px 14px",
            fontSize: 13,
            marginTop: 16,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      {output && (
        <section style={{ marginTop: 32 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <h2 style={{ fontSize: 18, margin: 0 }}>Output</h2>
            <button
              onClick={handleCopy}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                borderRadius: 4,
                border: "1px solid #1a3a5c",
                background: copied ? "#e7f0e7" : "#fff",
                color: "#1a3a5c",
                cursor: "pointer",
              }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#f6f6f6",
              color: "#111",
              padding: 20,
              borderRadius: 8,
              border: "1px solid #ddd",
              lineHeight: 1.5,
              maxHeight: 700,
              overflowY: "auto",
              fontSize: 13,
            }}
          >
            {output}
          </pre>
        </section>
      )}
    </main>
  );
}
