/**
 * FILE: src/lib/certificationAlerts.ts
 *
 * PASTE AT:  src/lib/certificationAlerts.ts  (create src/lib/ if it doesn't exist)
 *
 * Certification & Training Expiry Alert Engine
 *
 * Pure utility functions — no React dependencies.
 * Can run:
 *   (a) In the browser via a useEffect hook (checked on app load)
 *   (b) In a Firebase Scheduled Function (daily cron) — see bottom of file
 *
 * HOW TO USE IN A COMPONENT:
 * ─────────────────────────────────────────────────────────
 *   import { getExpiryAlerts, AlertSeverity } from '@/lib/certificationAlerts';
 *
 *   const alerts = getExpiryAlerts(trainingRecordList, usersList);
 *   const critical = alerts.filter(a => a.severity === 'critical');
 *
 * HOW TO USE IN A HOOK (recommended):
 * ─────────────────────────────────────────────────────────
 *   // Add this to src/hooks/useCertificationAlerts.ts
 *   import { useMemo } from 'react';
 *   import { useDataContext } from '../contexts/DataContext';
 *   import { useAppContext } from '../contexts/AppContext';
 *   import { getExpiryAlerts } from '../lib/certificationAlerts';
 *
 *   export function useCertificationAlerts() {
 *     const { trainingRecordList } = useDataContext();
 *     const { usersList } = useAppContext();
 *     return useMemo(
 *       () => getExpiryAlerts(trainingRecordList, usersList),
 *       [trainingRecordList, usersList]
 *     );
 *   }
 *
 * WHERE TO SHOW ALERTS:
 *   - Dashboard widget: import useCertificationAlerts and render AlertBadge
 *   - Sidebar badge: show count of 'critical' + 'warning' alerts on Training nav item
 *   - Training module: show inline alert banners next to each user's record
 *   - Email/push: trigger from Firebase Scheduled Function (see bottom of file)
 */

import type { TrainingRecord, User } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'expired';

export interface CertificationAlert {
  /** Unique alert ID */
  id: string;
  /** The training record this alert is for */
  record_id: string;
  /** User this record belongs to */
  user_id: string;
  user_name: string;
  /** Course / certification name */
  course_name: string;
  /** ISO date string of expiry */
  expiry_date: string;
  /** Days until expiry (negative = already expired) */
  days_until_expiry: number;
  /** Alert severity level */
  severity: AlertSeverity;
  /** Human-readable message */
  message: string;
  /** Suggested action for the HSE manager */
  action: string;
}

export interface AlertSummary {
  expired:  number;
  critical: number;   // expires within 14 days
  warning:  number;   // expires within 30 days
  info:     number;   // expires within 60 days
  total:    number;
  byUser:   Record<string, CertificationAlert[]>;
  byCourse: Record<string, CertificationAlert[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds (days before expiry to raise each severity level)
// ─────────────────────────────────────────────────────────────────────────────

export const ALERT_THRESHOLDS = {
  critical: 14,   // 2 weeks — action urgently required
  warning:  30,   // 1 month — schedule renewal soon
  info:     60,   // 2 months — plan ahead
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Core function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse a list of training records and return alerts for those
 * that are expired or expiring soon.
 *
 * @param records     Full list of TrainingRecord documents from Firestore
 * @param users       Full user list (for name lookups)
 * @param asOfDate    Date to check against (defaults to today — override in tests)
 * @returns           Array of CertificationAlert sorted by severity then days_until_expiry
 */
export function getExpiryAlerts(
  records: TrainingRecord[],
  users: User[],
  asOfDate: Date = new Date(),
): CertificationAlert[] {
  const alerts: CertificationAlert[] = [];
  const todayMs = asOfDate.getTime();

  for (const record of records) {
    // Only process records that have an expiry date
    if (!record.expires_at) continue;

    // Skip records that have already been renewed (status check)
    if ((record as any).status === 'renewed' || (record as any).status === 'superseded') continue;

    const expiryDate = new Date(record.expires_at);
    if (isNaN(expiryDate.getTime())) continue; // skip invalid dates

    const diffMs  = expiryDate.getTime() - todayMs;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // round up so "today" = 0

    // Skip records that expire far in the future
    if (diffDays > ALERT_THRESHOLDS.info) continue;

    // Determine severity
    let severity: AlertSeverity;
    let message: string;
    let action: string;

    if (diffDays < 0) {
      severity = 'expired';
      message  = `Certification expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago.`;
      action   = 'Worker must not perform this activity until certification is renewed. Schedule renewal immediately.';
    } else if (diffDays <= ALERT_THRESHOLDS.critical) {
      severity = 'critical';
      message  = `Certification expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}.`;
      action   = 'Schedule renewal training within the next 48 hours.';
    } else if (diffDays <= ALERT_THRESHOLDS.warning) {
      severity = 'warning';
      message  = `Certification expires in ${diffDays} days.`;
      action   = 'Book renewal training this week.';
    } else {
      severity = 'info';
      message  = `Certification expires in ${diffDays} days.`;
      action   = 'Plan renewal training within the next month.';
    }

    // Resolve user name
    const user      = users.find((u) => u.id === record.user_id);
    const user_name = user?.name ?? user?.email ?? record.user_id ?? 'Unknown User';

    alerts.push({
      id:                `alert_${record.id}_${record.expires_at}`,
      record_id:         record.id,
      user_id:           record.user_id,
      user_name,
      course_name:       (record as any).course_name ?? (record as any).course_id ?? 'Unknown Course',
      expiry_date:       record.expires_at,
      days_until_expiry: diffDays,
      severity,
      message,
      action,
    });
  }

  // Sort: expired first, then by days_until_expiry ascending (most urgent first)
  return alerts.sort((a, b) => {
    const SEVERITY_ORDER: Record<AlertSeverity, number> = {
      expired: 0, critical: 1, warning: 2, info: 3,
    };
    const so = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (so !== 0) return so;
    return a.days_until_expiry - b.days_until_expiry;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an AlertSummary from an array of CertificationAlerts.
 * Useful for dashboard widgets and badge counts.
 */
export function buildAlertSummary(alerts: CertificationAlert[]): AlertSummary {
  const byUser:   Record<string, CertificationAlert[]> = {};
  const byCourse: Record<string, CertificationAlert[]> = {};

  let expired = 0, critical = 0, warning = 0, info = 0;

  for (const alert of alerts) {
    // Count by severity
    if (alert.severity === 'expired')  expired++;
    else if (alert.severity === 'critical') critical++;
    else if (alert.severity === 'warning')  warning++;
    else info++;

    // Group by user
    if (!byUser[alert.user_id]) byUser[alert.user_id] = [];
    byUser[alert.user_id].push(alert);

    // Group by course
    const courseKey = alert.course_name;
    if (!byCourse[courseKey]) byCourse[courseKey] = [];
    byCourse[courseKey].push(alert);
  }

  return {
    expired,
    critical,
    warning,
    info,
    total: alerts.length,
    byUser,
    byCourse,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Training compliance rate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate training compliance rate for an organisation.
 * Compliance = % of active workers who have no expired certifications.
 *
 * @param records   All training records for the org
 * @param users     All active users for the org
 * @returns         Compliance rate 0–100
 */
export function calcTrainingComplianceRate(
  records: TrainingRecord[],
  users: User[],
  asOfDate: Date = new Date(),
): number {
  const activeUsers = users.filter((u) => (u as any).is_active !== false);
  if (!activeUsers.length) return 100;

  const alerts = getExpiryAlerts(records, users, asOfDate);
  const usersWithExpiredOrCritical = new Set(
    alerts
      .filter((a) => a.severity === 'expired' || a.severity === 'critical')
      .map((a) => a.user_id),
  );

  const compliantUsers = activeUsers.filter((u) => !usersWithExpiredOrCritical.has(u.id));
  return Math.round((compliantUsers.length / activeUsers.length) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Days until expiry helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get days until expiry for a single training record.
 * Returns negative number if already expired.
 */
export function daysUntilExpiry(expiryDateStr: string, asOfDate: Date = new Date()): number {
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) return Infinity;
  return Math.ceil((expiry.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get a human-readable expiry label.
 * e.g. "Expires in 12 days", "Expired 3 days ago", "Valid for 6 months"
 */
export function expiryLabel(expiryDateStr: string | undefined, asOfDate: Date = new Date()): string {
  if (!expiryDateStr) return 'No expiry';

  const days = daysUntilExpiry(expiryDateStr, asOfDate);

  if (days === Infinity) return 'Invalid date';
  if (days < 0)  return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days < 7)  return `Expires in ${days} days`;
  if (days < 30) return `Expires in ${Math.round(days / 7)} week${Math.round(days / 7) !== 1 ? 's' : ''}`;
  if (days < 365) return `Expires in ${Math.round(days / 30)} month${Math.round(days / 30) !== 1 ? 's' : ''}`;
  return `Expires in ${Math.round(days / 365)} year${Math.round(days / 365) !== 1 ? 's' : ''}`;
}

/**
 * Get severity colour classes for use in UI components.
 */
export function alertSeverityStyles(severity: AlertSeverity): {
  bg: string; text: string; border: string; dot: string;
} {
  const styles: Record<AlertSeverity, { bg: string; text: string; border: string; dot: string }> = {
    expired:  { bg: 'bg-red-100 dark:bg-red-950',     text: 'text-red-700 dark:text-red-300',       border: 'border-red-300 dark:border-red-700',     dot: 'bg-red-500' },
    critical: { bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', dot: 'bg-orange-500' },
    warning:  { bg: 'bg-amber-100 dark:bg-amber-950',  text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-300 dark:border-amber-700',   dot: 'bg-amber-500' },
    info:     { bg: 'bg-blue-100 dark:bg-blue-950',    text: 'text-blue-700 dark:text-blue-300',     border: 'border-blue-300 dark:border-blue-700',     dot: 'bg-blue-500' },
  };
  return styles[severity];
}

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Scheduled Function template
// ─────────────────────────────────────────────────────────────────────────────
/*
  ADD THIS TO: functions/src/index.ts
  (after the geminiProxy export)

  This runs every day at 6am UTC, checks all training records across all orgs,
  and writes notification documents for users with expiring certifications.
  Those notifications are then picked up by the real-time listener in DataContext.

  ─────────────────────────────────────────────────────────────────────────────

  import { onSchedule } from 'firebase-functions/v2/scheduler';
  import { getFirestore, Timestamp } from 'firebase-admin/firestore';

  export const dailyCertificationAlertCheck = onSchedule(
    {
      schedule: '0 6 * * *',   // every day at 06:00 UTC
      timeZone: 'Asia/Riyadh', // adjust to your timezone
      region: 'us-central1',
    },
    async () => {
      const db = getFirestore();
      const now = new Date();

      // Fetch all training records expiring within 60 days
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      const recordsSnap = await db.collection('training_records')
        .where('expiry_date', '<=', sixtyDaysFromNow.toISOString())
        .where('expiry_date', '>=', now.toISOString())
        .get();

      const batch = db.batch();
      let count = 0;

      for (const doc of recordsSnap.docs) {
        const record = doc.data();
        const days = Math.ceil(
          (new Date(record.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        let severity: string;
        if (days <= 14) severity = 'critical';
        else if (days <= 30) severity = 'warning';
        else severity = 'info';

        // Create a notification for the user's manager (or the user themselves)
        const notifRef = db.collection('notifications').doc(
          `cert_alert_${record.user_id}_${record.id}_${now.toISOString().slice(0,10)}`
        );

        batch.set(notifRef, {
          org_id:    record.org_id,
          user_id:   record.user_id,
          type:      'certification_expiry',
          severity,
          title:     `Certification expiring: ${(record as any).course_name}`,
          message:   `${(record as any).course_name} expires in ${days} day${days !== 1 ? 's' : ''}.`,
          record_id: doc.id,
          read:      false,
          created_at: Timestamp.now(),
        }, { merge: true }); // merge: true prevents duplicate notifications

        count++;
      }

      await batch.commit();
      console.log(`[dailyCertificationAlertCheck] Created/updated ${count} notifications.`);
    }
  );

  ─────────────────────────────────────────────────────────────────────────────
  After adding, deploy with:
    firebase deploy --only functions
*/