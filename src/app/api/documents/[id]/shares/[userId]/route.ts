import { NextResponse } from "next/server";
import { handle, HttpError, loadDocForUser, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { canManage } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, userId } = await params;
  const { access } = await loadDocForUser(id, user.id);
  if (!canManage(access)) throw new HttpError(403, "Only the owner can remove access");
  await prisma.documentShare.deleteMany({ where: { documentId: id, userId } });
  return NextResponse.json({ ok: true });
});
