"use client";

import { useMemo, useState } from "react";

import {
  type ExtractedCase,
  type RetainerMatter,
  validateMatter,
} from "@/lib/retainer/rules";

const initialMatter: RetainerMatter = {
  templateVariant: "no-guarantee",
  deliveryMethod: "Adobe Sign",
  recipientName: "",
  recipientDesignation: "Esq.",
  clientFirm: "",
  addressLine1: "",
  addressLine2: "",
  cityStateZip: "",
  salutation: "",
  clientInitials: "",
  plaintiffName: "",
  defendantName: "",
  caseNumber: "",
  officeFileNumber: "",
  clientSide: "Plaintiff",
  feeClaimantSide: "Plaintiff",
  feePosition: "Support fee claim",
  expertRate: 425,
  staffRate: 175,
  deposit: 1000,
  acknowledgementDate: "",
  sourceLabel: "",
  sourceConfirmed: false,
  attorneyAddressConfirmed: false,
  templateConfirmed: false,
};

const STEPS = [
  "Court PDF",
  "Lawyer",
  "Job",
  "Money",
  "Make Word",
] as const;

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#090d12",
  color: "#f3f4f6",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const shell: React.CSSProperties = {
  maxWidth: 820,
  margin: "0 auto",
  padding: "28px 18px 70px",
};
const card: React.CSSProperties = {
  marginTop: 18,
  padding: 22,
  border: "1px solid #273241",
  borderRadius: 12,
  background: "#111827",
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 14,
};
const label: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 14,
  fontWeight: 750,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #475569",
  borderRadius: 8,
  background: "#07101d",
  color: "#f9fafb",
  fontSize: 16,
};
const hint: React.CSSProperties = {
  color: "#a7b0bf",
  fontSize: 13,
  lineHeight: 1.5,
};
const choiceGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 10,
  marginTop: 8,
};

type ExtractionResponse = {
  sourceLabel?: string;
  extracted?: ExtractedCase;
  error?: string;
};

type CompileError = {
  error?: string;
  blockers?: string[];
};

function Field({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div>
      <label style={label}>{title}</label>
      {children}
      {note && <div style={{ ...hint, marginTop: 5 }}>{note}</div>}
    </div>
  );
}

function Choice<T extends string>({
  value,
  current,
  title,
  note,
  onChoose,
}: {
  value: T;
  current: T;
  title: string;
  note: string;
  onChoose: (value: T) => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onChoose(value)}
      style={{
        padding: 15,
        borderRadius: 9,
        border: `2px solid ${active ? "#93c5fd" : "#334155"}`,
        background: active ? "#152958" : "#0b1220",
        color: "#f9fafb",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
      <div style={{ ...hint, marginTop: 5 }}>{note}</div>
    </button>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        marginTop: 13,
        fontSize: 14,
        lineHeight: 1.45,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ width: 19, height: 19, marginTop: 1 }}
      />
      <span>{children}</span>
    </label>
  );
}

export default function RetainerProductionPage() {
  const [step, setStep] = useState(0);
  const [matter, setMatter] = useState<RetainerMatter>(initialMatter);
  const [extracted, setExtracted] = useState<ExtractedCase | null>(null);
  const [busy, setBusy] = useState<"extract" | "compile" | null>(null);
  const [message, setMessage] = useState("");

  const validation = useMemo(() => validateMatter(matter), [matter]);

  const set = <K extends keyof RetainerMatter>(
    key: K,
    value: RetainerMatter[K]
  ) => setMatter((current) => ({ ...current, [key]: value }));

  const stepReady = [
    Boolean(
      matter.sourceLabel &&
        matter.plaintiffName &&
        matter.defendantName &&
        matter.caseNumber &&
        matter.officeFileNumber &&
        matter.acknowledgementDate &&
        matter.sourceConfirmed
    ),
    Boolean(
      matter.recipientName &&
        matter.clientFirm &&
        matter.addressLine1 &&
        matter.cityStateZip &&
        matter.salutation &&
        matter.clientInitials &&
        matter.attorneyAddressConfirmed
    ),
    matter.templateConfirmed,
    Boolean(matter.expertRate > 0 && matter.staffRate > 0 && matter.deposit > 0),
    validation.blockers.length === 0,
  ][step];

  async function uploadSource(file: File | undefined) {
    if (!file) return;
    setBusy("extract");
    setMessage("");
    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/retainer/extract", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as ExtractionResponse;
      if (!response.ok || !data.extracted) {
        throw new Error(data.error || "Praxis could not read this file.");
      }

      setExtracted(data.extracted);
      setMatter((current) => ({
        ...current,
        plaintiffName: data.extracted?.plaintiffName || "",
        defendantName: data.extracted?.defendantName || "",
        caseNumber: data.extracted?.caseNumber || "",
        recipientName: data.extracted?.retainingAttorney || "",
        sourceLabel: data.sourceLabel || file.name,
        sourceConfirmed: false,
      }));
      setMessage("Done. Check the three yellow boxes below.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function compilePackage() {
    setBusy("compile");
    setMessage("");
    try {
      const response = await fetch("/api/retainer/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matter),
      });
      if (!response.ok) {
        const data = (await response.json()) as CompileError;
        throw new Error(
          [data.error, ...(data.blockers || [])].filter(Boolean).join(" ")
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ||
        "Retainer_Production_Package.zip";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage(
        "Finished. Open the Attorney Review Packet first. Nothing was sent to the client."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Word creation failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={page}>
      <div style={shell}>
        <a href="/" style={{ color: "#93c5fd", fontSize: 13 }}>
          ← Praxis
        </a>
        <h1 style={{ margin: "16px 0 5px", fontSize: 28 }}>
          Make a Retainer Agreement
        </h1>
        <p style={{ ...hint, margin: 0 }}>
          Follow the five screens. Do not guess. If a red message appears, stop.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 5,
            marginTop: 20,
          }}
        >
          {STEPS.map((name, index) => (
            <div key={name}>
              <div
                style={{
                  height: 5,
                  borderRadius: 4,
                  background: index <= step ? "#93c5fd" : "#273241",
                }}
              />
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: index === step ? "#dbeafe" : "#778195",
                  textAlign: "center",
                }}
              >
                {index + 1}. {name}
              </div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <section style={card}>
            <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>
              1. Put in the court PDF
            </h2>
            <p style={{ ...hint, margin: "0 0 15px" }}>
              Use the “Case Detail” PDF from the Clerk. Do not open Word first.
            </p>
            <input
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              disabled={busy === "extract"}
              onChange={(event) => uploadSource(event.target.files?.[0])}
              style={input}
            />

            {(extracted || matter.sourceLabel) && (
              <div style={{ ...grid, marginTop: 18 }}>
                <Field title="Plaintiff — copy from PDF">
                  <input
                    style={input}
                    value={matter.plaintiffName}
                    onChange={(event) =>
                      set("plaintiffName", event.target.value)
                    }
                  />
                </Field>
                <Field title="Defendant — copy from PDF">
                  <input
                    style={input}
                    value={matter.defendantName}
                    onChange={(event) =>
                      set("defendantName", event.target.value)
                    }
                  />
                </Field>
                <Field title="Case number — copy from PDF">
                  <input
                    style={input}
                    value={matter.caseNumber}
                    onChange={(event) => set("caseNumber", event.target.value)}
                  />
                </Field>
                <Field
                  title="Our file number"
                  note="The Office Manager gives you this. Never make one up."
                >
                  <input
                    style={input}
                    placeholder="26-001 (AF)"
                    value={matter.officeFileNumber}
                    onChange={(event) =>
                      set("officeFileNumber", event.target.value)
                    }
                  />
                </Field>
                <Field
                  title="Date Morrie was first contacted"
                  note="Not today. Not the signature date."
                >
                  <input
                    type="date"
                    style={input}
                    value={matter.acknowledgementDate}
                    onChange={(event) =>
                      set("acknowledgementDate", event.target.value)
                    }
                  />
                </Field>
              </div>
            )}
            {matter.sourceLabel && (
              <Check
                checked={matter.sourceConfirmed}
                onChange={(checked) => set("sourceConfirmed", checked)}
              >
                I looked at the PDF. These names and the case number are exactly
                the same.
              </Check>
            )}
          </section>
        )}

        {step === 1 && (
          <section style={card}>
            <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>
              2. Who gets the agreement?
            </h2>
            <p style={{ ...hint, margin: "0 0 15px" }}>
              Check the lawyer on{" "}
              <a
                href="https://www.floridabar.org/directories/find-mbr/"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#93c5fd", textDecoration: "underline" }}
              >
                The Florida Bar
              </a>
              . Copy and paste. Do not type from memory.
            </p>
            <div style={grid}>
              <Field title="Lawyer’s full name">
                <input
                  style={input}
                  value={matter.recipientName}
                  onChange={(event) => set("recipientName", event.target.value)}
                />
              </Field>
              <Field title="Word after the name">
                <select
                  style={input}
                  value={matter.recipientDesignation}
                  onChange={(event) =>
                    set(
                      "recipientDesignation",
                      event.target
                        .value as RetainerMatter["recipientDesignation"]
                    )
                  }
                >
                  <option value="Esq.">Esq.</option>
                  <option value="Attorney-at-Law">Attorney-at-Law</option>
                </select>
              </Field>
              <Field title="Law firm — goes after c/o">
                <input
                  style={input}
                  value={matter.clientFirm}
                  onChange={(event) => set("clientFirm", event.target.value)}
                />
              </Field>
              <Field title="Dear ...">
                <input
                  style={input}
                  placeholder="Mr. Smith or Ms. North"
                  value={matter.salutation}
                  onChange={(event) => set("salutation", event.target.value)}
                />
              </Field>
              <Field title="Mailing address">
                <input
                  style={input}
                  value={matter.addressLine1}
                  onChange={(event) => set("addressLine1", event.target.value)}
                />
              </Field>
              <Field title="Suite — leave blank if none">
                <input
                  style={input}
                  value={matter.addressLine2}
                  onChange={(event) => set("addressLine2", event.target.value)}
                />
              </Field>
              <Field
                title="City, state, ZIP"
                note='Write “Ft.” and “FL.” Do not write “Fort” or “Florida.”'
              >
                <input
                  style={input}
                  placeholder="Ft. Lauderdale, FL 33301"
                  value={matter.cityStateZip}
                  onChange={(event) => set("cityStateZip", event.target.value)}
                />
              </Field>
              <Field
                title="Initials at the bottom of each page"
                note="Use the client or firm initials shown in the approved example."
              >
                <input
                  style={input}
                  placeholder="K.W.N."
                  value={matter.clientInitials}
                  onChange={(event) => set("clientInitials", event.target.value)}
                />
              </Field>
            </div>
            <Check
              checked={matter.attorneyAddressConfirmed}
              onChange={(checked) =>
                set("attorneyAddressConfirmed", checked)
              }
            >
              I checked the lawyer’s name and mailing address. They are current.
            </Check>
          </section>
        )}

        {step === 2 && (
          <section style={card}>
            <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>
              3. What did the lawyer ask Morrie to do?
            </h2>
            <p style={{ ...hint, margin: "0 0 15px" }}>
              Get these answers from the instruction. If you do not know, stop
              and ask.
            </p>

            <div style={{ marginTop: 18, fontWeight: 800 }}>
              Which side hired Morrie?
            </div>
            <div style={choiceGrid}>
              <Choice
                value="Plaintiff"
                current={matter.clientSide}
                title="Plaintiff"
                note="The Plaintiff’s lawyer hired Morrie."
                onChoose={(value) => set("clientSide", value)}
              />
              <Choice
                value="Defendant"
                current={matter.clientSide}
                title="Defendant"
                note="The Defendant’s lawyer hired Morrie."
                onChoose={(value) => set("clientSide", value)}
              />
            </div>

            <div style={{ marginTop: 20, fontWeight: 800 }}>
              Who is asking the court for attorney’s fees?
            </div>
            <div style={choiceGrid}>
              <Choice
                value="Plaintiff"
                current={matter.feeClaimantSide}
                title="Plaintiff"
                note="Plaintiff is asking for fees."
                onChoose={(value) => set("feeClaimantSide", value)}
              />
              <Choice
                value="Defendant"
                current={matter.feeClaimantSide}
                title="Defendant"
                note="Defendant is asking for fees."
                onChoose={(value) => set("feeClaimantSide", value)}
              />
            </div>

            <div style={{ marginTop: 20, fontWeight: 800 }}>
              What is Morrie doing?
            </div>
            <div style={choiceGrid}>
              <Choice
                value="Support fee claim"
                current={matter.feePosition}
                title="Support the fee claim"
                note="Explain why the requested fee is reasonable."
                onChoose={(value) => set("feePosition", value)}
              />
              <Choice
                value="Challenge fee claim"
                current={matter.feePosition}
                title="Challenge the fee claim"
                note="Review or reduce the other side’s request."
                onChoose={(value) => set("feePosition", value)}
              />
            </div>

            <div style={{ marginTop: 20, fontWeight: 800 }}>
              Does the lawyer personally promise payment?
            </div>
            <div style={choiceGrid}>
              <Choice
                value="no-guarantee"
                current={matter.templateVariant}
                title="No Guarantee"
                note="Use this unless Morrie clearly instructed otherwise."
                onChoose={(value) => set("templateVariant", value)}
              />
              <Choice
                value="with-guarantee"
                current={matter.templateVariant}
                title="Yes — add Guarantee"
                note="Use only with clear instruction."
                onChoose={(value) => set("templateVariant", value)}
              />
            </div>

            <div style={{ marginTop: 20, fontWeight: 800 }}>
              How will the lawyer sign?
            </div>
            <div style={choiceGrid}>
              <Choice
                value="Adobe Sign"
                current={matter.deliveryMethod}
                title="Adobe Sign"
                note="Normal office method."
                onChoose={(value) => set("deliveryMethod", value)}
              />
              <Choice
                value="Email only"
                current={matter.deliveryMethod}
                title="Email only"
                note="Use only when instructed."
                onChoose={(value) => set("deliveryMethod", value)}
              />
            </div>

            <Check
              checked={matter.templateConfirmed}
              onChange={(checked) => set("templateConfirmed", checked)}
            >
              I got these answers from the lawyer’s or Office Manager’s
              instruction. I did not guess.
            </Check>
          </section>
        )}

        {step === 3 && (
          <section style={card}>
            <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>
              4. Check the money
            </h2>
            <p style={{ ...hint, margin: "0 0 15px" }}>
              Type each number once. Praxis puts the same number everywhere,
              including the amount written in words.
            </p>
            <div style={grid}>
              <Field title="Morrie’s hourly rate">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={input}
                  value={matter.expertRate}
                  onChange={(event) =>
                    set("expertRate", Number(event.target.value))
                  }
                />
              </Field>
              <Field title="Staff hourly rate">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={input}
                  value={matter.staffRate}
                  onChange={(event) =>
                    set("staffRate", Number(event.target.value))
                  }
                />
              </Field>
              <Field title="Refundable Retainer Deposit">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={input}
                  value={matter.deposit}
                  onChange={(event) =>
                    set("deposit", Number(event.target.value))
                  }
                />
              </Field>
            </div>
            <div
              style={{
                marginTop: 18,
                padding: 13,
                border: "1px solid #a16207",
                borderRadius: 8,
                background: "#2a1f0b",
                color: "#fde68a",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              If two papers show different numbers, do not choose one. Stop and
              ask Morrie or the Office Manager.
            </div>
          </section>
        )}

        {step === 4 && (
          <section style={card}>
            <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>
              5. Make the Word files
            </h2>
            <p style={{ ...hint, margin: "0 0 15px" }}>
              Praxis will make three Word files. Morrie reviews them before
              anyone sends them.
            </p>

            <div
              style={{
                padding: 15,
                borderRadius: 9,
                background: validation.blockers.length ? "#351012" : "#0d2a1a",
                border: `1px solid ${
                  validation.blockers.length ? "#ef4444" : "#22c55e"
                }`,
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 850 }}>
                {validation.blockers.length
                  ? `${validation.blockers.length} item(s) still need work`
                  : "Ready to make the Word package"}
              </div>
              {validation.blockers.length > 0 && (
                <ul style={{ margin: "10px 0 0 20px", lineHeight: 1.6 }}>
                  {validation.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: 18, lineHeight: 1.8, fontSize: 15 }}>
              <div>✓ Executing Cover Letter</div>
              <div>✓ Retainer Agreement</div>
              <div>✓ One-page Attorney Review Packet</div>
            </div>

            <button
              type="button"
              disabled={validation.blockers.length > 0 || busy === "compile"}
              onClick={compilePackage}
              style={{
                width: "100%",
                marginTop: 18,
                padding: "15px 18px",
                border: 0,
                borderRadius: 9,
                background:
                  validation.blockers.length === 0 ? "#93c5fd" : "#475569",
                color:
                  validation.blockers.length === 0 ? "#07101d" : "#cbd5e1",
                fontSize: 17,
                fontWeight: 850,
                cursor:
                  validation.blockers.length === 0 ? "pointer" : "not-allowed",
              }}
            >
              {busy === "compile"
                ? "Making Word files..."
                : "Make 3 Word Files"}
            </button>
            <p style={{ ...hint, margin: "10px 0 0", textAlign: "center" }}>
              Praxis does not email the client. Attorney approval comes first.
            </p>
          </section>
        )}

        {message && (
          <div
            style={{
              marginTop: 14,
              padding: 13,
              borderRadius: 8,
              background: "#0f1f3d",
              border: "1px solid #1d4ed8",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            type="button"
            disabled={step === 0}
            onClick={() => {
              setMessage("");
              setStep((current) => Math.max(0, current - 1));
            }}
            style={{
              padding: "11px 16px",
              borderRadius: 8,
              border: "1px solid #475569",
              background: "#0b1220",
              color: step === 0 ? "#596273" : "#e5e7eb",
              cursor: step === 0 ? "not-allowed" : "pointer",
            }}
          >
            Back
          </button>
          {step < 4 && (
            <button
              type="button"
              disabled={!stepReady}
              onClick={() => {
                setMessage("");
                setStep((current) => Math.min(4, current + 1));
              }}
              style={{
                padding: "12px 18px",
                borderRadius: 8,
                border: 0,
                background: stepReady ? "#93c5fd" : "#475569",
                color: stepReady ? "#07101d" : "#cbd5e1",
                fontWeight: 800,
                cursor: stepReady ? "pointer" : "not-allowed",
              }}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
