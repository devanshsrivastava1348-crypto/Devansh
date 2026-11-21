import type { DoseLog, MealTiming, Medication } from '../types/medicine';

const MEAL_LABELS: Record<MealTiming, string> = {
  before_meal: 'Take before meal',
  with_food: 'Take with food',
  after_meal: 'Take after meal',
  before_sleep: 'Take before sleep',
  anytime: 'Take anytime',
};

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatICSDateTime(date: Date, hhmm: string): string {
  const [hh, mm] = hhmm.split(':').map(Number);
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(hh)}${pad2(mm)}00`;
}

function formatICSStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T` +
    `${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  );
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateRegimenICS(
  medications: Medication[],
  leadMinutes: number = 0
): string {
  const now = new Date();
  const stamp = formatICSStamp(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dosewell//Daily Medicine Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Dosewell Medicine Reminders',
  ];

  const trigger = leadMinutes > 0 ? `-PT${leadMinutes}M` : 'PT0M';

  for (const med of medications) {
    if (!med.active) continue;
    const byDay =
      med.daysOfWeek.length === 7
        ? 'FREQ=DAILY'
        : `FREQ=WEEKLY;BYDAY=${med.daysOfWeek.map((d) => ICS_DAYS[d]).join(',')}`;

    for (const time of med.times) {
      const dtStart = formatICSDateTime(now, time);
      const summary = `${med.name} (${med.dosage})`;
      const descParts = [MEAL_LABELS[med.mealTiming]];
      if (med.notes) descParts.push(med.notes);

      lines.push(
        'BEGIN:VEVENT',
        `UID:${med.id}-${time.replace(':', '')}@dosewell.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${dtStart}`,
        'DURATION:PT10M',
        `RRULE:${byDay}`,
        `SUMMARY:${escapeICSText(summary)}`,
        `DESCRIPTION:${escapeICSText(descParts.join(' · '))}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeICSText(`Time for ${med.name} — ${med.dosage}`)}`,
        `TRIGGER:${trigger}`,
        'END:VALARM',
        'END:VEVENT'
      );
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICSFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAdherenceCSV(
  logs: DoseLog[],
  medications: Medication[]
): void {
  const medMap = new Map(medications.map((m) => [m.id, m]));
  const header = ['Date', 'Scheduled Time', 'Medication', 'Dosage', 'Status', 'Logged At'];
  const rows = [...logs]
    .sort((a, b) => `${b.date} ${b.scheduledTime}`.localeCompare(`${a.date} ${a.scheduledTime}`))
    .map((log) => {
      const med = medMap.get(log.medicationId);
      return [
        log.date,
        log.scheduledTime,
        med ? med.name : 'Removed Medication',
        med ? med.dosage : '',
        log.status,
        log.loggedAt,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });

  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dosewell-adherence-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
