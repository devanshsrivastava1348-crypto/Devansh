import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, SkipForward } from 'lucide-react';
import type { DoseLog, Medication } from '../types/medicine';
import { exportAdherenceCSV } from '../utils/icsExport';
import {
  addDays,
  buildDailyDoses,
  formatTimeDisplay,
  getLocalDateKey,
  parseDateKey,
} from '../utils/schedule';

interface HistoryViewProps {
  medications: Medication[];
  logs: DoseLog[];
  adherenceSummary: { rate: number; takenCount: number; totalCount: number; streak: number };
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  medications,
  logs,
  adherenceSummary,
}) => {
  const [medFilter, setMedFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'taken' | 'skipped'>('all');

  const medMap = useMemo(
    () => new Map(medications.map((m) => [m.id, m])),
    [medications]
  );

  const now = new Date();
  const todayKey = getLocalDateKey(now);

  // 14-day adherence grid (oldest to newest)
  const fourteenDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, idx) => {
      const dateKey = addDays(todayKey, idx - 13);
      const dayDoses = buildDailyDoses(medications, logs, dateKey, now);
      const relevant =
        dateKey === todayKey
          ? dayDoses.filter((d) => d.status !== 'upcoming')
          : dayDoses;
      const taken = relevant.filter((d) => d.status === 'taken').length;
      const total = relevant.length;
      const pct = total === 0 ? null : Math.round((taken / total) * 100);
      return { dateKey, taken, total, pct };
    });
  }, [medications, logs, todayKey]);

  const filteredLogs = useMemo(() => {
    return [...logs]
      .filter((log) => {
        if (log.status === 'snoozed') return false;
        if (medFilter !== 'all' && log.medicationId !== medFilter) return false;
        if (statusFilter !== 'all' && log.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => `${b.date} ${b.scheduledTime}`.localeCompare(`${a.date} ${a.scheduledTime}`));
  }, [logs, medFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111C1A] dark:text-[#EDF4F2]">
            Adherence History
          </h1>
          <p className="mt-1 text-sm text-[#52635F] dark:text-[#96ABA6]">
            14-day consistency overview and detailed dose log.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportAdherenceCSV(logs, medications)}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#131D1B] px-4 py-2 text-xs font-semibold text-[#111C1A] dark:text-[#EDF4F2] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Download Adherence CSV
        </button>
      </div>

      {/* Summary Metrics & 14-Day Grid */}
      <section className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EEF3F1] dark:border-[#1E2C29] pb-4">
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">7-Day Adherence</p>
              <p className="font-mono text-2xl font-bold text-[#111C1A] dark:text-[#EDF4F2]">
                {adherenceSummary.rate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">Doses Logged (7d)</p>
              <p className="font-mono text-2xl font-bold text-[#111C1A] dark:text-[#EDF4F2]">
                {adherenceSummary.takenCount}/{adherenceSummary.totalCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">Current Streak</p>
              <p className="font-mono text-2xl font-bold text-[#111C1A] dark:text-[#EDF4F2]">
                {adherenceSummary.streak} {adherenceSummary.streak === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-3">
            Last 14 Days
          </p>
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
            {fourteenDays.map((day) => {
              const d = parseDateKey(day.dateKey);
              const dayLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              let boxClass =
                'bg-[#EEF3F1] dark:bg-[#1A2825] text-[#52635F] dark:text-[#96ABA6] border-[#E2E8E5] dark:border-[#243532]';
              if (day.pct !== null) {
                if (day.pct === 100) {
                  boxClass =
                    'bg-[#0F766E] text-white border-[#0F766E] dark:bg-[#5EEAD4] dark:text-[#0B1211] dark:border-[#5EEAD4]';
                } else if (day.pct >= 50) {
                  boxClass =
                    'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4] dark:bg-[#134E4A] dark:text-[#99F6E4] dark:border-[#115E59]';
                } else {
                  boxClass =
                    'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FCD34D] dark:border-[#78350F]';
                }
              }

              return (
                <div
                  key={day.dateKey}
                  title={`${dayLabel}: ${day.taken}/${day.total} taken`}
                  className={`flex flex-col items-center justify-center rounded-lg border py-2 px-1 ${boxClass}`}
                >
                  <span className="text-[10px] font-medium">{d.getDate()}</span>
                  <span className="font-mono text-[11px] font-semibold mt-0.5">
                    {day.total === 0 ? '—' : `${day.taken}/${day.total}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Filters & Log Table */}
      <section className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#E2E8E5] dark:border-[#1E2C29] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={medFilter}
              onChange={(e) => setMedFilter(e.target.value)}
              aria-label="Filter by medication"
              className="min-h-[38px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-[#F7F9F8] dark:bg-[#0B1211] px-3 py-1.5 text-xs font-medium text-[#111C1A] dark:text-[#EDF4F2] focus:border-[#0F766E] focus:outline-none"
            >
              <option value="all">All Medications</option>
              {medications.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1211] p-1 border border-[#E2E8E5] dark:border-[#243532]">
              {(['all', 'taken', 'skipped'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white dark:bg-[#1E2C29] text-[#111C1A] dark:text-[#EDF4F2] shadow-xs'
                      : 'text-[#52635F] dark:text-[#96ABA6]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <span className="font-mono text-xs text-[#52635F] dark:text-[#96ABA6]">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#52635F] dark:text-[#96ABA6]">
            No dose logs match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E2E8E5] dark:border-[#1E2C29] bg-[#F7F9F8] dark:bg-[#0B1211] text-xs font-semibold text-[#52635F] dark:text-[#96ABA6]">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Scheduled</th>
                  <th className="px-5 py-3">Medication</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF3F1] dark:divide-[#1E2C29]">
                {filteredLogs.slice(0, 50).map((log) => {
                  const med = medMap.get(log.medicationId);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#F7F9F8]/70 dark:hover:bg-[#1A2825]/50 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-[#42524E] dark:text-[#B4C5C0] whitespace-nowrap">
                        {log.date}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-[#111C1A] dark:text-[#EDF4F2] whitespace-nowrap">
                        {formatTimeDisplay(log.scheduledTime)}
                      </td>
                      <td className="px-5 py-3 font-medium text-[#111C1A] dark:text-[#EDF4F2]">
                        {med ? `${med.name} · ${med.dosage}` : 'Removed Medication'}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {log.status === 'taken' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] dark:text-[#4ADE80]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Taken
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52635F] dark:text-[#96ABA6]">
                            <SkipForward className="h-3.5 w-3.5" />
                            Skipped
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-[#52635F] dark:text-[#96ABA6] whitespace-nowrap">
                        {new Date(log.loggedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
