import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { globalSearch } from '@/queries/global-search';

// GET /api/search?q=<term>
//
// Backs the Ctrl/Cmd+K command palette. The session — not the request — is the
// source of truth for clinic scope and role. Clinical-note results are gated
// inside `globalSearch` (admin/doctor only). Searches are not audit-logged:
// they are read-only, debounced, and would otherwise flood the audit trail
// (see Phase 11 §8 — "No audit spam for every search query").
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get('q') ?? '';
  const results = await globalSearch(session.clinicId, session.role, query);

  return NextResponse.json(results);
}
