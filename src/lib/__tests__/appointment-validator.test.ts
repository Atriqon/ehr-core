import { describe, expect, it } from 'vitest';
import { appointmentCreateSchema } from '../validators/appointment';

const baseInput = {
  patient_id: '00000000-0000-4000-8000-000000000001',
  doctor_id: '00000000-0000-4000-8000-000000000002',
  start_time: '08:00',
  end_time: '08:30',
  reason: 'Consulta',
};

describe('appointmentCreateSchema.date', () => {
  it('accepts a YYYY-MM-DD string and keeps it as a string', () => {
    const result = appointmentCreateSchema.safeParse({ ...baseInput, date: '2026-04-18' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.date).toBe('string');
      expect(result.data.date).toBe('2026-04-18');
    }
  });

  it('rejects empty string', () => {
    const result = appointmentCreateSchema.safeParse({ ...baseInput, date: '' });
    expect(result.success).toBe(false);
  });

  it('rejects malformed dates', () => {
    expect(appointmentCreateSchema.safeParse({ ...baseInput, date: '18/04/2026' }).success).toBe(false);
    expect(appointmentCreateSchema.safeParse({ ...baseInput, date: '2026-4-18' }).success).toBe(false);
    expect(appointmentCreateSchema.safeParse({ ...baseInput, date: 'not-a-date' }).success).toBe(false);
  });

  it('does NOT silently shift the day across timezones (regression for z.coerce.date)', () => {
    // The previous `z.coerce.date()` validator would parse "2026-04-18" as
    // a UTC midnight Date. On a server in UTC-4 (e.g. Caracas) reading
    // .getDate() back would return 17, shifting the appointment by a day.
    // The new validator returns the raw string, so the calendar date is
    // preserved verbatim regardless of the runtime timezone.
    const result = appointmentCreateSchema.safeParse({ ...baseInput, date: '2026-04-18' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBe('2026-04-18');
    }
  });
});
