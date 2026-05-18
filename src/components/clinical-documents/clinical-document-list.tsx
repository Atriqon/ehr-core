import Link from 'next/link';
import {
  FilePlus2,
  FileText,
  FlaskConical,
  HeartPulse,
  Microscope,
  Pill,
  Send,
  Stamp,
  User,
} from 'lucide-react';
import type { ClinicalDocumentListItem } from '@/queries/clinical-documents';
import {
  CLINICAL_DOCUMENT_TYPE_LABELS,
  type ClinicalDocumentType,
} from '@/lib/validators/clinical-document';

interface ClinicalDocumentListProps {
  documents: ClinicalDocumentListItem[];
  patientId: string;
  /** Doctor only — controls the "Nuevo documento" CTA. */
  canCreate: boolean;
  timeZone: string;
}

const TYPE_ICONS: Record<ClinicalDocumentType, React.ComponentType<{ className?: string }>> = {
  medical_rest: HeartPulse,
  medical_certificate: Stamp,
  referral: Send,
  prescription: Pill,
  patient_instructions: FileText,
  lab_order: FlaskConical,
  imaging_order: Microscope,
  interconsultation: Send,
};

function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function ClinicalDocumentList({
  documents,
  patientId,
  canCreate,
  timeZone,
}: ClinicalDocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center rounded-[22px] py-14 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#F0FDFA,#CCFBF1)] text-teal-600 shadow-[inset_0_0_0_1px_rgba(13,148,136,0.15),0_8px_18px_-8px_rgba(13,148,136,0.35)]">
          <FileText className="h-7 w-7" />
        </span>
        <p className="mt-2 text-[15px] font-semibold text-slate-800">
          Sin documentos generados
        </p>
        <p className="mt-1 max-w-80 text-[13px] leading-relaxed text-slate-500">
          Reposos, constancias, referencias y récipes aparecerán aquí.
        </p>
        {canCreate && (
          <Link
            href={`/pacientes/${patientId}/documentos/nuevo`}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-[linear-gradient(180deg,#14B8A6,#0D9488)] px-4 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_6px_14px_-4px_rgba(13,148,136,0.5)] transition-all hover:bg-[linear-gradient(180deg,#0D9488,#0F766E)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Nuevo documento
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {documents.length} documento{documents.length !== 1 ? 's' : ''}
        </p>
        {canCreate && (
          <Link
            href={`/pacientes/${patientId}/documentos/nuevo`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[linear-gradient(180deg,#14B8A6,#0D9488)] px-4 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_6px_14px_-4px_rgba(13,148,136,0.5)] transition-all hover:bg-[linear-gradient(180deg,#0D9488,#0F766E)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Nuevo documento
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {documents.map((doc) => {
          const Icon = TYPE_ICONS[doc.documentType] ?? FileText;
          return (
            <Link
              key={doc.id}
              href={`/pacientes/${patientId}/documentos/${doc.id}/print`}
              className="glass-surface flex items-start gap-3 rounded-[18px] p-3.5 transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
            >
              <div className="glass-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5EEAD4,#14B8A6)] text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-zinc-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {CLINICAL_DOCUMENT_TYPE_LABELS[doc.documentType]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(doc.createdAt, timeZone)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                  {doc.title}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <User className="h-3 w-3 shrink-0" />
                  {doc.author.fullName}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
