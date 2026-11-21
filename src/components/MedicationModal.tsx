import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { MealTiming, Medication, MedicationForm } from '../types/medicine';
import { FORM_LABELS, MEAL_TIMING_LABELS, WEEKDAY_SHORT, getLocalDateKey } from '../utils/schedule';

interface MedicationModalProps {
  isOpen: boolean;
  editingMedication: Medication | null;
  onClose: () => void;
  onSave: (medication: Medication) => void;
}

const COLOR_SWATCHES = [
  '#0F766E',
  '#0284C7',
  '#6D28D9',
  '#B45309',
  '#BE123C',
  '#334155',
];

const QUICK_TEMPLATES: {
  name: string;
  dosage: string;
  form: MedicationForm;
  times: string[];
  mealTiming: MealTiming;
  initialQuantity: number;
  typicalSupplyDays: number;
  refillNotifyDaysBefore: number;
}[] = [
  {
    name: 'Multivitamin',
    dosage: '1 tablet',
    form: 'tablet',
    times: ['08:00'],
    mealTiming: 'with_food',
    initialQuantity: 60,
    typicalSupplyDays: 60,
    refillNotifyDaysBefore: 7,
  },
  {
    name: 'Omega-3 Fish Oil',
    dosage: '1000 mg',
    form: 'capsule',
    times: ['08:30', '19:30'],
    mealTiming: 'with_food',
    initialQuantity: 120,
    typicalSupplyDays: 60,
    refillNotifyDaysBefore: 7,
  },
  {
    name: 'Levothyroxine',
    dosage: '50 mcg',
    form: 'tablet',
    times: ['07:00'],
    mealTiming: 'before_meal',
    initialQuantity: 30,
    typicalSupplyDays: 30,
    refillNotifyDaysBefore: 5,
  },
];

export const MedicationModal: React.FC<MedicationModalProps> = ({
  isOpen,
  editingMedication,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState<MedicationForm>('tablet');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [mealTiming, setMealTiming] = useState<MealTiming>('with_food');
  const [initialQuantity, setInitialQuantity] = useState<number>(30);
  const [remainingCount, setRemainingCount] = useState<number>(30);
  const [typicalSupplyDays, setTypicalSupplyDays] = useState<number>(30);
  const [refillNotifyDaysBefore, setRefillNotifyDaysBefore] = useState<number>(5);
  const [refillReminderEnabled, setRefillReminderEnabled] = useState<boolean>(true);
  const [colorHex, setColorHex] = useState<string>(COLOR_SWATCHES[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingMedication) {
      setName(editingMedication.name);
      setDosage(editingMedication.dosage);
      setForm(editingMedication.form);
      setTimes(editingMedication.times.length > 0 ? editingMedication.times : ['08:00']);
      setDaysOfWeek(editingMedication.daysOfWeek);
      setMealTiming(editingMedication.mealTiming);
      setInitialQuantity(editingMedication.initialQuantity);
      setRemainingCount(editingMedication.remainingCount);
      setTypicalSupplyDays(editingMedication.typicalSupplyDays);
      setRefillNotifyDaysBefore(editingMedication.refillNotifyDaysBefore);
      setRefillReminderEnabled(editingMedication.refillReminderEnabled);
      setColorHex(editingMedication.colorHex);
      setNotes(editingMedication.notes);
    } else {
      setName('');
      setDosage('');
      setForm('tablet');
      setTimes(['08:00']);
      setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
      setMealTiming('with_food');
      setInitialQuantity(30);
      setRemainingCount(30);
      setTypicalSupplyDays(30);
      setRefillNotifyDaysBefore(5);
      setRefillReminderEnabled(true);
      setColorHex(COLOR_SWATCHES[0]);
      setNotes('');
    }
    setError(null);
  }, [isOpen, editingMedication]);

  if (!isOpen) return null;

  const handleInitialQtyChange = (val: number) => {
    const clean = Math.max(1, val);
    setInitialQuantity(clean);
    if (!editingMedication) {
      setRemainingCount(clean);
    }
  };

  const applyTemplate = (tpl: (typeof QUICK_TEMPLATES)[number]) => {
    setName(tpl.name);
    setDosage(tpl.dosage);
    setForm(tpl.form);
    setTimes(tpl.times);
    setMealTiming(tpl.mealTiming);
    setInitialQuantity(tpl.initialQuantity);
    setRemainingCount(tpl.initialQuantity);
    setTypicalSupplyDays(tpl.typicalSupplyDays);
    setRefillNotifyDaysBefore(tpl.refillNotifyDaysBefore);
    setError(null);
  };

  const toggleDay = (dayIdx: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort((a, b) => a - b)
    );
  };

  const handleTimeChange = (idx: number, val: string) => {
    setTimes((prev) => prev.map((t, i) => (i === idx ? val : t)));
  };

  const addTimeSlot = () => {
    setTimes((prev) => [...prev, '20:00']);
  };

  const removeTimeSlot = (idx: number) => {
    if (times.length <= 1) return;
    setTimes((prev) => prev.filter((_, i) => i !== idx));
  };

  const safeInitial = Math.max(1, initialQuantity || 1);
  const safeDays = Math.max(1, typicalSupplyDays || 1);
  const dailyBurn = (safeInitial / safeDays).toFixed(1);
  const notifyUnitsApprox = Math.max(
    1,
    Math.round((refillNotifyDaysBefore / safeDays) * safeInitial)
  );
  const daysLeftPreview = Math.max(0, Math.round((remainingCount / safeInitial) * safeDays));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the medicine name.');
      return;
    }
    if (!dosage.trim()) {
      setError('Please enter a dosage (for example, 500 mg or 1 tablet).');
      return;
    }
    if (daysOfWeek.length === 0) {
      setError('Select at least one day of the week.');
      return;
    }

    const uniqueTimes = Array.from(new Set(times.filter(Boolean))).sort();
    if (uniqueTimes.length === 0) {
      setError('Add at least one daily reminder time.');
      return;
    }

    const medication: Medication = {
      id: editingMedication ? editingMedication.id : `med-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      form,
      times: uniqueTimes,
      daysOfWeek,
      mealTiming,
      initialQuantity: safeInitial,
      remainingCount: Math.max(0, remainingCount),
      typicalSupplyDays: safeDays,
      refillNotifyDaysBefore: Math.max(0, refillNotifyDaysBefore),
      refillReminderEnabled,
      lastRefilledAt: editingMedication?.lastRefilledAt || getLocalDateKey(),
      colorHex,
      notes: notes.trim(),
      active: editingMedication ? editingMedication.active : true,
      createdAt: editingMedication ? editingMedication.createdAt : new Date().toISOString(),
    };

    onSave(medication);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="med-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl sm:rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8E5] dark:border-[#1E2C29] px-5 py-4">
          <h2
            id="med-modal-title"
            className="font-display text-lg font-semibold text-[#111C1A] dark:text-[#EDF4F2]"
          >
            {editingMedication ? 'Edit Medication' : 'Add Medication & Refill Schedule'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#52635F] hover:bg-[#EEF3F1] dark:text-[#96ABA6] dark:hover:bg-[#1E2C29] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5 space-y-5">
          {!editingMedication && (
            <div>
              <p className="text-xs font-medium text-[#52635F] dark:text-[#96ABA6] mb-2">
                Quick templates
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-[#F7F9F8] dark:bg-[#0B1211] px-3 py-1.5 text-xs font-medium text-[#111C1A] dark:text-[#EDF4F2] hover:border-[#0F766E] dark:hover:border-[#5EEAD4] transition-colors cursor-pointer"
                  >
                    {tpl.name} · {tpl.dosage}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-[#BE123C]/30 bg-[#FFF1F2] dark:bg-[#4C0519]/40 px-3.5 py-2.5 text-sm text-[#BE123C] dark:text-[#FDA4AF]">
              {error}
            </div>
          )}

          {/* Core Details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="med-name"
                className="block text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-1.5"
              >
                Medicine Name
              </label>
              <input
                id="med-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Lisinopril"
                className="w-full min-h-[42px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#0B1211] px-3 py-2 text-sm text-[#111C1A] dark:text-[#EDF4F2] placeholder:text-[#869691] focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="med-dosage"
                className="block text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-1.5"
              >
                Dosage / Strength
              </label>
              <input
                id="med-dosage"
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g., 10 mg or 1 tablet"
                className="w-full min-h-[42px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#0B1211] px-3 py-2 text-sm text-[#111C1A] dark:text-[#EDF4F2] placeholder:text-[#869691] focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="med-form"
                className="block text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-1.5"
              >
                Form
              </label>
              <select
                id="med-form"
                value={form}
                onChange={(e) => setForm(e.target.value as MedicationForm)}
                className="w-full min-h-[42px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#0B1211] px-3 py-2 text-sm text-[#111C1A] dark:text-[#EDF4F2] focus:border-[#0F766E] focus:outline-none"
              >
                {Object.entries(FORM_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="med-meal"
                className="block text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-1.5"
              >
                Meal Instruction
              </label>
              <select
                id="med-meal"
                value={mealTiming}
                onChange={(e) => setMealTiming(e.target.value as MealTiming)}
                className="w-full min-h-[42px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#0B1211] px-3 py-2 text-sm text-[#111C1A] dark:text-[#EDF4F2] focus:border-[#0F766E] focus:outline-none"
              >
                {Object.entries(MEAL_TIMING_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Daily Reminder Times */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0]">
                Daily Reminder Times
              </span>
              <button
                type="button"
                onClick={addTimeSlot}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] dark:text-[#5EEAD4] hover:underline cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add time
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {times.map((t, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    className="min-h-[42px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#0B1211] px-3 py-1.5 font-mono text-sm text-[#111C1A] dark:text-[#EDF4F2] focus:border-[#0F766E] focus:outline-none"
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(idx)}
                      aria-label="Remove time"
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-[#52635F] hover:bg-[#FFF1F2] hover:text-[#BE123C] dark:text-[#96ABA6] dark:hover:bg-[#4C0519]/40 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0]">
                Days of Week
              </span>
              <button
                type="button"
                onClick={() => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])}
                className="text-xs font-medium text-[#0F766E] dark:text-[#5EEAD4] hover:underline cursor-pointer"
              >
                Every day
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_SHORT.map((day, idx) => {
                const active = daysOfWeek.includes(idx);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`min-h-[40px] rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'border-[#0F766E] bg-[#0F766E] text-white dark:border-[#5EEAD4] dark:bg-[#5EEAD4] dark:text-[#0B1211]'
                        : 'border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#0B1211] text-[#52635F] dark:text-[#96ABA6] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity & Refill Reminders */}
          <div className="rounded-xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-[#F7F9F8] dark:bg-[#0B1211] p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                  Quantity & Refill Reminder
                </h3>
                <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">
                  Track your supply and get notified before running out.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#111C1A] dark:text-[#EDF4F2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={refillReminderEnabled}
                  onChange={(e) => setRefillReminderEnabled(e.target.checked)}
                  className="h-4 w-4 accent-[#0F766E] rounded cursor-pointer"
                />
                <span>Notify me</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="med-initial-qty"
                  className="block text-xs font-medium text-[#42524E] dark:text-[#B4C5C0] mb-1"
                >
                  Initial Quantity (units)
                </label>
                <input
                  id="med-initial-qty"
                  type="number"
                  min={1}
                  max={1000}
                  value={initialQuantity}
                  onChange={(e) => handleInitialQtyChange(Number(e.target.value))}
                  className="w-full min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#131D1B] px-3 py-1.5 font-mono text-sm text-[#111C1A] dark:text-[#EDF4F2] focus:border-[#0F766E] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="med-supply-days"
                  className="block text-xs font-medium text-[#42524E] dark:text-[#B4C5C0] mb-1"
                >
                  Typically Lasts (days)
                </label>
                <input
                  id="med-supply-days"
                  type="number"
                  min={1}
                  max={365}
                  value={typicalSupplyDays}
                  onChange={(e) => setTypicalSupplyDays(Math.max(1, Number(e.target.value)))}
                  className="w-full min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#131D1B] px-3 py-1.5 font-mono text-sm text-[#111C1A] dark:text-[#EDF4F2] focus:border-[#0F766E] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="med-remaining-qty"
                  className="block text-xs font-medium text-[#42524E] dark:text-[#B4C5C0] mb-1"
                >
                  Current Remaining (units)
                </label>
                <input
                  id="med-remaining-qty"
                  type="number"
                  min={0}
                  max={1000}
                  value={remainingCount}
                  onChange={(e) => setRemainingCount(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#131D1B] px-3 py-1.5 font-mono text-sm text-[#111C1A] dark:text-[#EDF4F2] focus:border-[#0F766E] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="med-notify-before"
                  className="block text-xs font-medium text-[#42524E] dark:text-[#B4C5C0] mb-1"
                >
                  Remind Days Before Empty
                </label>
                <input
                  id="med-notify-before"
                  type="number"
                  min={0}
                  max={60}
                  disabled={!refillReminderEnabled}
                  value={refillNotifyDaysBefore}
                  onChange={(e) => setRefillNotifyDaysBefore(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#131D1B] px-3 py-1.5 font-mono text-sm text-[#111C1A] dark:text-[#EDF4F2] disabled:opacity-50 focus:border-[#0F766E] focus:outline-none"
                />
              </div>
            </div>

            <p className="text-xs text-[#52635F] dark:text-[#96ABA6] font-mono">
              ~{dailyBurn} units/day · {daysLeftPreview} days left at current stock · Alert at ≤
              {refillNotifyDaysBefore} days (~{notifyUnitsApprox} units)
            </p>
          </div>

          {/* Color Swatch & Notes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-2">
                Marker Color
              </span>
              <div className="flex items-center gap-2.5">
                {COLOR_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColorHex(hex)}
                    aria-label={`Select color ${hex}`}
                    className={`h-8 w-8 rounded-lg transition-transform cursor-pointer ${
                      colorHex === hex
                        ? 'ring-2 ring-offset-2 ring-[#0F766E] dark:ring-offset-[#131D1B] scale-105'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="med-notes"
                className="block text-xs font-semibold text-[#42524E] dark:text-[#B4C5C0] mb-1.5"
              >
                Notes (optional)
              </label>
              <input
                id="med-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Pharmacy #402"
                className="w-full min-h-[40px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#0B1211] px-3 py-1.5 text-sm text-[#111C1A] dark:text-[#EDF4F2] placeholder:text-[#869691] focus:border-[#0F766E] focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[#E2E8E5] dark:border-[#1E2C29] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-lg border border-[#D4DDD9] dark:border-[#243532] px-4 py-2 text-sm font-medium text-[#42524E] dark:text-[#B4C5C0] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[42px] rounded-lg bg-[#0F766E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0D655E] transition-colors cursor-pointer"
            >
              {editingMedication ? 'Save Changes' : 'Save Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
