"use client";

import { useState } from "react";

export default function Home() {
  const [matterType, setMatterType] = useState("General client inquiry");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateMemo() {
    setLoading(true);
    setOutput("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, matterType }),
      });

      const text = await res.text();

      let data: { output?: string; error?: string };

      try {
        data = JSON.parse(text);
      } catch {
        setOutput(`Server returned non-JSON response:\n\n${text.slice(0, 1000)}`);
        return;
      }

      if (!res.ok) {
        setOutput(data.error || "Request failed");
      } else {
        setOutput(data.output || "No output");
      }
    } catch (error) {
      console.error(error);
      setOutput("Request failed. Check the Codespaces terminal for details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Praxis Legal Router</h1>
      <p>Internal tool: client message → attorney review memo. Not legal advice.</p>

      <label>
        Matter Type
        <select value={matterType} onChange={(e) => setMatterType(e.target.value)} style={{ display: "block", width: "100%", padding: 10, marginTop: 8, marginBottom: 16 }}>
          <option>General client inquiry</option>
          <option>NDA review</option>
          <option>Florida-Japan real estate</option>
          <option>Retainer / engagement</option>
          <option>Mortgage / financing question</option>
          <option>Title / closing issue</option>
          <option>Other</option>
        </select>
      </label>

      <label>
        Client Message / Notes
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste client email, intake notes, or case facts here..." style={{ display: "block", width: "100%", height: 220, padding: 12, marginTop: 8, marginBottom: 16 }} />
      </label>

      <button onClick={generateMemo} disabled={loading || !input.trim()} style={{ padding: "12px 18px", cursor: loading || !input.trim() ? "not-allowed" : "pointer" }}>
        {loading ? "Generating..." : "Generate Attorney Review Memo"}
      </button>

      {output && (
        <section style={{ marginTop: 32 }}>
          <h2>Output</h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", color: "#111", padding: 20, borderRadius: 8, lineHeight: 1.5 }}>
            {output}
          </pre>
        </section>
      )}
    </main>
  );
}
