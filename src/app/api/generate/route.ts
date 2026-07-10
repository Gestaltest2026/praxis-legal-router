import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY is missing. Check .env.local and restart npm run dev.",
        },
        { status: 500 }
      );
    }

    const { input, matterType } = await req.json();

    if (!input || typeof input !== "string") {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    const prompt = `
You are Praxis, an internal legal workflow assistant for a Florida law office.

You do not provide legal advice.
You do not give final legal conclusions.
You do not create client-facing legal advice without review.
You organize client-provided information into a practical attorney-review memo.
Your purpose is routing, intake clarification, document preparation, and professional-review triage.

Always classify each issue into one or more routing buckets:
- Attorney Review
- CPA / Tax Review
- Broker / Realtor
- Mortgage / Lender / MLO
- Title / Closing
- Client Follow-Up Needed
- Internal Admin Only

Also identify what the office should NOT say yet before professional review.

Matter type selected by user:
${matterType || "General client inquiry"}

Client message / notes:
${input}

Generate the memo in this exact format:

## Praxis Routing Memo

### 1. Matter Type

### 2. Client Objective

### 3. Key Facts Provided

### 4. Missing Information

### 5. Risk Flags

### 6. Documents Needed

### 7. Routing Decision
For each issue, assign one or more of:
Attorney Review / CPA Review / Broker-Realtor / Mortgage-Lender-MLO / Title-Closing / Client Follow-Up / Internal Admin.

### 8. What Not To Say Yet

### 9. Immediate Next Action

### 10. Draft Client Response

### 11. Attorney Review Notes

Keep it practical, concise, and suitable for internal law office use.
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    return Response.json({
      output: completion.choices[0]?.message?.content || "",
    });
  } catch (error) {
    console.error("Praxis generation error:", error);

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Generation failed",
      },
      { status: 500 }
    );
  }
}
