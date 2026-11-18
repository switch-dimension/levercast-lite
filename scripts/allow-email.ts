// Manage the invite list.
//
//   npm run allow-email -- jo@example.com "Jo, tester"   add (or update the note)
//   npm run allow-email -- --remove jo@example.com       remove (revokes access)
//   npm run allow-email -- --list                         list
//
// Uses DATABASE_URL from .env.local (the dev branch). To change another
// branch, set it for one run: DATABASE_URL="<branch url>" npm run allow-email -- ...
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// Imported after dotenv so the database client sees DATABASE_URL.
const { allowEmail, listAllowedEmails, normalizeEmail, removeEmail } = await import(
  "../lib/auth/allowlist.ts"
);

const host = new URL(process.env.DATABASE_URL!).hostname.split(".")[0];
const args = process.argv.slice(2);

if (args[0] === "--list") {
  const rows = await listAllowedEmails();
  console.log(`${rows.length} invited on ${host}:`);
  for (const r of rows) console.log(`  ${r.email}${r.note ? `  (${r.note})` : ""}`);
} else if (args[0] === "--remove" && args[1]) {
  const removed = await removeEmail(args[1]);
  console.log(removed ? `Removed ${normalizeEmail(args[1])} from ${host}.` : `${args[1]} wasn't on the list.`);
} else if (args[0] && !args[0].startsWith("--")) {
  await allowEmail(args[0], args[1]);
  console.log(`Invited ${normalizeEmail(args[0])} on ${host}.`);
} else {
  console.error('Usage: npm run allow-email -- <email> ["note"] | --remove <email> | --list');
  process.exit(1);
}
