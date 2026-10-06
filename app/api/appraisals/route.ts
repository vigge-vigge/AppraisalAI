import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appraisalSaveSchema } from "@/types/appraisal";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = appraisalSaveSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid appraisal data", details: result.error.issues },
      { status: 400 },
    );
  }

  const { data, meta } = "data" in result.data
    ? { data: result.data.data, meta: result.data.meta ?? {} }
    : { data: result.data, meta: {} };

  try {
    const appraisal = await prisma.appraisal.create({
      data: {
        data: JSON.stringify(data),
        meta: JSON.stringify(meta),
      },
      select: { id: true },
    });

    return NextResponse.json({ id: appraisal.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to create appraisal" },
      { status: 500 },
    );
  }
}