import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DueAlertBanner } from './components/DueAlertBanner';
import { HistoryView } from './components/HistoryView';
import { MedicationModal } from './components/MedicationModal';
import { MedicationsView } from './components/MedicationsView';
import { RemindersView } from './components/RemindersView';
import { TodayView } from './components/TodayView';
import { TopBar, type AppTab } from './components/TopBar';
import {
  createInitialLogs,
  createInitialMedications,
  DEFAULT_SETTINGS,
} from './data/defaultMedications';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import type {
  ActiveAlert,
  DailyDoseItem,
  DoseLog,
  Medication,
  NotificationSettings,
} from './types/medicine';
import {
  getNotificationPermission,
  requestBrowserNotificationPermission,
  sendMedicineNotification,
  type NotificationPermissionState,
} from './utils/notifications';
import {
  buildDailyDoses,
  calculateAdherenceSummary,
  getLocalDateKey,
  getRefillProjection,
  hhmmToMinutes,
  makeDoseKey,
  MEAL_TIMING_LABELS,
  minutesToHHMM,
} from './utils/schedule';
import { playReminderChime } from './utils/sound';

const STORAGE_MEDS = 'dosewell_medications_v1';
const STORAGE_LOGS = 'dosewell_logs_v1';
const STORAGE_SETTINGS = 'dosewell_settings_v1';
const STORAGE_NOTIFIED_DOSES = 'dosewell_notified_doses_v1';
const STORAGE_NOTIFIED_REFILLS = 'dosewell_notified_refills_v1';

function loadInitialState(): {
  medications: Medication[];
  logs: DoseLog[];
  settings: NotificationSettings;
} {
  try {
    const rawMeds = localStorage.getItem(STORAGE_MEDS);
    const rawLogs = localStorage.getItem(STORAGE_LOGS);
    const rawSettings = localStorage.getItem(STORAGE_SETTINGS);

    const medications = rawMeds ? (JSON.parse(rawMeds) as Medication[]) : createInitialMedications();
    const logs = rawLogs
      ? (JSON.parse(rawLogs) as DoseLog[])
      : rawMeds
        ? []
        : createInitialLogs(medications);
    const settings: NotificationSettings = rawSettings
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(rawSettings) as Partial<NotificationSettings>) }
      : DEFAULT_SETTINGS;

    return { medications, logs, settings };
  } catch {
    const meds = createInitialMedications();
    return {
      medications: meds,
      logs: createInitialLogs(meds),
      settings: DEFAULT_SETTINGS,
    };
  }
}

function loadStringSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveStringSet(key: string, set: Set<string>): void {
  try {
    // Keep only recent 200 entries so localStorage stays lean
    const items = Array.from(set).slice(-200);
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [medications, setMedications] = useState<Medication[]>(initial.medications);
  const [logs, setLogs] = useState<DoseLog[]>(initial.logs);
  const [settings, setSettings] = useState<NotificationSettings>(initial.settings);

  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateKey());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );

  const isOnline = useOnlineStatus();
  const notifiedDosesRef = useRef<Set<string>>(loadStringSet(STORAGE_NOTIFIED_DOSES));
  const notifiedRefillsRef = useRef<Set<string>>(loadStringSet(STORAGE_NOTIFIED_REFILLS));

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Persist medications, logs, and settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MEDS, JSON.stringify(medications));
    } catch {
      // Ignore
    }
  }, [medications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOGS, JSON.stringify(logs));
    } catch {
      // Ignore
    }
  }, [logs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  // Live 1-second timer for countdown & exact reminder firing
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const todayKey = getLocalDateKey(now);

  const todayDoses = useMemo(
    () => buildDailyDoses(medications, logs, todayKey, now),
    [medications, logs, todayKey, now]
  );

  const selectedDayDoses = useMemo(
    () => buildDailyDoses(medications, logs, selectedDate, now),
    [medications, logs, selectedDate, now]
  );

  const adherenceSummary = useMemo(
    () => calculateAdherenceSummary(medications, logs, 7, now),
    [medications, logs, now]
  );

  // Check scheduled doses every minute/second against current local time
  useEffect(() => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const dose of todayDoses) {
      if (dose.status === 'taken' || dose.status === 'skipped') continue;

      const effectiveMins = hhmmToMinutes(dose.effectiveTime);
      const triggerMins =
        dose.status === 'snoozed'
          ? effectiveMins
          : Math.max(0, effectiveMins - settings.leadMinutes);

      // Fire when current minute matches trigger minute (or within 2-minute window if tab just woke up)
      const isTriggerWindow = nowMinutes >= triggerMins && nowMinutes <= triggerMins + 1;
      const notifyKey = `${dose.key}__${dose.effectiveTime}`;

      if (isTriggerWindow && !notifiedDosesRef.current.has(notifyKey)) {
        notifiedDosesRef.current.add(notifyKey);
        saveStringSet(STORAGE_NOTIFIED_DOSES, notifiedDosesRef.current);

        const alertId = `dose-alert-${notifyKey}`;
        setActiveAlerts((prev) => {
          if (prev.some((a) => a.id === alertId)) return prev;
          return [
            {
              id: alertId,
              kind: 'dose',
              medication: dose.medication,
              scheduledTime: dose.scheduledTime,
              date: dose.date,
              triggeredAt: new Date().toISOString(),
            },
            ...prev,
          ];
        });

        if (settings.soundEnabled) {
          playReminderChime(settings.soundStyle);
        }

        if (settings.browserNotificationsEnabled && permissionState === 'granted') {
          sendMedicineNotification({
            title: `Medicine Reminder: ${dose.medication.name}`,
            body: `${dose.medication.dosage} · ${MEAL_TIMING_LABELS[dose.medication.mealTiming]}`,
            tag: notifyKey,
          });
        }
      }
    }
  }, [todayDoses, now, settings, permissionState]);

  // Check refill thresholds and trigger refill notification when entering low stock
  const triggerRefillCheck = useCallback(
    (medList: Medication[], allowAudio: boolean) => {
      if (!settings.refillNotificationsEnabled) return;

      for (const med of medList) {
        const proj = getRefillProjection(med, now);
        if (!proj.needsRefill) continue;

        const refillKey = `${med.id}__${todayKey}`;
        if (notifiedRefillsRef.current.has(refillKey)) continue;

        notifiedRefillsRef.current.add(refillKey);
        saveStringSet(STORAGE_NOTIFIED_REFILLS, notifiedRefillsRef.current);

        const msg = proj.isOut
          ? `0 units left. Refill your prescription immediately.`
          : `${med.remainingCount} units left (~${proj.daysRemaining} days remaining). Time to refill.`;

        setActiveAlerts((prev) => {
          const alertId = `refill-${refillKey}`;
          if (prev.some((a) => a.id === alertId)) return prev;
          return [
            {
              id: alertId,
              kind: 'refill',
              medication: med,
              scheduledTime: '09:00',
              date: todayKey,
              triggeredAt: new Date().toISOString(),
              message: msg,
            },
            ...prev,
          ];
        });

        if (allowAudio && settings.soundEnabled) {
          playReminderChime(settings.soundStyle);
        }

        if (settings.browserNotificationsEnabled && permissionState === 'granted') {
          sendMedicineNotification({
            title: `Refill Reminder: ${med.name}`,
            body: `${med.dosage} — ${msg}`,
            tag: `refill-${med.id}`,
          });
        }
      }
    },
    [settings, todayKey, now, permissionState]
  );

  // Surface existing low-stock alert silently on first load (no surprise sound)
  const initialRefillChecked = useRef(false);
  useEffect(() => {
    if (initialRefillChecked.current) return;
    initialRefillChecked.current = true;
    triggerRefillCheck(medications, false);
  }, [medications, triggerRefillCheck]);

  const handleRequestPermission = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermissionState(result);
    if (result === 'granted') {
      setSettings((prev) => ({ ...prev, browserNotificationsEnabled: true }));
      await sendMedicineNotification({
        title: 'Dosewell Notifications Enabled',
        body: 'You will receive daily dose and refill reminders here.',
        tag: 'dosewell-welcome',
      });
    }
  };

  const handleUpdateSettings = (patch: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const upsertDoseLog = (
    medicationId: string,
    date: string,
    scheduledTime: string,
    status: DoseLog['status'],
    snoozedUntil?: string
  ) => {
    const key = makeDoseKey(medicationId, date, scheduledTime);
    setLogs((prev) => {
      const filtered = prev.filter(
        (l) => makeDoseKey(l.medicationId, l.date, l.scheduledTime) !== key
      );
      return [
        ...filtered,
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          medicationId,
          date,
          scheduledTime,
          status,
          loggedAt: new Date().toISOString(),
          snoozedUntil,
        },
      ];
    });
  };

  const handleMarkTaken = (dose: DailyDoseItem) => {
    const wasAlreadyTaken = dose.status === 'taken';
    upsertDoseLog(dose.medication.id, dose.date, dose.scheduledTime, 'taken');

    if (!wasAlreadyTaken) {
      const updatedMeds = medications.map((m) =>
        m.id === dose.medication.id
          ? { ...m, remainingCount: Math.max(0, m.remainingCount - 1) }
          : m
      );
      setMedications(updatedMeds);
      triggerRefillCheck(updatedMeds, true);
    }

    setActiveAlerts((prev) =>
      prev.filter(
        (a) =>
          !(
            a.kind === 'dose' &&
            a.medication.id === dose.medication.id &&
            a.scheduledTime === dose.scheduledTime &&
            a.date === dose.date
          )
      )
    );
  };

  const handleSnoozeDose = (dose: DailyDoseItem) => {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const snoozeTarget = minutesToHHMM(nowMins + settings.snoozeMinutes);
    upsertDoseLog(dose.medication.id, dose.date, dose.scheduledTime, 'snoozed', snoozeTarget);
    setActiveAlerts((prev) =>
      prev.filter(
        (a) =>
          !(
            a.kind === 'dose' &&
            a.medication.id === dose.medication.id &&
            a.scheduledTime === dose.scheduledTime &&
            a.date === dose.date
          )
      )
    );
  };

  const handleSkipDose = (dose: DailyDoseItem) => {
    upsertDoseLog(dose.medication.id, dose.date, dose.scheduledTime, 'skipped');
    setActiveAlerts((prev) =>
      prev.filter(
        (a) =>
          !(
            a.kind === 'dose' &&
            a.medication.id === dose.medication.id &&
            a.scheduledTime === dose.scheduledTime &&
            a.date === dose.date
          )
      )
    );
  };

  const handleUndoDose = (dose: DailyDoseItem) => {
    const key = makeDoseKey(dose.medication.id, dose.date, dose.scheduledTime);
    if (dose.status === 'taken') {
      setMedications((prev) =>
        prev.map((m) =>
          m.id === dose.medication.id ? { ...m, remainingCount: m.remainingCount + 1 } : m
        )
      );
    }
    setLogs((prev) =>
      prev.filter((l) => makeDoseKey(l.medicationId, l.date, l.scheduledTime) !== key)
    );
  };

  const handleRefillMedication = (medId: string) => {
    setMedications((prev) =>
      prev.map((m) =>
        m.id === medId
          ? {
              ...m,
              remainingCount: m.initialQuantity,
              lastRefilledAt: todayKey,
            }
          : m
      )
    );
    notifiedRefillsRef.current.delete(`${medId}__${todayKey}`);
    saveStringSet(STORAGE_NOTIFIED_REFILLS, notifiedRefillsRef.current);
    setActiveAlerts((prev) =>
      prev.filter((a) => !(a.kind === 'refill' && a.medication.id === medId))
    );
  };

  const handleSaveMedication = (med: Medication) => {
    setMedications((prev) => {
      const exists = prev.some((m) => m.id === med.id);
      const next = exists ? prev.map((m) => (m.id === med.id ? med : m)) : [med, ...prev];
      return next;
    });
  };

  const handleToggleActive = (medId: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === medId ? { ...m, active: !m.active } : m))
    );
  };

  const handleDeleteMedication = (medId: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== medId));
    setLogs((prev) => prev.filter((l) => l.medicationId !== medId));
    setActiveAlerts((prev) => prev.filter((a) => a.medication.id !== medId));
  };

  const handleTestDoseNotification = async () => {
    const sampleMed =
      medications.find((m) => m.active) || createInitialMedications()[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setActiveAlerts((prev) => [
      {
        id: `test-dose-${Date.now()}`,
        kind: 'dose',
        medication: sampleMed,
        scheduledTime: currentTime,
        date: todayKey,
        triggeredAt: new Date().toISOString(),
        isTest: true,
      },
      ...prev.filter((a) => !a.isTest),
    ]);

    if (settings.soundEnabled) {
      playReminderChime(settings.soundStyle);
    }

    if (permissionState === 'default') {
      const res = await requestBrowserNotificationPermission();
      setPermissionState(res);
    }

    await sendMedicineNotification({
      title: `Medicine Reminder: ${sampleMed.name}`,
      body: `${sampleMed.dosage} · ${MEAL_TIMING_LABELS[sampleMed.mealTiming]}`,
      tag: `test-dose-${Date.now()}`,
    });
  };

  const handleTestRefillNotification = async () => {
    const lowMed =
      medications.find((m) => m.active && getRefillProjection(m, now).needsRefill) ||
      medications.find((m) => m.active) ||
      createInitialMedications()[0];
    const proj = getRefillProjection(lowMed, now);

    const msg = `${lowMed.remainingCount} units left (~${proj.daysRemaining} days remaining). Time to refill.`;

    setActiveAlerts((prev) => [
      {
        id: `test-refill-${Date.now()}`,
        kind: 'refill',
        medication: lowMed,
        scheduledTime: '09:00',
        date: todayKey,
        triggeredAt: new Date().toISOString(),
        message: msg,
        isTest: true,
      },
      ...prev.filter((a) => !a.isTest),
    ]);

    if (settings.soundEnabled) {
      playReminderChime(settings.soundStyle);
    }

    if (permissionState === 'default') {
      const res = await requestBrowserNotificationPermission();
      setPermissionState(res);
    }

    await sendMedicineNotification({
      title: `Refill Reminder: ${lowMed.name}`,
      body: `${lowMed.dosage} — ${msg}`,
      tag: `test-refill-${Date.now()}`,
    });
  };

  const handleAlertTake = (alert: ActiveAlert) => {
    const match = todayDoses.find(
      (d) =>
        d.medication.id === alert.medication.id &&
        d.scheduledTime === alert.scheduledTime &&
        d.date === alert.date
    );
    if (match) {
      handleMarkTaken(match);
    } else {
      upsertDoseLog(alert.medication.id, alert.date, alert.scheduledTime, 'taken');
      setActiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    }
  };

  const handleAlertSnooze = (alert: ActiveAlert) => {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const snoozeTarget = minutesToHHMM(nowMins + settings.snoozeMinutes);
    upsertDoseLog(
      alert.medication.id,
      alert.date,
      alert.scheduledTime,
      'snoozed',
      snoozeTarget
    );
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
  };

  const handleAlertSkip = (alert: ActiveAlert) => {
    upsertDoseLog(alert.medication.id, alert.date, alert.scheduledTime, 'skipped');
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
  };

  const handleAlertRefill = (alert: ActiveAlert) => {
    handleRefillMedication(alert.medication.id);
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F8] dark:bg-[#0B1211] text-[#111C1A] dark:text-[#EDF4F2]">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingMedication(null);
          setIsModalOpen(true);
        }}
      />

      <DueAlertBanner
        alerts={activeAlerts}
        snoozeMinutes={settings.snoozeMinutes}
        onTakeDose={handleAlertTake}
        onSnoozeDose={handleAlertSnooze}
        onSkipDose={handleAlertSkip}
        onRefillNow={handleAlertRefill}
        onDismiss={(id) => setActiveAlerts((prev) => prev.filter((a) => a.id !== id))}
      />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        {activeTab === 'today' && (
          <TodayView
            medications={medications}
            doses={selectedDayDoses}
            selectedDate={selectedDate}
            now={now}
            adherenceSummary={adherenceSummary}
            settings={settings}
            permissionState={permissionState}
            onSelectDate={setSelectedDate}
            onMarkTaken={handleMarkTaken}
            onSnoozeDose={handleSnoozeDose}
            onSkipDose={handleSkipDose}
            onUndoDose={handleUndoDose}
            onRefillMedication={handleRefillMedication}
            onEditMedication={(med) => {
              setEditingMedication(med);
              setIsModalOpen(true);
            }}
            onOpenAddModal={() => {
              setEditingMedication(null);
              setIsModalOpen(true);
            }}
            onRequestPermission={handleRequestPermission}
            onTestDoseNotification={handleTestDoseNotification}
            onTestRefillNotification={handleTestRefillNotification}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'medications' && (
          <MedicationsView
            medications={medications}
            leadMinutes={settings.leadMinutes}
            onOpenAddModal={() => {
              setEditingMedication(null);
              setIsModalOpen(true);
            }}
            onEditMedication={(med) => {
              setEditingMedication(med);
              setIsModalOpen(true);
            }}
            onToggleActive={handleToggleActive}
            onDeleteMedication={handleDeleteMedication}
            onRefillMedication={handleRefillMedication}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            medications={medications}
            logs={logs}
            adherenceSummary={adherenceSummary}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersView
            medications={medications}
            settings={settings}
            permissionState={permissionState}
            onRequestPermission={handleRequestPermission}
            onUpdateSettings={handleUpdateSettings}
            onTestDoseNotification={handleTestDoseNotification}
            onTestRefillNotification={handleTestRefillNotification}
          />
        )}
      </main>

      <MedicationModal
        isOpen={isModalOpen}
        editingMedication={editingMedication}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMedication}
      />

      {!isOnline && (
        <div className="fixed bottom-16 md:bottom-4 left-4 z-50 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs font-medium text-[#92400E] shadow-md">
          Offline — Reminders and dose logs remain available locally.
        </div>
      )}
    </div>
  );
}
