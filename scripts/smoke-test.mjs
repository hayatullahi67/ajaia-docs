// End-to-end check of every core flow against a running server (local or deployed).
// Usage: npm run smoke -- http://localhost:3000   (creates test docs, then deletes them)
const BASE = process.argv[2] ?? "http://localhost:3000";
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`);
};

async function login(userId, tries = 2) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }),
  });
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) {
    console.log(`login ${userId} -> ${res.status} ${await res.text()}`);
    if (tries > 1) return login(userId, tries - 1);
  }
  return cookie;
}
function api(cookie) {
  return async (method, path, body, raw) => {
    const headers = cookie ? { cookie } : {};
    let payload;
    if (raw) payload = body;
    else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await fetch(`${BASE}${path}`, { method, headers, body: payload, redirect: "manual" });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text.slice(0, 80); }
    return { status: res.status, json };
  };
}
const upload = (name, content) => { const f = new FormData(); f.append("file", new Blob([content]), name); return f; };

const alice = api(await login("user_alice"));
const bob = api(await login("user_bob"));
const carol = api(await login("user_carol"));
const anon = api(null);

// Auth
check("bad login user rejected", (await anon("POST", "/api/auth/login", { userId: "user_mallory" })).status === 400);
check("unauthenticated list -> 401", (await anon("GET", "/api/documents")).status === 401);
check("forged cookie -> 401", (await api("session=user_alice.deadbeef")("GET", "/api/documents")).status === 401);

// Create, rename, edit, reopen
let r = await alice("POST", "/api/documents", {});
check("create doc", r.status === 201 && r.json.id, JSON.stringify(r));
const id = r.json.id;
r = await alice("PATCH", `/api/documents/${id}`, { title: "  Q4 Plan  ", content: "<h1>Plan</h1><p><strong>b</strong><em>i</em><u>u</u></p><ul><li>x</li></ul><ol><li>y</li></ol>" });
check("rename + save content", r.status === 200 && r.json.title === "Q4 Plan", JSON.stringify(r));
r = await alice("GET", `/api/documents/${id}`);
check("reopen keeps title + formatting", r.json.title === "Q4 Plan" && r.json.content.includes("<u>u</u>") && r.json.content.includes("<ol>"), JSON.stringify(r.json).slice(0, 200));

// Bad inputs
check("empty title -> 400", (await alice("PATCH", `/api/documents/${id}`, { title: "   " })).status === 400);
check("empty patch -> 400", (await alice("PATCH", `/api/documents/${id}`, {})).status === 400);
check("oversized content -> 400", (await alice("PATCH", `/api/documents/${id}`, { content: "x".repeat(500_001) })).status === 400);
check("malformed JSON -> 400", (await alice("PATCH", `/api/documents/${id}`, "{nope", true)).status === 400);
check("unknown doc -> 404", (await alice("GET", "/api/documents/nope")).status === 404);

// Sharing
check("share invalid email -> 400", (await alice("POST", `/api/documents/${id}/shares`, { email: "not-an-email" })).status === 400);
check("share unknown user -> 404", (await alice("POST", `/api/documents/${id}/shares`, { email: "x@y.com" })).status === 404);
check("share with self -> 400", (await alice("POST", `/api/documents/${id}/shares`, { email: "alice@ajaia.test" })).status === 400);
check("share bad role -> 400", (await alice("POST", `/api/documents/${id}/shares`, { email: "bob@ajaia.test", role: "owner" })).status === 400);
check("before sharing, bob gets 404", (await bob("GET", `/api/documents/${id}`)).status === 404);
r = await alice("POST", `/api/documents/${id}/shares`, { email: "BOB@ajaia.test", role: "editor" });
check("share bob as editor (email case-insensitive)", r.status === 201 && r.json.role === "editor", JSON.stringify(r));
r = await alice("POST", `/api/documents/${id}/shares`, { email: "carol@ajaia.test", role: "viewer" });
check("share carol as viewer", r.status === 201 && r.json.role === "viewer", JSON.stringify(r));

r = await bob("GET", "/api/documents");
check("bob sees it under shared (not owned)", r.json.shared?.some((d) => d.id === id && d.role === "editor") && !r.json.owned.some((d) => d.id === id));
check("editor can edit", (await bob("PATCH", `/api/documents/${id}`, { content: "<p>bob was here</p>" })).status === 200);
check("editor cannot share", (await bob("POST", `/api/documents/${id}/shares`, { email: "carol@ajaia.test" })).status === 403);
check("editor cannot delete", (await bob("DELETE", `/api/documents/${id}`)).status === 403);

r = await carol("GET", `/api/documents/${id}`);
check("viewer can read latest content", r.status === 200 && r.json.content.includes("bob was here") && r.json.access === "viewer");
check("viewer cannot edit", (await carol("PATCH", `/api/documents/${id}`, { content: "<p>hack</p>" })).status === 403);
check("viewer cannot rename", (await carol("PATCH", `/api/documents/${id}`, { title: "hack" })).status === 403);
check("viewer cannot remove others", (await carol("DELETE", `/api/documents/${id}/shares/user_bob`)).status === 403);

r = await alice("POST", `/api/documents/${id}/shares`, { email: "carol@ajaia.test", role: "editor" });
check("re-share changes role (viewer -> editor)", r.status === 201 && r.json.role === "editor");
check("carol can now edit", (await carol("PATCH", `/api/documents/${id}`, { content: "<p>carol</p>" })).status === 200);
check("owner removes carol", (await alice("DELETE", `/api/documents/${id}/shares/user_carol`)).status === 200);
check("removed user gets 404", (await carol("GET", `/api/documents/${id}`)).status === 404);

// Pages (server-rendered)
const page = async (who, path) => (await fetch(`${BASE}${path}`, { headers: who ? { cookie: who } : {}, redirect: "manual" })).status;
const bobCookie = await login("user_bob"), carolCookie = await login("user_carol");
check("doc page for shared user -> 200", (await page(bobCookie, `/docs/${id}`)) === 200);
check("doc page for no-access user -> 404", (await page(carolCookie, `/docs/${id}`)) === 404);
check("doc page signed out -> redirect", [307, 308].includes(await page(null, `/docs/${id}`)));

// Import
const imp = (f) => alice("POST", "/api/documents/import", f, true);
r = await imp(upload("Meeting notes.md", "# Notes\n\n**bold** and _it_\n\n- a\n- b\n\n<script>alert(1)</script>"));
check("import .md -> new doc", r.status === 201);
let d = await alice("GET", `/api/documents/${r.json.id}`);
check("md: title from filename, formatting kept, html escaped", d.json.title === "Meeting notes" && d.json.content.includes("<h1>Notes</h1>") && d.json.content.includes("<strong>bold</strong>") && !d.json.content.includes("<script>"), d.json.content);
const mdId = r.json.id;
r = await imp(upload("todo.txt", "line one\nline two\n\npara two"));
d = await alice("GET", `/api/documents/${r.json.id}`);
check("import .txt -> paragraphs", r.status === 201 && d.json.content === "<p>line one<br>line two</p><p>para two</p>", d.json.content);
const txtId = r.json.id;
check("import .pdf -> 400", (await imp(upload("x.pdf", "%PDF"))).status === 400);
check("import empty -> 400", (await imp(upload("x.txt", "   "))).status === 400);
check("import > 1MB -> 413", (await imp(upload("big.txt", "a".repeat(1024 * 1024 + 1)))).status === 413);
check("import no file -> 400", (await imp(new FormData())).status === 400);

// Delete (cleanup our test docs too)
check("owner deletes", (await alice("DELETE", `/api/documents/${id}`)).status === 200);
check("deleted doc -> 404 for owner", (await alice("GET", `/api/documents/${id}`)).status === 404);
check("deleted doc gone from bob's list", !(await bob("GET", "/api/documents")).json.shared.some((x) => x.id === id));
await alice("DELETE", `/api/documents/${mdId}`);
await alice("DELETE", `/api/documents/${txtId}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
