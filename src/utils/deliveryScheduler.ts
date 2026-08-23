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

/**
 * Parses a timing string like "4:00 PM - 9:00 PM" into start and end hours/minutes
 */
export function parseOperatingHours(timingStr: string): { startHour: number; startMinute: number; endHour: number; endMinute: number } | null {
  if (!timingStr || !timingStr.includes('-')) return null;

  const parts = timingStr.split('-');
  if (parts.length !== 2) return null;

  const parsePart = (str: string) => {
    const cleaned = str.trim().toUpperCase();
    const match = cleaned.match(/(\d+):?(\d+)?\s*(AM|PM)?/);
    if (!match) return { h: 12, m: 0 };

    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3];

    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;

    return { h, m };
  };

  const start = parsePart(parts[0]);
  const end = parsePart(parts[1]);

  return {
    startHour: start.h,
    startMinute: start.m,
    endHour: end.h,
    endMinute: end.m
  };
}

export interface StoreOperatingStatus {
  isOpen: boolean;
  isBeforeOpen: boolean;
  isAfterClose: boolean;
  opensAtLabel: string;
  closesAtLabel: string;
  todayTiming: string;
}

export function getStoreOperatingStatus(timingStr: string, now: Date = new Date()): StoreOperatingStatus {
  const parsed = parseOperatingHours(timingStr);
  if (!parsed) {
    return {
      isOpen: true,
      isBeforeOpen: false,
      isAfterClose: false,
      opensAtLabel: '',
      closesAtLabel: '',
      todayTiming: timingStr || ''
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = parsed.startHour * 60 + parsed.startMinute;
  const closeMinutes = parsed.endHour * 60 + parsed.endMinute;

  const isBeforeOpen = currentMinutes < openMinutes;
  const isAfterClose = currentMinutes >= closeMinutes;
  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  const formatDisplay = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m === 0 ? '00' : String(m).padStart(2, '0');
    return `${displayH}:${displayM} ${period}`;
  };

  return {
    isOpen,
    isBeforeOpen,
    isAfterClose,
    opensAtLabel: formatDisplay(parsed.startHour, parsed.startMinute),
    closesAtLabel: formatDisplay(parsed.endHour, parsed.endMinute),
    todayTiming: timingStr
  };
}

/**
 * Generates takeaway / collection options respecting store opening hours.
 */
export function getTakeawayTimeOptions(timingStr: string, now: Date = new Date()): { value: string; label: string; isAvailable: boolean }[] {
  const parsed = parseOperatingHours(timingStr);
  const status = getStoreOperatingStatus(timingStr, now);

  if (!parsed) {
    return [
      { value: 'As soon as possible (approx. 30-45 mins)', label: 'As soon as possible (approx. 30-45 mins)', isAvailable: true },
      { value: 'In 1 Hour', label: 'In 1 Hour', isAvailable: true },
      { value: 'In 1.5 Hours', label: 'In 1.5 Hours', isAvailable: true },
      { value: 'In 2 Hours', label: 'In 2 Hours', isAvailable: true }
    ];
  }

  const options: { value: string; label: string; isAvailable: boolean }[] = [];

  if (status.isOpen) {
    options.push({
      value: 'As soon as possible (approx. 30-45 mins)',
      label: 'As soon as possible (approx. 30-45 mins)',
      isAvailable: true
    });
  }

  // Generate slots up to closing time
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = status.isBeforeOpen ? parsed.startHour * 60 + parsed.startMinute : Math.ceil((currentMinutes + 30) / 30) * 30;
  const endMinutes = parsed.endHour * 60 + parsed.endMinute;

  for (let min = startMinutes; min < endMinutes; min += 30) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m === 0 ? '00' : String(m).padStart(2, '0');
    const timeLabel = `${displayH}:${displayM} ${period}`;
    const valueStr = `Collection at ${timeLabel}`;

    options.push({
      value: valueStr,
      label: status.isBeforeOpen && min === startMinutes ? `At Opening Time (${timeLabel})` : timeLabel,
      isAvailable: true
    });
  }

  if (options.length === 0) {
    options.push({
      value: `Collection at ${status.opensAtLabel || 'Opening'}`,
      label: `Kitchen closed today. Opens at ${status.opensAtLabel || 'Opening'}`,
      isAvailable: false
    });
  }

  return options;
}
