// Thin wrapper around the Resend SDK so the route handler stays focused on
// authorization, validation, and audit logging. Server-only — never imported
// from a Client Component. Reads RESEND_* env vars at call time so a missing
// secret surfaces as a clean disabled state instead of a startup crash.

import { Resend } from 'resend';

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Reads Resend env config without throwing. Returns null when any required
 * variable is missing so callers can surface a clean "feature unavailable"
 * error instead of crashing the request.
 */
export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = process.env.RESEND_FROM_NAME?.trim() || 'Hisamed';
  if (!apiKey || !fromEmail) return null;
  return { apiKey, fromEmail, fromName };
}

export interface SendPatientHistoryEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  pdf: Buffer;
  attachmentFilename: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** Resend message id, when send succeeded. */
  id?: string;
  /** Human-safe Spanish error message. Never includes provider internals. */
  errorMessage?: string;
}

/**
 * Sends the patient history PDF via Resend. Returns a discriminated result
 * rather than throwing so the route can audit failures uniformly.
 *
 * Errors are logged server-side with their raw shape but never returned to
 * the caller — the route surfaces a generic Spanish message to avoid leaking
 * upstream provider internals.
 */
export async function sendPatientHistoryEmail(
  config: ResendConfig,
  params: SendPatientHistoryEmailParams,
): Promise<SendEmailResult> {
  const client = new Resend(config.apiKey);
  const from = `${config.fromName} <${config.fromEmail}>`;

  try {
    const response = await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: [
        {
          filename: params.attachmentFilename,
          content: params.pdf,
          contentType: 'application/pdf',
        },
      ],
    });

    if (response.error) {
      console.error('[email/resend] Resend returned error', {
        name: response.error.name,
        message: response.error.message,
      });
      return { ok: false, errorMessage: 'No se pudo enviar el correo' };
    }

    return { ok: true, id: response.data?.id };
  } catch (err) {
    console.error('[email/resend] send threw', err instanceof Error ? err.message : err);
    return { ok: false, errorMessage: 'No se pudo enviar el correo' };
  }
}
