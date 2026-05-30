import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];
  if (!email || !newPassword) {
    console.error("Usage: tsx scripts/reset-password.ts <email> <newPassword>");
    process.exit(1);
  }
  const hash = await argon2.hash(newPassword, { type: argon2.argon2id });
  const result = await db
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.email, email))
    .returning({ email: users.email });
  console.log("Updated:", result);
  process.exit(0);
}
main();
