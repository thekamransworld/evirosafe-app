import { useCallback, useState } from 'react';
import { useAppContext, useDataContext } from '../contexts';
import { useToast } from '../components/ui/Toast';
import type { TrainingRecord } from '../types';
import { buildVerifyUrl, getPublicBaseUrl, isLocalUrl } from '../lib/certificates';
import { describeCertificateError, downloadCertificateForRecord } from '../services/certificateService';

/**
 * Download / share / issue / revoke for training certificates, with a single
 * "busy" id so only the card being worked on shows a spinner.
 */
export function useCertificateActions() {
  const { can } = useAppContext();
  const { handleIssueCertificate, handleRevokeCertificate } = useDataContext();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Mirrors the Firestore rule: only roles that can update training may issue
  // or revoke. Workers can still download and share their own certificates.
  const canManage = can('update', 'training');

  const run = useCallback(async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  }, []);

  const download = useCallback(
    (record: TrainingRecord) =>
      run(record.id, async () => {
        try {
          if (isLocalUrl(getPublicBaseUrl())) {
            toast.info('Heads up: this build runs on localhost, so the QR code will point to localhost. Set VITE_PUBLIC_APP_URL for real certificates.');
          }
          await downloadCertificateForRecord(record);
          toast.success('Certificate downloaded.');
        } catch (e) {
          console.error('[certificates] download failed:', e);
          toast.error(describeCertificateError(e));
        }
      }),
    [run, toast],
  );

  const copyLink = useCallback(
    async (record: TrainingRecord) => {
      if (!record.verification_code) return;
      const url = buildVerifyUrl(record.verification_code);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          toast.success('Verification link copied.');
        } else {
          toast.info(url);
        }
      } catch {
        toast.error('Could not copy the link.');
      }
    },
    [toast],
  );

  const issue = useCallback(
    (record: TrainingRecord) => run(record.id, () => handleIssueCertificate(record.id)),
    [run, handleIssueCertificate],
  );

  const revoke = useCallback(
    (record: TrainingRecord) =>
      run(record.id, async () => {
        const ok = window.confirm(
          'Revoke this certificate?\n\nIts verification page will immediately show it as revoked, and it can no longer be downloaded. This cannot be undone from the app.',
        );
        if (ok) await handleRevokeCertificate(record.id);
      }),
    [run, handleRevokeCertificate],
  );

  return { busyId, canManage, download, copyLink, issue, revoke };
}
