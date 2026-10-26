import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAccess } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { DocEditor } from "@/components/DocEditor";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  const access = doc ? getAccess(doc, user.id) : null;
  if (!doc || !access) notFound();

  return (
    <DocEditor
      doc={{
        id: doc.id,
        title: doc.title,
        content: doc.content,
        owner: doc.owner,
        shares: doc.shares.map((s) => ({ role: s.role, user: s.user })),
      }}
      access={access}
    />
  );
}
