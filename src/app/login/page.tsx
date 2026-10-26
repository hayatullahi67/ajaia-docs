"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, LogoMark } from "@/components/Avatar";
import { SEEDED_USERS } from "@/lib/users";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(userId: string) {
    setLoading(userId);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not sign in");
      setLoading(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <span className="text-2xl font-semibold tracking-tight">Ajaia Docs</span>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a demo account to continue.</p>

          <div className="mt-6 space-y-3">
            {SEEDED_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => login(u.id)}
                disabled={loading !== null}
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-blue-400 hover:bg-blue-50/40 disabled:opacity-60"
              >
                <Avatar id={u.id} name={u.name} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{u.name}</span>
                  <span className="block truncate text-sm text-slate-500">{u.email}</span>
                </span>
                {loading === u.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                )}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Demo sign-in, no password. To test sharing, sign in as a second user in another browser or a private window.
        </p>
      </div>
    </main>
  );
}
