import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Edit3,
  PackageCheck,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { Medication, TimeWindow } from '../types/medicine';
import { downloadICSFile, generateRegimenICS } from '../utils/icsExport';
import {
  FORM_LABELS,
  formatTimeDisplay,
  getRefillProjection,
  getTimeWindow,
  MEAL_TIMING_LABELS,
  WEEKDAY_SHORT,
} from '../utils/schedule';

interface MedicationsViewProps {
  medications: Medication[];
  leadMinutes: number;
  onOpenAddModal: () => void;
  onEditMedication: (med: Medication) => void;
  onToggleActive: (medId: string) => void;
  onDeleteMedication: (medId: string) => void;
  onRefillMedication: (medId: string) => void;
}

type FilterOption = 'All' | TimeWindow;

export const MedicationsView: React.FC<MedicationsViewProps> = ({
  medications,
  leadMinutes,
  onOpenAddModal,
  onEditMedication,
  onToggleActive,
  onDeleteMedication,
  onRefillMedication,
}) => {
  const [search, setSearch] = useState('');
  const [windowFilter, setWindowFilter] = useState<FilterOption>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return medications.filter((med) => {
      const matchesSearch =
        med.name.toLowerCase().includes(search.toLowerCase()) ||
        med.dosage.toLowerCase().includes(search.toLowerCase());
      const matchesWindow =
        windowFilter === 'All' || med.times.some((t) => getTimeWindow(t) === windowFilter);
      return matchesSearch && matchesWindow;
    });
  }, [medications, search, windowFilter]);

  const handleExportSingleICS = (med: Medication) => {
    const ics = generateRegimenICS([med], leadMinutes);
    const slug = med.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadICSFile(`dosewell-${slug}.ics`, ics);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111C1A] dark:text-[#EDF4F2]">
            Medications & Supply
          </h1>
          <p className="mt-1 text-sm text-[#52635F] dark:text-[#96ABA6]">
            Manage daily schedules, typical supply durations, and refill alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0D655E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Medication
        </button>
      </div>

      {/* Search and Window Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52635F] dark:text-[#96ABA6]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines..."
            aria-label="Search medicines"
            className="w-full min-h-[42px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#131D1B] pl-9 pr-3 py-2 text-sm text-[#111C1A] dark:text-[#EDF4F2] placeholder:text-[#869691] focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#EEF3F1] dark:bg-[#131D1B] p-1 border border-[#E2E8E5] dark:border-[#1E2C29]">
          {(['All', 'Morning', 'Afternoon', 'Evening', 'Bedtime'] as FilterOption[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setWindowFilter(opt)}
              className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                windowFilter === opt
                  ? 'bg-white dark:bg-[#1E2C29] text-[#111C1A] dark:text-[#EDF4F2] shadow-xs'
                  : 'text-[#52635F] dark:text-[#96ABA6] hover:text-[#111C1A] dark:hover:text-[#EDF4F2]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Medication List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-10 text-center">
          <p className="font-display text-base font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
            {medications.length === 0 ? 'No medications added yet' : 'No matching medications'}
          </p>
          <p className="mt-1 text-sm text-[#52635F] dark:text-[#96ABA6]">
            {medications.length === 0
              ? 'Add your first medicine to schedule daily notifications and refill reminders.'
              : 'Try adjusting your search or time-of-day filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((med) => {
            const proj = getRefillProjection(med);
            const daysLabel =
              med.daysOfWeek.length === 7
                ? 'Every day'
                : med.daysOfWeek.map((d) => WEEKDAY_SHORT[d]).join(', ');

            return (
              <article
                key={med.id}
                className={`rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-5 flex flex-col justify-between gap-4 ${
                  !med.active ? 'opacity-65' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: med.colorHex }}
                      />
                      <div className="min-w-0">
                        <h2 className="font-display text-base font-semibold text-[#111C1A] dark:text-[#EDF4F2] truncate">
                          {med.name}
                          {!med.active && ' (Paused)'}
                        </h2>
                        <p className="mt-0.5 text-xs text-[#52635F] dark:text-[#96ABA6]">
                          {med.dosage} · {FORM_LABELS[med.form]} · {MEAL_TIMING_LABELS[med.mealTiming]}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditMedication(med)}
                      aria-label={`Edit ${med.name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#52635F] hover:bg-[#EEF3F1] hover:text-[#111C1A] dark:text-[#96ABA6] dark:hover:bg-[#1A2825] dark:hover:text-[#EDF4F2] cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Schedule Metadata */}
                  <div className="text-xs text-[#42524E] dark:text-[#B4C5C0] space-y-1">
                    <p>
                      <span className="text-[#52635F] dark:text-[#96ABA6]">Times: </span>
                      <span className="font-mono font-medium text-[#111C1A] dark:text-[#EDF4F2]">
                        {med.times.map(formatTimeDisplay).join(' · ')}
                      </span>
                    </p>
                    <p>
                      <span className="text-[#52635F] dark:text-[#96ABA6]">Frequency: </span>
                      <span>{daysLabel}</span>
                    </p>
                    {med.notes && (
                      <p className="text-[#52635F] dark:text-[#96ABA6] truncate">{med.notes}</p>
                    )}
                  </div>

                  {/* Quantity & Refill Tracker */}
                  <div className="rounded-xl bg-[#F7F9F8] dark:bg-[#0B1211] border border-[#E2E8E5] dark:border-[#1E2C29] p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                        Supply: <span className="font-mono">{med.remainingCount}/{med.initialQuantity}</span>
                      </span>
                      <span
                        className={`font-mono font-medium ${
                          proj.needsRefill
                            ? 'text-[#B45309] dark:text-[#FBBF24]'
                            : 'text-[#52635F] dark:text-[#96ABA6]'
                        }`}
                      >
                        ~{proj.daysRemaining} days left
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8E5] dark:bg-[#1E2C29]">
                      <div
                        className={`h-full rounded-full ${
                          proj.needsRefill
                            ? 'bg-[#D97706] dark:bg-[#FBBF24]'
                            : 'bg-[#0F766E] dark:bg-[#5EEAD4]'
                        }`}
                        style={{ width: `${proj.percentRemaining}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#52635F] dark:text-[#96ABA6]">
                      <span>
                        Lasts {med.typicalSupplyDays}d ·{' '}
                        {med.refillReminderEnabled
                          ? `Alert ${med.refillNotifyDaysBefore}d before empty`
                          : 'Refill alerts off'}
                      </span>
                      <span>Refill by {proj.refillDueDateKey}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF3F1] dark:border-[#1E2C29] pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRefillMedication(med.id)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#D4DDD9] dark:border-[#243532] px-2.5 py-1.5 text-xs font-medium text-[#111C1A] dark:text-[#EDF4F2] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors cursor-pointer"
                    >
                      <PackageCheck className="h-3.5 w-3.5 text-[#0F766E] dark:text-[#5EEAD4]" />
                      Refill ({med.initialQuantity})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportSingleICS(med)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#D4DDD9] dark:border-[#243532] px-2.5 py-1.5 text-xs font-medium text-[#42524E] dark:text-[#B4C5C0] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors cursor-pointer"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      .ics
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleActive(med.id)}
                      aria-label={med.active ? `Pause ${med.name}` : `Resume ${med.name}`}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#52635F] hover:bg-[#EEF3F1] hover:text-[#111C1A] dark:text-[#96ABA6] dark:hover:bg-[#1A2825] dark:hover:text-[#EDF4F2] cursor-pointer"
                    >
                      {med.active ? (
                        <>
                          <PauseCircle className="h-3.5 w-3.5" />
                          Pause
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-3.5 w-3.5" />
                          Resume
                        </>
                      )}
                    </button>

                    {confirmDeleteId === med.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteMedication(med.id);
                          setConfirmDeleteId(null);
                        }}
                        className="min-h-[36px] rounded-lg bg-[#BE123C] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9F1239] cursor-pointer"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(med.id)}
                        aria-label={`Delete ${med.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#52635F] hover:bg-[#FFF1F2] hover:text-[#BE123C] dark:text-[#96ABA6] dark:hover:bg-[#4C0519]/40 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
