import { describe, expect, it } from 'vitest';
import {
  CRUMB_NAME_MAX,
  patientCrumb,
  patientTrail,
  patientsRootCrumb,
  settingsTrail,
  truncateCrumb,
} from '../breadcrumbs';

describe('truncateCrumb', () => {
  it('leaves short labels untouched', () => {
    expect(truncateCrumb('Ana González')).toBe('Ana González');
  });

  it('collapses internal whitespace', () => {
    expect(truncateCrumb('  Ana   María   González  ')).toBe('Ana María González');
  });

  it('truncates labels longer than the limit with an ellipsis', () => {
    const long = 'A'.repeat(CRUMB_NAME_MAX + 20);
    const result = truncateCrumb(long);
    expect(result.length).toBe(CRUMB_NAME_MAX);
    expect(result.endsWith('…')).toBe(true);
  });

  it('respects a custom max length', () => {
    expect(truncateCrumb('abcdefghij', 5)).toBe('abcd…');
  });
});

describe('patientCrumb', () => {
  it('builds a crumb linking to the patient profile', () => {
    const crumb = patientCrumb({ id: 'abc', firstName: 'Ana', lastName: 'González' });
    expect(crumb).toEqual({ label: 'Ana González', href: '/pacientes/abc' });
  });

  it('truncates a very long patient name', () => {
    const crumb = patientCrumb({
      id: 'abc',
      firstName: 'Maria del Carmen Inmaculada',
      lastName: 'Rodríguez de la Fuente',
    });
    expect(crumb.label.length).toBeLessThanOrEqual(CRUMB_NAME_MAX);
    expect(crumb.href).toBe('/pacientes/abc');
  });
});

describe('patientTrail', () => {
  const patient = { id: 'abc', firstName: 'Ana', lastName: 'González' };

  it('roots the trail at Pacientes > <patient>', () => {
    expect(patientTrail(patient)).toEqual([
      { label: 'Pacientes', href: '/pacientes' },
      { label: 'Ana González', href: '/pacientes/abc' },
    ]);
  });

  it('appends deeper crumbs in order', () => {
    const trail = patientTrail(
      patient,
      { label: 'Notas', href: '/pacientes/abc/notas' },
      { label: 'Nueva nota' },
    );
    expect(trail.map((c) => c.label)).toEqual([
      'Pacientes',
      'Ana González',
      'Notas',
      'Nueva nota',
    ]);
    expect(trail[trail.length - 1].href).toBeUndefined();
  });
});

describe('settingsTrail', () => {
  it('roots the trail at Configuración', () => {
    expect(settingsTrail({ label: 'Auditoría' })).toEqual([
      { label: 'Configuración', href: '/configuracion' },
      { label: 'Auditoría' },
    ]);
  });
});

describe('patientsRootCrumb', () => {
  it('returns the Pacientes root crumb', () => {
    expect(patientsRootCrumb()).toEqual({ label: 'Pacientes', href: '/pacientes' });
  });
});
