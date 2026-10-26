// Seeded demo accounts. Auth is mocked on purpose (see ARCHITECTURE.md):
// reviewers pick a user on /login so the sharing flow can be tested in seconds.
export const SEEDED_USERS = [
  { id: "user_alice", name: "Alice Johnson", email: "alice@ajaia.test" },
  { id: "user_bob", name: "Bob Smith", email: "bob@ajaia.test" },
  { id: "user_carol", name: "Carol Lee", email: "carol@ajaia.test" },
] as const;

export type SeededUser = (typeof SEEDED_USERS)[number];

export function findSeededUser(id: string): SeededUser | undefined {
  return SEEDED_USERS.find((u) => u.id === id);
}
