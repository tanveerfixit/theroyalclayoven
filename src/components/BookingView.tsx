/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Users, Home, Compass, PhoneCall, HelpCircle, ShieldCheck, Mail, ArrowRight, Sparkles, X } from 'lucide-react';
import { Reservation } from '../types';

export const BookingView: React.FC = () => {
  const [noticeText, setNoticeText] = React.useState(localStorage.getItem('clay_oven_booking_notice_text') || `Assalamu Alaikum, dear friends and valued guests,

We are incredibly grateful for the wonderful love and support you show us every single day!

While we would love nothing more than to celebrate Eid with all of you, we want to share that our restaurant is now completely fully booked for Eid this Wednesday.

To ensure that everyone dining with us has a fantastic experience, we are unfortunately unable to accept any further bookings or walk-ins for that day.

While we truly wish we could host every one of you on Wednesday, we would be absolutely delighted to welcome you, your family, and your friends on Thursday instead! Please do book a table with us so we can celebrate together then.

To bring a little extra joy to your week, we have some exciting news!

Due to popular demand, we are extending our special Pakistani breakfast service. You can now come and enjoy it with us on both Saturday and Sunday, rather than just on Sundays!

Thank you from the bottom of our hearts for your understanding and continuous support. We cannot wait to see your smiling faces soon!

Warmest regards,

The Royal Clay Oven`);
  const [noticePhone, setNoticePhone] = React.useState(localStorage.getItem('clay_oven_notice_phone') || '089 489 9950');
  const [noticeEnabled, setNoticeEnabled] = React.useState(localStorage.getItem('clay_oven_booking_notice_enabled') !== 'false');

  const [reservationsEnabled, setReservationsEnabled] = React.useState(localStorage.getItem('clay_oven_reservations_enabled') !== 'false');
  const [reservationsNoticeText, setReservationsNoticeText] = React.useState(localStorage.getItem('clay_oven_reservations_notice') || 'Table reservations are temporarily closed. Please telephone us to book a table!');

  const [showWarningModal, setShowWarningModal] = React.useState(false);
  const [showReservationsWarningModal, setShowReservationsWarningModal] = React.useState(false);

  const [businessInfo, setBusinessInfo] = React.useState({
    phone: '086 020 3720',
  });

  const [timingSettings, setTimingSettings] = React.useState<Record<string, string>>({
    monday: localStorage.getItem('clay_oven_timing_monday') || '4:00 PM - 9:00 PM',
    tuesday: localStorage.getItem('clay_oven_timing_tuesday') || '4:00 PM - 9:00 PM',
    wednesday: localStorage.getItem('clay_oven_timing_wednesday') || '4:00 PM - 9:00 PM',
    thursday: localStorage.getItem('clay_oven_timing_thursday') || '4:00 PM - 9:00 PM',
    friday: localStorage.getItem('clay_oven_timing_friday') || '4:00 PM - 9:00 PM',
    saturday: localStorage.getItem('clay_oven_timing_saturday') || '12:00 PM - 9:00 PM',
    sunday: localStorage.getItem('clay_oven_timing_sunday') || '10:00 AM - 6:00 PM',
    offset: localStorage.getItem('clay_oven_timing_offset') || 'KITCHEN CLOSES 15 MINS PRIOR'
  });

  // Sync settings with database on mount
  React.useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const res = await fetch('/api/business-info');
        if (res.ok) {
          const data = await res.json();
          setBusinessInfo({
            phone: data.phone || '086 020 3720',
          });
        }
      } catch (err) {
        console.error('Failed to load business info in BookingView:', err);
      }
    };

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setTimingSettings({
            monday: data.clay_oven_timing_monday || timingSettings.monday,
            tuesday: data.clay_oven_timing_tuesday || timingSettings.tuesday,
            wednesday: data.clay_oven_timing_wednesday || timingSettings.wednesday,
            thursday: data.clay_oven_timing_thursday || timingSettings.thursday,
            friday: data.clay_oven_timing_friday || timingSettings.friday,
            saturday: data.clay_oven_timing_saturday || timingSettings.saturday,
            sunday: data.clay_oven_timing_sunday || timingSettings.sunday,
            offset: data.clay_oven_timing_offset || timingSettings.offset
          });

          if (data.clay_oven_booking_notice_text) setNoticeText(data.clay_oven_booking_notice_text);
          if (data.clay_oven_notice_phone) setNoticePhone(data.clay_oven_notice_phone);
          
          if (data.clay_oven_booking_notice_enabled !== undefined) {
            const enabled = data.clay_oven_booking_notice_enabled !== 'false';
            setNoticeEnabled(enabled);
            setShowWarningModal(enabled);
          } else {
            setShowWarningModal(noticeEnabled);
          }

          if (data.clay_oven_reservations_enabled !== undefined) {
            const enabled = data.clay_oven_reservations_enabled !== 'false';
            setReservationsEnabled(enabled);
            setShowReservationsWarningModal(!enabled);
          } else {
            setShowReservationsWarningModal(!reservationsEnabled);
          }

          if (data.clay_oven_reservations_notice) setReservationsNoticeText(data.clay_oven_reservations_notice);
        } else {
          setShowWarningModal(noticeEnabled);
          setShowReservationsWarningModal(!reservationsEnabled);
        }
      } catch (err) {
        console.error('Failed to retrieve storefront settings:', err);
        setShowWarningModal(noticeEnabled);
        setShowReservationsWarningModal(!reservationsEnabled);
      }
    };

    fetchBusinessInfo();
    loadSettings();

    window.addEventListener('business_info_updated', fetchBusinessInfo);
    return () => {
      window.removeEventListener('business_info_updated', fetchBusinessInfo);
    };
  }, []);

  // Booking inputs
  const [partySize, setPartySize] = React.useState<number>(2);
  const [bookingDate, setBookingDate] = React.useState<string>('');
  const [bookingTime, setBookingTime] = React.useState<string>('18:00');
  const [diningArea, setDiningArea] = React.useState<'Indoor' | 'Outdoor Garden' | 'Private Hall (Up to 50)'>('Indoor');
  const [selectedTableId, setSelectedTableId] = React.useState<number | null>(null);

  // Helper to resolve opening hours for a specific date
  const getOpeningHoursForDate = (dateStr: string): string => {
    if (!dateStr) return '4:00 PM - 9:00 PM';
    try {
      const dateObj = new Date(dateStr);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[dateObj.getDay()];
      return timingSettings[dayName] || getDefaultHours(dayName);
    } catch (e) {
      return '4:00 PM - 9:00 PM';
    }
  };

  const getDefaultHours = (day: string): string => {
    if (day === 'sunday') return '10:00 AM - 6:00 PM';
    if (day === 'saturday') return '12:00 PM - 9:00 PM';
    return '4:00 PM - 9:00 PM';
  };

  // Helper to dynamically extract hour slots from timing configurations
  const getAvailableTimeSlots = (hoursStr: string): { value: string; label: string }[] => {
    const defaultSlots = [
      { value: '16:00', label: '4:00 PM' },
      { value: '17:00', label: '5:00 PM' },
      { value: '18:00', label: '6:00 PM' },
      { value: '19:00', label: '7:00 PM' },
      { value: '20:00', label: '8:00 PM' },
      { value: '21:00', label: '9:00 PM' }
    ];

    try {
      if (hoursStr.toUpperCase() === 'CLOSED') {
        return [];
      }

      const parts = hoursStr.split('-');
      if (parts.length !== 2) return defaultSlots;

      const parseHour = (str: string): number => {
        const cleaned = str.trim().toUpperCase();
        const match = cleaned.match(/(\d+):?(\d+)?\s*(AM|PM)/);
        if (!match) return 12;

        let hour = parseInt(match[1]);
        const period = match[3];

        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;

        return hour;
      };

      const startHour = parseHour(parts[0]);
      const endHour = parseHour(parts[1]);

      const slots = [];
      for (let h = startHour; h < endHour; h++) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        const padHour = String(h).padStart(2, '0');
        
        slots.push({
          value: `${padHour}:00`,
          label: `${displayHour}:00 ${ampm}`
        });
      }
      
      return slots.length > 0 ? slots : defaultSlots;
    } catch (err) {
      console.error('Error generating slots from timings', err);
      return defaultSlots;
    }
  };

  const currentDayHours = getOpeningHoursForDate(bookingDate);
  const timeSlots = getAvailableTimeSlots(currentDayHours);

  // Synchronize time selection when the selected date (and its available slots) shifts
  React.useEffect(() => {
    if (timeSlots.length > 0) {
      const isCurrentTimeValid = timeSlots.some(s => s.value === bookingTime);
      if (!isCurrentTimeValid) {
        setBookingTime(timeSlots[0].value);
      }
    } else {
      setBookingTime('');
    }
  }, [bookingDate, currentDayHours]);
  
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [specialRequests, setSpecialRequests] = React.useState('');
  
  // States
  const [confirmationMessage, setConfirmationMessage] = React.useState<Reservation | null>(null);
  const [localBookings, setLocalBookings] = React.useState<Reservation[]>([]);
  const [validationError, setValidationError] = React.useState('');

  const loadUserProfile = () => {
    const storedUser = localStorage.getItem('clay_oven_google_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.name) setCustomerName(user.name);
        if (user.phone) setCustomerPhone(user.phone);
        if (user.email) setCustomerEmail(user.email);
      } catch (err) {
        console.error('Failed to parse Google user data for booking', err);
      }
    }
  };

  const handleProfileUpdated = () => {
    loadUserProfile();
    fetchBookings();
  };

  // Default date setup
  React.useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Default to tomorrow
    const tomorrowStr = today.toISOString().split('T')[0];
    setBookingDate(tomorrowStr);
    
    // Retrieve historical logs
    fetchBookings();
    loadUserProfile();

    window.addEventListener('profile_updated', handleProfileUpdated);

    return () => {
      window.removeEventListener('profile_updated', handleProfileUpdated);
    };
  }, []);

  const fetchBookings = async () => {
    const storedUser = localStorage.getItem('clay_oven_google_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const res = await fetch(`/api/bookings?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setLocalBookings(data);
          return;
        }
      } catch (err) {
        console.error('Failed to fetch bookings from server', err);
      }
    }

    const stored = localStorage.getItem('clay_oven_bookings');
    if (stored) {
      setLocalBookings(JSON.parse(stored));
    }
  };

  const handleTableClick = (tableNum: number, isOccupied: boolean) => {
    if (isOccupied) return;
    setSelectedTableId(tableNum);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!customerName.trim()) {
      setValidationError('Please input your name.');
      return;
    }
    if (!customerPhone.trim()) {
      setValidationError('Telephone number is required.');
      return;
    }
    if (!customerEmail.trim()) {
      setValidationError('Email address is required.');
      return;
    }
    if (!bookingDate) {
      setValidationError('Please choose a valid scheduling date.');
      return;
    }

    const newReservation: Reservation = {
      id: 'RES-' + Math.floor(200000 + Math.random() * 800000),
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      partySize,
      date: bookingDate,
      time: bookingTime,
      diningArea,
      specialRequests: specialRequests.trim() ? specialRequests : undefined,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newReservation)
      });
      if (!response.ok) {
        throw new Error('Database save failed');
      }
    } catch (err) {
      console.error('Failed to save booking to server, saving locally', err);
    }

    // Save to local storage as secondary backup / cache
    const stored = localStorage.getItem('clay_oven_bookings');
    const existing: Reservation[] = stored ? JSON.parse(stored) : [];
    existing.unshift(newReservation);
    localStorage.setItem('clay_oven_bookings', JSON.stringify(existing));

    // Sync customer details to local storage and database
    const storedUser = localStorage.getItem('clay_oven_google_user');
    let existingUser = {};
    if (storedUser) {
      try {
        existingUser = JSON.parse(storedUser);
      } catch (err) {
        console.error('Failed to parse existing user', err);
      }
    }

    const updatedUser = {
      ...existingUser,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      picture: (existingUser as any).picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
    };

    // Save to local storage
    localStorage.setItem('clay_oven_google_user', JSON.stringify(updatedUser));

    // Save to database
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedUser)
      });
    } catch (err) {
      console.error('Failed to upsert user profile to server', err);
    }

    // Reset Form Input (special requests and table selection only)
    setSpecialRequests('');
    setSelectedTableId(null);
    setConfirmationMessage(newReservation);
    
    // Notify other views and sync the navbar and booking list
    window.dispatchEvent(new Event('profile_updated'));
  };

  // Occupancy map layout (determines which tables are pre-blocked or available based on date/time)
  const tables = [
    { num: 1, size: 2, isOccupied: false },
    { num: 2, size: 2, isOccupied: true },
    { num: 3, size: 4, isOccupied: false },
    { num: 4, size: 4, isOccupied: false },
    { num: 5, size: 6, isOccupied: false },
    { num: 6, size: 8, isOccupied: true },
    { num: 7, size: 4, isOccupied: false },
    { num: 8, size: 2, isOccupied: false },
    { num: 9, size: 10, isOccupied: false },
    { num: 10, size: 12, isOccupied: false }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-12 animate-fade-in" id="booking-view">
      
      {/* Editorial Header - Only displayed when table reservations are active */}
      {reservationsEnabled && (
        <div className="text-center max-w-xl mx-auto pt-4 sm:pt-8 space-y-2 mb-6 sm:mb-10">
          <span className="font-mono text-xs sm:text-sm tracking-widest text-brand-accent uppercase font-bold">
            RESERVATIONS
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-brand-dark">
            Book Table / Functions
          </h1>
          <p className="text-xs sm:text-sm text-brand-dark leading-relaxed font-normal px-2 sm:px-0">
            Enjoy in-house luxury dining. Double-capped private hall allows grand birthday layouts, corporate conferences, and outdoor barbecue buffet arrangements for up to 50 guests.
          </p>
        </div>
      )}

      {/* TIGHT MOBILE RESPONSIVE EMERGENCY RESERVATIONS BANNER (Only displays when reservations are paused) */}
      {!reservationsEnabled && (
        <div className="mb-6 border border-red-200 bg-red-50 p-4 text-left animate-fade-in" id="reservations-disabled-banner">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-red-800 font-extrabold uppercase tracking-widest block">★ ONLINE RESERVATIONS PAUSED</span>
              <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-brand-dark">
                We are actively taking bookings over the phone!
              </h2>
              <p className="text-xs sm:text-sm text-red-700 leading-relaxed font-sans font-medium">
                {reservationsNoticeText}
              </p>
            </div>
            <div className="shrink-0">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="w-full sm:w-auto inline-flex items-center justify-center bg-red-700 hover:bg-red-800 text-white font-mono font-bold text-xs uppercase tracking-wider px-5 py-3.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 mr-2" />
                Call to Book Table Now: {noticePhone}
              </a>
            </div>
          </div>
        </div>
      )}

      {confirmationMessage ? (
        
        /* BOOKING CONFIRMED SCREEN */
        <div className="max-w-xl mx-auto bg-white border border-brand-dark p-8 sm:p-12 text-center space-y-6" id="booking-confirmed-card">
          <div className="w-16 h-16 bg-brand-accent text-white font-serif text-3xl flex items-center justify-center font-bold mx-auto">
            ✓
          </div>
          
          <div className="space-y-1">
            <span className="font-mono text-sm text-brand-accent font-bold tracking-widest uppercase">
              RESERVATION REQUEST SUBMITTED
            </span>
            <h2 className="font-serif text-2xl font-bold text-brand-dark">
              We'll secure your table soon, {confirmationMessage.name}!
            </h2>
            <span className="font-mono text-sm text-brand-dark uppercase block">
              Reference: <span className="font-bold text-brand-dark">{confirmationMessage.id}</span>
            </span>
          </div>

          <div className="border-t border-b border-brand-dark/15 py-6 text-left space-y-2.5 font-mono text-sm text-brand-dark">
            <div className="flex justify-between">
              <span>Date Scheduled</span>
              <span className="text-brand-dark font-bold">{confirmationMessage.date}</span>
            </div>
            <div className="flex justify-between">
              <span>Fulfillment Time</span>
              <span className="text-brand-dark font-bold">{confirmationMessage.time}</span>
            </div>
            <div className="flex justify-between">
              <span>Guests Attending</span>
              <span className="text-brand-dark font-bold">{confirmationMessage.partySize} Pax</span>
            </div>
            <div className="flex justify-between">
              <span>Assigned Zone</span>
              <span className="text-brand-dark font-bold">{confirmationMessage.diningArea}</span>
            </div>
          </div>

          {confirmationMessage.partySize >= 15 && (
            <div className="p-4 bg-brand-beige border border-brand-accent/30 text-left space-y-1">
              <span className="font-mono text-sm font-bold text-brand-accent uppercase block">
                SPECIAL LARGE GROUP CATERING INFO
              </span>
              <p className="text-[11px] text-brand-dark font-normal leading-relaxed">
                Awesome! Because your party has 15 or more guests, our culinary captain will reach out via <span className="font-semibold text-brand-dark">{confirmationMessage.email}</span> within 12 hours to discuss our bespoke family-style buffet options.
              </p>
            </div>
          )}

          <p className="text-sm text-brand-dark font-normal leading-relaxed">
            A temporary confirmation card has been generated. If you prefer to modify your timings, feel free to telephone our direct line at <span className="font-semibold text-brand-dark">{businessInfo.phone}</span>.
          </p>

          <button
            type="button"
            id="book-another-btn"
            onClick={() => setConfirmationMessage(null)}
            className="w-full bg-brand-dark text-white hover:bg-brand-accent py-3.5 text-sm font-mono uppercase tracking-widest font-bold font-medium"
          >
            BOOK ANOTHER TABLE
          </button>
        </div>

      ) : (

        /* PRIMARY BOOKING FORM GRID */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Form parameters */}
          <form onSubmit={handleBookingSubmit} className="lg:col-span-7 bg-white border border-brand-dark/10 p-6 sm:p-10 space-y-6">
            <h2 className="font-serif text-2xl font-bold tracking-tight border-b border-brand-dark/10 pb-4">
              Reservation Details
            </h2>

            {validationError && (
              <div className="p-4 bg-red-50 text-red-800 text-sm font-mono border border-red-200" id="booking-validation-error">
                {validationError}
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label htmlFor="bk-date" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                  DATE
                </label>
                <input
                  id="bk-date"
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full border border-brand-dark/10 p-3 text-sm font-mono bg-brand-beige/10 outline-none focus:border-brand-dark"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="bk-time" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                  RESERVATION TIME
                </label>
                <select
                  id="bk-time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full border border-brand-dark/10 p-3 text-sm font-mono bg-white outline-none focus:border-brand-dark"
                  disabled={timeSlots.length === 0}
                >
                  {timeSlots.length === 0 ? (
                    <option value="">Closed on this day</option>
                  ) : (
                    timeSlots.map(slot => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))
                  )}
                </select>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label htmlFor="bk-party" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                  PARTY SIZE (GUESTS)
                </label>
                <input
                  id="bk-party"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value) || 2)}
                  className="w-full border border-brand-dark/10 p-3 text-sm font-mono bg-brand-beige/10 outline-none focus:border-brand-dark"
                />
                <span className="font-mono text-xs text-brand-dark italic block">
                  * Dynamic hall allows seating layouts up to 50 guests.
                </span>
              </div>

              <div className="space-y-1">
                <label htmlFor="bk-area" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                  DINING LAYOUT AREA
                </label>
                <select
                  id="bk-area"
                  value={diningArea}
                  onChange={(e) => setDiningArea(e.target.value as any)}
                  className="w-full border border-brand-dark/10 p-3 text-sm font-mono bg-white outline-none focus:border-brand-dark"
                >
                  <option value="Indoor">Indoor Main Hall</option>
                  <option value="Outdoor Garden">Outdoor Zen Garden</option>
                  <option value="Private Hall (Up to 50)">Private Vault (Corporate / Buffets)</option>
                </select>
              </div>

            </div>

            {/* If group is larger than 15, show special catering alert */}
            {partySize >= 15 && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-sm font-mono space-y-1" id="large-party-notice">
                <span className="font-bold text-amber-800">★ PRIVATE BANQUET DETECTED</span>
                <p className="text-amber-800 leading-relaxed font-normal">
                  For groups larger than 15 guests, we offer specialized Pakistani feast menus and table buffet selections customized to your desires. Our catering captain will email you to plan details!
                </p>
              </div>
            )}

            {/* Customer Particulars */}
            <div className="space-y-3">
              <span className="block font-mono text-sm tracking-widest text-brand-accent uppercase font-bold">
                COMMUNICATION RECORD INFO
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border border-brand-dark/10 p-3 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="tel"
                    required
                    placeholder="Contact Telephone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border border-brand-dark/10 p-3 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full border border-brand-dark/10 p-3 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="bk-requests" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                SPECIAL REQUESTS / SEATING PREFERENCES
              </label>
              <textarea
                id="bk-requests"
                rows={3}
                placeholder="High chairs for infants, customized wheelchair placements, allergy warnings, etc."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full border border-brand-dark/10 p-3 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10"
              ></textarea>
            </div>

            <button
              type="submit"
              id="confirm-booking-btn"
              disabled={!reservationsEnabled}
              className={`w-full py-4 text-sm font-mono uppercase tracking-widest font-bold transition-all ${
                !reservationsEnabled
                  ? 'bg-red-700 hover:bg-red-800 text-white cursor-not-allowed opacity-80'
                  : 'bg-brand-accent text-white hover:bg-brand-dark'
              }`}
            >
              {!reservationsEnabled ? 'RESERVATIONS SUSPENDED (CALL BY PHONE)' : 'CONFIRM RESERVATION ARRANGEMENTS'}
            </button>
          </form>

          {/* Interactive Seating layout with zero rounded corners */}
          <div className="lg:col-span-5 bg-white border border-brand-dark/10 p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-brand-dark">Interactive Seating Grid</h3>
              <p className="text-sm text-brand-dark font-normal leading-relaxed">
                Click an available table (white square) matching your party size.
              </p>
            </div>

            {/* Tables Grid map */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-brand-beige border border-brand-dark/10" id="tables-floorplan-grid">
              {tables.map((tbl) => {
                const isSelected = selectedTableId === tbl.num;
                return (
                  <button
                    type="button"
                    key={tbl.num}
                    id={`table-seat-btn-${tbl.num}`}
                    onClick={() => handleTableClick(tbl.num, tbl.isOccupied)}
                    className={`p-4 border text-left transition-all ${
                      tbl.isOccupied
                        ? 'bg-brand-dark/10 border-brand-dark/5 text-brand-dark/30 cursor-not-allowed'
                        : isSelected
                        ? 'bg-brand-dark text-white border-brand-dark ring-2 ring-brand-accent ring-offset-2'
                        : 'bg-white hover:border-brand-dark border-brand-dark/15 text-brand-dark'
                    }`}
                    disabled={tbl.isOccupied}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-sm font-bold">TABLE {tbl.num}</span>
                      <span className={`w-1.5 h-1.5 rounded-none inline-block ${tbl.isOccupied ? 'bg-red-400' : isSelected ? 'bg-brand-accent' : 'bg-emerald-400'}`}></span>
                    </div>
                    <div className="font-mono text-sm text-brand-dark">
                      Cap: <span className="font-bold text-brand-dark">{tbl.size} Seats</span>
                    </div>
                    <div className="font-mono text-xs mt-1 uppercase text-brand-accent font-bold">
                      {tbl.isOccupied ? 'OCCUPIED' : isSelected ? 'MY SELECTION' : 'FREE'}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between text-sm font-mono text-brand-dark pt-2 border-t border-brand-dark/5">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-emerald-400 mr-1.5 inline-block"></span> AVAILABLE
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-brand-dark/10 mr-1.5 inline-block"></span> OCCUPIED
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-brand-dark mr-1.5 inline-block ring-1 ring-brand-accent"></span> SELECTED
              </span>
            </div>

            <div className="p-4 bg-brand-beige border border-brand-dark/5 text-sm text-brand-dark font-normal leading-relaxed">
              * Seating allocation is subject to exact arrival timings. Tables are held for a maximum of 15 minutes past reservation hour.
            </div>
          </div>

        </div>
      )}

      {/* Custom Warning Modal Dialog */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-brand-dark p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-slide-up">
            
            {/* Close Button X */}
            <button
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="absolute top-4 right-4 p-1.5 text-brand-dark hover:text-brand-dark hover:bg-brand-dark/5 transition-colors border border-transparent hover:border-brand-dark/10"
              aria-label="Close warning"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Content */}
            <div className="text-center space-y-4 pt-2">
              <div className="w-12 h-12 bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-brand-dark">
                Book Table / Functions Notice
              </h3>
              <div className="max-h-[35vh] overflow-y-auto pr-1 text-left scrollbar-thin border-y border-brand-dark/5 py-2">
                <p className="font-sans text-xs sm:text-sm text-brand-dark leading-relaxed font-medium whitespace-pre-line">
                  {noticeText}
                </p>
              </div>
              <p className="font-sans text-2xl font-extrabold text-brand-dark tracking-tight">
                {noticePhone}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white py-3.5 text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors flex items-center justify-center space-x-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Now</span>
              </a>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="flex-1 border border-brand-dark/15 hover:border-brand-dark text-brand-dark py-3.5 text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors"
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Table Reservations Suspended Warning Modal Dialog */}
      {showReservationsWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 backdrop-blur-sm animate-fade-in" id="reservations-disabled-modal">
          <div className="relative w-full max-w-md bg-white border border-brand-dark p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-slide-up">
            
            {/* Close Button X */}
            <button
              type="button"
              onClick={() => setShowReservationsWarningModal(false)}
              className="absolute top-4 right-4 p-1.5 text-brand-dark hover:text-brand-dark hover:bg-brand-dark/5 transition-colors border border-transparent hover:border-brand-dark/10"
              aria-label="Close warning"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Content */}
            <div className="text-center space-y-4 pt-2">
              <div className="w-12 h-12 bg-red-100 text-red-700 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-brand-dark">
                Online Bookings Paused
              </h3>
              <p className="font-sans text-sm sm:text-base text-brand-dark leading-relaxed font-medium text-center">
                {reservationsNoticeText}
              </p>
              <p className="font-sans text-xs text-brand-accent font-bold uppercase tracking-wider">
                We are actively taking table bookings by phone! Please dial:
              </p>
              <p className="font-sans text-3xl font-extrabold text-brand-dark tracking-tight">
                {noticePhone}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white py-3.5 text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors flex items-center justify-center space-x-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Us to Book</span>
              </a>
              <button
                type="button"
                onClick={() => setShowReservationsWarningModal(false)}
                className="flex-1 border border-brand-dark/15 hover:border-brand-dark text-brand-dark py-3.5 text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors"
              >
                View Seating Grid
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
