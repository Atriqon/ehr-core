import { CalendarDays, Lock, ShieldAlert, User } from 'lucide-react';
import { ClinicalNoteStatusBadge } from '@/components/clinical-notes/status-badge';
import type { ClinicalNoteDetail } from '@/queries/clinical-notes';
import type {
  GynecologicalExam,
  ProcedureEntry,
  ProcedureType,
} from '@/lib/validators/clinical-note';
import {
  ADNEXA_LABELS,
  CERVIX_LABELS,
  DISCHARGE_LABELS,
  DOUGLAS_LABELS,
  LABIA_MAJORA_LABELS,
  LABIA_MINORA_LABELS,
  PERINEAL_LABELS,
  PROCEDURE_LABELS,
  UTERUS_POSITION_LABELS,
  UTERUS_SIZE_LABELS,
  VAGINA_LABELS,
  VULVA_LABELS,
} from '@/components/clinical-notes/gynecological-exam-section';

interface ClinicalNoteViewProps {
  note: ClinicalNoteDetail;
  /**
   * True when the *current viewer* may see internal_notes. The value itself
   * is also nulled in the query for non-doctor roles, so this prop is just
   * for deciding whether to render the (empty) section at all.
   */
  canViewInternalNotes: boolean;
  /**
   * Procedure-photo attachments tied to this note, indexed by id. The page
   * already fetches `getAttachmentsByClinicalNote` for the attachments list,
   * so we just receive the relevant subset to render before/after thumbs
   * inline with the procedure entries.
   */
  procedurePhotos?: Record<string, { id: string; fileName: string }>;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        'rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900',
        className ?? '',
      ].join(' ')}
    >
      <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TextBlock({ value, placeholder }: { value: string | null; placeholder?: string }) {
  if (!value) {
    return (
      <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
        {placeholder ?? 'Sin información registrada.'}
      </p>
    );
  }
  return (
    <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{value}</p>
  );
}

function FindingRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string | null;
  note: string | null | undefined;
}) {
  if (!value && !note) return null;
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[180px_1fr]">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <div>
        {value && (
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {value}
          </span>
        )}
        {note && (
          <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{note}</p>
        )}
      </div>
    </div>
  );
}

function hasAnyExamData(g: GynecologicalExam | null | undefined): g is GynecologicalExam {
  if (!g) return false;
  return Object.values(g).some((v) => {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.values(v).some((x) => x != null && x !== '');
    return v !== '';
  });
}

function PhotoThumb({
  attachmentId,
  caption,
  attachments,
}: {
  attachmentId: string | null | undefined;
  caption: string;
  attachments: Record<string, { id: string; fileName: string }>;
}) {
  if (!attachmentId || !attachments[attachmentId]) return null;
  return (
    <figure className="space-y-1">
      <a
        href={`/api/attachments/${attachmentId}/download`}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/attachments/${attachmentId}/download`}
          alt={caption}
          className="h-32 w-full object-cover"
        />
      </a>
      <figcaption className="text-xs text-zinc-500 dark:text-zinc-400">{caption}</figcaption>
    </figure>
  );
}

function ProcedureCard({
  procedure,
  attachments,
}: {
  procedure: ProcedureEntry;
  attachments: Record<string, { id: string; fileName: string }>;
}) {
  const label =
    procedure.type === 'otro' && procedure.custom_label
      ? procedure.custom_label
      : PROCEDURE_LABELS[procedure.type as ProcedureType];

  const beforeId = procedure.photos?.before ?? null;
  const afterId = procedure.photos?.after ?? null;
  const hasPhotos = Boolean(
    (beforeId && attachments[beforeId]) || (afterId && attachments[afterId]),
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
      {procedure.notes && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {procedure.notes}
        </p>
      )}
      {hasPhotos && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <PhotoThumb attachmentId={beforeId} caption="Antes" attachments={attachments} />
          <PhotoThumb attachmentId={afterId} caption="Después" attachments={attachments} />
        </div>
      )}
    </div>
  );
}

function GynecologicalExamReadOnly({
  exam,
  attachments,
}: {
  exam: GynecologicalExam;
  attachments: Record<string, { id: string; fileName: string }>;
}) {
  const procedures = exam.procedures ?? [];
  const uterus = exam.uterus ?? {};
  const hasUterusData =
    uterus.size || uterus.position || uterus.consistency || uterus.mobility || uterus.pain;

  return (
    <div className="space-y-5">
      {(exam.labia_majora || exam.labia_minora || exam.vulva || exam.perineal) && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Examen externo
          </p>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <FindingRow
              label="Labios mayores"
              value={
                exam.labia_majora?.value ? LABIA_MAJORA_LABELS[exam.labia_majora.value] : null
              }
              note={exam.labia_majora?.note}
            />
            <FindingRow
              label="Labios menores"
              value={
                exam.labia_minora?.value ? LABIA_MINORA_LABELS[exam.labia_minora.value] : null
              }
              note={exam.labia_minora?.note}
            />
            <FindingRow
              label="Vulva"
              value={exam.vulva?.value ? VULVA_LABELS[exam.vulva.value] : null}
              note={exam.vulva?.note}
            />
            <FindingRow
              label="Región perineal"
              value={exam.perineal?.value ? PERINEAL_LABELS[exam.perineal.value] : null}
              note={exam.perineal?.note}
            />
          </div>
        </div>
      )}

      {(exam.vagina || exam.cervix || exam.discharge) && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Examen con espéculo
          </p>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <FindingRow
              label="Vagina"
              value={exam.vagina?.value ? VAGINA_LABELS[exam.vagina.value] : null}
              note={exam.vagina?.note}
            />
            <FindingRow
              label="Cuello uterino"
              value={exam.cervix?.value ? CERVIX_LABELS[exam.cervix.value] : null}
              note={exam.cervix?.note}
            />
            <FindingRow
              label="Secreción"
              value={exam.discharge?.value ? DISCHARGE_LABELS[exam.discharge.value] : null}
              note={exam.discharge?.note}
            />
          </div>
        </div>
      )}

      {(hasUterusData || exam.right_adnexa || exam.left_adnexa || exam.douglas_pouch) && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Tacto bimanual
          </p>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {uterus.size && (
              <FindingRow
                label="Útero · tamaño"
                value={UTERUS_SIZE_LABELS[uterus.size]}
                note={null}
              />
            )}
            {uterus.position && (
              <FindingRow
                label="Útero · posición"
                value={UTERUS_POSITION_LABELS[uterus.position]}
                note={null}
              />
            )}
            {uterus.consistency && (
              <FindingRow
                label="Útero · consistencia"
                value={uterus.consistency}
                note={null}
              />
            )}
            {uterus.mobility && (
              <FindingRow label="Útero · movilidad" value={uterus.mobility} note={null} />
            )}
            {uterus.pain && (
              <FindingRow label="Útero · dolor" value={uterus.pain} note={null} />
            )}
            <FindingRow
              label="Anexo derecho"
              value={
                exam.right_adnexa?.value ? ADNEXA_LABELS[exam.right_adnexa.value] : null
              }
              note={exam.right_adnexa?.note}
            />
            <FindingRow
              label="Anexo izquierdo"
              value={exam.left_adnexa?.value ? ADNEXA_LABELS[exam.left_adnexa.value] : null}
              note={exam.left_adnexa?.note}
            />
            <FindingRow
              label="Fondo de saco de Douglas"
              value={
                exam.douglas_pouch?.value ? DOUGLAS_LABELS[exam.douglas_pouch.value] : null
              }
              note={exam.douglas_pouch?.note}
            />
          </div>
        </div>
      )}

      {procedures.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Procedimientos realizados
          </p>
          <div className="space-y-3">
            {procedures.map((p) => (
              <ProcedureCard key={p.type} procedure={p} attachments={attachments} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecialtyRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}) {
  const display =
    value === null || value === undefined || value === ''
      ? null
      : `${value}${unit ? ` ${unit}` : ''}`;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {display ?? <span className="italic text-zinc-400 dark:text-zinc-500">—</span>}
      </span>
    </div>
  );
}

export function ClinicalNoteView({
  note,
  canViewInternalNotes,
  procedurePhotos = {},
}: ClinicalNoteViewProps) {
  const sp = note.specialtyData;
  const exam = sp?.gynecological_exam;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Nota de evolución
              </h1>
              <ClinicalNoteStatusBadge isSigned={note.isSigned} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(note.noteDate)}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {note.author.fullName}
              </span>
              {note.isSigned && note.signedAt && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Lock className="h-3.5 w-3.5" />
                  Firmada el {formatDateTime(note.signedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {note.chiefComplaint && (
          <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Motivo de consulta:{' '}
            </span>
            {note.chiefComplaint}
          </p>
        )}
      </div>

      {/* SOAP */}
      <SectionCard title="Subjetivo">
        <TextBlock value={note.subjective} />
      </SectionCard>
      <SectionCard title="Objetivo">
        <TextBlock value={note.objective} />
      </SectionCard>
      <SectionCard title="Análisis / Evaluación">
        <TextBlock value={note.assessment} />
      </SectionCard>
      <SectionCard title="Plan">
        <TextBlock value={note.plan} />
      </SectionCard>

      {/* Diagnóstico */}
      {note.diagnoses.length > 0 && (
        <SectionCard title="Diagnóstico(s)">
          <ul className="space-y-2">
            {note.diagnoses.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                {d.code && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2.5 py-0.5 font-mono text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {d.code}
                  </span>
                )}
                <span className="text-sm text-zinc-800 dark:text-zinc-200">{d.text}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* specialty_data */}
      {sp && Object.values(sp).some((v) => v !== null && v !== undefined && v !== '') && (
        <SectionCard title="Datos de consulta ginecológica">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <SpecialtyRow label="TA" value={sp.blood_pressure ?? null} unit="mmHg" />
            <SpecialtyRow label="Peso" value={sp.weight_kg ?? null} unit="kg" />
            <SpecialtyRow label="Talla" value={sp.height_cm ?? null} unit="cm" />
            <SpecialtyRow label="IMC" value={sp.bmi ?? null} />
            <SpecialtyRow
              label="FUM"
              value={sp.last_menstrual_period ? formatDate(sp.last_menstrual_period) : null}
            />
            <SpecialtyRow
              label="Edad gestacional"
              value={sp.gestational_age_weeks ?? null}
              unit="sem"
            />
            <SpecialtyRow label="Folículos izquierdo" value={sp.follicle_count_left ?? null} />
            <SpecialtyRow label="Folículos derecho" value={sp.follicle_count_right ?? null} />
            <SpecialtyRow
              label="Grosor endometrial"
              value={sp.endometrial_thickness_mm ?? null}
              unit="mm"
            />
          </div>

          {sp.ultrasound_findings && (
            <div className="mt-5">
              <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                Hallazgos ecográficos
              </p>
              <TextBlock value={sp.ultrasound_findings ?? null} />
            </div>
          )}
          {sp.procedure_performed && (
            <div className="mt-5">
              <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                Procedimiento realizado
              </p>
              <TextBlock value={sp.procedure_performed ?? null} />
            </div>
          )}
          {sp.treatment_protocol && (
            <div className="mt-5">
              <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                Protocolo de tratamiento
              </p>
              <TextBlock value={sp.treatment_protocol ?? null} />
            </div>
          )}
        </SectionCard>
      )}

      {/* Examen ginecológico estructurado (si fue llenado) */}
      {hasAnyExamData(exam) && (
        <SectionCard title="Examen ginecológico">
          <GynecologicalExamReadOnly exam={exam} attachments={procedurePhotos} />
        </SectionCard>
      )}

      {/* Internal notes — only rendered when the viewer is a doctor. The
          value itself is already NULLed in the query for any other role,
          but we also skip the whole section for clarity. */}
      {canViewInternalNotes && note.internalNotes && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 dark:border-amber-900/40 dark:bg-amber-950/10">
          <div className="mb-3 flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Notas internas (solo visibles para médicos)
            </h2>
          </div>
          <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {note.internalNotes}
          </p>
        </section>
      )}
    </div>
  );
}
