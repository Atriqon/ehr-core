import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getPatientById } from '@/queries/patients';
import { getClinicalDocumentsByPatient } from '@/queries/clinical-documents';
import { getClinicSettings } from '@/queries/clinic';
import { ClinicalDocumentList } from '@/components/clinical-documents/clinical-document-list';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { patientTrail } from '@/lib/breadcrumbs';

const VIEWER_ROLES = new Set(['admin', 'doctor']);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDocumentsPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  // Receptionist: no access. 404 keeps the existence of the route opaque.
  if (!VIEWER_ROLES.has(session.role)) {
    notFound();
  }

  const { id } = await params;
  const [patient, documents, clinicSettings] = await Promise.all([
    getPatientById(session.clinicId, id),
    getClinicalDocumentsByPatient(session.clinicId, id),
    getClinicSettings(session.clinicId),
  ]);
  if (!patient) notFound();

  const canCreate = session.role === 'doctor';

  return (
    <div className="p-6 lg:p-8">
      <Breadcrumbs items={patientTrail(patient, { label: 'Documentos' })} />

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {patient.firstName} {patient.lastName}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Documentos clínicos
        </h1>
      </div>

      <ClinicalDocumentList
        documents={documents}
        patientId={patient.id}
        canCreate={canCreate}
        timeZone={clinicSettings.timezone}
      />
    </div>
  );
}
