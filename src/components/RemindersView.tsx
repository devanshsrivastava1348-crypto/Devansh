import React from 'react';
import { Bell, CalendarPlus, Moon, Sun, Volume2 } from 'lucide-react';
import type { Medication, NotificationSettings, SoundStyle } from '../types/medicine';
import { downloadICSFile, generateRegimenICS } from '../utils/icsExport';
import type { NotificationPermissionState } from '../utils/notifications';
import { playReminderChime } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';

interface RemindersViewProps {
  medications: Medication[];
  settings: NotificationSettings;
  permissionState: NotificationPermissionState;
  onRequestPermission: () => void;
  onUpdateSettings: (patch: Partial<NotificationSettings>) => void;
  onTestDoseNotification: () => void;
  onTestRefillNotification: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  medications,
  settings,
  permissionState,
  onRequestPermission,
  onUpdateSettings,
  onTestDoseNotification,
  onTestRefillNotification,
}) => {
  const handleExportAllICS = () => {
    const ics = generateRegimenICS(medications, settings.leadMinutes);
    downloadICSFile('dosewell-daily-reminders.ics', ics);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#111C1A] dark:text-[#EDF4F2]">
          Notifications & Reminders
        </h1>
        <p className="mt-1 text-sm text-[#52635F] dark:text-[#96ABA6]">
          Configure browser alerts, refill reminders, chime tones, and calendar sync.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left 7 Columns: Notification & Sound Settings */}
        <div className="lg:col-span-7 space-y-5">
          {/* Browser Notification Permission Card */}
          <section className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F766E]/10 text-[#0F766E] dark:bg-[#5EEAD4]/15 dark:text-[#5EEAD4]">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                    Browser & Push Notifications
                  </h2>
                  <p className="text-xs text-[#52635F] dark:text-[#96ABA6] mt-0.5">
                    Permission status:{' '}
                    <span className="font-semibold text-[#111C1A] dark:text-[#EDF4F2] capitalize">
                      {permissionState}
                    </span>
                  </p>
                </div>
              </div>

              {permissionState !== 'granted' && permissionState !== 'unsupported' && (
                <button
                  type="button"
                  onClick={onRequestPermission}
                  className="min-h-[40px] rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D655E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Allow Notifications
                </button>
              )}
            </div>

            {permissionState === 'denied' && (
              <p className="rounded-lg border border-[#FDE68A] dark:border-[#78350F] bg-[#FFFBEB] dark:bg-[#451A03]/40 px-3.5 py-2.5 text-xs text-[#92400E] dark:text-[#FCD34D]">
                Notifications are currently blocked in your browser. Click the site lock/settings icon in your address bar to allow notifications, then reload.
              </p>
            )}

            <div className="divide-y divide-[#EEF3F1] dark:divide-[#1E2C29] border-t border-[#EEF3F1] dark:border-[#1E2C29] pt-2">
              <label className="flex items-center justify-between py-3 gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-[#111C1A] dark:text-[#EDF4F2]">
                    Daily Dose Notifications
                  </p>
                  <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">
                    Send an alert at each scheduled medication time.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.browserNotificationsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ browserNotificationsEnabled: e.target.checked })
                  }
                  className="h-5 w-5 accent-[#0F766E] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between py-3 gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-[#111C1A] dark:text-[#EDF4F2]">
                    Refill Stock Notifications
                  </p>
                  <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">
                    Alert when a medication reaches its refill threshold days.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.refillNotificationsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ refillNotificationsEnabled: e.target.checked })
                  }
                  className="h-5 w-5 accent-[#0F766E] rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={onTestDoseNotification}
                className="min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] px-3.5 py-2 text-xs font-semibold text-[#111C1A] dark:text-[#EDF4F2] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors cursor-pointer"
              >
                Send Test Dose Alert
              </button>
              <button
                type="button"
                onClick={onTestRefillNotification}
                className="min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] px-3.5 py-2 text-xs font-semibold text-[#111C1A] dark:text-[#EDF4F2] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors cursor-pointer"
              >
                Send Test Refill Alert
              </button>
            </div>
          </section>

          {/* Sound & Timing Preferences */}
          <section className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-5 space-y-5">
            <h2 className="font-display text-base font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
              Sound & Timing Preferences
            </h2>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#111C1A] dark:text-[#EDF4F2]">
                  Audible Alert Chime
                </p>
                <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">
                  Play a gentle tone when a dose or refill reminder triggers.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="h-5 w-5 accent-[#0F766E] rounded cursor-pointer"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-2">
                Chime Tone
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'chime', label: 'Soft Chime' },
                    { id: 'bell', label: 'Warm Bell' },
                    { id: 'pulse', label: 'Double Pulse' },
                  ] as { id: SoundStyle; label: string }[]
                ).map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ soundStyle: tone.id });
                      playReminderChime(tone.id);
                    }}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      settings.soundStyle === tone.id
                        ? 'border-[#0F766E] bg-[#0F766E] text-white dark:border-[#5EEAD4] dark:bg-[#5EEAD4] dark:text-[#0B1211]'
                        : 'border-[#D4DDD9] dark:border-[#243532] text-[#42524E] dark:text-[#B4C5C0] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825]'
                    }`}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="lead-minutes"
                  className="block text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-1.5"
                >
                  Reminder Lead Time
                </label>
                <select
                  id="lead-minutes"
                  value={settings.leadMinutes}
                  onChange={(e) =>
                    onUpdateSettings({ leadMinutes: Number(e.target.value) as 0 | 5 | 10 })
                  }
                  className="w-full min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-[#F7F9F8] dark:bg-[#0B1211] px-3 py-1.5 text-sm text-[#111C1A] dark:text-[#EDF4F2] focus:border-[#0F766E] focus:outline-none"
                >
                  <option value={0}>At scheduled time</option>
                  <option value={5}>5 minutes before</option>
                  <option value={10}>10 minutes before</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="snooze-minutes"
                  className="block text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-1.5"
                >
                  Default Snooze Duration
                </label>
                <select
                  id="snooze-minutes"
                  value={settings.snoozeMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      snoozeMinutes: Number(e.target.value) as 5 | 10 | 15 | 30,
                    })
                  }
                  className="w-full min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-[#F7F9F8] dark:bg-[#0B1211] px-3 py-1.5 text-sm text-[#111C1A] dark:text-[#EDF4F2] focus:border-[#0F766E] focus:outline-none"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Right 5 Columns: Calendar Sync, Theme, PWA Install */}
        <div className="lg:col-span-5 space-y-5">
          {/* Calendar .ics Sync */}
          <section className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF3F1] dark:bg-[#1A2825] text-[#0F766E] dark:text-[#5EEAD4]">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                  System Calendar Sync (.ics)
                </h2>
                <p className="mt-1 text-xs text-[#52635F] dark:text-[#96ABA6] leading-relaxed">
                  Import your entire daily medicine schedule into Apple Calendar, Google Calendar, or Outlook so alarms ring on your phone even when this tab is closed.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportAllICS}
              disabled={medications.filter((m) => m.active).length === 0}
              className="w-full min-h-[42px] rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D655E] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Download All Reminders (.ics)
            </button>
          </section>

          {/* Appearance */}
          <section className="rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                Appearance
              </h2>
              <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">
                Switch between daylight and low-glare dark theme.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1211] p-1 border border-[#E2E8E5] dark:border-[#243532]">
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  settings.theme === 'light'
                    ? 'bg-white text-[#111C1A] shadow-xs'
                    : 'text-[#52635F] dark:text-[#96ABA6]'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  settings.theme === 'dark'
                    ? 'bg-[#1E2C29] text-[#EDF4F2] shadow-xs'
                    : 'text-[#52635F] dark:text-[#96ABA6]'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
            </div>
          </section>

          <PWAInstallButton variant="card" />
        </div>
      </div>
    </div>
  );
};
