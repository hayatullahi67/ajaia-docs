"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";

type Btn = { icon: LucideIcon; title: string; run: () => void; active?: boolean; disabled?: boolean };

export function Toolbar({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  const groups: Btn[][] = [
    [
      { icon: Undo2, title: "Undo (Ctrl+Z)", run: () => c().undo().run(), disabled: !editor.can().undo() },
      { icon: Redo2, title: "Redo (Ctrl+Shift+Z)", run: () => c().redo().run(), disabled: !editor.can().redo() },
    ],
    [
      { icon: Heading1, title: "Heading 1", active: editor.isActive("heading", { level: 1 }), run: () => c().toggleHeading({ level: 1 }).run() },
      { icon: Heading2, title: "Heading 2", active: editor.isActive("heading", { level: 2 }), run: () => c().toggleHeading({ level: 2 }).run() },
      { icon: Heading3, title: "Heading 3", active: editor.isActive("heading", { level: 3 }), run: () => c().toggleHeading({ level: 3 }).run() },
    ],
    [
      { icon: Bold, title: "Bold (Ctrl+B)", active: editor.isActive("bold"), run: () => c().toggleBold().run() },
      { icon: Italic, title: "Italic (Ctrl+I)", active: editor.isActive("italic"), run: () => c().toggleItalic().run() },
      { icon: Underline, title: "Underline (Ctrl+U)", active: editor.isActive("underline"), run: () => c().toggleUnderline().run() },
    ],
    [
      { icon: List, title: "Bulleted list", active: editor.isActive("bulletList"), run: () => c().toggleBulletList().run() },
      { icon: ListOrdered, title: "Numbered list", active: editor.isActive("orderedList"), run: () => c().toggleOrderedList().run() },
      { icon: Quote, title: "Quote", active: editor.isActive("blockquote"), run: () => c().toggleBlockquote().run() },
    ],
  ];

  return (
    <div className="px-2 pb-2 sm:px-4">
      {/* Scrolls sideways on narrow screens instead of wrapping onto several rows. */}
      <div
        role="toolbar"
        aria-label="Formatting"
        className="mx-auto flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-slate-100 px-2 py-1 [scrollbar-width:none]"
      >
        {groups.map((group, i) => (
          <div key={i} className="flex shrink-0 items-center gap-0.5">
            {i > 0 && <span aria-hidden className="mx-1 h-5 w-px bg-slate-300" />}
            {group.map(({ icon: Icon, title, run, active, disabled }) => (
              <button
                key={title}
                type="button"
                title={title}
                aria-label={title}
                aria-pressed={active}
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={run}
                className={`grid h-8 w-8 place-items-center rounded-md transition disabled:opacity-35 ${
                  active ? "bg-blue-100 text-blue-700" : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
