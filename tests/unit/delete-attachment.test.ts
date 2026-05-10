/**
 * Unit tests for `deleteAttachment` server action — focused on the
 * signed-note immutability guard added in Phase 4.
 *
 * The action talks to the DB, audit log, storage, and Next.js cache. We
 * mock all four so the test exercises only the permission/state machine,
 * not the surrounding infrastructure.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-at-least-32-chars!';

// ── Mocks ────────────────────────────────────────────────────────────────────
// `vi.hoisted` lets us share mutable state with the mock factories — tests
// program `selectRows` per case and inspect the spies after invoking the
// action.

const mocks = vi.hoisted(() => {
  return {
    selectRows: [] as Array<{
      id: string;
      storageKey: string;
      uploadedBy: string;
      patientId: string;
      clinicalNoteId: string | null;
      clinicalNoteIsSigned: boolean | null;
    }>,
    deleteSpy: vi.fn().mockResolvedValue(undefined),
    deleteFileSpy: vi.fn().mockResolvedValue(undefined),
    auditLogSpy: vi.fn().mockResolvedValue(undefined),
    revalidateSpy: vi.fn(),
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidateSpy,
}));

vi.mock('@/lib/db', () => {
  // Drizzle's fluent select chain. `limit(...)` resolves to the canned rows.
  const selectChain = {
    from: () => selectChain,
    innerJoin: () => selectChain,
    leftJoin: () => selectChain,
    where: () => selectChain,
    limit: () => Promise.resolve(mocks.selectRows),
  };
  const deleteChain = {
    where: (..._args: unknown[]) => mocks.deleteSpy(),
  };
  return {
    db: {
      select: () => selectChain,
      delete: () => deleteChain,
    },
  };
});

vi.mock('@/lib/storage', () => ({
  deleteFile: mocks.deleteFileSpy,
}));

vi.mock('@/lib/audit', () => ({
  auditLog: mocks.auditLogSpy,
  getClientIpFromHeaders: () => Promise.resolve('127.0.0.1'),
}));

import { cookies } from 'next/headers';
import { generateAccessToken } from '@/lib/auth/tokens';
import { deleteAttachment } from '@/actions/attachments';
import type { UserRole } from '@/lib/db/schema';

// ── Test helpers ─────────────────────────────────────────────────────────────

const CLINIC_ID = '00000000-0000-4000-8000-000000000002';
const DOCTOR_ID = '00000000-0000-4000-8000-000000000003';
const ANOTHER_USER = '00000000-0000-4000-8000-0000000000aa';
const ATTACHMENT_ID = '00000000-0000-4000-8000-0000000000bb';
const NOTE_ID = '00000000-0000-4000-8000-0000000000cc';
const PATIENT_ID = '00000000-0000-4000-8000-0000000000dd';
const STORAGE_KEY = 'fake-storage-key.pdf';

async function mockSession(role: UserRole, userId: string = DOCTOR_ID) {
  const token = await generateAccessToken({ userId, clinicId: CLINIC_ID, role });
  vi.mocked(cookies).mockResolvedValue({
    get: (_name: string) => ({ name: 'access_token', value: token }),
  } as ReturnType<typeof cookies> extends Promise<infer R> ? R : never);
}

function fdWith(id: string): FormData {
  const fd = new FormData();
  fd.set('attachment_id', id);
  return fd;
}

function setRow(opts: {
  uploadedBy?: string;
  clinicalNoteId?: string | null;
  clinicalNoteIsSigned?: boolean | null;
}) {
  mocks.selectRows = [
    {
      id: ATTACHMENT_ID,
      storageKey: STORAGE_KEY,
      uploadedBy: opts.uploadedBy ?? DOCTOR_ID,
      patientId: PATIENT_ID,
      clinicalNoteId: opts.clinicalNoteId ?? null,
      clinicalNoteIsSigned: opts.clinicalNoteIsSigned ?? null,
    },
  ];
}

beforeEach(() => {
  mocks.selectRows = [];
  mocks.deleteSpy.mockClear();
  mocks.deleteFileSpy.mockClear();
  mocks.auditLogSpy.mockClear();
  mocks.revalidateSpy.mockClear();
});

afterEach(() => {
  vi.resetAllMocks();
});

// ── Signed-note guard ────────────────────────────────────────────────────────

describe('deleteAttachment - signed-note immutability', () => {
  it('rechaza el doctor autor cuando la nota está firmada', async () => {
    await mockSession('doctor', DOCTOR_ID);
    setRow({
      uploadedBy: DOCTOR_ID,
      clinicalNoteId: NOTE_ID,
      clinicalNoteIsSigned: true,
    });

    const res = await deleteAttachment(null, fdWith(ATTACHMENT_ID));

    expect(res).toEqual({
      success: false,
      error: expect.stringContaining('nota firmada'),
    });
    expect(mocks.deleteSpy).not.toHaveBeenCalled();
    expect(mocks.deleteFileSpy).not.toHaveBeenCalled();
    expect(mocks.auditLogSpy).not.toHaveBeenCalled();
  });

  it('rechaza al admin (sin excepción) cuando la nota está firmada', async () => {
    await mockSession('admin');
    setRow({
      uploadedBy: ANOTHER_USER,
      clinicalNoteId: NOTE_ID,
      clinicalNoteIsSigned: true,
    });

    const res = await deleteAttachment(null, fdWith(ATTACHMENT_ID));

    expect(res).toEqual({
      success: false,
      error: expect.stringContaining('nota firmada'),
    });
    expect(mocks.deleteSpy).not.toHaveBeenCalled();
  });

  it('rechaza al recepcionista incluso antes de evaluar firma', async () => {
    await mockSession('receptionist');
    setRow({
      uploadedBy: ANOTHER_USER,
      clinicalNoteId: NOTE_ID,
      clinicalNoteIsSigned: false,
    });

    const res = await deleteAttachment(null, fdWith(ATTACHMENT_ID));

    expect(res).toEqual({
      success: false,
      error: expect.stringContaining('No tienes permisos'),
    });
    expect(mocks.deleteSpy).not.toHaveBeenCalled();
  });

  it('permite al doctor autor borrar adjunto de una nota NO firmada (borrador)', async () => {
    await mockSession('doctor', DOCTOR_ID);
    setRow({
      uploadedBy: DOCTOR_ID,
      clinicalNoteId: NOTE_ID,
      clinicalNoteIsSigned: false,
    });

    const res = await deleteAttachment(null, fdWith(ATTACHMENT_ID));

    expect(res).toEqual({ success: true });
    expect(mocks.deleteSpy).toHaveBeenCalledTimes(1);
    expect(mocks.deleteFileSpy).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mocks.auditLogSpy).toHaveBeenCalledTimes(1);
  });

  it('permite borrar adjuntos generales (sin nota) según rol existente', async () => {
    await mockSession('admin');
    setRow({
      uploadedBy: ANOTHER_USER,
      clinicalNoteId: null,
      clinicalNoteIsSigned: null,
    });

    const res = await deleteAttachment(null, fdWith(ATTACHMENT_ID));

    expect(res).toEqual({ success: true });
    expect(mocks.deleteSpy).toHaveBeenCalledTimes(1);
    expect(mocks.auditLogSpy).toHaveBeenCalledTimes(1);
  });

  it('rechaza al doctor que no es el uploader (regla previa intacta)', async () => {
    await mockSession('doctor', DOCTOR_ID);
    setRow({
      uploadedBy: ANOTHER_USER,
      clinicalNoteId: null,
      clinicalNoteIsSigned: null,
    });

    const res = await deleteAttachment(null, fdWith(ATTACHMENT_ID));

    expect(res).toEqual({
      success: false,
      error: expect.stringContaining('que tú subiste'),
    });
    expect(mocks.deleteSpy).not.toHaveBeenCalled();
  });

  it('devuelve "Adjunto no encontrado" cuando no hay fila (cross-clinic)', async () => {
    await mockSession('admin');
    mocks.selectRows = [];

    const res = await deleteAttachment(null, fdWith(ATTACHMENT_ID));

    expect(res).toEqual({ success: false, error: 'Adjunto no encontrado' });
    expect(mocks.deleteSpy).not.toHaveBeenCalled();
  });
});
