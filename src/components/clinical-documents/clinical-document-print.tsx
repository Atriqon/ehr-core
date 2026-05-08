'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClinicalDocumentDetail } from '@/queries/clinical-documents';
import {
  CLINICAL_DOCUMENT_TYPE_LABELS,
  type MedicalRestContent,
  type MedicalCertificateContent,
  type ReferralContent,
  type PrescriptionContent,
  type PatientInstructionsContent,
} from '@/lib/validators/clinical-document';

interface ClinicalDocumentPrintProps {
  document: ClinicalDocumentDetail;
  clinic: {
    name: string;
    address: string | null;
    phone: string | null;
  };
  /** YYYY-MM-DD in clinic TZ; printed below the doctor's signature. */
  todayStr: string;
}

const SEX_LABELS: Record<string, string> = { F: 'Femenino', M: 'Masculino', other: 'Otro' };

function formatDateLong(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function calcAge(dob: string, todayStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !/^\d{4}-\d{2}-\d{2}$/.test(todayStr)) {
    return null;
  }
  const [by, bm, bd] = dob.split('-').map(Number);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

export function ClinicalDocumentPrint({
  document,
  clinic,
  todayStr,
}: ClinicalDocumentPrintProps) {
  const age = calcAge(document.patient.dateOfBirth, todayStr);

  // Print-only styles. Hides the chrome (toolbar, app shell), forces
  // black-on-white, and gives consistent A4 margins. Plain <style> with
  // dangerouslySetInnerHTML keeps us independent of styled-jsx.
  const printCss = `
    @media print {
      @page { size: A4; margin: 18mm 15mm; }
      html, body { background: #fff !important; }
      body * { visibility: hidden; }
      #clinical-document-print, #clinical-document-print * { visibility: visible; }
      #clinical-document-print {
        position: absolute;
        top: 0; left: 0; right: 0;
        width: 100%;
        color: #000;
        background: #fff;
        font-family: 'Times New Roman', Times, serif;
      }
      .no-print { display: none !important; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      <div className="mx-auto max-w-3xl px-6 py-8 print:p-0">
        {/* Toolbar — hidden on print */}
        <div className="no-print mb-6 flex items-center justify-end gap-2">
          <Button type="button" onClick={() => window.print()} size="lg">
            <Printer className="h-4 w-4" />
            Imprimir / Guardar PDF
          </Button>
        </div>

        <article
          id="clinical-document-print"
          className="rounded-xl border border-zinc-200 bg-white p-10 text-zinc-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none dark:border-zinc-700 dark:bg-white"
        >
          {/* Header */}
          <header className="border-b-2 border-zinc-800 pb-4 text-center">
            <h1 className="text-xl font-bold uppercase tracking-wide">{clinic.name}</h1>
            {clinic.address && (
              <p className="mt-1 text-xs text-zinc-700">{clinic.address}</p>
            )}
            {clinic.phone && (
              <p className="text-xs text-zinc-700">Tel: {clinic.phone}</p>
            )}
          </header>

          {/* Document title */}
          <div className="mt-6 text-center">
            <h2 className="text-lg font-bold uppercase tracking-wide">
              {CLINICAL_DOCUMENT_TYPE_LABELS[document.documentType]}
            </h2>
            {document.title &&
              document.title !== CLINICAL_DOCUMENT_TYPE_LABELS[document.documentType] && (
                <p className="mt-1 text-sm italic text-zinc-700">{document.title}</p>
              )}
          </div>

          {/* Patient block */}
          <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <p>
              <span className="font-semibold">Paciente:</span>{' '}
              {document.patient.firstName} {document.patient.lastName}
            </p>
            <p>
              <span className="font-semibold">
                {document.patient.idType === 'cedula' ? 'Cédula:' : 'Identificación:'}
              </span>{' '}
              {document.patient.idNumber}
            </p>
            <p>
              <span className="font-semibold">Edad:</span>{' '}
              {age != null ? `${age} años` : '—'}
            </p>
            <p>
              <span className="font-semibold">Sexo:</span>{' '}
              {SEX_LABELS[document.patient.sex] ?? document.patient.sex}
            </p>
            <p>
              <span className="font-semibold">Fecha:</span>{' '}
              {formatDateLong(todayStr)}
            </p>
          </section>

          <hr className="my-5 border-zinc-300" />

          {/* Body — varies per type */}
          <section className="space-y-3 text-sm leading-relaxed">
            <DocumentBody document={document} />
          </section>

          {/* Signature */}
          <section className="mt-16 text-center">
            <div className="mx-auto w-72 border-t border-zinc-800 pt-2 text-sm">
              <p className="font-semibold">{document.author.fullName}</p>
              <p className="text-xs text-zinc-700">Firma del médico</p>
            </div>
          </section>

          {/* Footer */}
          {(clinic.address || clinic.phone) && (
            <footer className="mt-12 border-t border-zinc-300 pt-3 text-center text-[10px] text-zinc-600">
              {clinic.name}
              {clinic.address ? ` · ${clinic.address}` : ''}
              {clinic.phone ? ` · ${clinic.phone}` : ''}
            </footer>
          )}
        </article>
      </div>
    </>
  );
}

function DocumentBody({ document }: { document: ClinicalDocumentDetail }) {
  switch (document.documentType) {
    case 'medical_rest':
      return <MedicalRestBody content={document.content as MedicalRestContent} />;
    case 'medical_certificate':
      return (
        <MedicalCertificateBody content={document.content as MedicalCertificateContent} />
      );
    case 'referral':
      return <ReferralBody content={document.content as ReferralContent} />;
    case 'prescription':
      return <PrescriptionBody content={document.content as PrescriptionContent} />;
    case 'patient_instructions':
      return (
        <PatientInstructionsBody
          content={document.content as PatientInstructionsContent}
        />
      );
  }
}

function MedicalRestBody({ content }: { content: MedicalRestContent }) {
  return (
    <>
      <p>
        Por la presente certifico que el/la paciente arriba identificado/a requiere{' '}
        <strong>reposo médico por {content.rest_days} día{content.rest_days === 1 ? '' : 's'}</strong>,
        comprendido entre el <strong>{formatDateLong(content.start_date)}</strong> y el{' '}
        <strong>{formatDateLong(content.end_date)}</strong>.
      </p>
      <p>
        <strong>Diagnóstico:</strong> {content.diagnosis}
      </p>
      {content.observations && (
        <p>
          <strong>Observaciones:</strong>{' '}
          <span className="whitespace-pre-wrap">{content.observations}</span>
        </p>
      )}
    </>
  );
}

function MedicalCertificateBody({ content }: { content: MedicalCertificateContent }) {
  return (
    <>
      <p className="whitespace-pre-wrap">{content.purpose}</p>
      {content.observations && (
        <p>
          <strong>Observaciones:</strong>{' '}
          <span className="whitespace-pre-wrap">{content.observations}</span>
        </p>
      )}
    </>
  );
}

function ReferralBody({ content }: { content: ReferralContent }) {
  return (
    <>
      <p>
        Se refiere al paciente al servicio de{' '}
        <strong>{content.referred_to_specialty}</strong>
        {content.referred_to_doctor ? (
          <>
            {' '}
            con el/la <strong>{content.referred_to_doctor}</strong>
          </>
        ) : null}
        .
      </p>
      <div>
        <p className="font-semibold">Motivo de la referencia:</p>
        <p className="whitespace-pre-wrap">{content.reason}</p>
      </div>
      {content.clinical_summary && (
        <div>
          <p className="font-semibold">Resumen clínico:</p>
          <p className="whitespace-pre-wrap">{content.clinical_summary}</p>
        </div>
      )}
    </>
  );
}

function PrescriptionBody({ content }: { content: PrescriptionContent }) {
  return (
    <ol className="space-y-3 pl-5" style={{ listStyleType: 'decimal' }}>
      {content.medications.map((med, i) => (
        <li key={i} className="leading-snug">
          <p>
            <strong>{med.name}</strong> — {med.dose}
          </p>
          <p className="text-sm">
            {med.frequency} · {med.duration}
          </p>
          {med.instructions && (
            <p className="text-sm italic text-zinc-700">{med.instructions}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

function PatientInstructionsBody({ content }: { content: PatientInstructionsContent }) {
  return <p className="whitespace-pre-wrap">{content.instructions}</p>;
}
