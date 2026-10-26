import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createDocSchema } from "@/lib/validation";

const listSelect = {
  id: true,
  title: true,
  updatedAt: true,
  owner: { select: { name: true, email: true } },
} as const;

export const GET = handle(async () => {
  const user = await requireUser();
  const [owned, shares] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: listSelect,
    }),
    prisma.documentShare.findMany({
      where: { userId: user.id },
      orderBy: { document: { updatedAt: "desc" } },
      select: { role: true, document: { select: listSelect } },
    }),
  ]);
  return NextResponse.json({
    owned,
    shared: shares.map((s) => ({ ...s.document, role: s.role })),
  });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const { title } = createDocSchema.parse(body);
  const doc = await prisma.document.create({
    data: { ownerId: user.id, ...(title ? { title } : {}) },
    select: { id: true },
  });
  return NextResponse.json(doc, { status: 201 });
});
