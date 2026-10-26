import { FileText, Inbox, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Avatar, LogoMark } from "@/components/Avatar";
import { DashboardActions } from "@/components/DashboardActions";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function DocRow({ id, title, meta, badge }: { id: string; title: string; meta: string; badge?: React.ReactNode }) {
  return (
    <li>
      <Link href={`/docs/${id}`} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <FileText className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium group-hover:text-blue-700">{title}</span>
          <span className="block truncate text-xs text-slate-500">{meta}</span>
        </span>
        {badge}
      </Link>
    </li>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        {title}
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{count}</span>
      </h2>
      {count === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          <Inbox className="h-6 w-6 text-slate-400" />
          {empty}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {children}
        </ul>
      )}
    </section>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [owned, shares] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, _count: { select: { shares: true } } },
    }),
    prisma.documentShare.findMany({
      where: { userId: user.id },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        role: true,
        document: { select: { id: true, title: true, updatedAt: true, owner: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="text-lg font-semibold tracking-tight">Ajaia Docs</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm leading-tight sm:block">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <Avatar id={user.id} name={user.name} />
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-slate-100/70">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="mb-4 text-sm font-medium text-slate-600">Start a new document</h1>
          <DashboardActions />
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        <Section title="My documents" count={owned.length} empty="No documents yet. Start a blank one or import a file above.">
          {owned.map((d) => (
            <DocRow
              key={d.id}
              id={d.id}
              title={d.title}
              meta={`Edited ${formatDate(d.updatedAt)}`}
              badge={
                d._count.shares > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    <Users className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Shared with</span> {d._count.shares}
                  </span>
                )
              }
            />
          ))}
        </Section>

        <Section title="Shared with me" count={shares.length} empty="Nothing has been shared with you yet.">
          {shares.map(({ role, document: d }) => (
            <DocRow
              key={d.id}
              id={d.id}
              title={d.title}
              meta={`${d.owner.name} · Edited ${formatDate(d.updatedAt)}`}
              badge={
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    role === "editor" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {role === "editor" ? "Can edit" : "View only"}
                </span>
              }
            />
          ))}
        </Section>
      </main>
    </div>
  );
}
