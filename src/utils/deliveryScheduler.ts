/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DeliveryDayConfig {
  active: boolean;
  start: string; // 'HH:MM' e.g. '16:30'
  end: string;   // 'HH:MM' e.g. '21:00'
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DeliverySchedule {
  slot_interval_minutes: number;
  lead_time_minutes: number;
  advance_days: number;
  schedule: Record<DayOfWeek, DeliveryDayConfig>;
}

export interface DeliverySlot {
  label: string;      // e.g. "17:00 – 17:30"
  startTime: string;  // "17:00"
  endTime: string;    // "17:30"
  isAvailable: boolean;
}

export interface AvailableDeliveryDate {
  date: Date;
  dateKey: string;     // 'YYYY-MM-DD'
  dayOfWeek: DayOfWeek;
  dayLabel: string;    // "Today (Fri, 23 Aug)", "Tomorrow (Sat, 24 Aug)"
  fullLabel: string;   // "Fri, 23 Aug"
  dayConfig: DeliveryDayConfig;
}

export const DAY_NAMES: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
];

export function getDefaultDeliverySchedule(): DeliverySchedule {
  return {
    slot_interval_minutes: 30,
    lead_time_minutes: 45,
    advance_days: 7,
    schedule: {
      monday:    { active: false, start: '17:00', end: '21:00' },
      tuesday:   { active: false, start: '17:00', end: '21:00' },
      wednesday: { active: false, start: '17:00', end: '21:00' },
      thursday:  { active: true,  start: '16:30', end: '21:00' },
      friday:    { active: true,  start: '16:30', end: '21:00' },
      saturday:  { active: true,  start: '12:00', end: '21:00' },
      sunday:    { active: true,  start: '13:00', end: '18:00' }
    }
  };
}

export function parseDeliverySchedule(raw: string | object | undefined | null): DeliverySchedule {
  const defaults = getDefaultDeliverySchedule();
  if (!raw) return defaults;

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return defaults;

    const mergedSchedule: Record<DayOfWeek, DeliveryDayConfig> = { ...defaults.schedule };
    if (parsed.schedule && typeof parsed.schedule === 'object') {
      DAY_NAMES.forEach((day) => {
        if (parsed.schedule[day]) {
          mergedSchedule[day] = {
            active: Boolean(parsed.schedule[day].active),
            start: parsed.schedule[day].start || defaults.schedule[day].start,
            end: parsed.schedule[day].end || defaults.schedule[day].end
          };
        }
      });
    }

    return {
      slot_interval_minutes: Number(parsed.slot_interval_minutes) || defaults.slot_interval_minutes,
      lead_time_minutes: Number(parsed.lead_time_minutes) || defaults.lead_time_minutes,
      advance_days: Number(parsed.advance_days) || defaults.advance_days,
      schedule: mergedSchedule
    };
  } catch (err) {
    console.error('Failed to parse delivery schedule JSON:', err);
    return defaults;
  }
}

/**
 * Returns available delivery dates within advance_days limit for days where delivery is active.
 */
export function getAvailableDeliveryDates(
  schedule: DeliverySchedule,
  baseDate: Date = new Date()
): AvailableDeliveryDate[] {
  const dates: AvailableDeliveryDate[] = [];
  const maxDays = schedule.advance_days || 7;

  for (let i = 0; i < maxDays; i++) {
    const target = new Date(baseDate);
    target.setDate(baseDate.getDate() + i);
    target.setHours(0, 0, 0, 0);

    const dayOfWeek = DAY_NAMES[target.getDay()];
    const dayConfig = schedule.schedule[dayOfWeek];

    if (dayConfig && dayConfig.active) {
      const year = target.getFullYear();
      const month = String(target.getMonth() + 1).padStart(2, '0');
      const day = String(target.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      let dayLabel = target.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });
      if (i === 0) {
        dayLabel = `Today (${target.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric' })})`;
      } else if (i === 1) {
        dayLabel = `Tomorrow (${target.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric' })})`;
      }

      const fullLabel = target.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });

      dates.push({
        date: target,
        dateKey,
        dayOfWeek,
        dayLabel,
        fullLabel,
        dayConfig
      });
    }
  }

  return dates;
}

/**
 * Formats time from Date to "HH:MM"
 */
function formatTimeHM(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Generates slot intervals (e.g. 30 mins) for a given date and dayConfig.
 */
export function getDeliverySlots(
  targetDate: Date,
  dayConfig: DeliveryDayConfig,
  leadTimeMinutes: number = 45,
  slotInterval: number = 30,
  now: Date = new Date()
): DeliverySlot[] {
  if (!dayConfig || !dayConfig.active) return [];

  const slots: DeliverySlot[] = [];
  const [startH, startM] = (dayConfig.start || '17:00').split(':').map(Number);
  const [endH, endM] = (dayConfig.end || '21:00').split(':').map(Number);

  const slotStart = new Date(targetDate);
  slotStart.setHours(startH, startM, 0, 0);

  const dayEnd = new Date(targetDate);
  dayEnd.setHours(endH, endM, 0, 0);

  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  const minAvailableTime = new Date(now.getTime() + leadTimeMinutes * 60 * 1000);

  let current = new Date(slotStart);
  while (current < dayEnd) {
    const next = new Date(current.getTime() + slotInterval * 60 * 1000);
    if (next > dayEnd) break;

    const startLabel = formatTimeHM(current);
    const endLabel = formatTimeHM(next);
    const label = `${startLabel} – ${endLabel}`;

    const isAvailable = !isToday || current >= minAvailableTime;

    slots.push({
      label,
      startTime: startLabel,
      endTime: endLabel,
      isAvailable
    });

    current = next;
  }

  return slots;
}

/**
 * Formats the final preferredTime string saved in the order.
 * e.g. "Sat, 23 Aug · 18:00 – 18:30"
 */
export function formatDeliveryPreferredTime(targetDate: Date, slotLabel: string): string {
  const dateStr = targetDate.toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  return `${dateStr} · ${slotLabel}`;
}
