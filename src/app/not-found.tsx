import { FileQuestion } from "lucide-react";
import Link from "next/link";

// Shown for unknown documents and for documents the user can't access, so
// the two cases look identical (we don't reveal that a document exists).
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
          <FileQuestion className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Document not found</h1>
        <p className="mt-1 text-sm text-slate-500">It may have been deleted, or you don&apos;t have access to it.</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Back to documents
        </Link>
      </div>
    </main>
  );
}
