import { NextResponse } from "next/server";
import { handle, HttpError, loadDocForUser, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { canEdit, canManage } from "@/lib/permissions";
import { updateDocSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { doc, access } = await loadDocForUser(id, user.id);
  return NextResponse.json({ ...doc, access });
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { access } = await loadDocForUser(id, user.id);
  if (!canEdit(access)) throw new HttpError(403, "You have view-only access");
  const data = updateDocSchema.parse(await req.json());
  const updated = await prisma.document.update({
    where: { id },
    data,
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json(updated);
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { access } = await loadDocForUser(id, user.id);
  if (!canManage(access)) throw new HttpError(403, "Only the owner can delete");
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
