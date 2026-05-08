import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getPatientById } from '@/queries/patients';
import { getMedicalHistory } from '@/queries/medical-history';
import { getAppointmentsByPatient } from '@/queries/appointments';
import { getClinicalNotesByPatient } from '@/queries/clinical-notes';
import { getClinicSettings } from '@/queries/clinic';
import { getAttachmentsByPatient } from '@/queries/attachments';
import { getClinicalDocumentsByPatient } from '@/queries/clinical-documents';
import { PatientTabs, type PatientTabId } from '@/components/patients/patient-tabs';
import { ClinicalDocumentList } from '@/components/clinical-documents/clinical-document-list';
import { ToggleActiveButton } from '@/components/patients/toggle-active-button';
import { MedicalHistoryForm } from '@/components/patients/medical-history-form';
import { PatientAppointments } from '@/components/appointments/patient-appointments';
import { ClinicalNoteTimeline } from '@/components/clinical-notes/clinical-note-timeline';
import { AttachmentUploader } from '@/components/attachments/attachment-uploader';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { PatientAvatar } from '@/components/patients/patient-avatar';
import { PatientAvatarUploader } from '@/components/patients/patient-avatar-uploader';
import { PatientAvatarRemoveButton } from '@/components/patients/patient-avatar-remove-button';
import { safeAuditLog, getClientIpFromHeaders } from '@/lib/audit';
import { todayInTz } from '@/lib/dates';

const CLINICAL_ROLES = new Set(['admin', 'doctor']);

interface PageProps {
  params: Promise<{ id: string }>;
}

const SEX_LABELS: Record<string, string> = { F: 'Femenino', M: 'Masculino', other: 'Otro' };

export default async function PatientDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const patient = await getPatientById(session.clinicId, id);
  if (!patient) notFound();

  // Audit READ on patient record. Use safeAuditLog so a logging failure never
  // breaks the page render; the event still gets recorded in the server log.
  await safeAuditLog({
    clinicId: session.clinicId,
    userId: session.userId,
    action: 'READ',
    resourceType: 'patient',
    resourceId: patient.id,
    ipAddress: await getClientIpFromHeaders(),
  });

  const canViewClinical = CLINICAL_ROLES.has(session.role);
  const allowedTabs: PatientTabId[] = canViewClinical
    ? ['datos', 'citas', 'historia', 'notas', 'documentos', 'adjuntos']
    : ['datos', 'citas', 'adjuntos'];

  // Only fetch medical history + notes for roles that can access them. Both
  // queries re-enforce the role gate, but we still branch here to avoid
  // throwing on legitimate non-clinical viewers.
  const [
    medicalHistory,
    clinicalNotes,
    patientAppointments,
    clinicSettings,
    patientAttachments,
    patientDocuments,
  ] = await Promise.all([
    canViewClinical ? getMedicalHistory(patient.id) : Promise.resolve(null),
    canViewClinical
      ? getClinicalNotesByPatient(session.clinicId, patient.id)
      : Promise.resolve([]),
    getAppointmentsByPatient(session.clinicId, patient.id),
    getClinicSettings(session.clinicId),
    getAttachmentsByPatient(session.clinicId, patient.id),
    canViewClinical
      ? getClinicalDocumentsByPatient(session.clinicId, patient.id)
      : Promise.resolve([]),
  ]);
  const todayStr = todayInTz(clinicSettings.timezone);
  const canCreateNote = session.role === 'doctor';
  const canCreateDocument = session.role === 'doctor';
  // Mirrors the policy of `updatePatient` / `updatePatientAvatar` (any
  // authenticated session). Centralised here so tightening the rule later is
  // a one-line change.
  const canEditPatient = true;

  const dob = patient.dateOfBirth as string;
  const [year, month, day] = dob.split('-');

  return (
    <div className="p-6 lg:p-8">
      {/* Back link */}
      <Link
        href="/pacientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a pacientes
      </Link>

      {/* Patient header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <PatientAvatar
              patientId={patient.id}
              firstName={patient.firstName}
              lastName={patient.lastName}
              avatarStorageKey={patient.avatarStorageKey}
              className="h-20 w-20"
              textClassName="text-xl"
            />
            {canEditPatient && <PatientAvatarUploader patientId={patient.id} />}
            {canEditPatient && patient.avatarStorageKey && (
              <PatientAvatarRemoveButton patientId={patient.id} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {patient.idType === 'cedula' ? 'C.I. ' : ''}
              {patient.idNumber} · {day}/{month}/{year} · {SEX_LABELS[patient.sex] ?? patient.sex}
            </p>
            {!patient.isActive && (
              <span className="mt-1 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Inactivo
              </span>
            )}
          </div>
        </div>

        {session.role === 'admin' && (
          <ToggleActiveButton
            patientId={patient.id}
            isActive={patient.isActive}
          />
        )}
      </div>

      {/* Tabs — role gating is decided here, on the server, not in the client */}
      <PatientTabs
        patient={patient}
        allowedTabs={allowedTabs}
        todayStr={todayStr}
        citasSlot={
          <PatientAppointments
            appointments={patientAppointments}
            patientId={patient.id}
            todayStr={todayStr}
          />
        }
        historiaSlot={
          canViewClinical ? (
            <MedicalHistoryForm patientId={patient.id} history={medicalHistory} />
          ) : undefined
        }
        notasSlot={
          canViewClinical ? (
            <ClinicalNoteTimeline
              notes={clinicalNotes}
              patientId={patient.id}
              canCreate={canCreateNote}
            />
          ) : undefined
        }
        documentosSlot={
          canViewClinical ? (
            <ClinicalDocumentList
              documents={patientDocuments}
              patientId={patient.id}
              canCreate={canCreateDocument}
              timeZone={clinicSettings.timezone}
            />
          ) : undefined
        }
        adjuntosSlot={
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Subir adjunto
              </h2>
              <AttachmentUploader patientId={patient.id} />
            </div>
            <AttachmentList
              attachments={patientAttachments}
              sessionUserId={session.userId}
              sessionRole={session.role}
              timeZone={clinicSettings.timezone}
            />
          </div>
        }
      />
    </div>
  );
}
