import { beforeEach, describe, expect, it, vi } from 'vitest';

// `globalSearch` runs at most two clinic-scoped queries (patients, then notes)
// inside a single `Promise.all`. The mock below hands each freshly created
// query builder the next canned result set from `queue` and records the
// arguments passed to `.where()` / `.limit()` so the tests can assert clinic
// scoping and the per-group result cap without a real database. Same pattern
// as queries/__tests__/reports.test.ts.
const queue: unknown[][] = [];
const whereArgs: unknown[] = [];
const limitArgs: number[] = [];

function makeBuilder() {
  const result = queue.shift() ?? [];
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'innerJoin', 'orderBy']) {
    builder[m] = () => builder;
  }
  builder.where = (arg: unknown) => {
    whereArgs.push(arg);
    return builder;
  };
  builder.limit = (n: number) => {
    limitArgs.push(n);
    return builder;
  };
  builder.then = (resolve: (v: unknown) => void) => resolve(result);
  return builder;
}

vi.mock('@/lib/db', () => ({
  db: { select: () => makeBuilder() },
}));

import { globalSearch, SEARCH_GROUP_LIMIT } from '../global-search';

const CLINIC_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CLINIC = '99999999-9999-4999-8999-999999999999';

const PATIENT_ROW = {
  id: 'p1',
  firstName: 'Ana',
  lastName: 'González',
  idNumber: 'V-12345678',
  phone: '0412-1112233',
};

const NOTE_ROW = {
  id: 'n1',
  patientId: 'p1',
  noteDate: '2026-05-10',
  chiefComplaint: 'Dolor pélvico',
  diagnoses: [{ code: 'N80', text: 'Endometriosis' }],
  patientFirstName: 'Ana',
  patientLastName: 'González',
};

// Recursively collect every string value reachable from a value, guarding
// against the circular references inside drizzle's SQL/table objects.
function collectStrings(value: unknown, seen = new Set<unknown>()): string[] {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  if (seen.has(value)) return [];
  seen.add(value);
  const out: string[] = [];
  for (const v of Object.values(value as Record<string, unknown>)) {
    out.push(...collectStrings(v, seen));
  }
  return out;
}

beforeEach(() => {
  queue.length = 0;
  whereArgs.length = 0;
  limitArgs.length = 0;
});

describe('globalSearch — minimum query length', () => {
  it('returns empty groups and runs no query for input under 2 chars', async () => {
    const results = await globalSearch(CLINIC_ID, 'doctor', 'a');
    expect(results).toEqual({ patients: [], notes: [] });
    expect(whereArgs).toHaveLength(0);
  });

  it('returns empty groups for a blank/whitespace query', async () => {
    const results = await globalSearch(CLINIC_ID, 'doctor', '   ');
    expect(results).toEqual({ patients: [], notes: [] });
    expect(whereArgs).toHaveLength(0);
  });
});

describe('globalSearch — patient results', () => {
  it('returns mapped patient hits (name / cédula / phone)', async () => {
    queue.push([PATIENT_ROW]);
    const results = await globalSearch(CLINIC_ID, 'receptionist', 'gonzález');
    expect(results.patients).toEqual([
      {
        type: 'patient',
        id: 'p1',
        firstName: 'Ana',
        lastName: 'González',
        idNumber: 'V-12345678',
        phone: '0412-1112233',
      },
    ]);
  });

  it('returns an empty patient group when nothing matches', async () => {
    queue.push([]);
    const results = await globalSearch(CLINIC_ID, 'doctor', 'zzzzz');
    expect(results.patients).toEqual([]);
    expect(results.notes).toEqual([]);
  });
});

describe('globalSearch — clinic scoping', () => {
  it('passes the caller clinic id into every query filter', async () => {
    queue.push([PATIENT_ROW], [NOTE_ROW]);
    await globalSearch(CLINIC_ID, 'doctor', 'gonzález');
    const strings = collectStrings(whereArgs);
    expect(strings).toContain(CLINIC_ID);
    expect(strings).not.toContain(OTHER_CLINIC);
  });
});

describe('globalSearch — RBAC', () => {
  it('receptionist receives patient results only, never notes', async () => {
    // Only one result set is consumed — the note query must not run.
    queue.push([PATIENT_ROW], [NOTE_ROW]);
    const results = await globalSearch(CLINIC_ID, 'receptionist', 'gonzález');
    expect(results.patients).toHaveLength(1);
    expect(results.notes).toEqual([]);
    expect(whereArgs).toHaveLength(1);
  });

  it('doctor can receive note results', async () => {
    queue.push([PATIENT_ROW], [NOTE_ROW]);
    const results = await globalSearch(CLINIC_ID, 'doctor', 'endometriosis');
    expect(results.notes).toHaveLength(1);
    expect(results.notes[0]).toMatchObject({
      type: 'note',
      id: 'n1',
      patientId: 'p1',
      patientName: 'Ana González',
    });
  });

  it('admin can receive note results', async () => {
    queue.push([PATIENT_ROW], [NOTE_ROW]);
    const results = await globalSearch(CLINIC_ID, 'admin', 'endometriosis');
    expect(results.notes).toHaveLength(1);
  });
});

describe('globalSearch — note snippets', () => {
  it('uses the first diagnosis text as the snippet', async () => {
    queue.push([], [NOTE_ROW]);
    const results = await globalSearch(CLINIC_ID, 'doctor', 'endometriosis');
    expect(results.notes[0].snippet).toBe('Endometriosis');
  });

  it('falls back to the chief complaint when there is no diagnosis', async () => {
    queue.push([], [{ ...NOTE_ROW, diagnoses: [] }]);
    const results = await globalSearch(CLINIC_ID, 'doctor', 'dolor');
    expect(results.notes[0].snippet).toBe('Dolor pélvico');
  });
});

describe('globalSearch — result limit', () => {
  it('caps every group at SEARCH_GROUP_LIMIT rows', async () => {
    queue.push([PATIENT_ROW], [NOTE_ROW]);
    await globalSearch(CLINIC_ID, 'doctor', 'gonzález');
    expect(limitArgs).toHaveLength(2);
    expect(limitArgs.every((n) => n === SEARCH_GROUP_LIMIT)).toBe(true);
    expect(SEARCH_GROUP_LIMIT).toBe(5);
  });
});
