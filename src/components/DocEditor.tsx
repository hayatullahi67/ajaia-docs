"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Check, CircleAlert, Eye, Loader2, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Access } from "@/lib/permissions";
import { Avatar, LogoMark } from "./Avatar";
import { ShareDialog, type ShareEntry } from "./ShareDialog";
import { Toolbar } from "./Toolbar";

type Person = { id: string; name: string; email: string };
type SaveState = "saved" | "saving" | "unsaved" | "error";

interface Props {
  doc: { id: string; title: string; content: string; owner: Person; shares: ShareEntry[] };
  access: Exclude<Access, null>;
}

const SAVE_DELAY_MS = 800;

export function DocEditor({ doc, access }: Props) {
  const router = useRouter();
  const readOnly = access === "viewer";
  const isOwner = access === "owner";
  const [title, setTitle] = useState(doc.title);
  const [shares, setShares] = useState(doc.shares);
  const [shareOpen, setShareOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ title?: string; content?: string }>({});
  const inFlight = useRef(false);
  // Last non-empty title, used to restore the field if the user blanks it.
  const lastTitle = useRef(doc.title);

  const hasPending = () => pending.current.title !== undefined || pending.current.content !== undefined;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    // Only one save at a time, so an older save can never land after a newer
    // one. Edits made meanwhile stay in `pending` and go out when this finishes.
    if (inFlight.current || !hasPending()) return;
    const body = pending.current;
    pending.current = {};
    inFlight.current = true;
    setSaveState("saving");
    let ok = false;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      ok = true;
      setError(null);
      setSaveState(hasPending() ? "unsaved" : "saved");
    } catch (e) {
      // Put the failed changes back so the next edit (or Retry) re-sends them.
      pending.current = { ...body, ...pending.current };
      setError(e instanceof Error ? e.message : "Save failed");
      setSaveState("error");
    } finally {
      inFlight.current = false;
    }
    if (ok && hasPending()) void flush();
  }, [doc.id]);

  const queueSave = useCallback(
    (patch: { title?: string; content?: string }) => {
      pending.current = { ...pending.current, ...patch };
      setSaveState("unsaved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: readOnly ? "This document is empty." : "Start typing…" }),
    ],
    content: doc.content,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[50vh] focus:outline-none prose-headings:font-semibold prose-p:my-2 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:border-slate-300 prose-blockquote:text-slate-600",
        "aria-label": "Document content",
      },
    },
    onUpdate: ({ editor }) => queueSave({ content: editor.getHTML() }),
  });

  // Warn before closing the tab with unsaved changes. Some browsers only show
  // the prompt when returnValue is set as well.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState === "saved") return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  // In-app navigation (e.g. "All documents") doesn't fire beforeunload, so
  // send any queued changes right away when the editor unmounts.
  useEffect(() => () => void flush(), [flush]);

  const closeShare = useCallback(() => setShareOpen(false), []);

  function onTitleChange(value: string) {
    setTitle(value);
    if (value.trim()) {
      lastTitle.current = value.trim();
      queueSave({ title: value.trim() });
    }
  }

  async function deleteDoc() {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Delete failed");
    }
  }

  const status: Record<SaveState, { text: string; icon: React.ReactNode }> = {
    saved: { text: "Saved", icon: <Check className="h-3.5 w-3.5 text-emerald-600" /> },
    saving: { text: "Saving…", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    unsaved: { text: "Unsaved changes", icon: <span className="h-2 w-2 rounded-full bg-amber-500" /> },
    error: { text: "Not saved", icon: <CircleAlert className="h-3.5 w-3.5" /> },
  };
  const people = [{ role: "owner", user: doc.owner }, ...shares];

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-1.5 px-2 py-2 sm:gap-3 sm:px-4">
          <Link
            href="/"
            aria-label="All documents"
            title="All documents"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <LogoMark className="hidden h-9 w-9 sm:grid" />

          <div className="min-w-0 flex-1">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={() => {
                if (!title.trim()) setTitle(lastTitle.current);
                flush();
              }}
              readOnly={readOnly}
              maxLength={200}
              aria-label="Document title"
              className="w-full truncate rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-base font-medium transition hover:border-slate-300 focus:border-blue-500 focus:outline-none read-only:hover:border-transparent sm:text-lg"
            />
            <div className="flex items-center gap-2 px-1.5 text-xs text-slate-500" aria-live="polite">
              {readOnly ? (
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> View only
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1 ${saveState === "error" ? "text-red-600" : ""}`}>
                  {status[saveState].icon}
                  {status[saveState].text}
                </span>
              )}
              {saveState === "error" && (
                <button onClick={flush} className="font-medium text-blue-600 hover:underline">
                  Retry
                </button>
              )}
              {!isOwner && <span className="hidden truncate sm:inline">· Shared by {doc.owner.name}</span>}
            </div>
          </div>

          <div className="hidden -space-x-2 md:flex">
            {people.slice(0, 4).map((p) => (
              <Avatar key={p.user.id} id={p.user.id} name={`${p.user.name} (${p.role})`} size="sm" />
            ))}
            {people.length > 4 && (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-[11px] font-semibold ring-2 ring-white">
                +{people.length - 4}
              </span>
            )}
          </div>

          {isOwner && (
            <>
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 sm:px-5"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={deleteDoc}
                aria-label="Delete document"
                title="Delete document"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        {editor && !readOnly && <Toolbar editor={editor} />}
      </header>

      {(error || readOnly) && (
        <div className="mx-auto mt-3 w-full max-w-[816px] space-y-2 px-3 sm:px-0">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {readOnly && (
            <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {doc.owner.name} shared this with you as a viewer. You can read it but not edit.
            </p>
          )}
        </div>
      )}

      {/* The "page": full-bleed on phones, a centred US-letter-width sheet from tablets up. */}
      <main className="flex-1 sm:px-4 sm:py-8">
        <div className="mx-auto min-h-full w-full max-w-[816px] bg-white px-5 py-8 sm:min-h-[1056px] sm:rounded-sm sm:border sm:border-slate-200 sm:px-14 sm:py-14 sm:shadow-md lg:px-[72px] lg:py-16">
          <EditorContent editor={editor} />
        </div>
      </main>

      {shareOpen && (
        <ShareDialog docId={doc.id} title={title} owner={doc.owner} shares={shares} onChange={setShares} onClose={closeShare} />
      )}
    </div>
  );
}
