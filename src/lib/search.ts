// Shared global-search constants and result types.
//
// Kept in `lib` (not `queries/global-search.ts`) so client components — the
// Ctrl/Cmd+K dialog — can import the constants and types WITHOUT pulling the
// database/`pg` module into the browser bundle.

/** Max hits returned per group. Keeps payloads small and queries cheap. */
export const SEARCH_GROUP_LIMIT = 5;

/** Minimum query length before a search is performed. */
export const SEARCH_MIN_LENGTH = 2;

export interface PatientSearchHit {
  type: 'patient';
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string | null;
}

export interface NoteSearchHit {
  type: 'note';
  id: string;
  patientId: string;
  patientName: string;
  noteDate: string;
  /** Short, non-sensitive label — diagnosis text or chief complaint. */
  snippet: string;
}

export interface GlobalSearchResults {
  patients: PatientSearchHit[];
  notes: NoteSearchHit[];
}
