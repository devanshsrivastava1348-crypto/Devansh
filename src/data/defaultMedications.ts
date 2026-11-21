import type { DoseLog, Medication, NotificationSettings } from '../types/medicine';
import { addDays, getLocalDateKey } from '../utils/schedule';

export const DEFAULT_SETTINGS: NotificationSettings = {
  browserNotificationsEnabled: true,
  refillNotificationsEnabled: true,
  soundEnabled: true,
  soundStyle: 'chime',
  leadMinutes: 0,
  snoozeMinutes: 10,
  theme: 'light',
};

export function createInitialMedications(): Medication[] {
  const today = getLocalDateKey();
  return [
    {
      id: 'med-lisinopril',
      name: 'Lisinopril',
      dosage: '10 mg',
      form: 'tablet',
      times: ['08:00'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      mealTiming: 'before_meal',
      initialQuantity: 30,
      remainingCount: 4,
      typicalSupplyDays: 30,
      refillNotifyDaysBefore: 5,
      refillReminderEnabled: true,
      lastRefilledAt: addDays(today, -26),
      colorHex: '#0F766E',
      notes: 'Monitor blood pressure weekly.',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-vitamin-d3',
      name: 'Vitamin D3',
      dosage: '2000 IU',
      form: 'capsule',
      times: ['08:30'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      mealTiming: 'with_food',
      initialQuantity: 60,
      remainingCount: 38,
      typicalSupplyDays: 60,
      refillNotifyDaysBefore: 7,
      refillReminderEnabled: true,
      lastRefilledAt: addDays(today, -22),
      colorHex: '#0284C7',
      notes: 'Best absorbed alongside breakfast.',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-metformin',
      name: 'Metformin XR',
      dosage: '500 mg',
      form: 'tablet',
      times: ['13:00', '20:00'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      mealTiming: 'with_food',
      initialQuantity: 60,
      remainingCount: 24,
      typicalSupplyDays: 30,
      refillNotifyDaysBefore: 5,
      refillReminderEnabled: true,
      lastRefilledAt: addDays(today, -18),
      colorHex: '#6D28D9',
      notes: 'Take with lunch and dinner to avoid stomach upset.',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-magnesium',
      name: 'Magnesium Glycinate',
      dosage: '200 mg',
      form: 'capsule',
      times: ['21:30'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      mealTiming: 'before_sleep',
      initialQuantity: 90,
      remainingCount: 52,
      typicalSupplyDays: 90,
      refillNotifyDaysBefore: 7,
      refillReminderEnabled: true,
      lastRefilledAt: addDays(today, -38),
      colorHex: '#B45309',
      notes: 'Evening wind-down support.',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function createInitialLogs(medications: Medication[]): DoseLog[] {
  const today = getLocalDateKey();
  const now = new Date();
  const nowHour = now.getHours();
  const logs: DoseLog[] = [];

  // Seed last 6 days of realistic adherence
  for (let offset = 1; offset <= 6; offset++) {
    const dateKey = addDays(today, -offset);
    for (const med of medications) {
      for (const time of med.times) {
        // Leave one realistic skip 4 days ago for variety
        const isSkipped = offset === 4 && med.id === 'med-magnesium';
        logs.push({
          id: `seed-${med.id}-${dateKey}-${time}`,
          medicationId: med.id,
          date: dateKey,
          scheduledTime: time,
          status: isSkipped ? 'skipped' : 'taken',
          loggedAt: `${dateKey}T${time}:05`,
        });
      }
    }
  }

  // Seed morning doses if current local time is already past noon
  if (nowHour >= 12) {
    for (const med of medications) {
      for (const time of med.times) {
        const h = Number(time.split(':')[0]);
        if (h < 12) {
          logs.push({
            id: `seed-today-${med.id}-${time}`,
            medicationId: med.id,
            date: today,
            scheduledTime: time,
            status: 'taken',
            loggedAt: `${today}T${time}:04`,
          });
        }
      }
    }
  }

  return logs;
}
