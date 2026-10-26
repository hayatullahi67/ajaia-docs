import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "./db";
import { getAccess, type Access } from "./permissions";
import { getCurrentUser } from "./session";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wraps a route handler so thrown errors become clean JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      // req.json() throws SyntaxError on a malformed body: that's a client error.
      if (err instanceof SyntaxError) {
        return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: err.issues[0]?.message ?? "Invalid input" },
          { status: 400 },
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  return user;
}

/** Loads a document and the caller's access level. 404s if the user has no
 * access at all, so we don't reveal that the document exists. */
export async function loadDocForUser(id: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  const access: Access = doc ? getAccess(doc, userId) : null;
  if (!doc || !access) throw new HttpError(404, "Document not found");
  return { doc, access };
}
