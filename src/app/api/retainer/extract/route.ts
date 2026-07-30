import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";

import { parseBrowardCaseText } from "@/lib/retainer/rules";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A Clerk PDF or text file is required." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "The source file must be between 1 byte and 10 MB." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let text = "";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const parsed = await pdfParse(bytes);
    text = parsed.text;
  } else if (
    file.type.startsWith("text/") ||
    file.name.toLowerCase().endsWith(".txt")
  ) {
    text = bytes.toString("utf8");
  } else {
    return NextResponse.json(
      { error: "Only PDF and TXT source files are accepted." },
      { status: 415 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "No readable text was found in the uploaded source." },
      { status: 422 }
    );
  }

  return NextResponse.json({
    sourceLabel: `${file.name} — uploaded for in-memory extraction`,
    extracted: parseBrowardCaseText(text),
    retention: "The source was processed in memory and was not saved by this route.",
  });
}
