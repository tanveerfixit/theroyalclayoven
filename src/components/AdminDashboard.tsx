import React, { useState, useEffect, useRef } from 'react';
import { Play, Check, X, ShieldAlert, ShoppingBag, Calendar, ListFilter, Search, RefreshCw, Volume2, ShieldCheck, Clock, Settings, Sparkles } from 'lucide-react';
import { Order, Reservation } from '../types';
import { MENU_ITEMS, CATEGORIES } from '../data/menu';

const OPEN_TIME_OPTIONS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM'
];

const CLOSE_TIME_OPTIONS = [
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM',
  '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM',
  '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM'
];

export const AdminDashboard: React.FC = () => {
  // Authentication states
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Console active sub-tabs
  const [adminTab, setAdminTab] = useState<'orders' | 'bookings' | 'functions' | 'catalog' | 'settings'>('orders');

  // Form states for creating a new Function booking
  const [funcName, setFuncName] = useState('');
  const [funcEmail, setFuncEmail] = useState('');
  const [funcPhone, setFuncPhone] = useState('');
  const [funcGuests, setFuncGuests] = useState(15);
  const [funcDate, setFuncDate] = useState('');
  const [funcTime, setFuncTime] = useState('18:00');
  const [funcArea, setFuncArea] = useState('Private Hall (Up to 50)');
  const [funcRequests, setFuncRequests] = useState('');
  const [funcPackage, setFuncPackage] = useState('Custom Karahi Feast');
  const [funcSuccess, setFuncSuccess] = useState(false);
  const [funcError, setFuncError] = useState('');

  // Custom Timings & Notice Settings states
  const [timingMonday, setTimingMonday] = useState('4:00 PM - 9:00 PM');
  const [timingTuesday, setTimingTuesday] = useState('4:00 PM - 9:00 PM');
  const [timingWednesday, setTimingWednesday] = useState('4:00 PM - 9:00 PM');
  const [timingThursday, setTimingThursday] = useState('4:00 PM - 9:00 PM');
  const [timingFriday, setTimingFriday] = useState('4:00 PM - 9:00 PM');
  const [timingSaturday, setTimingSaturday] = useState('12:00 PM - 9:00 PM');
  const [timingSunday, setTimingSunday] = useState('10:00 AM - 6:00 PM');
  const [timingOffset, setTimingOffset] = useState('KITCHEN CLOSES 15 MINS PRIOR');

  const [noticeText, setNoticeText] = useState('We are Still Working on Website, for online order please contact.');
  const [noticePhone, setNoticePhone] = useState('089 489 9950');
  const [noticeEnabled, setNoticeEnabled] = useState(true);

  const [bookingNoticeText, setBookingNoticeText] = useState(`Assalamu Alaikum, dear friends and valued guests,

We are incredibly grateful for the wonderful love and support you show us every single day!

While we would love nothing more than to celebrate Eid with all of you, we want to share that our restaurant is now completely fully booked for Eid this Wednesday.

To ensure that everyone dining with us has a fantastic experience, we are unfortunately unable to accept any further bookings or walk-ins for that day.

While we truly wish we could host every one of you on Wednesday, we would be absolutely delighted to welcome you, your family, and your friends on Thursday instead! Please do book a table with us so we can celebrate together then.

To bring a little extra joy to your week, we have some exciting news!

Due to popular demand, we are extending our special Pakistani breakfast service. You can now come and enjoy it with us on both Saturday and Sunday, rather than just on Sundays!

Thank you from the bottom of our hearts for your understanding and continuous support. We cannot wait to see your smiling faces soon!

Warmest regards,

The Royal Clay Oven`);
  const [bookingNoticeEnabled, setBookingNoticeEnabled] = useState(true);

  // Takeaway Online Order Enable/Disable controls
  const [takeawayEnabled, setTakeawayEnabled] = useState(true);
  const [takeawayNoticeText, setTakeawayNoticeText] = useState('We are temporarily not taking online orders. Please phone us to order directly!');

  // Reservation Enable/Disable controls
  const [reservationsEnabled, setReservationsEnabled] = useState(true);
  const [reservationsNoticeText, setReservationsNoticeText] = useState('Table reservations are temporarily closed. Please telephone us to book a table!');

  // Notice Sub-tabs settings pane navigation: 'takeaway' | 'reservations' | 'announcements' | 'festive'
  const [settingsSubTab, setSettingsSubTab] = useState<'takeaway' | 'reservations' | 'announcements' | 'festive'>('takeaway');

  // Festive Offer states
  const [festiveEnabled, setFestiveEnabled] = useState(true);
  const [festiveHeader, setFestiveHeader] = useState('BANK HOLIDAY WEEKEND');
  const [festiveSubheader, setFestiveSubheader] = useState('Running: Thursday — Friday — Monday');
  const [festiveDescription, setFestiveDescription] = useState('Celebrate the festive weekend with our custom curated clay oven specialty platter. Crafted with premium Pakistani heritage recipes and fresh local ingredients.');
  const [festivePrice, setFestivePrice] = useState('35.00');
  const [festiveItems, setFestiveItems] = useState(`Beef Nihari | Slow-cooked, rich beef shank stew cooked to melt-in-mouth perfection, served with 1 fresh hot tandoori naan.
Clay Oven BBQ Platter | A flame-roasted collection of 1 Beef Chapli Kebab, 1 tender Lamb Chop, and 1 Royal Kebab Skewer.
Zeera Rice | Fragrant cumin-tempered basmati rice with aromatic herbs.
Complimentary Accompaniments | Includes fresh garden salad, traditional yogurt Raita, and tangy herb chutney.
Falooda (1 Serving) | A delicious, cold traditional dessert drink featuring rose syrup, basil seeds, vermicelli, and sweet milk.`);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.clay_oven_timing_monday) setTimingMonday(data.clay_oven_timing_monday);
        if (data.clay_oven_timing_tuesday) setTimingTuesday(data.clay_oven_timing_tuesday);
        if (data.clay_oven_timing_wednesday) setTimingWednesday(data.clay_oven_timing_wednesday);
        if (data.clay_oven_timing_thursday) setTimingThursday(data.clay_oven_timing_thursday);
        if (data.clay_oven_timing_friday) setTimingFriday(data.clay_oven_timing_friday);
        if (data.clay_oven_timing_saturday) setTimingSaturday(data.clay_oven_timing_saturday);
        if (data.clay_oven_timing_sunday) setTimingSunday(data.clay_oven_timing_sunday);
        if (data.clay_oven_timing_offset) setTimingOffset(data.clay_oven_timing_offset);

        if (data.clay_oven_notice_text) setNoticeText(data.clay_oven_notice_text);
        if (data.clay_oven_notice_phone) setNoticePhone(data.clay_oven_notice_phone);
        if (data.clay_oven_notice_enabled !== undefined) setNoticeEnabled(data.clay_oven_notice_enabled !== 'false');

        if (data.clay_oven_booking_notice_text) setBookingNoticeText(data.clay_oven_booking_notice_text);
        if (data.clay_oven_booking_notice_enabled !== undefined) setBookingNoticeEnabled(data.clay_oven_booking_notice_enabled !== 'false');

        if (data.clay_oven_takeaway_enabled !== undefined) setTakeawayEnabled(data.clay_oven_takeaway_enabled !== 'false');
        if (data.clay_oven_takeaway_notice) setTakeawayNoticeText(data.clay_oven_takeaway_notice);

        if (data.clay_oven_reservations_enabled !== undefined) setReservationsEnabled(data.clay_oven_reservations_enabled !== 'false');
        if (data.clay_oven_reservations_notice) setReservationsNoticeText(data.clay_oven_reservations_notice);

        if (data.clay_oven_festive_enabled !== undefined) setFestiveEnabled(data.clay_oven_festive_enabled !== 'false');
        if (data.clay_oven_festive_header) setFestiveHeader(data.clay_oven_festive_header);
        if (data.clay_oven_festive_subheader) setFestiveSubheader(data.clay_oven_festive_subheader);
        if (data.clay_oven_festive_description) setFestiveDescription(data.clay_oven_festive_description);
        if (data.clay_oven_festive_price) setFestivePrice(data.clay_oven_festive_price);
        if (data.clay_oven_festive_items) setFestiveItems(data.clay_oven_festive_items);
      }
    } catch (err) {
      console.error('Failed to fetch storefront settings:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    
    const settingsPayload = {
      'clay_oven_timing_monday': timingMonday,
      'clay_oven_timing_tuesday': timingTuesday,
      'clay_oven_timing_wednesday': timingWednesday,
      'clay_oven_timing_thursday': timingThursday,
      'clay_oven_timing_friday': timingFriday,
      'clay_oven_timing_saturday': timingSaturday,
      'clay_oven_timing_sunday': timingSunday,
      'clay_oven_timing_offset': timingOffset,
      'clay_oven_notice_text': noticeText,
      'clay_oven_notice_phone': noticePhone,
      'clay_oven_notice_enabled': String(noticeEnabled),
      'clay_oven_booking_notice_text': bookingNoticeText,
      'clay_oven_booking_notice_enabled': String(bookingNoticeEnabled),
      'clay_oven_takeaway_enabled': String(takeawayEnabled),
      'clay_oven_takeaway_notice': takeawayNoticeText,
      'clay_oven_reservations_enabled': String(reservationsEnabled),
      'clay_oven_reservations_notice': reservationsNoticeText,
      'clay_oven_festive_enabled': String(festiveEnabled),
      'clay_oven_festive_header': festiveHeader,
      'clay_oven_festive_subheader': festiveSubheader,
      'clay_oven_festive_description': festiveDescription,
      'clay_oven_festive_price': festivePrice,
      'clay_oven_festive_items': festiveItems
    };

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsPayload)
      });
      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error('Server responded with an error');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      // Fallback: save to localStorage anyway
      Object.entries(settingsPayload).forEach(([key, val]) => {
        localStorage.setItem(key, val);
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreateFunction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuncError('');
    setFuncSuccess(false);

    if (!funcName || !funcEmail || !funcPhone || !funcDate) {
      setFuncError('Please fill in all required fields.');
      return;
    }

    const newFunctionBooking = {
      id: 'FUNC-' + Math.floor(100000 + Math.random() * 900000),
      name: funcName,
      email: funcEmail,
      phone: funcPhone,
      partySize: funcGuests,
      date: funcDate,
      time: funcTime,
      diningArea: funcArea,
      specialRequests: `Package: ${funcPackage}${funcRequests ? ` | Requests: ${funcRequests}` : ''}`,
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newFunctionBooking)
      });
      if (response.ok) {
        setFuncSuccess(true);
        setFuncName('');
        setFuncEmail('');
        setFuncPhone('');
        setFuncGuests(15);
        setFuncDate('');
        setFuncTime('18:00');
        setFuncRequests('');
        setFuncPackage('Custom Karahi Feast');
        
        // Refresh bookings
        fetchData();
      } else {
        throw new Error('Server response was not ok');
      }
    } catch (err) {
      console.error(err);
      setFuncError('Failed to save function booking to server. Saving locally instead.');
      
      // Save locally as backup
      const stored = localStorage.getItem('clay_oven_bookings');
      const existing = stored ? JSON.parse(stored) : [];
      existing.unshift(newFunctionBooking);
      localStorage.setItem('clay_oven_bookings', JSON.stringify(existing));
      
      setFuncSuccess(true);
      fetchData();
    }
  };

  // Database states
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Reservation[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [muteSound, setMuteSound] = useState(false);

  // Keep track of order count to play audio alert on increment
  const prevOrderCountRef = useRef<number>(0);

  // Handle Passcode Numeric Input
  const handleKeypadPress = (num: string) => {
    setAuthError(false);
    if (passcode.length < 4) {
      const nextCode = passcode + num;
      setPasscode(nextCode);
      
      // Auto-validate once 4 digits are completed
      if (nextCode === '4321') {
        setTimeout(() => {
          setIsAuthenticated(true);
          setPasscode('');
        }, 150);
      } else if (nextCode.length === 4) {
        setTimeout(() => {
          setAuthError(true);
          setPasscode('');
        }, 200);
      }
    }
  };

  const handleClearKeypad = () => {
    setPasscode('');
    setAuthError(false);
  };

  // Synthesize dynamic clean notification chime using Web Audio API (zero external files required)
  const playNewOrderChime = () => {
    if (muteSound) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, startTime);
        
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      // Pleasant double digital synthesizer chime (High pitch bell tone)
      playTone(880, audioCtx.currentTime, 0.12);
      playTone(1320, audioCtx.currentTime + 0.08, 0.3);
    } catch (e) {
      console.warn('Web Audio synthesis blocked or not supported by browser:', e);
    }
  };

  // Fetch admin orders & bookings data
  const fetchData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [ordersRes, bookingsRes] = await Promise.all([
        fetch(`/api/admin/orders?t=${Date.now()}`),
        fetch(`/api/admin/bookings?t=${Date.now()}`)
      ]);

      if (ordersRes.ok && bookingsRes.ok) {
        const ordersData: Order[] = await ordersRes.json();
        const bookingsData: Reservation[] = await bookingsRes.json();
        
        // Filter out fully completed orders to keep board focused
        setOrders(ordersData);
        setBookings(bookingsData);

        // Sound Notification Logic: If order count has increased, play alert chime!
        const activeNewOrders = ordersData.filter(o => o.status === 'Received').length;
        if (prevOrderCountRef.current !== undefined && activeNewOrders > prevOrderCountRef.current) {
          playNewOrderChime();
        }
        prevOrderCountRef.current = activeNewOrders;
      }
      
      // Synchronize administrative storefront settings from the database
      await fetchSettings();
    } catch (err) {
      console.error('Failed to sync admin data', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for data updates
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 12000); // Poll every 12s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, muteSound]);

  // Update Takeaway Order Status
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: Order['status']) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) {
        // Optimistically update frontend state
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      }
    } catch (err) {
      console.error('Failed to update order status', err);
    }
  };

  // Update Booking Status
  const handleUpdateBookingStatus = async (bookingId: string, nextStatus: Reservation['status'], sendEmail: boolean = false) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus, sendEmail })
      });
      if (response.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: nextStatus } : b));
      }
    } catch (err) {
      console.error('Failed to update booking status', err);
    }
  };

  // Render Timing dropdown helper with structured Open, Close, and Closed controls
  const renderTimingField = (id: string, value: string, setValue: (val: string) => void, label: string) => {
    // Parse combined string
    const isClosed = !value || value.trim().toUpperCase() === 'CLOSED';
    let currentOpen = '12:00 PM';
    let currentClose = '9:00 PM';
    
    if (!isClosed) {
      const parts = value.split(' - ');
      if (parts.length === 2) {
        currentOpen = parts[0].trim();
        currentClose = parts[1].trim();
      }
    }

    const handleToggleClosed = () => {
      if (isClosed) {
        // Re-open with current defaults
        setValue(`${currentOpen} - ${currentClose}`);
      } else {
        setValue('CLOSED');
      }
    };

    const handleOpenChange = (newOpen: string) => {
      setValue(`${newOpen} - ${currentClose}`);
    };

    const handleCloseChange = (newClose: string) => {
      setValue(`${currentOpen} - ${newClose}`);
    };

    // Ensure custom/saved values are present in options lists
    const openChoices = OPEN_TIME_OPTIONS.includes(currentOpen) 
      ? OPEN_TIME_OPTIONS 
      : [currentOpen, ...OPEN_TIME_OPTIONS];
      
    const closeChoices = CLOSE_TIME_OPTIONS.includes(currentClose) 
      ? CLOSE_TIME_OPTIONS 
      : [currentClose, ...CLOSE_TIME_OPTIONS];

    return (
      <div className="border border-brand-dark/10 p-3 bg-white space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-brand-dark uppercase font-bold tracking-wider">{label}</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox"
              checked={isClosed}
              onChange={handleToggleClosed}
              className="accent-brand-accent w-3.5 h-3.5"
            />
            <span className="font-mono text-[10px] font-bold text-red-700 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 border border-red-200">CLOSED</span>
          </label>
        </div>

        {!isClosed && (
          <div className="grid grid-cols-2 gap-2 animate-fade-in">
            <div className="space-y-0.5">
              <span className="block font-sans text-[9px] text-brand-muted uppercase font-bold tracking-wider">OPEN TIME</span>
              <select
                id={`${id}-open`}
                value={currentOpen}
                onChange={(e) => handleOpenChange(e.target.value)}
                className="w-full border border-brand-dark/10 p-1.5 text-xs font-mono focus:border-brand-dark outline-none bg-brand-beige/20 cursor-pointer"
              >
                {openChoices.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-0.5">
              <span className="block font-sans text-[9px] text-brand-muted uppercase font-bold tracking-wider">CLOSE TIME</span>
              <select
                id={`${id}-close`}
                value={currentClose}
                onChange={(e) => handleCloseChange(e.target.value)}
                className="w-full border border-brand-dark/10 p-1.5 text-xs font-mono focus:border-brand-dark outline-none bg-brand-beige/20 cursor-pointer"
              >
                {closeChoices.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* --- AUTHENTICATION PASSCODE keyPad LOCK SCREEN --- */
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 animate-fade-in flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full bg-white border border-brand-dark/15 p-8 text-center space-y-6 shadow-[0_8px_30px_rgba(44,38,33,0.04)]">
          <div className="w-14 h-14 bg-brand-accent/5 border border-brand-accent/35 text-brand-accent flex items-center justify-center rounded-none mx-auto animate-pulse">
            <ShieldAlert className="w-6 h-6 stroke-[1.5]" />
          </div>
          
          <div className="space-y-1">
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Staff Portal Access</h2>
            <p className="font-mono text-xs uppercase tracking-widest text-brand-muted">
              Enter 4-Digit Security Passcode
            </p>
          </div>

          {/* Masked Dots Indicator */}
          <div className="flex justify-center space-x-4 py-3">
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx}
                className={`w-3.5 h-3.5 border transition-all duration-200 ${
                  authError 
                    ? 'bg-red-600 border-red-600 animate-bounce' 
                    : passcode.length > idx 
                    ? 'bg-brand-dark border-brand-dark scale-110' 
                    : 'bg-transparent border-brand-dark/20'
                }`}
                style={{ transitionDelay: `${idx * 20}ms` }}
              />
            ))}
          </div>

          {authError && (
            <p className="text-xs font-mono text-red-600 font-bold uppercase tracking-wide animate-shake">
              ★ Security Passcode Invalid
            </p>
          )}

          {/* Sharp Flat Numeric Grid Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                type="button"
                key={num}
                onClick={() => handleKeypadPress(num)}
                className="w-16 h-16 bg-brand-beige border border-brand-dark/10 hover:border-brand-dark font-mono text-xl text-brand-dark flex items-center justify-center font-semibold active:bg-brand-dark active:text-white transition-all rounded-none"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearKeypad}
              className="w-16 h-16 bg-red-50 border border-red-200 hover:border-red-600 font-mono text-xs text-red-600 font-bold flex items-center justify-center active:bg-red-600 active:text-white transition-all rounded-none"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="w-16 h-16 bg-brand-beige border border-brand-dark/10 hover:border-brand-dark font-mono text-xl text-brand-dark flex items-center justify-center font-semibold active:bg-brand-dark active:text-white transition-all rounded-none"
            >
              0
            </button>
            <div className="w-16 h-16 flex items-center justify-center border border-transparent">
              <span className="text-[9px] font-mono text-brand-muted/40 uppercase">PIN: 4321</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter Bookings by Search Query
  const filteredBookings = bookings.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.phone.includes(searchQuery) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-8 animate-fade-in" id="admin-console-view">
      
      {/* Console Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-dark/10 pb-6 pt-4">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-300/40 px-2 py-0.5 uppercase">
              Authenticated Admin Session
            </span>
            <button 
              onClick={playNewOrderChime}
              className="p-1 text-brand-muted hover:text-brand-dark transition-colors"
              title="Test Sound Chime"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-brand-dark">
            Management &amp; Kitchen Console
          </h1>
        </div>

        {/* Global Controls Panel */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMuteSound(!muteSound)}
            className={`px-4 py-2 border font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              muteSound
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white hover:bg-brand-dark/5 border-brand-dark/10 text-brand-muted'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{muteSound ? 'SOUND MUTED' : 'SOUND ALERTS ON'}</span>
          </button>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="bg-white border border-brand-dark/10 hover:border-brand-dark text-brand-dark px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 active:bg-brand-dark/5 disabled:opacity-50 transition-all rounded-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'SYNCING...' : 'SYNC CONSOLE'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            className="border border-red-200 hover:border-red-600 text-red-600 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
          >
            LOCK SESSION
          </button>
        </div>
      </div>

      {/* Main Console Subtabs Navigation */}
      <div className="flex space-x-6 border-b border-brand-dark/10">
        <button
          onClick={() => setAdminTab('orders')}
          className={`pb-4 font-mono text-xs font-bold uppercase tracking-widest border-b-2 flex items-center gap-1.5 transition-all ${
            adminTab === 'orders'
              ? 'border-brand-dark text-brand-dark'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Active Takeaways ({orders.filter(o => o.status !== 'Completed').length})</span>
        </button>
        <button
          onClick={() => setAdminTab('bookings')}
          className={`pb-4 font-mono text-xs font-bold uppercase tracking-widest border-b-2 flex items-center gap-1.5 transition-all ${
            adminTab === 'bookings'
              ? 'border-brand-dark text-brand-dark'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Table Bookings ({bookings.filter(b => b.status === 'Confirmed').length})</span>
        </button>
        <button
          onClick={() => setAdminTab('functions')}
          className={`pb-4 font-mono text-xs font-bold uppercase tracking-widest border-b-2 flex items-center gap-1.5 transition-all ${
            adminTab === 'functions'
              ? 'border-brand-dark text-brand-dark'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Functions ({bookings.filter(b => (b.id.startsWith('FUNC') || b.diningArea.includes('Private Hall') || b.partySize >= 12) && b.status === 'Confirmed').length})</span>
        </button>
        <button
          onClick={() => setAdminTab('catalog')}
          className={`pb-4 font-mono text-xs font-bold uppercase tracking-widest border-b-2 flex items-center gap-1.5 transition-all ${
            adminTab === 'catalog'
              ? 'border-brand-dark text-brand-dark'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Catalog Directory</span>
        </button>
        <button
          onClick={() => setAdminTab('settings')}
          className={`pb-4 font-mono text-xs font-bold uppercase tracking-widest border-b-2 flex items-center gap-1.5 transition-all ${
            adminTab === 'settings'
              ? 'border-brand-dark text-brand-dark'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Notice &amp; Timings</span>
        </button>
      </div>

      {/* --- CONTENT TABS SWITCH BOARD --- */}

      {/* 1. TAB: ACTIVE TAKEAWAY ORDERS */}
      {adminTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="admin-orders-board">
          
          {/* COLUMN 1: NEW/RECEIVED */}
          <div className="bg-white border border-brand-dark/10 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-brand-dark/10 pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-accent flex items-center gap-1.5">
                <span className="w-2 h-2 bg-brand-accent animate-ping inline-block"></span>
                RECEIVED (NEW)
              </span>
              <span className="font-mono text-xs bg-brand-accent/5 text-brand-accent font-bold px-2 py-0.5 border border-brand-accent/15">
                {orders.filter(o => o.status === 'Received').length} Active
              </span>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">
              {orders.filter(o => o.status === 'Received').length === 0 ? (
                <p className="text-sm text-brand-muted font-mono italic text-center py-10">No new orders placed.</p>
              ) : (
                orders.filter(o => o.status === 'Received').map(order => (
                  <div key={order.id} className="p-4 border border-brand-dark/15 hover:border-brand-dark/30 bg-[#FDFBF7]/40 space-y-4 relative transition-all shadow-[0_4px_12px_rgba(44,38,33,0.008)]">
                    <div className="flex justify-between items-start font-mono text-sm">
                      <div>
                        <span className="font-bold text-brand-dark block">ORDER: {order.id}</span>
                        <span className="text-xs text-brand-muted">Placed: {new Date(order.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-brand-accent font-bold text-base">&euro;{order.total.toFixed(2)}</span>
                    </div>

                    <div className="text-xs font-mono border-t border-b border-brand-dark/5 py-2 space-y-1 text-brand-muted">
                      <div>Customer: <span className="font-bold text-brand-dark">{order.customerInfo.name}</span></div>
                      <div>Contact: <span className="underline">{order.customerInfo.phone}</span></div>
                      <div>Time: <span className="font-bold text-brand-dark uppercase">{order.customerInfo.preferredTime}</span></div>
                      <div>Type: <span className="font-bold uppercase text-brand-accent">{order.serviceType}</span></div>
                      {order.customerInfo.address && (
                        <div className="pt-1 font-sans text-brand-dark border-t border-dashed border-brand-dark/5 mt-1 font-medium">
                          Deliver: {order.customerInfo.address}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="font-mono text-xs font-bold text-brand-dark uppercase block">Items:</span>
                      <ul className="text-xs font-mono text-brand-muted space-y-1 list-disc list-inside">
                        {order.items.map((it, i) => (
                          <li key={i} className="truncate">
                            {it.quantity}x {it.name} {it.size ? `(${it.size})` : ''}
                            {it.notes && <span className="text-brand-accent block font-sans italic text-[11px] pl-3">&ldquo;{it.notes}&rdquo;</span>}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {order.customerInfo.notes && (
                      <div className="p-2 bg-amber-50/50 border border-amber-100 text-[11px] font-sans text-amber-800 italic leading-relaxed">
                        ★ "{order.customerInfo.notes}"
                      </div>
                    )}

                    <div className="pt-2 border-t border-brand-dark/5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'Preparing')}
                        className="bg-brand-dark text-white hover:bg-brand-accent px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-none active:scale-95 transition-all"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>START PREPARING</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: IN PREPARATION */}
          <div className="bg-white border border-brand-dark/10 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-brand-dark/10 pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-500 inline-block"></span>
                PREPARING (COOKING)
              </span>
              <span className="font-mono text-xs bg-brand-dark/5 text-brand-dark font-bold px-2 py-0.5 border border-brand-dark/10">
                {orders.filter(o => o.status === 'Preparing').length} Active
              </span>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">
              {orders.filter(o => o.status === 'Preparing').length === 0 ? (
                <p className="text-sm text-brand-muted font-mono italic text-center py-10">No orders actively cooking.</p>
              ) : (
                orders.filter(o => o.status === 'Preparing').map(order => (
                  <div key={order.id} className="p-4 border border-brand-dark/15 hover:border-brand-dark/30 bg-[#FDFBF7]/40 space-y-4 relative transition-all shadow-[0_4px_12px_rgba(44,38,33,0.008)]">
                    <div className="flex justify-between items-start font-mono text-sm">
                      <div>
                        <span className="font-bold text-brand-dark block">ORDER: {order.id}</span>
                        <span className="text-xs text-brand-muted">Placed: {new Date(order.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-brand-dark font-bold text-base">&euro;{order.total.toFixed(2)}</span>
                    </div>

                    <div className="text-xs font-mono border-t border-b border-brand-dark/5 py-2 space-y-1 text-brand-muted">
                      <div>Customer: <span className="font-bold text-brand-dark">{order.customerInfo.name}</span></div>
                      <div>Contact: <span className="underline">{order.customerInfo.phone}</span></div>
                      <div>Time: <span className="font-bold text-brand-dark uppercase">{order.customerInfo.preferredTime}</span></div>
                      <div>Type: <span className="font-bold uppercase text-brand-accent">{order.serviceType}</span></div>
                      {order.customerInfo.address && (
                        <div className="pt-1 font-sans text-brand-dark border-t border-dashed border-brand-dark/5 mt-1 font-medium">
                          Deliver: {order.customerInfo.address}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="font-mono text-xs font-bold text-brand-dark uppercase block">Items:</span>
                      <ul className="text-xs font-mono text-brand-muted space-y-1 list-disc list-inside">
                        {order.items.map((it, i) => (
                          <li key={i} className="truncate">
                            {it.quantity}x {it.name} {it.size ? `(${it.size})` : ''}
                            {it.notes && <span className="text-brand-accent block font-sans italic text-[11px] pl-3">&ldquo;{it.notes}&rdquo;</span>}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-brand-dark/5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'Ready for Collection')}
                        className="bg-emerald-700 text-white hover:bg-emerald-800 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-none active:scale-95 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>MARK READY</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: READY / DELIVERING */}
          <div className="bg-white border border-brand-dark/10 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-brand-dark/10 pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 inline-block"></span>
                READY FOR DISPATCH
              </span>
              <span className="font-mono text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 border border-emerald-200">
                {orders.filter(o => o.status === 'Ready for Collection' || o.status === 'Out for Delivery').length} Active
              </span>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">
              {orders.filter(o => o.status === 'Ready for Collection' || o.status === 'Out for Delivery').length === 0 ? (
                <p className="text-sm text-brand-muted font-mono italic text-center py-10">No orders waiting on dispatch.</p>
              ) : (
                orders.filter(o => o.status === 'Ready for Collection' || o.status === 'Out for Delivery').map(order => (
                  <div key={order.id} className="p-4 border border-emerald-600/20 hover:border-emerald-600/40 bg-emerald-50/5 space-y-4 relative transition-all shadow-[0_4px_12px_rgba(44,38,33,0.008)]">
                    <div className="flex justify-between items-start font-mono text-sm">
                      <div>
                        <span className="font-bold text-brand-dark block">ORDER: {order.id}</span>
                        <span className="text-xs text-brand-muted">Placed: {new Date(order.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-emerald-800 font-bold text-base">&euro;{order.total.toFixed(2)}</span>
                    </div>

                    <div className="text-xs font-mono border-t border-b border-brand-dark/5 py-2 space-y-1 text-brand-muted">
                      <div>Customer: <span className="font-bold text-brand-dark">{order.customerInfo.name}</span></div>
                      <div>Contact: <span className="underline">{order.customerInfo.phone}</span></div>
                      <div>Time: <span className="font-bold text-brand-dark uppercase">{order.customerInfo.preferredTime}</span></div>
                      <div>Type: <span className="font-bold uppercase text-brand-accent">{order.serviceType}</span></div>
                      {order.customerInfo.address && (
                        <div className="pt-1 font-sans text-brand-dark border-t border-dashed border-brand-dark/5 mt-1 font-medium">
                          Deliver: {order.customerInfo.address}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="font-mono text-xs font-bold text-brand-dark uppercase block">Items:</span>
                      <ul className="text-xs font-mono text-brand-muted space-y-1 list-disc list-inside">
                        {order.items.map((it, i) => (
                          <li key={i} className="truncate">
                            {it.quantity}x {it.name} {it.size ? `(${it.size})` : ''}
                            {it.notes && <span className="text-brand-accent block font-sans italic text-[11px] pl-3">&ldquo;{it.notes}&rdquo;</span>}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-brand-dark/5 flex gap-2 justify-end">
                      {order.serviceType === 'delivery' && order.status === 'Ready for Collection' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order.id, 'Out for Delivery')}
                          className="bg-brand-dark text-white hover:bg-brand-accent px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider rounded-none active:scale-95 transition-all"
                        >
                          OUT FOR DELIVERY
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'Completed')}
                        className="bg-emerald-700 text-white hover:bg-emerald-800 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider rounded-none active:scale-95 transition-all"
                      >
                        COMPLETE &amp; CLOSE
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* 2. TAB: DINING RESERVATIONS PLANNER */}
      {adminTab === 'bookings' && (
        <div className="bg-white border border-brand-dark/10 p-6 space-y-6 animate-fade-in" id="admin-bookings-tab">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-dark/5 pb-4">
            <h2 className="font-serif text-xl font-bold text-brand-dark flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-brand-accent" />
              Dining Reservations Log
            </h2>
            
            {/* Search Input Filter */}
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-muted">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by name, phone or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-brand-dark/10 font-mono text-xs focus:border-brand-dark focus:outline-none bg-brand-beige/5 rounded-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredBookings.length === 0 ? (
              <p className="text-sm font-mono text-brand-muted text-center py-20 italic">
                No matching dining reservations mapped.
              </p>
            ) : (
              <table className="w-full border-collapse font-mono text-xs text-left">
                <thead>
                  <tr className="border-b border-brand-dark/15 text-brand-muted uppercase text-[10px] tracking-wider bg-brand-beige/10">
                    <th className="py-3 px-4">REF ID</th>
                    <th className="py-3 px-4">CUSTOMER Details</th>
                    <th className="py-3 px-4">GUESTS</th>
                    <th className="py-3 px-4">TIMINGS</th>
                    <th className="py-3 px-4">ZONE SECTION</th>
                    <th className="py-3 px-4">SPECIAL REQUESTS</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dark/5">
                  {filteredBookings.map((b) => {
                    const isCancelled = b.status === 'Cancelled';
                    return (
                      <tr key={b.id} className={`hover:bg-brand-beige/20 transition-colors ${isCancelled ? 'opacity-50' : ''}`}>
                        <td className="py-4 px-4 font-bold text-brand-dark">{b.id}</td>
                        <td className="py-4 px-4 font-sans text-sm">
                          <div className="font-bold text-brand-dark font-mono text-xs">{b.name}</div>
                          <div className="text-xs text-brand-muted">{b.email}</div>
                          <div className="text-xs text-brand-muted font-mono">{b.phone}</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-brand-dark">{b.partySize} Pax</td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-brand-dark">{b.date}</div>
                          <div className="text-brand-muted">{b.time}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-brand-dark/5 px-2 py-0.5 border border-brand-dark/5 font-semibold text-brand-dark">
                            {b.diningArea}
                          </span>
                        </td>
                        <td className="py-4 px-4 max-w-xs font-sans text-brand-muted text-xs leading-relaxed italic">
                          {b.specialRequests || <span className="text-brand-muted/30 font-mono">&mdash; None</span>}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase ${
                            isCancelled
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : b.status === 'Pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex gap-2 justify-end items-center">
                            {b.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(b.id, 'Confirmed', true)}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 font-bold uppercase rounded-none transition-all active:scale-95 border border-emerald-800"
                                  title="Confirm booking and send receipt"
                                >
                                  CONFIRM &amp; EMAIL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(b.id, 'Cancelled')}
                                  className="border border-red-200 hover:border-red-600 text-red-600 px-2 py-1 font-bold uppercase rounded-none transition-all active:scale-95"
                                >
                                  CANCEL
                                </button>
                              </>
                            )}
                            {b.status === 'Confirmed' && (
                              <>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 border border-emerald-300 uppercase tracking-wider">
                                  ✓ CONFIRMED (DONE)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(b.id, 'Confirmed', true)}
                                  className="border border-brand-dark/15 hover:border-brand-dark text-brand-dark px-2 py-1 font-bold uppercase rounded-none transition-all active:scale-95 text-[10px]"
                                  title="Resend confirmation email"
                                >
                                  RESEND EMAIL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(b.id, 'Cancelled')}
                                  className="border border-red-200 hover:border-red-600 text-red-600 px-2 py-1 font-bold uppercase rounded-none transition-all active:scale-95"
                                >
                                  CANCEL
                                </button>
                              </>
                            )}
                            {b.status === 'Cancelled' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateBookingStatus(b.id, 'Confirmed')}
                                className="border border-brand-dark/15 hover:border-brand-dark text-brand-dark px-2 py-1 font-bold uppercase rounded-none transition-all active:scale-95"
                              >
                                RESTORE
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB: CATALOG MENU DIRECTORY INSPECTOR */}
      {adminTab === 'catalog' && (
        <div className="bg-white border border-brand-dark/10 p-6 space-y-8 animate-fade-in" id="admin-catalog-tab">
          
          <div className="border-b border-brand-dark/5 pb-4 flex justify-between items-center">
            <h2 className="font-serif text-xl font-bold text-brand-dark flex items-center">
              <ListFilter className="w-5 h-5 mr-2 text-brand-accent" />
              Restaurant Category Catalog
            </h2>
            <span className="font-mono text-xs text-brand-muted bg-brand-dark/5 px-2 py-0.5 border border-brand-dark/5">
              {MENU_ITEMS.length} Active Dishes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {CATEGORIES.map((category) => {
              const categoryItems = MENU_ITEMS.filter(it => it.category === category);
              return (
                <div key={category} className="border border-brand-dark/10 p-4 space-y-4 bg-brand-beige/5 shadow-[0_2px_8px_rgba(44,38,33,0.005)]">
                  <h3 className="font-serif text-lg font-bold text-brand-dark border-b border-brand-dark/5 pb-2 text-left uppercase flex justify-between items-center">
                    <span>{category}</span>
                    <span className="font-mono text-xs bg-brand-dark text-white px-2 py-0.5">{categoryItems.length}</span>
                  </h3>

                  <div className="divide-y divide-brand-dark/5 space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {categoryItems.map((item, idx) => (
                      <div key={item.id} className={`pt-3 space-y-1.5 ${idx === 0 ? 'border-t-0 pt-0' : ''}`}>
                        <div className="flex justify-between items-start font-mono text-xs">
                          <div>
                            <span className="font-serif text-sm font-bold text-brand-dark flex items-center gap-1.5">
                              {item.name}
                              {item.isVeg && (
                                <span className="w-1.5 h-1.5 bg-emerald-600 inline-block rounded-none ring-1" title="Veg Available"></span>
                              )}
                            </span>
                            <span className="text-[10px] text-brand-muted block uppercase">DISh ID: {item.id}</span>
                          </div>
                          <span className="font-bold text-brand-dark">&euro;{item.price.toFixed(2)}</span>
                        </div>

                        {item.description && (
                          <p className="text-xs text-brand-muted leading-relaxed font-sans font-normal text-left">
                            {item.description}
                          </p>
                        )}
                        
                        {item.sizeOptions && item.sizeOptions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="font-mono text-[9px] text-brand-accent tracking-widest font-bold uppercase">SIZES:</span>
                            {item.sizeOptions.map(sz => (
                              <span key={sz.name} className="bg-brand-dark/5 border border-brand-dark/5 px-1.5 py-0.5 text-[9px] font-mono text-brand-muted">
                                {sz.name} (&euro;{sz.price.toFixed(2)})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* 4. TAB: TIMING & NOTICE SETTINGS */}
      {adminTab === 'settings' && (
        <div className="bg-white border border-brand-dark/10 p-6 sm:p-8 space-y-8 animate-fade-in text-left font-sans" id="admin-settings-tab">
          
          <div className="border-b border-brand-dark/5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-brand-dark flex items-center">
                <Settings className="w-5 h-5 mr-2 text-brand-accent animate-pulse" />
                Store Controls &amp; Settings
              </h2>
              <p className="text-xs text-brand-muted mt-1 font-sans">
                Manage online ordering, table reservations, landing page notices, and weekly schedules.
              </p>
            </div>
            {saveSuccess && (
              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300/40 px-3 py-1 animate-fade-in">
                ✓ SETTINGS SAVED SUCCESSFULLY
              </span>
            )}
          </div>

          {/* Sub-tab navigation */}
          <div className="flex border-b border-brand-dark/10">
            <button
              type="button"
              onClick={() => setSettingsSubTab('takeaway')}
              className={`px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                settingsSubTab === 'takeaway'
                  ? 'border-brand-accent text-brand-accent bg-brand-beige/10'
                  : 'border-transparent text-brand-muted hover:text-brand-dark'
              }`}
            >
              1. Takeaway Settings
            </button>
            <button
              type="button"
              onClick={() => setSettingsSubTab('reservations')}
              className={`px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                settingsSubTab === 'reservations'
                  ? 'border-brand-accent text-brand-accent bg-brand-beige/10'
                  : 'border-transparent text-brand-muted hover:text-brand-dark'
              }`}
            >
              2. Reservation Settings
            </button>
            <button
              type="button"
              onClick={() => setSettingsSubTab('announcements')}
              className={`px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                settingsSubTab === 'announcements'
                  ? 'border-brand-accent text-brand-accent bg-brand-beige/10'
                  : 'border-transparent text-brand-muted hover:text-brand-dark'
              }`}
            >
              3. Announcements &amp; Timings
            </button>
            <button
              type="button"
              onClick={() => setSettingsSubTab('festive')}
              className={`px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                settingsSubTab === 'festive'
                  ? 'border-brand-accent text-brand-accent bg-brand-beige/10'
                  : 'border-transparent text-brand-muted hover:text-brand-dark'
              }`}
            >
              4. Festive Offer
            </button>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-8">
            
            {/* SUBTAB 1: TAKEAWAY SETTINGS */}
            {settingsSubTab === 'takeaway' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2 border-b border-brand-dark/5 pb-4">
                  <h3 className="font-serif text-lg font-bold text-brand-dark">
                    Takeaway / Online Ordering Control
                  </h3>
                  <p className="text-xs text-brand-muted leading-relaxed font-sans font-normal">
                    Turn online takeaway ordering ON or OFF. When disabled, customers cannot place online takeaway orders and will see a notice popup and banner.
                  </p>
                </div>

                <div className="max-w-2xl space-y-6">
                  {/* Enabled Toggle */}
                  <div className="flex items-center justify-between border border-brand-dark/10 p-5 bg-[#FDFBF7]">
                    <div className="space-y-1">
                      <span className="block font-mono text-xs text-brand-dark font-bold uppercase tracking-wider">
                        ONLINE ORDERING (TAKEAWAY)
                      </span>
                      <span className="block text-[11px] text-brand-muted font-sans font-normal">
                        Toggle to immediately stop or start accepting online takeaway orders.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTakeawayEnabled(!takeawayEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        takeawayEnabled ? 'bg-emerald-700' : 'bg-red-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          takeawayEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Service Closed Notice Textarea */}
                  <div className="space-y-2">
                    <label htmlFor="settings-takeaway-notice" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                      TAKEAWAY CLOSED CUSTOM BANNER &amp; POPUP TEXT
                    </label>
                    <textarea
                      id="settings-takeaway-notice"
                      rows={4}
                      required
                      value={takeawayNoticeText}
                      onChange={(e) => setTakeawayNoticeText(e.target.value)}
                      className="w-full border border-brand-dark/10 p-4 text-xs font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none resize-y"
                      placeholder="e.g. We are temporarily not taking online orders. Please phone us to order directly!"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: RESERVATION SETTINGS */}
            {settingsSubTab === 'reservations' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2 border-b border-brand-dark/5 pb-4">
                  <h3 className="font-serif text-lg font-bold text-brand-dark">
                    Table Reservations Control
                  </h3>
                  <p className="text-xs text-brand-muted leading-relaxed font-sans font-normal">
                    Turn table booking reservations ON or OFF. When disabled, customers cannot book tables online and will see a notice popup and banner.
                  </p>
                </div>

                <div className="max-w-2xl space-y-6">
                  {/* Enabled Toggle */}
                  <div className="flex items-center justify-between border border-brand-dark/10 p-5 bg-[#FDFBF7]">
                    <div className="space-y-1">
                      <span className="block font-mono text-xs text-brand-dark font-bold uppercase tracking-wider">
                        TABLE RESERVATIONS (ONLINE BOOKING)
                      </span>
                      <span className="block text-[11px] text-brand-muted font-sans font-normal">
                        Toggle to immediately stop or start accepting online table reservations.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReservationsEnabled(!reservationsEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        reservationsEnabled ? 'bg-emerald-700' : 'bg-red-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          reservationsEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reservation Closed Notice Textarea */}
                  <div className="space-y-2">
                    <label htmlFor="settings-reservations-notice" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                      RESERVATIONS CLOSED CUSTOM BANNER &amp; POPUP TEXT
                    </label>
                    <textarea
                      id="settings-reservations-notice"
                      rows={4}
                      required
                      value={reservationsNoticeText}
                      onChange={(e) => setReservationsNoticeText(e.target.value)}
                      className="w-full border border-brand-dark/10 p-4 text-xs font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none resize-y"
                      placeholder="e.g. Table reservations are temporarily closed. Please telephone us to book a table!"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 3: ANNOUNCEMENTS & TIMINGS */}
            {settingsSubTab === 'announcements' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                
                {/* COLUMN 1: POPUP NOTICE MESSAGE */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-brand-dark border-b border-brand-dark/5 pb-2">
                      Popup Timing Notice
                    </h3>
                    <p className="text-xs text-brand-muted leading-relaxed font-sans font-normal">
                      Customize the temporary under-construction notice that pops up on both the homepage and takeaway ordering page.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Enabled Toggle */}
                    <div className="flex items-center justify-between border border-brand-dark/10 p-4 bg-brand-beige/5">
                      <div className="space-y-0.5">
                        <span className="block font-mono text-xs text-brand-dark font-bold uppercase tracking-wider">
                          SHOW POPUP ON LANDING PAGE
                        </span>
                        <span className="block text-[11px] text-brand-muted font-sans font-normal">
                          When enabled, the under-construction dialog pops up automatically.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNoticeEnabled(!noticeEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          noticeEnabled ? 'bg-brand-accent' : 'bg-brand-dark/15'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            noticeEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Text Description */}
                    <div className="space-y-1">
                      <label htmlFor="settings-notice-text" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                        NOTICE DESCRIPTION TEXT
                      </label>
                      <textarea
                        id="settings-notice-text"
                        rows={3}
                        required
                        value={noticeText}
                        onChange={(e) => setNoticeText(e.target.value)}
                        className="w-full border border-brand-dark/10 p-3 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none resize-none"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div className="space-y-1">
                      <label htmlFor="settings-notice-phone" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                        DIRECT CALL NUMBER
                      </label>
                      <input
                        id="settings-notice-phone"
                        type="text"
                        required
                        value={noticePhone}
                        onChange={(e) => setNoticePhone(e.target.value)}
                        className="w-full border border-brand-dark/10 p-2.5 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none"
                      />
                    </div>

                    {/* Booking Page Specific Notice */}
                    <div className="border-t border-brand-dark/10 pt-4 mt-4 space-y-4">
                      <h4 className="font-serif text-sm font-bold text-brand-dark uppercase">
                        Book Table / Functions Specific Notice
                      </h4>
                      
                      <div className="flex items-center justify-between border border-brand-dark/10 p-4 bg-brand-beige/5">
                        <div className="space-y-0.5">
                          <span className="block font-mono text-xs text-brand-dark font-bold uppercase tracking-wider">
                            SHOW POPUP ON BOOKING PAGE
                          </span>
                          <span className="block text-[11px] text-brand-muted font-sans font-normal">
                            When enabled, the custom timing notice pops up automatically on the Book Table / Functions page.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBookingNoticeEnabled(!bookingNoticeEnabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            bookingNoticeEnabled ? 'bg-brand-accent' : 'bg-brand-dark/15'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              bookingNoticeEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="settings-booking-notice-text" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                          BOOKING NOTICE DESCRIPTION TEXT
                        </label>
                        <textarea
                          id="settings-booking-notice-text"
                          rows={6}
                          required
                          value={bookingNoticeText}
                          onChange={(e) => setBookingNoticeText(e.target.value)}
                          className="w-full border border-brand-dark/10 p-3 text-xs font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: WEEKLY OPENING TIMINGS */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-brand-dark border-b border-brand-dark/5 pb-2">
                      Weekly Opening Timings
                    </h3>
                    <p className="text-xs text-brand-muted leading-relaxed font-sans font-normal">
                      Modify the hours schedule presented inside the Opening Hours widget on the landing page.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderTimingField('time-mon', timingMonday, setTimingMonday, 'MONDAY HOURS')}
                    {renderTimingField('time-tue', timingTuesday, setTimingTuesday, 'TUESDAY HOURS')}
                    {renderTimingField('time-wed', timingWednesday, setTimingWednesday, 'WEDNESDAY HOURS')}
                    {renderTimingField('time-thu', timingThursday, setTimingThursday, 'THURSDAY HOURS')}
                    {renderTimingField('time-fri', timingFriday, setTimingFriday, 'FRIDAY HOURS')}
                    {renderTimingField('time-sat', timingSaturday, setTimingSaturday, 'SATURDAY HOURS')}
                    {renderTimingField('time-sun', timingSunday, setTimingSunday, 'SUNDAY HOURS')}
                    <div className="space-y-1">
                      <label htmlFor="time-offset" className="block font-mono text-[10px] text-brand-muted uppercase font-bold">WARNING OFFSET LABEL</label>
                      <input
                        id="time-offset"
                        type="text"
                        required
                        value={timingOffset}
                        onChange={(e) => setTimingOffset(e.target.value)}
                        className="w-full border border-brand-dark/10 p-2 text-xs font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 4: FESTIVE OFFER SETTINGS */}
            {settingsSubTab === 'festive' && (
              <div className="space-y-6 animate-fade-in max-w-4xl">
                <div className="space-y-2 border-b border-brand-dark/5 pb-4">
                  <h3 className="font-serif text-lg font-bold text-brand-dark flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-accent" />
                    Limited Time Festive Offer Editor
                  </h3>
                  <p className="text-xs text-brand-muted leading-relaxed font-sans font-normal">
                    Manage the Bank Holiday / Festive event platter section displayed prominently at the top of the landing page.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Basic Details */}
                  <div className="lg:col-span-6 space-y-5">
                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between border border-brand-dark/10 p-5 bg-[#FDFBF7]">
                      <div className="space-y-1">
                        <span className="block font-mono text-xs text-brand-dark font-bold uppercase tracking-wider">
                          DISPLAY ON LANDING PAGE
                        </span>
                        <span className="block text-[11px] text-brand-muted font-sans font-normal">
                          Toggle to show or hide the festive promotion block on the main page.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFestiveEnabled(!festiveEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          festiveEnabled ? 'bg-emerald-700' : 'bg-brand-dark/15'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            festiveEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Festive Header / Title */}
                    <div className="space-y-1">
                      <label htmlFor="settings-festive-header" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                        Festive Header / Title
                      </label>
                      <input
                        id="settings-festive-header"
                        type="text"
                        required
                        value={festiveHeader}
                        onChange={(e) => setFestiveHeader(e.target.value)}
                        className="w-full border border-brand-dark/10 p-3 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none"
                        placeholder="e.g. BANK HOLIDAY WEEKEND"
                      />
                    </div>

                    {/* Subheader / Run Times */}
                    <div className="space-y-1">
                      <label htmlFor="settings-festive-subheader" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                        Subheader / Run Days
                      </label>
                      <input
                        id="settings-festive-subheader"
                        type="text"
                        required
                        value={festiveSubheader}
                        onChange={(e) => setFestiveSubheader(e.target.value)}
                        className="w-full border border-brand-dark/10 p-3 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none"
                        placeholder="e.g. Running: Thursday — Friday — Monday"
                      />
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                      <label htmlFor="settings-festive-price" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                        Offer Price (&euro;)
                      </label>
                      <input
                        id="settings-festive-price"
                        type="text"
                        required
                        value={festivePrice}
                        onChange={(e) => setFestivePrice(e.target.value)}
                        className="w-full border border-brand-dark/10 p-3 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none"
                        placeholder="e.g. 35.00"
                      />
                    </div>
                  </div>

                  {/* Right Column: Description & Items */}
                  <div className="lg:col-span-6 space-y-5">
                    {/* Offer Description */}
                    <div className="space-y-1">
                      <label htmlFor="settings-festive-desc" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                        Main Offer Description
                      </label>
                      <textarea
                        id="settings-festive-desc"
                        rows={3}
                        required
                        value={festiveDescription}
                        onChange={(e) => setFestiveDescription(e.target.value)}
                        className="w-full border border-brand-dark/10 p-3 text-xs font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none resize-none"
                        placeholder="Celebrate the festive weekend with..."
                      />
                    </div>

                    {/* Platter Items Editor */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <label htmlFor="settings-festive-items" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                          Platter Items List
                        </label>
                        <span className="text-[10px] font-mono text-brand-muted uppercase">Format: Name | Description</span>
                      </div>
                      <textarea
                        id="settings-festive-items"
                        rows={8}
                        required
                        value={festiveItems}
                        onChange={(e) => setFestiveItems(e.target.value)}
                        className="w-full border border-brand-dark/10 p-3 text-xs font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none resize-y"
                        placeholder="Beef Nihari | Slow-cooked beef shank..."
                      />
                      <span className="block text-[10px] text-brand-muted leading-relaxed font-sans font-normal mt-1">
                        * Input each platter item on a new line. Separate the item name and its description with a vertical pipe character (<code>|</code>).
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-brand-dark/10 flex justify-end">
              <button
                type="submit"
                className="bg-brand-accent text-white hover:bg-brand-dark px-8 py-3.5 text-sm font-mono font-bold uppercase tracking-wider transition-colors rounded-none"
              >
                SAVE CONFIGURATIONS &amp; UPDATE LANDING
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 2.5. TAB: FUNCTIONS & BANQUETS MANAGER */}
      {adminTab === 'functions' && (() => {
        const functionsList = bookings.filter(b => 
          b.id.startsWith('FUNC') || 
          b.diningArea.includes('Private Hall') || 
          b.partySize >= 12
        );
        return (
          <div className="bg-white border border-brand-dark/10 p-6 space-y-8 animate-fade-in text-left" id="admin-functions-tab">
            
            <div className="border-b border-brand-dark/5 pb-4 flex justify-between items-center">
              <h2 className="font-serif text-xl font-bold text-brand-dark flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-brand-accent animate-pulse" />
                Functions &amp; Large Banquets Manager
              </h2>
              <span className="font-mono text-xs text-brand-muted bg-brand-dark/5 px-2 py-0.5 border border-brand-dark/5">
                {functionsList.length} Registered Events
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Create a New Function Booking Form */}
              <form onSubmit={handleCreateFunction} className="lg:col-span-5 bg-brand-beige/5 border border-brand-dark/10 p-6 space-y-4">
                <h3 className="font-serif text-lg font-bold text-brand-dark border-b border-brand-dark/5 pb-2">
                  Register New Private Function
                </h3>

                {funcSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-mono border border-emerald-200">
                    ✓ FUNCTION EVENT REGISTERED SUCCESSFULLY!
                  </div>
                )}

                {funcError && (
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs font-mono border border-amber-200">
                    ⚠ {funcError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block font-mono text-[10px] text-brand-accent uppercase tracking-widest font-bold">
                    Event / Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanveer Birthday Bash"
                    value={funcName}
                    onChange={(e) => setFuncName(e.target.value)}
                    className="w-full border border-brand-dark/10 p-2.5 text-xs font-mono focus:border-brand-dark outline-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] text-brand-accent uppercase tracking-widest font-bold">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="customer@email.com"
                      value={funcEmail}
                      onChange={(e) => setFuncEmail(e.target.value)}
                      className="w-full border border-brand-dark/10 p-2.5 text-xs font-mono focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] text-brand-accent uppercase tracking-widest font-bold">
                      Telephone
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="089 489 9950"
                      value={funcPhone}
                      onChange={(e) => setFuncPhone(e.target.value)}
                      className="w-full border border-brand-dark/10 p-2.5 text-xs font-mono focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] text-brand-accent uppercase tracking-widest font-bold">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={funcDate}
                      onChange={(e) => setFuncDate(e.target.value)}
                      className="w-full border border-brand-dark/10 p-2.5 text-xs font-mono focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] text-brand-accent uppercase tracking-widest font-bold">
                      Time Slot
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 18:00"
                      value={funcTime}
                      onChange={(e) => setFuncTime(e.target.value)}
                      className="w-full border border-brand-dark/10 p-2.5 text-xs font-mono focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] text-brand-accent uppercase tracking-widest font-bold">
                      Guests (Pax)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="150"
                      required
                      value={funcGuests}
                      onChange={(e) => setFuncGuests(parseInt(e.target.value) || 15)}
                      className="w-full border border-brand-dark/10 p-2.5 text-xs font-mono focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] text-brand-accent uppercase tracking-widest font-bold">
                      Dining Layout Area
                    </label>
                    <select
                      value={funcArea}
                      onChange={(e) => setFuncArea(e.target.value)}
                      className="w-full border border-brand-dark/10 p-2.5 text-xs font-mono focus:border-brand-dark outline-none bg-white"
                    >
                      <option value="Private Hall (Up to 50)">Private Vault (Up to 50)</option>
                      <option value="Indoor">Indoor Main Hall</option>
                      <option value="Outdoor Garden">Outdoor Zen Garden</option>
                      <option value="Whole Restaurant Venue">Whole Restaurant Venue (100+)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] text-brand-accent uppercase tracking-widest font-bold">
                      Catering Package
                    </label>
                    <select
                      value={funcPackage}
                      onChange={(e) => setFuncPackage(e.target.value)}
                      className="w-full border border-brand-dark/10 p-2.5 text-xs font-mono focus:border-brand-dark outline-none bg-white"
                    >
                      <option value="Custom Karahi Feast">Custom Karahi Feast</option>
                      <option value="Pakistani Banquet Feast (Silver)">Pakistani Banquet Feast (Silver)</option>
                      <option value="Royal Tandoori Buffet (Gold)">Royal Tandoori Buffet (Gold)</option>
                      <option value="Mughlai Barbecue Buffet">Mughlai Barbecue Buffet</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-[10px] text-brand-accent uppercase tracking-widest font-bold">
                    Special Requests / Setup Requirements
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Need sound system, mic, customized balloon arches, or vegetarian specific buffet options..."
                    value={funcRequests}
                    onChange={(e) => setFuncRequests(e.target.value)}
                    className="w-full border border-brand-dark/10 p-2.5 text-xs font-mono focus:border-brand-dark outline-none bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-accent hover:bg-brand-dark text-white py-3 text-xs font-mono uppercase tracking-widest font-bold transition-all rounded-none"
                >
                  CONFIRM &amp; BOOK PRIVATE EVENT
                </button>
              </form>

              {/* Registered Functions Event List Display */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="font-serif text-lg font-bold text-brand-dark border-b border-brand-dark/5 pb-2">
                  Upcoming Registered Functions List
                </h3>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {functionsList.length === 0 ? (
                    <p className="text-sm font-mono text-brand-muted italic text-center py-20 bg-brand-beige/5 border border-brand-dark/5">
                      No private functions or large banquets registered.
                    </p>
                  ) : (
                    functionsList.map((fn) => {
                      const isCancelled = fn.status === 'Cancelled';
                      return (
                        <div key={fn.id} className={`p-4 border border-brand-dark/15 hover:border-brand-dark bg-[#FDFBF7]/40 space-y-3 relative transition-all ${isCancelled ? 'opacity-40' : ''}`}>
                          <div className="flex justify-between items-start font-mono text-xs">
                            <div>
                              <span className="font-bold text-brand-dark block">EVENT ID: {fn.id}</span>
                              <span className="text-[10px] text-brand-muted">Registered: {new Date(fn.createdAt).toLocaleDateString()}</span>
                            </div>
                            <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase ${
                              isCancelled
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : fn.status === 'Pending'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {fn.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-brand-muted border-t border-b border-brand-dark/5 py-2">
                            <div>
                              <span className="font-bold text-brand-dark block">{fn.name}</span>
                              <span className="block">{fn.email}</span>
                              <span className="underline block">{fn.phone}</span>
                            </div>
                            <div>
                              <div>Date: <span className="font-bold text-brand-dark">{fn.date}</span></div>
                              <div>Time: <span className="font-bold text-brand-dark">{fn.time}</span></div>
                              <div>Guests: <span className="font-bold text-brand-accent">{fn.partySize} Pax</span></div>
                              <div>Area: <span className="font-bold text-brand-dark">{fn.diningArea}</span></div>
                            </div>
                          </div>

                          {fn.specialRequests && (
                            <div className="p-2.5 bg-brand-beige border border-brand-dark/5 text-[11px] font-sans text-brand-dark/80 italic leading-relaxed">
                              {fn.specialRequests}
                            </div>
                          )}

                          <div className="flex justify-end gap-2 items-center">
                            {fn.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(fn.id, 'Confirmed', true)}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 font-mono text-[10px] font-bold uppercase rounded-none transition-all border border-emerald-800"
                                >
                                  CONFIRM &amp; EMAIL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(fn.id, 'Cancelled')}
                                  className="border border-red-200 hover:border-red-600 text-red-600 px-3 py-1 font-mono text-[10px] font-bold uppercase rounded-none transition-all"
                                >
                                  CANCEL EVENT
                                </button>
                              </>
                            )}
                            {fn.status === 'Confirmed' && (
                              <>
                                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 border border-emerald-300 uppercase tracking-wider">
                                  ✓ CONFIRMED (DONE)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(fn.id, 'Confirmed', true)}
                                  className="border border-brand-dark/15 hover:border-brand-dark text-brand-dark px-3 py-1 font-mono text-[10px] font-bold uppercase rounded-none transition-all"
                                >
                                  RESEND EMAIL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(fn.id, 'Cancelled')}
                                  className="border border-red-200 hover:border-red-600 text-red-600 px-3 py-1 font-mono text-[10px] font-bold uppercase rounded-none transition-all"
                                >
                                  CANCEL EVENT
                                </button>
                              </>
                            )}
                            {fn.status === 'Cancelled' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateBookingStatus(fn.id, 'Confirmed')}
                                className="border border-brand-dark/15 hover:border-brand-dark text-brand-dark px-3 py-1 font-mono text-[10px] font-bold uppercase rounded-none transition-all"
                              >
                                RESTORE EVENT
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
};
