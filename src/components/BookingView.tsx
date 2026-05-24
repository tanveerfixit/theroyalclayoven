/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Users, Home, Compass, PhoneCall, HelpCircle, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { Reservation } from '../types';

export const BookingView: React.FC = () => {
  // Booking inputs
  const [partySize, setPartySize] = React.useState<number>(2);
  const [bookingDate, setBookingDate] = React.useState<string>('');
  const [bookingTime, setBookingTime] = React.useState<string>('18:00');
  const [diningArea, setDiningArea] = React.useState<'Indoor' | 'Outdoor Garden' | 'Private Hall (Up to 50)'>('Indoor');
  const [selectedTableId, setSelectedTableId] = React.useState<number | null>(null);
  
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [specialRequests, setSpecialRequests] = React.useState('');
  
  // States
  const [confirmationMessage, setConfirmationMessage] = React.useState<Reservation | null>(null);
  const [localBookings, setLocalBookings] = React.useState<Reservation[]>([]);
  const [validationError, setValidationError] = React.useState('');

  // Default date setup
  React.useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Default to tomorrow
    const tomorrowStr = today.toISOString().split('T')[0];
    setBookingDate(tomorrowStr);
    
    // Retrieve historical logs
    fetchBookings();
  }, []);

  const fetchBookings = () => {
    const stored = localStorage.getItem('clay_oven_bookings');
    if (stored) {
      setLocalBookings(JSON.parse(stored));
    }
  };

  const handleTableClick = (tableNum: number, isOccupied: boolean) => {
    if (isOccupied) return;
    setSelectedTableId(tableNum);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
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
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    // Save
    const stored = localStorage.getItem('clay_oven_bookings');
    const existing: Reservation[] = stored ? JSON.parse(stored) : [];
    existing.unshift(newReservation);
    localStorage.setItem('clay_oven_bookings', JSON.stringify(existing));

    // Reset Form Input
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setSpecialRequests('');
    setSelectedTableId(null);
    setConfirmationMessage(newReservation);
    fetchBookings();
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
      
      {/* Editorial Header */}
      <div className="text-center max-w-xl mx-auto pt-8 space-y-3">
        <span className="font-mono text-sm tracking-widest text-brand-accent uppercase font-bold">
          RESERVATIONS
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-dark">
          Book Table / Functions
        </h1>
        <p className="text-sm text-brand-muted leading-relaxed font-normal">
          Enjoy in-house luxury dining. Double-capped private hall allows grand birthday layouts, corporate conferences, and outdoor barbecue buffet arrangements for up to 50 guests.
        </p>
      </div>

      {confirmationMessage ? (
        
        /* BOOKING CONFIRMED SCREEN */
        <div className="max-w-xl mx-auto bg-white border border-brand-dark p-8 sm:p-12 text-center space-y-6" id="booking-confirmed-card">
          <div className="w-16 h-16 bg-brand-accent text-white font-serif text-3xl flex items-center justify-center font-bold mx-auto">
            ✓
          </div>
          
          <div className="space-y-1">
            <span className="font-mono text-sm text-brand-accent font-bold tracking-widest uppercase">
              RESERVATION SECURED
            </span>
            <h2 className="font-serif text-2xl font-bold text-brand-dark">
              See You Soon, {confirmationMessage.name}!
            </h2>
            <span className="font-mono text-sm text-brand-muted uppercase block">
              Reference: <span className="font-bold text-brand-dark">{confirmationMessage.id}</span>
            </span>
          </div>

          <div className="border-t border-b border-brand-dark/15 py-6 text-left space-y-2.5 font-mono text-sm text-brand-muted">
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
              <p className="text-[11px] text-brand-muted font-normal leading-relaxed">
                Awesome! Because your party has 15 or more guests, our culinary captain will reach out via <span className="font-semibold text-brand-dark">{confirmationMessage.email}</span> within 12 hours to discuss our bespoke family-style buffet options.
              </p>
            </div>
          )}

          <p className="text-sm text-brand-muted font-normal leading-relaxed">
            A temporary confirmation card has been generated. If you prefer to modify your timings, feel free to telephone our direct line at <span className="font-semibold text-brand-dark">061 703 636</span>.
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
                  PICKUP TIME
                </label>
                <select
                  id="bk-time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full border border-brand-dark/10 p-3 text-sm font-mono bg-white outline-none focus:border-brand-dark"
                >
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="19:00">7:00 PM</option>
                  <option value="20:00">8:00 PM</option>
                  <option value="21:00">9:00 PM</option>
                  <option value="22:00">10:00 PM</option>
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
                <span className="font-mono text-xs text-brand-muted italic block">
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
              className="w-full bg-brand-accent text-white hover:bg-brand-dark py-4 text-sm font-mono uppercase tracking-widest font-bold transition-all"
            >
              CONFIRM RESERVATION ARRANGEMENTS
            </button>
          </form>

          {/* Interactive Seating layout with zero rounded corners */}
          <div className="lg:col-span-5 bg-white border border-brand-dark/10 p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-brand-dark">Interactive Seating Grid</h3>
              <p className="text-sm text-brand-muted font-normal leading-relaxed">
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
                    <div className="font-mono text-sm text-brand-muted">
                      Cap: <span className="font-bold text-brand-dark">{tbl.size} Seats</span>
                    </div>
                    <div className="font-mono text-xs mt-1 uppercase text-brand-accent font-bold">
                      {tbl.isOccupied ? 'OCCUPIED' : isSelected ? 'MY SELECTION' : 'FREE'}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between text-sm font-mono text-brand-muted pt-2 border-t border-brand-dark/5">
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

            <div className="p-4 bg-brand-beige border border-brand-dark/5 text-sm text-brand-muted font-normal leading-relaxed">
              * Seating allocation is subject to exact arrival timings. Tables are held for a maximum of 15 minutes past reservation hour.
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
