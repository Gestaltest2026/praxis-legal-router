import { NextResponse } from "next/server";

import { compileRetainerPackage } from "@/lib/retainer/compiler";
import {
  type RetainerMatter,
  validateMatter,
} from "@/lib/retainer/rules";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let matter: RetainerMatter;
  try {
    matter = (await request.json()) as RetainerMatter;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  matter.expertRate = Number(matter.expertRate);
  matter.staffRate = Number(matter.staffRate);
  matter.deposit = Number(matter.deposit);

  const validation = validateMatter(matter);
  if (validation.blockers.length) {
    return NextResponse.json(
      {
        error: "Production blocked.",
        status: validation.status,
        blockers: validation.blockers,
        decisions: validation.decisions,
      },
      { status: 422 }
    );
  }

  try {
    const output = await compileRetainerPackage(matter);
    return new Response(new Uint8Array(output.bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${output.filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Retainer package compilation failed.",
      },
      { status: 500 }
    );
  }
}
