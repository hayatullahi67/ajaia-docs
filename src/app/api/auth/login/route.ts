import { NextResponse } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { findSeededUser } from "@/lib/users";
import { loginSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const { userId } = loginSchema.parse(await req.json());
  const seeded = findSeededUser(userId);
  if (!seeded) throw new HttpError(400, "Unknown user");
  await prisma.user.upsert({
    where: { id: seeded.id },
    update: {},
    create: { id: seeded.id, name: seeded.name, email: seeded.email },
  });
  await setSession(seeded.id);
  return NextResponse.json({ ok: true });
});
