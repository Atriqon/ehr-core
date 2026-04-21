import { NextResponse, type NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attachments, patients } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { safeAuditLog, getClientIpFromHeaders } from '@/lib/audit';
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
  // Basic UUID shape check. A malformed id path param should 404 rather than
  // surface a DB error.
  if (!/^[0-9a-f-]{20,}$/i.test(id)) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
  }

  // Clinic-scoped lookup: join attachments → patients and filter by the
  // caller's clinic. A cross-clinic id yields zero rows, same 404 as a
  // non-existent attachment — no info leak.
  const rows = await db
    .select({
      id: attachments.id,
      storageKey: attachments.storageKey,
      fileName: attachments.fileName,
      fileType: attachments.fileType,
      patientId: attachments.patientId,
    })
    .from(attachments)
    .innerJoin(patients, eq(attachments.patientId, patients.id))
    .where(and(eq(attachments.id, id), eq(patients.clinicId, session.clinicId)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Adjunto no encontrado' },
      { status: 404 },
    );
  }

  const att = rows[0];

  await safeAuditLog({
    clinicId: session.clinicId,
    userId: session.userId,
    action: 'READ',
    resourceType: 'attachment',
    resourceId: att.id,
    details: { patientId: att.patientId },
    ipAddress: await getClientIpFromHeaders(),
  });

  // Prefer a short-lived presigned URL when the provider supports it (R2).
  // For the local dev provider, `getPresignedUrl` returns null and we stream
  // the bytes through the handler instead. Either way the bucket is never
  // exposed to the client directly.
  try {
    const url = await getPresignedUrl(att.storageKey, 300);
    if (url) {
      return NextResponse.redirect(url, 302);
    }

    const obj = await getObject(att.storageKey);
    const body =
      obj.body instanceof Buffer
        ? obj.body
        : obj.body instanceof Readable
          ? (Readable.toWeb(obj.body) as unknown as ReadableStream)
          : (obj.body as ReadableStream);

    const headers = new Headers({
      'Content-Type': obj.contentType || att.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(att.fileName)}"`,
      'Cache-Control': 'private, no-store',
    });
    if (obj.contentLength !== undefined) {
      headers.set('Content-Length', String(obj.contentLength));
    }

    return new Response(body as BodyInit, { status: 200, headers });
  } catch (err) {
    console.error('[attachments] download failed', err);
    return NextResponse.json(
      { success: false, error: 'No se pudo descargar el archivo' },
      { status: 500 },
    );
  }
}
