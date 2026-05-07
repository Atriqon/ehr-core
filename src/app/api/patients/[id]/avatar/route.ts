import { NextResponse, type NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { patients } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { getObject, getPresignedUrl } from '@/lib/storage';

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{20,}$/i.test(id)) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
  }

  // Clinic-scoped lookup. A cross-clinic id yields zero rows — same 404 as a
  // non-existent patient, no info leak.
  const rows = await db
    .select({ avatarStorageKey: patients.avatarStorageKey })
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.clinicId, session.clinicId)))
    .limit(1);

  if (rows.length === 0 || !rows[0].avatarStorageKey) {
    return NextResponse.json(
      { success: false, error: 'Avatar no encontrado' },
      { status: 404 },
    );
  }

  const storageKey = rows[0].avatarStorageKey;

  try {
    const url = await getPresignedUrl(storageKey, 300);
    if (url) {
      return NextResponse.redirect(url, 302);
    }

    const obj = await getObject(storageKey);
    const body =
      obj.body instanceof Buffer
        ? obj.body
        : obj.body instanceof Readable
          ? (Readable.toWeb(obj.body) as unknown as ReadableStream)
          : (obj.body as ReadableStream);

    const headers = new Headers({
      'Content-Type': obj.contentType || 'application/octet-stream',
      // Avatars are inline-rendered, never downloaded.
      'Content-Disposition': 'inline',
      // Short private cache. Callers cache-bust via a `?v=<key-prefix>` query
      // string when the row changes (see PatientAvatar).
      'Cache-Control': 'private, max-age=300',
    });
    if (obj.contentLength !== undefined) {
      headers.set('Content-Length', String(obj.contentLength));
    }

    return new Response(body as BodyInit, { status: 200, headers });
  } catch (err) {
    console.error('[patient-avatar] download failed', err);
    return NextResponse.json(
      { success: false, error: 'No se pudo cargar la foto' },
      { status: 500 },
    );
  }
}
