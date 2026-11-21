import type {
  DailyDoseItem,
  DoseLog,
  DoseStatus,
  MealTiming,
  Medication,
  TimeWindow,
} from '../types/medicine';

export const MEAL_TIMING_LABELS: Record<MealTiming, string> = {
  before_meal: 'Before meal',
  with_food: 'With food',
  after_meal: 'After meal',
  before_sleep: 'Before sleep',
  anytime: 'Anytime',
};

export const FORM_LABELS: Record<Medication['form'], string> = {
  tablet: 'Tablet',
  capsule: 'Capsule',
  liquid: 'Liquid',
  drops: 'Drops',
  injection: 'Injection',
  inhaler: 'Inhaler',
};

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateKey: string, delta: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + delta);
  return getLocalDateKey(d);
}

export function getCurrentHHMM(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHHMM(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTimeDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function getTimeWindow(hhmm: string): TimeWindow {
  const hour = Number(hhmm.split(':')[0]);
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Bedtime';
}

export function makeDoseKey(medicationId: string, date: string, scheduledTime: string): string {
  return `${medicationId}__${date}__${scheduledTime}`;
}

export function buildDailyDoses(
  medications: Medication[],
  logs: DoseLog[],
  dateKey: string,
  now: Date = new Date()
): DailyDoseItem[] {
  const targetDate = parseDateKey(dateKey);
  const weekday = targetDate.getDay();
  const todayKey = getLocalDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const logMap = new Map<string, DoseLog>();
  for (const log of logs) {
    if (log.date === dateKey) {
      logMap.set(makeDoseKey(log.medicationId, log.date, log.scheduledTime), log);
    }
  }

  const items: DailyDoseItem[] = [];

  for (const med of medications) {
    if (!med.active) continue;
    if (!med.daysOfWeek.includes(weekday)) continue;

    for (const scheduledTime of med.times) {
      const key = makeDoseKey(med.id, dateKey, scheduledTime);
      const log = logMap.get(key);
      const effectiveTime =
        log?.status === 'snoozed' && log.snoozedUntil ? log.snoozedUntil : scheduledTime;

      let status: DoseStatus = 'upcoming';

      if (log?.status === 'taken') {
        status = 'taken';
      } else if (log?.status === 'skipped') {
        status = 'skipped';
      } else if (log?.status === 'snoozed') {
        const snoozeMins = hhmmToMinutes(effectiveTime);
        if (dateKey === todayKey && nowMinutes >= snoozeMins) {
          status = 'due';
        } else {
          status = 'snoozed';
        }
      } else {
        if (dateKey < todayKey) {
          status = 'missed';
        } else if (dateKey > todayKey) {
          status = 'upcoming';
        } else {
          const schedMins = hhmmToMinutes(scheduledTime);
          if (nowMinutes >= schedMins && nowMinutes <= schedMins + 120) {
            status = 'due';
          } else if (nowMinutes > schedMins + 120) {
            status = 'missed';
          } else {
            status = 'upcoming';
          }
        }
      }

      items.push({
        key,
        medication: med,
        date: dateKey,
        scheduledTime,
        effectiveTime,
        window: getTimeWindow(effectiveTime),
        status,
        log,
      });
    }
  }

  return items.sort((a, b) => {
    const timeDiff = hhmmToMinutes(a.effectiveTime) - hhmmToMinutes(b.effectiveTime);
    if (timeDiff !== 0) return timeDiff;
    return a.medication.name.localeCompare(b.medication.name);
  });
}

export function formatCountdownToDose(
  dose: DailyDoseItem | null,
  now: Date = new Date()
): string {
  if (!dose) return 'All doses completed';
  const [h, m] = dose.effectiveTime.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  const diffSec = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  if (diffSec === 0) return 'Due now';
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function calculateAdherenceSummary(
  medications: Medication[],
  logs: DoseLog[],
  days: number = 7,
  now: Date = new Date()
): { rate: number; takenCount: number; totalCount: number; streak: number } {
  const todayKey = getLocalDateKey(now);
  let takenCount = 0;
  let totalCount = 0;

  for (let i = 0; i < days; i++) {
    const dateKey = addDays(todayKey, -i);
    const dayDoses = buildDailyDoses(medications, logs, dateKey, now);
    for (const d of dayDoses) {
      if (i === 0 && d.status === 'upcoming') continue;
      totalCount++;
      if (d.status === 'taken') takenCount++;
    }
  }

  const rate = totalCount === 0 ? 100 : Math.round((takenCount / totalCount) * 100);

  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const dateKey = addDays(todayKey, -i);
    const dayDoses = buildDailyDoses(medications, logs, dateKey, now);
    if (dayDoses.length === 0) continue;
    if (i === 0) {
      const dueOrPast = dayDoses.filter((d) => d.status !== 'upcoming');
      if (dueOrPast.length > 0 && dueOrPast.every((d) => d.status === 'taken')) {
        streak++;
        continue;
      } else if (dueOrPast.some((d) => d.status === 'missed' || d.status === 'skipped')) {
        break;
      }
      continue;
    }
    const allTaken = dayDoses.every((d) => d.status === 'taken');
    if (allTaken) {
      streak++;
    } else {
      break;
    }
  }

  return { rate, takenCount, totalCount, streak };
}

export interface RefillProjection {
  daysRemaining: number;
  percentRemaining: number;
  dailyUsageRate: number;
  refillDueDateKey: string;
  runOutDateKey: string;
  needsRefill: boolean;
  isOut: boolean;
}

export function getRefillProjection(
  med: Medication,
  now: Date = new Date()
): RefillProjection {
  const todayKey = getLocalDateKey(now);
  const safeInitial = Math.max(1, med.initialQuantity || 1);
  const safeSupplyDays = Math.max(1, med.typicalSupplyDays || 30);
  const remaining = Math.max(0, med.remainingCount);

  const dailyUsageRate = Number((safeInitial / safeSupplyDays).toFixed(2));
  const daysRemaining = Math.max(
    0,
    Math.round((remaining / safeInitial) * safeSupplyDays)
  );
  const percentRemaining = Math.min(100, Math.round((remaining / safeInitial) * 100));
  const runOutDateKey = addDays(todayKey, daysRemaining);
  const notifyLead = Math.max(0, med.refillNotifyDaysBefore ?? 5);
  const daysUntilReminder = Math.max(0, daysRemaining - notifyLead);
  const refillDueDateKey = addDays(todayKey, daysUntilReminder);

  const isOut = remaining <= 0;
  const needsRefill =
    med.active &&
    med.refillReminderEnabled &&
    (isOut || daysRemaining <= notifyLead);

  return {
    daysRemaining,
    percentRemaining,
    dailyUsageRate,
    refillDueDateKey,
    runOutDateKey,
    needsRefill,
    isOut,
  };
}
