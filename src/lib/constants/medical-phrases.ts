// Predefined "frequent phrases" surfaced as click-to-insert chips next to the
// long-form medical-history textareas. Stored as a constant (not in the DB)
// so the clinic can extend the lists without a migration — just edit this
// file. Keys mirror the field names used in `medical-history-form.tsx` and
// `clinical-note-form.tsx`.

export const personalHistoryPhrases = [
  'HTA',
  'Diabetes Tipo 2',
  'Asma',
  'Hipotiroidismo',
  'Hipertiroidismo',
  'Dislipidemia',
  'Obesidad',
  'Migraña',
  'Depresión',
  'Ansiedad',
  'Anemia',
  'Sin antecedentes patológicos',
] as const;

export const familyHistoryPhrases = [
  'HTA',
  'Diabetes',
  'Cáncer de mama',
  'Cáncer de cuello uterino',
  'Cáncer de ovario',
  'Cáncer de colon',
  'Cardiopatía isquémica',
  'ACV',
  'Hipotiroidismo',
  'Obesidad',
  'Sin antecedentes familiares relevantes',
] as const;

export const surgicalHistoryPhrases = [
  'Apendicectomía',
  'Colecistectomía',
  'Cesárea',
  'Histerectomía',
  'Laparoscopia diagnóstica',
  'Quistectomía ovárica',
  'Miomectomía',
  'Legrado uterino',
  'Conización cervical',
  'Salpingectomía',
  'Sin cirugías previas',
] as const;

export const allergyPhrases = [
  'Penicilina',
  'AINEs',
  'Sulfas',
  'Yodo / contraste yodado',
  'Látex',
  'Aspirina',
  'Mariscos',
  'Sin alergias conocidas',
] as const;

export const medicationPhrases = [
  'Levotiroxina',
  'Metformina',
  'Losartán',
  'Enalapril',
  'Ácido fólico',
  'Hierro',
  'Anticonceptivos orales',
  'Vitamina D',
  'Calcio',
  'Sin medicación habitual',
] as const;

// Frequent reasons for visit. Surfaced as a quick-pick select on the clinical
// note form (chief_complaint).
export const consultationReasonPhrases = [
  'Control ginecológico',
  'Planificación familiar',
  'Infertilidad',
  'Amenorrea',
  'Sangrado uterino anormal',
  'Dolor pélvico',
  'Control prenatal',
  'Climaterio / menopausia',
  'Infección urinaria',
  'Flujo vaginal',
  'Dismenorrea',
  'Resultado de estudios',
] as const;

export type PhraseList = readonly string[];
