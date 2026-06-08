// Next.js runs register() once when the server boots. We use it only to seed
// demo data into the in-memory Redis stub for local development — guarded so it
// never runs in the edge runtime or against a real database.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.USE_IN_MEMORY_REDIS !== "1") return;
  const { seedDemoData } = await import("./lib/devSeed");
  await seedDemoData();
}
