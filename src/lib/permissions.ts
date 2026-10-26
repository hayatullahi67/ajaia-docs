// Pure access rules, kept free of database code so they are easy to test.

export type ShareRole = "viewer" | "editor";
export type Access = "owner" | ShareRole | null;

export interface DocAccessInput {
  ownerId: string;
  shares: { userId: string; role: string }[];
}

export function getAccess(doc: DocAccessInput, userId: string): Access {
  if (doc.ownerId === userId) return "owner";
  const share = doc.shares.find((s) => s.userId === userId);
  if (!share) return null;
  // Fail closed: anything other than an explicit "editor" is read-only.
  return share.role === "editor" ? "editor" : "viewer";
}

export const canView = (a: Access) => a !== null;
export const canEdit = (a: Access) => a === "owner" || a === "editor";
// Only the owner can share, unshare or delete. Editors can rename and edit.
export const canManage = (a: Access) => a === "owner";
