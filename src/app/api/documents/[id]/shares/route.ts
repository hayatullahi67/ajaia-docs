import { NextResponse } from "next/server";
import { handle, HttpError, loadDocForUser, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { canManage } from "@/lib/permissions";
import { SEEDED_USERS } from "@/lib/users";
import { shareSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { access } = await loadDocForUser(id, user.id);
  if (!canManage(access)) throw new HttpError(403, "Only the owner can share");

  const { email, role } = shareSchema.parse(await req.json());

  // Users only exist once they've logged in, so fall back to the seeded list.
  const seeded = SEEDED_USERS.find((u) => u.email === email);
  const target =
    (await prisma.user.findUnique({ where: { email } })) ??
    (seeded
      ? await prisma.user.create({ data: { id: seeded.id, name: seeded.name, email } })
      : null);

  if (!target) throw new HttpError(404, "No user with that email");
  if (target.id === user.id) throw new HttpError(400, "You already own this document");

  const share = await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: id, userId: target.id } },
    update: { role },
    create: { documentId: id, userId: target.id, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(share, { status: 201 });
});
