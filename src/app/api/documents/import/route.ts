import { NextResponse } from "next/server";
import { handle, HttpError, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fileToDocument, ImportError, MAX_UPLOAD_BYTES } from "@/lib/import";

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a file to upload");
  // Check size before reading the whole file into memory.
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "File is too large. The limit is 1 MB.");

  let parsed;
  try {
    parsed = fileToDocument(file.name, file.size, await file.text());
  } catch (err) {
    if (err instanceof ImportError) throw new HttpError(400, err.message);
    throw err;
  }

  const doc = await prisma.document.create({
    data: { ownerId: user.id, title: parsed.title, content: parsed.content },
    select: { id: true },
  });
  return NextResponse.json(doc, { status: 201 });
});
