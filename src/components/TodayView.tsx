import React from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  PackageCheck,
  Plus,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  DailyDoseItem,
  DoseStatus,
  Medication,
  NotificationSettings,
  TimeWindow,
} from '../types/medicine';
import type { NotificationPermissionState } from '../utils/notifications';
import {
  addDays,
  formatCountdownToDose,
  formatTimeDisplay,
  getLocalDateKey,
  getRefillProjection,
  MEAL_TIMING_LABELS,
  parseDateKey,
  WEEKDAY_SHORT,
} from '../utils/schedule';
import { PWAInstallButton } from './PWAInstallButton';

interface TodayViewProps {
  medications: Medication[];
  doses: DailyDoseItem[];
  selectedDate: string;
  now: Date;
  adherenceSummary: { rate: number; takenCount: number; totalCount: number; streak: number };
  settings: NotificationSettings;
  permissionState: NotificationPermissionState;
  onSelectDate: (dateKey: string) => void;
  onMarkTaken: (dose: DailyDoseItem) => void;
  onSnoozeDose: (dose: DailyDoseItem) => void;
  onSkipDose: (dose: DailyDoseItem) => void;
  onUndoDose: (dose: DailyDoseItem) => void;
  onRefillMedication: (medId: string) => void;
  onEditMedication: (med: Medication) => void;
  onOpenAddModal: () => void;
  onRequestPermission: () => void;
  onTestDoseNotification: () => void;
  onTestRefillNotification: () => void;
  onUpdateSettings: (patch: Partial<NotificationSettings>) => void;
}

const TIME_WINDOWS: TimeWindow[] = ['Morning', 'Afternoon', 'Evening', 'Bedtime'];

function renderStatusLabel(dose: DailyDoseItem) {
  const map: Record<
    DoseStatus,
    { label: string; textClass: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    taken: {
      label: dose.log?.loggedAt
        ? `Taken at ${new Date(dose.log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Taken',
      textClass: 'text-[#15803D] dark:text-[#4ADE80]',
      Icon: CheckCircle2,
    },
    due: {
      label: 'Due now',
      textClass: 'text-[#B45309] dark:text-[#FBBF24]',
      Icon: BellRing,
    },
    snoozed: {
      label: `Snoozed until ${formatTimeDisplay(dose.effectiveTime)}`,
      textClass: 'text-[#B45309] dark:text-[#FBBF24]',
      Icon: Clock,
    },
    missed: {
      label: 'Missed',
      textClass: 'text-[#BE123C] dark:text-[#FDA4AF]',
      Icon: AlertTriangle,
    },
    skipped: {
      label: 'Skipped',
      textClass: 'text-[#52635F] dark:text-[#96ABA6]',
      Icon: SkipForward,
    },
    upcoming: {
      label: 'Scheduled',
      textClass: 'text-[#52635F] dark:text-[#96ABA6]',
      Icon: Clock,
    },
  };

  const info = map[dose.status];
  const Icon = info.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${info.textClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{info.label}</span>
    </span>
  );
}

export const TodayView: React.FC<TodayViewProps> = ({
  medications,
  doses,
  selectedDate,
  now,
  adherenceSummary,
  settings,
  permissionState,
  onSelectDate,
  onMarkTaken,
  onSnoozeDose,
  onSkipDose,
  onUndoDose,
  onRefillMedication,
  onEditMedication,
  onOpenAddModal,
  onRequestPermission,
  onTestDoseNotification,
  onTestRefillNotification,
  onUpdateSettings,
}) => {
  const todayKey = getLocalDateKey(now);
  const isToday = selectedDate === todayKey;

  const takenToday = doses.filter((d) => d.status === 'taken').length;
  const totalToday = doses.length;
  const progressPct = totalToday === 0 ? 0 : Math.round((takenToday / totalToday) * 100);

  const nextDose = isToday
    ? doses.find((d) => d.status === 'due' || d.status === 'upcoming' || d.status === 'snoozed') ||
      null
    : null;

  const countdownText = isToday ? formatCountdownToDose(nextDose, now) : '';

  // 7-day selector centered slightly around today (-3 to +3)
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(todayKey, i - 3));

  // Refill watchlist: active meds sorted by urgency (needsRefill first, then lowest daysRemaining)
  const refillItems = medications
    .filter((m) => m.active)
    .map((m) => ({ med: m, proj: getRefillProjection(m, now) }))
    .sort((a, b) => {
      if (a.proj.needsRefill !== b.proj.needsRefill) return a.proj.needsRefill ? -1 : 1;
      return a.proj.daysRemaining - b.proj.daysRemaining;
    });

  const selectedDateObj = parseDateKey(selectedDate);
  const dateHeading = selectedDateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Top Hero Summary Strip */}
      <section className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-medium text-[#52635F] dark:text-[#96ABA6]">
              {isToday ? 'Today' : 'Schedule View'} · {dateHeading}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#111C1A] dark:text-[#EDF4F2] [text-wrap:balance]">
              {isToday
                ? nextDose
                  ? nextDose.status === 'due'
                    ? `${nextDose.medication.name} is due now`
                    : `Next dose: ${nextDose.medication.name} at ${formatTimeDisplay(nextDose.effectiveTime)}`
                  : totalToday > 0
                    ? 'All doses for today are logged'
                    : 'No doses scheduled today'
                : `${totalToday} ${totalToday === 1 ? 'dose' : 'doses'} scheduled`}
            </h1>

            {isToday && nextDose && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm text-[#42524E] dark:text-[#B4C5C0]">
                <span className="font-mono font-medium text-[#0F766E] dark:text-[#5EEAD4]">
                  {nextDose.status === 'due' ? 'Due now' : `In ${countdownText}`}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {nextDose.medication.dosage} · {MEAL_TIMING_LABELS[nextDose.medication.mealTiming]}
                </span>
              </div>
            )}

            {permissionState !== 'granted' && permissionState !== 'unsupported' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onRequestPermission}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#0F766E]/30 bg-[#0F766E]/8 px-3.5 py-2 text-xs font-semibold text-[#0F766E] hover:bg-[#0F766E]/15 dark:border-[#5EEAD4]/30 dark:bg-[#5EEAD4]/10 dark:text-[#5EEAD4] transition-colors cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  <span>
                    {permissionState === 'denied'
                      ? 'Notifications blocked in browser settings'
                      : 'Enable Daily Browser Notifications'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Compact Progress & Adherence Metrics */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E2E8E5] dark:border-[#1E2C29]">
            <div className="flex items-center gap-3.5">
              <div className="relative h-16 w-16 shrink-0">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                  <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-[#EEF3F1] dark:text-[#1E2C29]"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="text-[#0F766E] dark:text-[#5EEAD4] transition-all duration-300"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                  {progressPct}%
                </span>
              </div>
              <div>
                <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">Day Progress</p>
                <p className="font-mono text-lg font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                  {takenToday}/{totalToday}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">Streak</p>
              <p className="font-mono text-lg font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                {adherenceSummary.streak} {adherenceSummary.streak === 1 ? 'day' : 'days'}
              </p>
            </div>

            <div>
              <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">7-Day Rate</p>
              <p className="font-mono text-lg font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                {adherenceSummary.rate}%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Horizontal 7-Day Date Selector */}
      <div
        role="tablist"
        aria-label="Select schedule day"
        className="grid grid-cols-7 gap-1.5 sm:gap-2.5"
      >
        {weekDates.map((dateKey) => {
          const d = parseDateKey(dateKey);
          const isSelected = dateKey === selectedDate;
          const isCurrentDay = dateKey === todayKey;
          return (
            <button
              key={dateKey}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectDate(dateKey)}
              className={`flex min-h-[54px] flex-col items-center justify-center rounded-xl border px-2 py-2 transition-colors cursor-pointer ${
                isSelected
                  ? 'border-[#0F766E] bg-[#0F766E] text-white dark:border-[#5EEAD4] dark:bg-[#5EEAD4] dark:text-[#0B1211]'
                  : 'border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] text-[#42524E] dark:text-[#B4C5C0] hover:border-[#0F766E]/40'
              }`}
            >
              <span
                className={`text-[11px] font-medium ${
                  isSelected
                    ? 'text-white/90 dark:text-[#0B1211]/80'
                    : 'text-[#52635F] dark:text-[#96ABA6]'
                }`}
              >
                {isCurrentDay ? 'Today' : WEEKDAY_SHORT[d.getDay()]}
              </span>
              <span className="font-mono text-sm font-semibold mt-0.5">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left 8 Columns: Daily Timeline */}
        <div className="lg:col-span-8 space-y-5">
          {doses.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-8 text-center">
              <p className="font-display text-base font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                No medications scheduled for this day
              </p>
              <p className="mt-1 text-sm text-[#52635F] dark:text-[#96ABA6]">
                Add a medication to start daily notifications and refill reminders.
              </p>
              <button
                type="button"
                onClick={onOpenAddModal}
                className="mt-4 inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0D655E] transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Medication
              </button>
            </div>
          ) : (
            TIME_WINDOWS.map((win) => {
              const groupDoses = doses.filter((d) => d.window === win);
              if (groupDoses.length === 0) return null;

              return (
                <section
                  key={win}
                  className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-[#E2E8E5] dark:border-[#1E2C29] px-5 py-3.5">
                    <h2 className="font-display text-sm font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                      {win}
                    </h2>
                    <span className="font-mono text-xs text-[#52635F] dark:text-[#96ABA6]">
                      {groupDoses.filter((d) => d.status === 'taken').length}/{groupDoses.length} taken
                    </span>
                  </div>

                  <ul className="divide-y divide-[#EEF3F1] dark:divide-[#1E2C29]">
                    {groupDoses.map((dose) => {
                      const proj = getRefillProjection(dose.medication, now);
                      const isDone = dose.status === 'taken' || dose.status === 'skipped';

                      return (
                        <li
                          key={dose.key}
                          className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                            isDone ? 'opacity-75' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <span
                              aria-hidden="true"
                              className="mt-1.5 h-3 w-3 shrink-0 rounded-sm"
                              style={{ backgroundColor: dose.medication.colorHex }}
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                                <span className="font-mono text-sm font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                                  {formatTimeDisplay(dose.effectiveTime)}
                                </span>
                                <span className="font-display text-base font-semibold text-[#111C1A] dark:text-[#EDF4F2] truncate">
                                  {dose.medication.name}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-[#52635F] dark:text-[#96ABA6]">
                                {dose.medication.dosage} ·{' '}
                                {MEAL_TIMING_LABELS[dose.medication.mealTiming]} ·{' '}
                                <span
                                  className={
                                    proj.needsRefill
                                      ? 'font-medium text-[#B45309] dark:text-[#FBBF24]'
                                      : ''
                                  }
                                >
                                  {dose.medication.remainingCount} left (~{proj.daysRemaining}d)
                                </span>
                              </p>
                              <div className="mt-1.5">{renderStatusLabel(dose)}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
                            {isDone ? (
                              <button
                                type="button"
                                onClick={() => onUndoDose(dose)}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D4DDD9] dark:border-[#243532] px-3 py-1.5 text-xs font-medium text-[#42524E] dark:text-[#B4C5C0] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Undo
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onMarkTaken(dose)}
                                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0D655E] active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Mark Taken
                                </button>
                                {isToday && (
                                  <button
                                    type="button"
                                    onClick={() => onSnoozeDose(dose)}
                                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D4DDD9] dark:border-[#243532] px-3 py-2 text-xs font-medium text-[#111C1A] dark:text-[#EDF4F2] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors whitespace-nowrap cursor-pointer"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                    Snooze {settings.snoozeMinutes}m
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onSkipDose(dose)}
                                  className="inline-flex min-h-[40px] items-center rounded-lg px-2.5 py-2 text-xs font-medium text-[#52635F] hover:bg-[#EEF3F1] hover:text-[#111C1A] dark:text-[#96ABA6] dark:hover:bg-[#1A2825] dark:hover:text-[#EDF4F2] transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  Skip
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>

        {/* Right 4 Columns: Reminder Controls & Refill Watchlist */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Notification & Chime Controls */}
          <section className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                  Reminder Alerts
                </h2>
                <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">
                  Browser:{' '}
                  {permissionState === 'granted'
                    ? settings.browserNotificationsEnabled
                      ? 'Active'
                      : 'Paused'
                    : permissionState === 'denied'
                      ? 'Blocked'
                      : permissionState === 'unsupported'
                        ? 'In-app only'
                        : 'Not enabled'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                aria-label={settings.soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D4DDD9] dark:border-[#243532] text-[#42524E] dark:text-[#B4C5C0] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors cursor-pointer"
              >
                {settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-[#0F766E] dark:text-[#5EEAD4]" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onTestDoseNotification}
                className="min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-[#F7F9F8] dark:bg-[#0B1211] px-3 py-2 text-xs font-semibold text-[#111C1A] dark:text-[#EDF4F2] hover:border-[#0F766E] dark:hover:border-[#5EEAD4] transition-colors cursor-pointer"
              >
                Test Dose Alert
              </button>
              <button
                type="button"
                onClick={onTestRefillNotification}
                className="min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-[#F7F9F8] dark:bg-[#0B1211] px-3 py-2 text-xs font-semibold text-[#111C1A] dark:text-[#EDF4F2] hover:border-[#0F766E] dark:hover:border-[#5EEAD4] transition-colors cursor-pointer"
              >
                Test Refill Alert
              </button>
            </div>
          </section>

          {/* Refill Watchlist */}
          <section className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                Supply & Refill Watchlist
              </h2>
              <span className="font-mono text-xs text-[#52635F] dark:text-[#96ABA6]">
                {refillItems.filter((r) => r.proj.needsRefill).length} due
              </span>
            </div>

            {refillItems.length === 0 ? (
              <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">
                Add medications to monitor supply counts and refill dates.
              </p>
            ) : (
              <ul className="space-y-3.5">
                {refillItems.slice(0, 4).map(({ med, proj }) => (
                  <li
                    key={med.id}
                    className="space-y-2 pb-3.5 border-b last:border-b-0 last:pb-0 border-[#EEF3F1] dark:border-[#1E2C29]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onEditMedication(med)}
                          className="text-left text-sm font-semibold text-[#111C1A] dark:text-[#EDF4F2] hover:text-[#0F766E] dark:hover:text-[#5EEAD4] truncate block cursor-pointer"
                        >
                          {med.name}
                        </button>
                        <p className="text-xs text-[#52635F] dark:text-[#96ABA6] font-mono">
                          {med.remainingCount}/{med.initialQuantity} units · ~{proj.daysRemaining}d left
                        </p>
                      </div>

                      {proj.needsRefill ? (
                        <button
                          type="button"
                          onClick={() => onRefillMedication(med.id)}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-[#FEF3C7] dark:bg-[#451A03] px-2.5 py-1 text-xs font-semibold text-[#B45309] dark:text-[#FCD34D] hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Refill
                        </button>
                      ) : (
                        <span className="text-xs text-[#52635F] dark:text-[#96ABA6] shrink-0">
                          OK
                        </span>
                      )}
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEF3F1] dark:bg-[#1E2C29]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          proj.needsRefill
                            ? 'bg-[#D97706] dark:bg-[#FBBF24]'
                            : 'bg-[#0F766E] dark:bg-[#5EEAD4]'
                        }`}
                        style={{ width: `${proj.percentRemaining}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <PWAInstallButton variant="card" />
        </aside>
      </div>
    </div>
  );
};
