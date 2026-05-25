import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Integrity guarantee ──────────────────────────────────────────────────────
//
// Phase 0.5 (solo-doctor permission model): admin became dormant. A user with
// role 'admin' must NEVER be able to create or sign a clinical note — that
// privilege is reserved for 'doctor' so signatures retain medico-legal weight
// even in a hypothetical future multi-doctor clinic where admin might be a
// non-physician.
//
// We test the action boundary (`requireRole(['doctor'])`) by mocking the
// session module with semantics that mirror the real implementation: it
// throws "Sin permisos" when the caller's role is not in the allowed list.
// Each action catches that throw and returns its own error state — so we
// assert the error message rather than an HTTP status (server actions don't
// return HTTP responses).

const CLINIC_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const DOCTOR_ID = '33333333-3333-4333-8333-333333333333';
const PATIENT_ID = '44444444-4444-4444-8444-444444444444';
const NOTE_ID = '55555555-5555-4555-8555-555555555555';

const sessionState = {
  role: 'admin' as 'admin' | 'doctor' | 'receptionist',
  userId: ADMIN_ID as string,
};

const mocks = vi.hoisted(() => ({
  requireRoleImpl: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  requireRole: (allowed: Array<'admin' | 'doctor' | 'receptionist'>) =>
    mocks.requireRoleImpl(allowed),
  requireSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  getClientIpFromHeaders: vi.fn().mockResolvedValue(undefined),
}));

// Patient lookup returns an empty row → doctor path stops with
// "Paciente no encontrado", which is a *post-role-gate* failure. That's
// exactly the signal we want: the doctor was allowed past the role check.
vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
        where: () => ({ limit: () => Promise.resolve([]) }),
      }),
    }),
    insert: () => ({ values: () => Promise.resolve() }),
    update: () => ({
      set: () => ({
        where: () => ({ returning: () => Promise.resolve([]) }),
      }),
    }),
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

import { createClinicalNote, signClinicalNote } from '@/actions/clinical-notes';

beforeEach(() => {
  mocks.requireRoleImpl.mockImplementation(
    (allowed: Array<'admin' | 'doctor' | 'receptionist'>) => {
      if (!allowed.includes(sessionState.role)) {
        throw new Error('Sin permisos');
      }
      return Promise.resolve({
        userId: sessionState.userId,
        clinicId: CLINIC_ID,
        role: sessionState.role,
      });
    },
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

function buildCreateForm(): FormData {
  const fd = new FormData();
  fd.set('patient_id', PATIENT_ID);
  fd.set('note_date', '2026-05-25');
  fd.set('chief_complaint', 'Dolor abdominal');
  return fd;
}

function buildSignForm(): FormData {
  const fd = new FormData();
  fd.set('note_id', NOTE_ID);
  return fd;
}

describe('clinical-notes integrity gate — admin must not sign', () => {
  it('createClinicalNote: admin is rejected with "solo médicos" error', async () => {
    sessionState.role = 'admin';
    sessionState.userId = ADMIN_ID;
    const result = await createClinicalNote(null, buildCreateForm());
    expect(result).toEqual({
      success: false,
      error: 'Solo médicos pueden crear notas de evolución',
    });
  });

  it('signClinicalNote: admin is rejected with "solo médicos" error', async () => {
    sessionState.role = 'admin';
    sessionState.userId = ADMIN_ID;
    const result = await signClinicalNote(null, buildSignForm());
    expect(result).toEqual({
      success: false,
      error: 'Solo médicos pueden firmar notas de evolución',
    });
  });

  it('createClinicalNote: doctor passes the role gate (fails later on patient lookup)', async () => {
    sessionState.role = 'doctor';
    sessionState.userId = DOCTOR_ID;
    const result = await createClinicalNote(null, buildCreateForm());
    // Past the role gate → next check fails with patient-not-found.
    expect(result).toEqual({ success: false, error: 'Paciente no encontrado' });
    // And critically: the error is NOT the "solo médicos" message.
    expect((result as { error: string }).error).not.toMatch(/solo médicos/i);
  });

  it('signClinicalNote: doctor passes the role gate (fails later on note lookup)', async () => {
    sessionState.role = 'doctor';
    sessionState.userId = DOCTOR_ID;
    const result = await signClinicalNote(null, buildSignForm());
    expect(result).toEqual({ success: false, error: 'Nota no encontrada' });
    expect((result as { error: string }).error).not.toMatch(/solo médicos/i);
  });

  it('receptionist is also rejected (sanity check that the gate works for all non-doctors)', async () => {
    sessionState.role = 'receptionist';
    sessionState.userId = ADMIN_ID;
    const create = await createClinicalNote(null, buildCreateForm());
    const sign = await signClinicalNote(null, buildSignForm());
    expect(create).toEqual({
      success: false,
      error: 'Solo médicos pueden crear notas de evolución',
    });
    expect(sign).toEqual({
      success: false,
      error: 'Solo médicos pueden firmar notas de evolución',
    });
  });
});
