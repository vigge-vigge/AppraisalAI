import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appraisalSaveSchema } from "@/types/appraisal";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const appraisal = await prisma.appraisal.findUnique({ where: { id } });
    if (!appraisal) {
      return NextResponse.json({ error: "Appraisal not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...appraisal,
      data: JSON.parse(appraisal.data),
      meta: JSON.parse(appraisal.meta),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve appraisal" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
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
    const existingAppraisal = await prisma.appraisal.findUnique({ where: { id } });
    if (!existingAppraisal) {
      return NextResponse.json({ error: "Appraisal not found" }, { status: 404 });
    }

    const appraisal = await prisma.appraisal.update({
      where: { id },
      data: { data: JSON.stringify(data), meta: JSON.stringify(meta) },
    });

    return NextResponse.json({
      ...appraisal,
      data: JSON.parse(appraisal.data),
      meta: JSON.parse(appraisal.meta),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to update appraisal" },
      { status: 500 },
    );
  }
}