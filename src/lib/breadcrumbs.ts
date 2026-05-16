// Breadcrumb helpers.
//
// Pages pass explicit breadcrumb trails (rather than guessing from the
// pathname) so the labels can be real data — a patient's name, a document
// title — instead of opaque URL segments. These builders are pure functions:
// see src/lib/__tests__/breadcrumbs.test.ts.

export interface Crumb {
  label: string;
  /** Omit for the current (non-clickable) page. */
  href?: string;
}

/** Max length for a name segment before it is truncated with an ellipsis. */
export const CRUMB_NAME_MAX = 32;

/**
 * Truncate a long label (e.g. a patient name) so the breadcrumb bar never
 * overflows on narrow viewports. Collapses internal whitespace first.
 */
export function truncateCrumb(label: string, max = CRUMB_NAME_MAX): string {
  const clean = label.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

interface CrumbPatient {
  id: string;
  firstName: string;
  lastName: string;
}

/** "Pacientes" root crumb. */
export function patientsRootCrumb(): Crumb {
  return { label: 'Pacientes', href: '/pacientes' };
}

/** Crumb linking to a patient's profile, with the name truncated. */
export function patientCrumb(patient: CrumbPatient): Crumb {
  return {
    label: truncateCrumb(`${patient.firstName} ${patient.lastName}`),
    href: `/pacientes/${patient.id}`,
  };
}

/**
 * Build a breadcrumb trail rooted at "Pacientes > <patient name>" followed by
 * any number of deeper crumbs (e.g. "Notas", "Nueva nota").
 */
export function patientTrail(patient: CrumbPatient, ...trail: Crumb[]): Crumb[] {
  return [patientsRootCrumb(), patientCrumb(patient), ...trail];
}

/** "Configuración" root crumb. */
export function settingsRootCrumb(): Crumb {
  return { label: 'Configuración', href: '/configuracion' };
}

/** Build a trail rooted at "Configuración" followed by a section label. */
export function settingsTrail(...trail: Crumb[]): Crumb[] {
  return [settingsRootCrumb(), ...trail];
}
