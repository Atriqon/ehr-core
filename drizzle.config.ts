import fs from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit auto-loads `.env` but not `.env.local`. Match Next.js
// precedence (`.env.local` overrides `.env` in dev) so a developer running
// `pnpm db:migrate` in dev hits their local DB, not the one in `.env`.
function loadEnvLocal() {
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
      if (!m) continue;
      let value = m[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[m[1]] = value;
    }
  } catch {
    // .env.local is optional
  }
}

// MIGRATE_TARGET selects which DB drizzle-kit acts on:
//   'local' (default) → DATABASE_URL from .env.local (your dev Postgres)
//   'prod'            → MIGRATE_DATABASE_URL from .env (Supabase session pooler)
// Keep these separate to prevent accidental prod migrations from `pnpm db:migrate`.
const target = process.env.MIGRATE_TARGET ?? 'local';

let rawUrl: string | undefined;
if (target === 'local') {
  loadEnvLocal();
  rawUrl = process.env.DATABASE_URL;
} else if (target === 'prod') {
  rawUrl = process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL;
} else {
  throw new Error(`Unknown MIGRATE_TARGET: ${target} (expected 'local' or 'prod')`);
}

if (!rawUrl) {
  throw new Error(`No database URL found for target=${target}`);
}

// pg v8+ treats sslmode=require as verify-full; Supabase uses its own CA so verification fails.
// uselibpqcompat=true restores libpq semantics: require = encrypt without cert verification.
const url = rawUrl.includes('uselibpqcompat')
  ? rawUrl
  : rawUrl.replace(/(\?|&)(sslmode=require)/, '$1$2&uselibpqcompat=true');

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
