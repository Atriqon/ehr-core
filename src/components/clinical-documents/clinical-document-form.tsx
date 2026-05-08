'use client';

import {
  startTransition,
  useActionState,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import { AlertCircle, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  createClinicalDocument,
  type ClinicalDocumentActionState,
} from '@/actions/clinical-documents';
import {
  CLINICAL_DOCUMENT_TYPES,
  CLINICAL_DOCUMENT_TYPE_LABELS,
  type ClinicalDocumentType,
} from '@/lib/validators/clinical-document';

// ─── Shared input classes (mirrors clinical-note-form) ────────────────────────

function fieldClass(hasError = false) {
  return [
    'flex h-9 w-full rounded-lg border bg-white px-3 text-sm shadow-sm outline-none transition-colors',
    'placeholder:text-zinc-400 focus:ring-2',
    'dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500',
    'disabled:cursor-not-allowed disabled:opacity-60',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700'
      : 'border-zinc-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-zinc-700 dark:focus:border-blue-500',
  ].join(' ');
}

function textareaClass(hasError = false) {
  return [
    'w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors resize-y',
    'placeholder:text-zinc-400 focus:ring-2',
    'dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500',
    'disabled:cursor-not-allowed disabled:opacity-60',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700'
      : 'border-zinc-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-zinc-700 dark:focus:border-blue-500',
  ].join(' ');
}

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
    >
      {children}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-600 dark:text-red-400">{msg}</p>;
}

// ─── Local form state per document type ───────────────────────────────────────

interface MedicalRestState {
  diagnosis: string;
  rest_days: string;
  start_date: string;
  end_date: string;
  observations: string;
}

interface MedicalCertificateState {
  purpose: string;
  observations: string;
}

interface ReferralState {
  referred_to_specialty: string;
  referred_to_doctor: string;
  reason: string;
  clinical_summary: string;
}

interface MedicationRow {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PatientInstructionsState {
  instructions: string;
}

function emptyMedication(): MedicationRow {
  return { name: '', dose: '', frequency: '', duration: '', instructions: '' };
}

// ─── Date helpers (calendar arithmetic only) ──────────────────────────────────

function addDaysToDateStr(dateStr: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function calcAgeFromDob(dob: string, todayStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !/^\d{4}-\d{2}-\d{2}$/.test(todayStr)) {
    return null;
  }
  const [by, bm, bd] = dob.split('-').map(Number);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PatientHeader {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  idType: string;
  dateOfBirth: string;
  sex: string;
}

interface ClinicalDocumentFormProps {
  patient: PatientHeader;
  doctorName: string;
  todayStr: string;
  /** Optional initial selection (e.g. coming from a deep link). */
  initialType?: ClinicalDocumentType;
  /** Optional clinical_note_id to associate (e.g. from "documentar consulta"). */
  clinicalNoteId?: string | null;
}

export function ClinicalDocumentForm({
  patient,
  doctorName,
  todayStr,
  initialType,
  clinicalNoteId,
}: ClinicalDocumentFormProps) {
  const [state, action, isPending] = useActionState<
    ClinicalDocumentActionState,
    FormData
  >(createClinicalDocument, null);

  const [docType, setDocType] = useState<ClinicalDocumentType>(
    initialType ?? 'medical_rest',
  );
  const [title, setTitle] = useState<string>(
    initialType ? CLINICAL_DOCUMENT_TYPE_LABELS[initialType] : CLINICAL_DOCUMENT_TYPE_LABELS.medical_rest,
  );

  const [medicalRest, setMedicalRest] = useState<MedicalRestState>(() => ({
    diagnosis: '',
    rest_days: '3',
    start_date: todayStr,
    end_date: addDaysToDateStr(todayStr, 2),
    observations: '',
  }));

  const [certificate, setCertificate] = useState<MedicalCertificateState>({
    purpose: '',
    observations: '',
  });

  const [referral, setReferral] = useState<ReferralState>({
    referred_to_specialty: '',
    referred_to_doctor: '',
    reason: '',
    clinical_summary: '',
  });

  const [medications, setMedications] = useState<MedicationRow[]>(() => [
    emptyMedication(),
  ]);

  const [instructions, setInstructions] = useState<PatientInstructionsState>({
    instructions: '',
  });

  // Reset title to the type-default when changing types if the user hasn't
  // customized it. This keeps the input pre-filled but never overwrites a
  // bespoke title.
  function onChangeType(next: ClinicalDocumentType) {
    setDocType(next);
    const wasDefault = Object.values(CLINICAL_DOCUMENT_TYPE_LABELS).includes(title);
    if (wasDefault) {
      setTitle(CLINICAL_DOCUMENT_TYPE_LABELS[next]);
    }
  }

  function onMedicalRestChange<K extends keyof MedicalRestState>(
    key: K,
    value: MedicalRestState[K],
  ) {
    setMedicalRest((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'rest_days' || key === 'start_date') {
        const days = Math.max(1, Math.floor(Number(next.rest_days)) || 0);
        if (days >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(next.start_date)) {
          next.end_date = addDaysToDateStr(next.start_date, days - 1);
        }
      }
      return next;
    });
  }

  function updateMedication(idx: number, key: keyof MedicationRow, value: string) {
    setMedications((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)),
    );
  }

  function addMedication() {
    setMedications((prev) => [...prev, emptyMedication()]);
  }

  function removeMedication(idx: number) {
    setMedications((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
    );
  }

  // Build the JSON payload for the server action. Empty strings on optional
  // fields are converted to undefined so Zod's optional rules treat them
  // as "not provided".
  const payload = useMemo(() => {
    const base = {
      title: title.trim(),
      ...(clinicalNoteId ? { clinical_note_id: clinicalNoteId } : {}),
    };
    switch (docType) {
      case 'medical_rest':
        return {
          ...base,
          document_type: 'medical_rest',
          content: {
            diagnosis: medicalRest.diagnosis.trim(),
            rest_days: Number(medicalRest.rest_days),
            start_date: medicalRest.start_date,
            end_date: medicalRest.end_date,
            observations: medicalRest.observations.trim() || undefined,
          },
        };
      case 'medical_certificate':
        return {
          ...base,
          document_type: 'medical_certificate',
          content: {
            purpose: certificate.purpose.trim(),
            observations: certificate.observations.trim() || undefined,
          },
        };
      case 'referral':
        return {
          ...base,
          document_type: 'referral',
          content: {
            referred_to_specialty: referral.referred_to_specialty.trim(),
            referred_to_doctor: referral.referred_to_doctor.trim() || undefined,
            reason: referral.reason.trim(),
            clinical_summary: referral.clinical_summary.trim() || undefined,
          },
        };
      case 'prescription':
        return {
          ...base,
          document_type: 'prescription',
          content: {
            medications: medications.map((m) => ({
              name: m.name.trim(),
              dose: m.dose.trim(),
              frequency: m.frequency.trim(),
              duration: m.duration.trim(),
              instructions: m.instructions.trim() || undefined,
            })),
          },
        };
      case 'patient_instructions':
        return {
          ...base,
          document_type: 'patient_instructions',
          content: {
            instructions: instructions.instructions.trim(),
          },
        };
    }
  }, [docType, title, clinicalNoteId, medicalRest, certificate, referral, medications, instructions]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('patient_id', patient.id);
    fd.set('payload', JSON.stringify(payload));
    startTransition(() => {
      action(fd);
    });
  }

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const err = (key: string): string | undefined => fieldErrors?.[key]?.[0];

  const age = calcAgeFromDob(patient.dateOfBirth, todayStr);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {state && !state.success && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {/* ── Datos pre-rellenados (read-only summary) ───────────────────────── */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Datos del documento
        </h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Paciente
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {patient.firstName} {patient.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {patient.idType === 'cedula' ? 'Cédula' : 'Identificación'}
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{patient.idNumber}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Edad
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {age != null ? `${age} años` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Médico
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{doctorName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Fecha
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{todayStr}</dd>
          </div>
        </dl>
      </section>

      {/* ── Tipo + título ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Tipo de documento
        </h2>
        <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="document_type">
              Tipo <span className="text-red-500">*</span>
            </Label>
            <select
              id="document_type"
              value={docType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                onChangeType(e.target.value as ClinicalDocumentType)
              }
              className={fieldClass()}
            >
              {CLINICAL_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CLINICAL_DOCUMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Título del documento</Label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Reposo médico post-cirugía"
              maxLength={255}
              className={fieldClass(!!err('title'))}
            />
            <FieldError msg={err('title')} />
          </div>
        </div>
      </section>

      {/* ── Per-type fields ────────────────────────────────────────────────── */}
      {docType === 'medical_rest' && (
        <MedicalRestFields
          state={medicalRest}
          onChange={onMedicalRestChange}
          err={err}
        />
      )}
      {docType === 'medical_certificate' && (
        <MedicalCertificateFields
          state={certificate}
          onChange={(k, v) => setCertificate((prev) => ({ ...prev, [k]: v }))}
          err={err}
        />
      )}
      {docType === 'referral' && (
        <ReferralFields
          state={referral}
          onChange={(k, v) => setReferral((prev) => ({ ...prev, [k]: v }))}
          err={err}
        />
      )}
      {docType === 'prescription' && (
        <PrescriptionFields
          medications={medications}
          onUpdate={updateMedication}
          onAdd={addMedication}
          onRemove={removeMedication}
          err={err}
        />
      )}
      {docType === 'patient_instructions' && (
        <PatientInstructionsFields
          state={instructions}
          onChange={(v) => setInstructions({ instructions: v })}
          err={err}
        />
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:flex-row sm:justify-end dark:border-zinc-700 dark:bg-zinc-900/95">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Generar documento
        </Button>
      </div>
    </form>
  );
}

// ─── Per-type field groups ────────────────────────────────────────────────────

function MedicalRestFields({
  state,
  onChange,
  err,
}: {
  state: MedicalRestState;
  onChange: <K extends keyof MedicalRestState>(key: K, value: MedicalRestState[K]) => void;
  err: (key: string) => string | undefined;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        Reposo médico
      </h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="diagnosis">
            Diagnóstico <span className="text-red-500">*</span>
          </Label>
          <input
            id="diagnosis"
            type="text"
            value={state.diagnosis}
            onChange={(e) => onChange('diagnosis', e.target.value)}
            maxLength={500}
            placeholder="Ej: Síndrome viral agudo"
            className={fieldClass(!!err('content.diagnosis'))}
          />
          <FieldError msg={err('content.diagnosis')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="rest_days">
              Días de reposo <span className="text-red-500">*</span>
            </Label>
            <input
              id="rest_days"
              type="number"
              min={1}
              max={365}
              value={state.rest_days}
              onChange={(e) => onChange('rest_days', e.target.value)}
              className={fieldClass(!!err('content.rest_days'))}
            />
            <FieldError msg={err('content.rest_days')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start_date">
              Fecha de inicio <span className="text-red-500">*</span>
            </Label>
            <input
              id="start_date"
              type="date"
              value={state.start_date}
              onChange={(e) => onChange('start_date', e.target.value)}
              className={fieldClass(!!err('content.start_date'))}
            />
            <FieldError msg={err('content.start_date')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_date">Fecha de término (calculada)</Label>
            <input
              id="end_date"
              type="date"
              value={state.end_date}
              readOnly
              className={`${fieldClass()} bg-zinc-50 dark:bg-zinc-800`}
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Calculada desde la fecha de inicio + días de reposo.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="observations">Observaciones</Label>
          <textarea
            id="observations"
            value={state.observations}
            onChange={(e) => onChange('observations', e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Recomendaciones adicionales para el paciente…"
            className={textareaClass()}
          />
        </div>
      </div>
    </section>
  );
}

function MedicalCertificateFields({
  state,
  onChange,
  err,
}: {
  state: MedicalCertificateState;
  onChange: <K extends keyof MedicalCertificateState>(
    key: K,
    value: MedicalCertificateState[K],
  ) => void;
  err: (key: string) => string | undefined;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        Constancia médica
      </h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="purpose">
            Propósito <span className="text-red-500">*</span>
          </Label>
          <textarea
            id="purpose"
            value={state.purpose}
            onChange={(e) => onChange('purpose', e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Certifico que el/la paciente se encuentra en condiciones de…"
            className={textareaClass(!!err('content.purpose'))}
          />
          <FieldError msg={err('content.purpose')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cert_observations">Observaciones</Label>
          <textarea
            id="cert_observations"
            value={state.observations}
            onChange={(e) => onChange('observations', e.target.value)}
            rows={3}
            maxLength={4000}
            className={textareaClass()}
          />
        </div>
      </div>
    </section>
  );
}

function ReferralFields({
  state,
  onChange,
  err,
}: {
  state: ReferralState;
  onChange: <K extends keyof ReferralState>(key: K, value: ReferralState[K]) => void;
  err: (key: string) => string | undefined;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        Referencia médica
      </h2>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ref_specialty">
              Especialidad <span className="text-red-500">*</span>
            </Label>
            <input
              id="ref_specialty"
              type="text"
              value={state.referred_to_specialty}
              onChange={(e) => onChange('referred_to_specialty', e.target.value)}
              placeholder="Ej: Cardiología"
              maxLength={255}
              className={fieldClass(!!err('content.referred_to_specialty'))}
            />
            <FieldError msg={err('content.referred_to_specialty')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ref_doctor">Médico (opcional)</Label>
            <input
              id="ref_doctor"
              type="text"
              value={state.referred_to_doctor}
              onChange={(e) => onChange('referred_to_doctor', e.target.value)}
              placeholder="Ej: Dr. Pedro Sánchez"
              maxLength={255}
              className={fieldClass()}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ref_reason">
            Motivo de la referencia <span className="text-red-500">*</span>
          </Label>
          <textarea
            id="ref_reason"
            value={state.reason}
            onChange={(e) => onChange('reason', e.target.value)}
            rows={3}
            maxLength={4000}
            className={textareaClass(!!err('content.reason'))}
          />
          <FieldError msg={err('content.reason')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ref_summary">Resumen clínico</Label>
          <textarea
            id="ref_summary"
            value={state.clinical_summary}
            onChange={(e) => onChange('clinical_summary', e.target.value)}
            rows={5}
            maxLength={8000}
            placeholder="Antecedentes relevantes, hallazgos, estudios realizados…"
            className={textareaClass()}
          />
        </div>
      </div>
    </section>
  );
}

function PrescriptionFields({
  medications,
  onUpdate,
  onAdd,
  onRemove,
  err,
}: {
  medications: MedicationRow[];
  onUpdate: (idx: number, key: keyof MedicationRow, value: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  err: (key: string) => string | undefined;
}) {
  const arrayError = err('content.medications');
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Récipe médico
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Agregar medicamento
        </Button>
      </div>

      <FieldError msg={arrayError} />

      <div className="space-y-4">
        {medications.map((med, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-4 dark:border-zinc-700 dark:bg-zinc-800/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Medicamento #{idx + 1}
              </p>
              {medications.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => onRemove(idx)}
                  aria-label={`Eliminar medicamento ${idx + 1}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nombre <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  value={med.name}
                  onChange={(e) => onUpdate(idx, 'name', e.target.value)}
                  maxLength={255}
                  placeholder="Ej: Amoxicilina"
                  className={fieldClass(!!err(`content.medications.${idx}.name`))}
                />
                <FieldError msg={err(`content.medications.${idx}.name`)} />
              </div>
              <div className="space-y-1.5">
                <Label>Dosis <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  value={med.dose}
                  onChange={(e) => onUpdate(idx, 'dose', e.target.value)}
                  maxLength={255}
                  placeholder="Ej: 500 mg"
                  className={fieldClass(!!err(`content.medications.${idx}.dose`))}
                />
                <FieldError msg={err(`content.medications.${idx}.dose`)} />
              </div>
              <div className="space-y-1.5">
                <Label>Frecuencia <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  value={med.frequency}
                  onChange={(e) => onUpdate(idx, 'frequency', e.target.value)}
                  maxLength={255}
                  placeholder="Ej: Cada 8 horas"
                  className={fieldClass(!!err(`content.medications.${idx}.frequency`))}
                />
                <FieldError msg={err(`content.medications.${idx}.frequency`)} />
              </div>
              <div className="space-y-1.5">
                <Label>Duración <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  value={med.duration}
                  onChange={(e) => onUpdate(idx, 'duration', e.target.value)}
                  maxLength={255}
                  placeholder="Ej: 7 días"
                  className={fieldClass(!!err(`content.medications.${idx}.duration`))}
                />
                <FieldError msg={err(`content.medications.${idx}.duration`)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Indicaciones</Label>
                <textarea
                  value={med.instructions}
                  onChange={(e) => onUpdate(idx, 'instructions', e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Ej: Tomar con alimentos"
                  className={textareaClass()}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PatientInstructionsFields({
  state,
  onChange,
  err,
}: {
  state: PatientInstructionsState;
  onChange: (value: string) => void;
  err: (key: string) => string | undefined;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        Indicaciones al paciente
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="instructions">
          Indicaciones <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="instructions"
          value={state.instructions}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          maxLength={8000}
          placeholder="Indicaciones detalladas, cuidados, recomendaciones, próximo control…"
          className={textareaClass(!!err('content.instructions'))}
        />
        <FieldError msg={err('content.instructions')} />
      </div>
    </section>
  );
}
