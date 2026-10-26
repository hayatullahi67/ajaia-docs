"use client";

import { Loader2, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Busy = null | "create" | "import";

export function DashboardActions() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  async function createDoc() {
    setBusy("create");
    setError(null);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/docs/${body.id}`);
    else {
      setError(body.error ?? "Could not create document");
      setBusy(null);
    }
  }

  async function importFile(file: File) {
    setBusy("import");
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/documents/import", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/docs/${body.id}`);
    else {
      setError(body.error ?? "Import failed");
      setBusy(null);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  const tile =
    "grid h-32 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm transition group-hover:border-blue-500 group-hover:shadow-md group-disabled:opacity-60 sm:h-40";

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:flex">
        <button onClick={createDoc} disabled={busy !== null} className="group text-left sm:w-44">
          <span className={tile}>
            {busy === "create" ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            ) : (
              <Plus className="h-10 w-10 text-blue-600" strokeWidth={1.75} />
            )}
          </span>
          <span className="mt-2 block text-sm font-medium">Blank document</span>
        </button>

        <button onClick={() => fileInput.current?.click()} disabled={busy !== null} className="group text-left sm:w-44">
          <span className={tile}>
            {busy === "import" ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            ) : (
              <Upload className="h-9 w-9 text-slate-500 group-hover:text-blue-600" strokeWidth={1.75} />
            )}
          </span>
          <span className="mt-2 block text-sm font-medium">Import a file</span>
          <span className="block text-xs text-slate-500">.txt or .md, up to 1 MB</span>
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importFile(f);
        }}
      />
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
