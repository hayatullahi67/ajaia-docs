"use client";

import { Loader2, Lock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SEEDED_USERS } from "@/lib/users";
import { Avatar } from "./Avatar";

type Role = "editor" | "viewer";
type Person = { id: string; name: string; email: string };
export type ShareEntry = { role: string; user: Person };

interface Props {
  docId: string;
  title: string;
  owner: Person;
  shares: ShareEntry[];
  onChange: (shares: ShareEntry[]) => void;
  onClose: () => void;
}

/** Owner-only dialog: grant access by email, change a role, or remove access.
 * A bottom sheet on phones, a centred modal on larger screens. */
export function ShareDialog({ docId, title, owner, shares, onChange, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Sharing an existing person again updates their role (the API upserts).
  async function grant(targetEmail: string, targetRole: Role) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/documents/${docId}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, role: targetRole }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not share");
      return false;
    }
    const entry = { role: data.role, user: data.user };
    const exists = shares.some((s) => s.user.id === data.user.id);
    onChange(exists ? shares.map((s) => (s.user.id === data.user.id ? entry : s)) : [...shares, entry]);
    return true;
  }

  async function remove(userId: string) {
    setError(null);
    const res = await fetch(`/api/documents/${docId}/shares/${userId}`, { method: "DELETE" });
    if (res.ok) onChange(shares.filter((s) => s.user.id !== userId));
    else setError("Could not remove access");
  }

  const suggestions = SEEDED_USERS.filter((u) => u.id !== owner.id && !shares.some((s) => s.user.id === u.id));
  const field = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="share-title" className="min-w-0 text-lg font-semibold">
            Share <span className="break-words">“{title}”</span>
          </h2>
          <button onClick={onClose} aria-label="Close" className="-m-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await grant(email, role)) setEmail("");
          }}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            ref={input}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Add people by email"
            list="seeded-emails"
            aria-label="Email to share with"
            className={`${field} min-w-0 flex-1`}
          />
          <datalist id="seeded-emails">
            {suggestions.map((u) => (
              <option key={u.id} value={u.email}>
                {u.name}
              </option>
            ))}
          </datalist>
          <div className="flex gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Access level" className={`${field} flex-1`}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Share
            </button>
          </div>
        </form>
        {suggestions.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">Demo accounts: {suggestions.map((u) => u.email).join(", ")}</p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <h3 className="mt-6 text-sm font-semibold text-slate-700">People with access</h3>
        <ul className="mt-2 divide-y divide-slate-100">
          <li className="flex items-center gap-3 py-2.5">
            <Avatar id={owner.id} name={owner.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{owner.name} (you)</span>
              <span className="block truncate text-xs text-slate-500">{owner.email}</span>
            </span>
            <span className="text-sm text-slate-500">Owner</span>
          </li>
          {shares.map((s) => (
            <li key={s.user.id} className="flex items-center gap-3 py-2.5">
              <Avatar id={s.user.id} name={s.user.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.user.name}</span>
                <span className="block truncate text-xs text-slate-500">{s.user.email}</span>
              </span>
              <select
                value={s.role === "editor" ? "editor" : "viewer"}
                onChange={(e) => grant(s.user.email, e.target.value as Role)}
                aria-label={`Access for ${s.user.name}`}
                className="rounded-md border-0 bg-transparent py-1 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={() => remove(s.user.id)}
                aria-label={`Remove ${s.user.name}`}
                title="Remove access"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5" /> Only people listed here can open this document.
          </p>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
