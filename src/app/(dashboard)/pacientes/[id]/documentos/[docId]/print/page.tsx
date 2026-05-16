import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { patientTrail } from '@/lib/breadcrumbs';
import { getClinicalDocumentById } from '@/queries/clinical-documents';
import { getFullClinic } from '@/queries/clinic';
import { ClinicalDocumentPrint } from '@/components/clinical-documents/clinical-document-print';
import { safeAuditLog, getClientIpFromHeaders } from '@/lib/audit';
import { todayInTz } from '@/lib/dates';

const VIEWER_ROLES = new Set(['admin', 'doctor']);

interface PageProps {
  params: Promise<{ id: string; docId: string }>;
}

export default async function ClinicalDocumentPrintPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!VIEWER_ROLES.has(session.role)) {
    notFound();
  }

  const { id, docId } = await params;
  const document = await getClinicalDocumentById(session.clinicId, docId);

  // Also verify the doc belongs to the URL's patient — defense against
  // hand-crafted /pacientes/<other>/documentos/<existing>/print URLs.
  if (!document || document.patientId !== id) {
    notFound();
  }

  const clinic = await getFullClinic(session.clinicId);
  if (!clinic) notFound();

  // Audit trail: viewing/printing a clinical document is a sensitive READ.
  await safeAuditLog({
    clinicId: session.clinicId,
    userId: session.userId,
    action: 'READ',
    resourceType: 'clinical_document',
    resourceId: document.id,
    details: {
      patientId: document.patientId,
      documentType: document.documentType,
    },
    ipAddress: await getClientIpFromHeaders(),
  });

  const todayStr = todayInTz(clinic.timezone);

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 print:bg-white">
      <div className="mx-auto max-w-3xl p-4 print:hidden">
        <Breadcrumbs
          items={patientTrail(
            {
              id: document.patientId,
              firstName: document.patient.firstName,
              lastName: document.patient.lastName,
            },
            { label: 'Documentos', href: `/pacientes/${document.patientId}/documentos` },
            { label: 'Imprimir documento' },
          )}
        />
      </div>

      <ClinicalDocumentPrint
        document={document}
        clinic={{ name: clinic.name, address: clinic.address, phone: clinic.phone }}
        todayStr={todayStr}
      />
    </div>
  );
}
