/**
 * useStoreSettings — Single source of truth for all store-wide settings.
 * Accepts the raw storeSettings Record<string, string> prop from App.tsx,
 * syncs to localStorage for resilience, and returns strongly-typed values.
 * Components read settings from this hook only — no direct localStorage calls.
 */
import { useState, useEffect } from 'react';
import { safeLocalGetString, safeLocalGetBool, safeLocalGetNumber, safeLocalSet } from '../utils/storage';
import { parseDeliverySchedule, getDefaultDeliverySchedule } from '../utils/deliveryScheduler';
import type { DeliveryZone } from '../types';
import type { DeliverySchedule } from '../utils/deliveryScheduler';

function parseDeliveryZones(raw: string | null | undefined): DeliveryZone[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export interface StoreSettingsValues {
  noticeText: string; noticePhone: string; noticeEnabled: boolean;
  bookingNoticeText: string; bookingNoticeEnabled: boolean;
  takeawayEnabled: boolean; takeawayNotice: string; takeawayCharges: number;
  deliveryCharges: number; deliveryZones: DeliveryZone[]; deliverySchedule: DeliverySchedule;
  reservationsEnabled: boolean; reservationsNotice: string;
  timings: { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string; saturday: string; sunday: string; offset: string; };
  festiveEnabled: boolean; festiveDisplayMode: 'banner' | 'text'; festiveBannerUrl: string;
  festiveTargetDishId: string; festiveBannerCtaEnabled: boolean; festiveBannerCtaText: string;
  festiveBannerAlt: string; festiveHeader: string; festiveSubheader: string;
  festiveDescription: string; festivePrice: string; festivePriceLabel: string; festiveItemsRaw: string;
  imageHeroBg: string; imageHeritageLeft: string; imageHeritageRight: string;
}

const DEFAULTS: StoreSettingsValues = {
  noticeText: 'We are Still Working on Website, for online order please contact.',
  noticePhone: '089 489 9950', noticeEnabled: true,
  bookingNoticeText: '', bookingNoticeEnabled: false,
  takeawayEnabled: true, takeawayNotice: 'We are temporarily not taking online orders. Please phone us to order directly!', takeawayCharges: 0.95,
  deliveryCharges: 3.00, deliveryZones: [], deliverySchedule: getDefaultDeliverySchedule(),
  reservationsEnabled: true, reservationsNotice: 'Table reservations are temporarily closed. Please telephone us to book a table!',
  timings: { monday: '4:00 PM - 9:00 PM', tuesday: '4:00 PM - 9:00 PM', wednesday: '4:00 PM - 9:00 PM', thursday: '4:00 PM - 9:00 PM', friday: '4:00 PM - 9:00 PM', saturday: '12:00 PM - 9:00 PM', sunday: '10:00 AM - 6:00 PM', offset: 'KITCHEN CLOSES 15 MINS PRIOR' },
  festiveEnabled: true, festiveDisplayMode: 'banner', festiveBannerUrl: '', festiveTargetDishId: '',
  festiveBannerCtaEnabled: true, festiveBannerCtaText: 'Order Special Offer Online', festiveBannerAlt: 'Special Offer Announcement',
  festiveHeader: "FATHER'S DAY DINNER", festiveSubheader: 'Sunday, 21st June', festiveDescription: '', festivePrice: '39.95', festivePriceLabel: 'FOR 2 PEOPLE:', festiveItemsRaw: '',
  imageHeroBg: '/hero-bg.webp',
  imageHeritageLeft: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=500&q=70&fm=webp',
  imageHeritageRight: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=500&q=70&fm=webp',
};

export function useStoreSettings(storeSettings: Record<string, string>): StoreSettingsValues {
  const [values, setValues] = useState<StoreSettingsValues>(() => ({
    noticeText: safeLocalGetString('clay_oven_notice_text', DEFAULTS.noticeText),
    noticePhone: safeLocalGetString('clay_oven_notice_phone', DEFAULTS.noticePhone),
    noticeEnabled: safeLocalGetBool('clay_oven_notice_enabled', DEFAULTS.noticeEnabled),
    bookingNoticeText: safeLocalGetString('clay_oven_booking_notice_text', DEFAULTS.bookingNoticeText),
    bookingNoticeEnabled: safeLocalGetBool('clay_oven_booking_notice_enabled', DEFAULTS.bookingNoticeEnabled),
    takeawayEnabled: safeLocalGetBool('clay_oven_takeaway_enabled', DEFAULTS.takeawayEnabled),
    takeawayNotice: safeLocalGetString('clay_oven_takeaway_notice', DEFAULTS.takeawayNotice),
    takeawayCharges: safeLocalGetNumber('clay_oven_takeaway_charges', DEFAULTS.takeawayCharges),
    deliveryCharges: safeLocalGetNumber('clay_oven_delivery_charges', DEFAULTS.deliveryCharges),
    deliveryZones: parseDeliveryZones(localStorage.getItem('clay_oven_delivery_zones')),
    deliverySchedule: parseDeliverySchedule(localStorage.getItem('clay_oven_delivery_schedule')),
    reservationsEnabled: safeLocalGetBool('clay_oven_reservations_enabled', DEFAULTS.reservationsEnabled),
    reservationsNotice: safeLocalGetString('clay_oven_reservations_notice', DEFAULTS.reservationsNotice),
    timings: {
      monday:    safeLocalGetString('clay_oven_timing_monday',    DEFAULTS.timings.monday),
      tuesday:   safeLocalGetString('clay_oven_timing_tuesday',   DEFAULTS.timings.tuesday),
      wednesday: safeLocalGetString('clay_oven_timing_wednesday', DEFAULTS.timings.wednesday),
      thursday:  safeLocalGetString('clay_oven_timing_thursday',  DEFAULTS.timings.thursday),
      friday:    safeLocalGetString('clay_oven_timing_friday',    DEFAULTS.timings.friday),
      saturday:  safeLocalGetString('clay_oven_timing_saturday',  DEFAULTS.timings.saturday),
      sunday:    safeLocalGetString('clay_oven_timing_sunday',    DEFAULTS.timings.sunday),
      offset:    safeLocalGetString('clay_oven_timing_offset',    DEFAULTS.timings.offset),
    },
    festiveEnabled: safeLocalGetBool('clay_oven_festive_enabled', DEFAULTS.festiveEnabled),
    festiveDisplayMode: (safeLocalGetString('clay_oven_festive_display_mode', DEFAULTS.festiveDisplayMode) as 'banner' | 'text'),
    festiveBannerUrl: safeLocalGetString('clay_oven_image_festive_banner', DEFAULTS.festiveBannerUrl),
    festiveTargetDishId: safeLocalGetString('clay_oven_festive_target_dish_id', DEFAULTS.festiveTargetDishId),
    festiveBannerCtaEnabled: safeLocalGetBool('clay_oven_festive_banner_cta_enabled', DEFAULTS.festiveBannerCtaEnabled),
    festiveBannerCtaText: safeLocalGetString('clay_oven_festive_banner_cta_text', DEFAULTS.festiveBannerCtaText),
    festiveBannerAlt: safeLocalGetString('clay_oven_festive_banner_alt', DEFAULTS.festiveBannerAlt),
    festiveHeader: safeLocalGetString('clay_oven_festive_header', DEFAULTS.festiveHeader),
    festiveSubheader: safeLocalGetString('clay_oven_festive_subheader', DEFAULTS.festiveSubheader),
    festiveDescription: safeLocalGetString('clay_oven_festive_description', DEFAULTS.festiveDescription),
    festivePrice: safeLocalGetString('clay_oven_festive_price', DEFAULTS.festivePrice),
    festivePriceLabel: safeLocalGetString('clay_oven_festive_price_label', DEFAULTS.festivePriceLabel),
    festiveItemsRaw: safeLocalGetString('clay_oven_festive_items', DEFAULTS.festiveItemsRaw),
    imageHeroBg: safeLocalGetString('clay_oven_image_hero_bg', DEFAULTS.imageHeroBg),
    imageHeritageLeft: safeLocalGetString('clay_oven_image_heritage_left', DEFAULTS.imageHeritageLeft),
    imageHeritageRight: safeLocalGetString('clay_oven_image_heritage_right', DEFAULTS.imageHeritageRight),
  }));

  useEffect(() => {
    if (!storeSettings || Object.keys(storeSettings).length === 0) return;
    const d = storeSettings;
    const noticeEnabled = d.clay_oven_notice_enabled !== undefined ? d.clay_oven_notice_enabled !== 'false' : values.noticeEnabled;
    const bookingNoticeEnabled = d.clay_oven_booking_notice_enabled !== undefined ? d.clay_oven_booking_notice_enabled !== 'false' : values.bookingNoticeEnabled;
    const takeawayEnabled = d.clay_oven_takeaway_enabled !== undefined ? d.clay_oven_takeaway_enabled !== 'false' : values.takeawayEnabled;
    const tc = parseFloat(d.clay_oven_takeaway_charges ?? ''); const takeawayCharges = isNaN(tc) ? values.takeawayCharges : tc;
    const dc = parseFloat(d.clay_oven_delivery_charges ?? ''); const deliveryCharges = isNaN(dc) ? values.deliveryCharges : dc;
    const deliveryZones = d.clay_oven_delivery_zones ? parseDeliveryZones(d.clay_oven_delivery_zones) : values.deliveryZones;
    const deliverySchedule = d.clay_oven_delivery_schedule ? parseDeliverySchedule(d.clay_oven_delivery_schedule) : values.deliverySchedule;
    const reservationsEnabled = d.clay_oven_reservations_enabled !== undefined ? d.clay_oven_reservations_enabled !== 'false' : values.reservationsEnabled;
    const festiveBannerCtaEnabled = d.clay_oven_festive_banner_cta_enabled !== undefined ? d.clay_oven_festive_banner_cta_enabled !== 'false' : values.festiveBannerCtaEnabled;
    const next: StoreSettingsValues = {
      noticeText: d.clay_oven_notice_text || values.noticeText, noticePhone: d.clay_oven_notice_phone || values.noticePhone, noticeEnabled,
      bookingNoticeText: d.clay_oven_booking_notice_text || values.bookingNoticeText, bookingNoticeEnabled,
      takeawayEnabled, takeawayNotice: d.clay_oven_takeaway_notice || values.takeawayNotice, takeawayCharges,
      deliveryCharges, deliveryZones, deliverySchedule,
      reservationsEnabled, reservationsNotice: d.clay_oven_reservations_notice || values.reservationsNotice,
      timings: { monday: d.clay_oven_timing_monday || values.timings.monday, tuesday: d.clay_oven_timing_tuesday || values.timings.tuesday, wednesday: d.clay_oven_timing_wednesday || values.timings.wednesday, thursday: d.clay_oven_timing_thursday || values.timings.thursday, friday: d.clay_oven_timing_friday || values.timings.friday, saturday: d.clay_oven_timing_saturday || values.timings.saturday, sunday: d.clay_oven_timing_sunday || values.timings.sunday, offset: d.clay_oven_timing_offset || values.timings.offset },
      festiveEnabled: d.clay_oven_festive_enabled !== undefined ? d.clay_oven_festive_enabled !== 'false' : values.festiveEnabled,
      festiveDisplayMode: (d.clay_oven_festive_display_mode as 'banner' | 'text') || values.festiveDisplayMode,
      festiveBannerUrl: d.clay_oven_image_festive_banner ?? values.festiveBannerUrl,
      festiveTargetDishId: d.clay_oven_festive_target_dish_id ?? values.festiveTargetDishId,
      festiveBannerCtaEnabled, festiveBannerCtaText: d.clay_oven_festive_banner_cta_text || values.festiveBannerCtaText,
      festiveBannerAlt: d.clay_oven_festive_banner_alt || values.festiveBannerAlt,
      festiveHeader: d.clay_oven_festive_header || values.festiveHeader, festiveSubheader: d.clay_oven_festive_subheader || values.festiveSubheader,
      festiveDescription: d.clay_oven_festive_description || values.festiveDescription, festivePrice: d.clay_oven_festive_price || values.festivePrice,
      festivePriceLabel: d.clay_oven_festive_price_label || values.festivePriceLabel, festiveItemsRaw: d.clay_oven_festive_items || values.festiveItemsRaw,
      imageHeroBg: d.clay_oven_image_hero_bg || values.imageHeroBg, imageHeritageLeft: d.clay_oven_image_heritage_left || values.imageHeritageLeft, imageHeritageRight: d.clay_oven_image_heritage_right || values.imageHeritageRight,
    };
    safeLocalSet('clay_oven_notice_text', next.noticeText); safeLocalSet('clay_oven_notice_phone', next.noticePhone); safeLocalSet('clay_oven_notice_enabled', String(next.noticeEnabled));
    safeLocalSet('clay_oven_booking_notice_text', next.bookingNoticeText); safeLocalSet('clay_oven_booking_notice_enabled', String(next.bookingNoticeEnabled));
    safeLocalSet('clay_oven_takeaway_enabled', String(next.takeawayEnabled)); safeLocalSet('clay_oven_takeaway_notice', next.takeawayNotice); safeLocalSet('clay_oven_takeaway_charges', String(next.takeawayCharges));
    safeLocalSet('clay_oven_delivery_charges', String(next.deliveryCharges)); safeLocalSet('clay_oven_delivery_zones', JSON.stringify(next.deliveryZones)); safeLocalSet('clay_oven_delivery_schedule', JSON.stringify(next.deliverySchedule));
    safeLocalSet('clay_oven_reservations_enabled', String(next.reservationsEnabled)); safeLocalSet('clay_oven_reservations_notice', next.reservationsNotice);
    safeLocalSet('clay_oven_timing_monday', next.timings.monday); safeLocalSet('clay_oven_timing_tuesday', next.timings.tuesday); safeLocalSet('clay_oven_timing_wednesday', next.timings.wednesday); safeLocalSet('clay_oven_timing_thursday', next.timings.thursday); safeLocalSet('clay_oven_timing_friday', next.timings.friday); safeLocalSet('clay_oven_timing_saturday', next.timings.saturday); safeLocalSet('clay_oven_timing_sunday', next.timings.sunday); safeLocalSet('clay_oven_timing_offset', next.timings.offset);
    safeLocalSet('clay_oven_festive_enabled', String(next.festiveEnabled)); safeLocalSet('clay_oven_festive_display_mode', next.festiveDisplayMode);
    safeLocalSet('clay_oven_festive_target_dish_id', next.festiveTargetDishId); safeLocalSet('clay_oven_festive_banner_cta_enabled', String(next.festiveBannerCtaEnabled));
    safeLocalSet('clay_oven_festive_banner_cta_text', next.festiveBannerCtaText); safeLocalSet('clay_oven_festive_banner_alt', next.festiveBannerAlt);
    setValues(next);
  }, [storeSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  return values;
}
