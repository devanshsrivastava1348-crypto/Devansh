export type MedicationForm =
  | 'tablet'
  | 'capsule'
  | 'liquid'
  | 'drops'
  | 'injection'
  | 'inhaler';

export type MealTiming =
  | 'before_meal'
  | 'with_food'
  | 'after_meal'
  | 'before_sleep'
  | 'anytime';

export type DoseStatus =
  | 'upcoming'
  | 'due'
  | 'taken'
  | 'skipped'
  | 'snoozed'
  | 'missed';

export type TimeWindow = 'Morning' | 'Afternoon' | 'Evening' | 'Bedtime';

export type SoundStyle = 'chime' | 'bell' | 'pulse';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: MedicationForm;
  times: string[]; // HH:MM (24-hour)
  daysOfWeek: number[]; // 0 (Sun) - 6 (Sat)
  mealTiming: MealTiming;
  initialQuantity: number;
  remainingCount: number;
  typicalSupplyDays: number;
  refillNotifyDaysBefore: number;
  refillReminderEnabled: boolean;
  lastRefilledAt: string;
  colorHex: string;
  notes: string;
  active: boolean;
  createdAt: string;
}

export interface DoseLog {
  id: string;
  medicationId: string;
  date: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  status: 'taken' | 'skipped' | 'snoozed';
  loggedAt: string; // ISO string
  snoozedUntil?: string; // HH:MM
}

export interface NotificationSettings {
  browserNotificationsEnabled: boolean;
  refillNotificationsEnabled: boolean;
  soundEnabled: boolean;
  soundStyle: SoundStyle;
  leadMinutes: 0 | 5 | 10;
  snoozeMinutes: 5 | 10 | 15 | 30;
  theme: 'light' | 'dark';
}

export interface DailyDoseItem {
  key: string; // `${medication.id}__${date}__${scheduledTime}`
  medication: Medication;
  date: string;
  scheduledTime: string;
  effectiveTime: string; // snoozedUntil or scheduledTime
  window: TimeWindow;
  status: DoseStatus;
  log?: DoseLog;
}

export interface ActiveAlert {
  id: string;
  kind: 'dose' | 'refill';
  medication: Medication;
  scheduledTime: string;
  date: string;
  triggeredAt: string;
  message?: string;
  isTest?: boolean;
}
