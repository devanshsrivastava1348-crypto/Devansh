import React from 'react';
import { BellRing, Check, Clock, PackageCheck, X } from 'lucide-react';
import type { ActiveAlert } from '../types/medicine';
import { formatTimeDisplay, getRefillProjection, MEAL_TIMING_LABELS } from '../utils/schedule';

interface DueAlertBannerProps {
  alerts: ActiveAlert[];
  snoozeMinutes: number;
  onTakeDose: (alert: ActiveAlert) => void;
  onSnoozeDose: (alert: ActiveAlert) => void;
  onSkipDose: (alert: ActiveAlert) => void;
  onRefillNow: (alert: ActiveAlert) => void;
  onDismiss: (alertId: string) => void;
}

export const DueAlertBanner: React.FC<DueAlertBannerProps> = ({
  alerts,
  snoozeMinutes,
  onTakeDose,
  onSnoozeDose,
  onSkipDose,
  onRefillNow,
  onDismiss,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Active medication alerts"
      className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-4 space-y-3"
    >
      {alerts.map((alert) => {
        const isRefill = alert.kind === 'refill';
        const projection = getRefillProjection(alert.medication);

        return (
          <div
            key={alert.id}
            className="rounded-xl border border-[#0F766E]/30 dark:border-[#5EEAD4]/30 bg-white dark:bg-[#131D1B] p-4 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isRefill
                      ? 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#451A03] dark:text-[#FCD34D]'
                      : 'bg-[#0F766E]/10 text-[#0F766E] dark:bg-[#5EEAD4]/15 dark:text-[#5EEAD4]'
                  }`}
                >
                  {isRefill ? (
                    <PackageCheck className="h-5 w-5" />
                  ) : (
                    <BellRing className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#52635F] dark:text-[#96ABA6]">
                    {isRefill ? 'Refill Reminder' : 'Dose Reminder'}
                    {alert.isTest ? ' · Test Alert' : ''}
                    {!isRefill && ` · Scheduled ${formatTimeDisplay(alert.scheduledTime)}`}
                  </p>
                  <h2 className="font-display text-base font-semibold text-[#111C1A] dark:text-[#EDF4F2] truncate">
                    {alert.medication.name} — {alert.medication.dosage}
                  </h2>
                  <p className="mt-0.5 text-sm text-[#42524E] dark:text-[#B4C5C0]">
                    {isRefill
                      ? alert.message ||
                        `${alert.medication.remainingCount} left (~${projection.daysRemaining} days remaining). Time to reorder.`
                      : `${MEAL_TIMING_LABELS[alert.medication.mealTiming]} · ${alert.medication.remainingCount} remaining`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isRefill ? (
                  <button
                    type="button"
                    onClick={() => onRefillNow(alert)}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D655E] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <PackageCheck className="h-4 w-4" />
                    Mark Refilled ({alert.medication.initialQuantity})
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onTakeDose(alert)}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D655E] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      Mark Taken
                    </button>
                    <button
                      type="button"
                      onClick={() => onSnoozeDose(alert)}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#131D1B] px-3.5 py-2 text-xs font-medium text-[#111C1A] dark:text-[#EDF4F2] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Snooze {snoozeMinutes}m
                    </button>
                    <button
                      type="button"
                      onClick={() => onSkipDose(alert)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-[#52635F] hover:text-[#111C1A] hover:bg-[#EEF3F1] dark:text-[#96ABA6] dark:hover:text-[#EDF4F2] dark:hover:bg-[#1A2825] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Skip
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onDismiss(alert.id)}
                  aria-label="Dismiss alert"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#52635F] hover:bg-[#EEF3F1] dark:text-[#96ABA6] dark:hover:bg-[#1A2825] transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
