import { describe, expect, it } from "vitest";
import { canEdit, canManage, canView, getAccess } from "../src/lib/permissions";

const doc = {
  ownerId: "alice",
  shares: [
    { userId: "bob", role: "editor" },
    { userId: "carol", role: "viewer" },
  ],
};

describe("document access rules", () => {
  it("gives the owner full control", () => {
    const a = getAccess(doc, "alice");
    expect(a).toBe("owner");
    expect(canView(a) && canEdit(a) && canManage(a)).toBe(true);
  });

  it("lets an editor read and edit but not share or delete", () => {
    const a = getAccess(doc, "bob");
    expect(a).toBe("editor");
    expect(canEdit(a)).toBe(true);
    expect(canManage(a)).toBe(false);
  });

  it("keeps a viewer read-only", () => {
    const a = getAccess(doc, "carol");
    expect(a).toBe("viewer");
    expect(canView(a)).toBe(true);
    expect(canEdit(a)).toBe(false);
  });

  it("denies everyone else", () => {
    const a = getAccess(doc, "mallory");
    expect(a).toBeNull();
    expect(canView(a)).toBe(false);
  });

  it("treats an unknown role as read-only (fails closed)", () => {
    const a = getAccess({ ownerId: "alice", shares: [{ userId: "dan", role: "weird" }] }, "dan");
    expect(a).toBe("viewer");
    expect(canEdit(a)).toBe(false);
    expect(canManage(a)).toBe(false);
  });
});
