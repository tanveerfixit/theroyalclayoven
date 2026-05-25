import React, { useState, useEffect, useRef } from 'react';
import { Play, Check, X, ShieldAlert, ShoppingBag, Calendar, ListFilter, Search, RefreshCw, Volume2, ShieldCheck } from 'lucide-react';
import { Order, Reservation } from '../types';
import { MENU_ITEMS, CATEGORIES } from '../data/menu';

export const AdminDashboard: React.FC = () => {
  // Authentication states
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Console active sub-tabs
  const [adminTab, setAdminTab] = useState<'orders' | 'bookings' | 'catalog'>('orders');

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
        fetch('/api/admin/orders'),
        fetch('/api/admin/bookings')
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
  const handleUpdateBookingStatus = async (bookingId: string, nextStatus: Reservation['status']) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: nextStatus } : b));
      }
    } catch (err) {
      console.error('Failed to update booking status', err);
    }
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
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {!isCancelled ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingStatus(b.id, 'Cancelled')}
                              className="border border-red-200 hover:border-red-600 text-red-600 px-2 py-1 font-bold uppercase rounded-none transition-all active:scale-95"
                            >
                              CANCEL
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingStatus(b.id, 'Confirmed')}
                              className="border border-brand-dark/15 hover:border-brand-dark text-brand-dark px-2 py-1 font-bold uppercase rounded-none transition-all active:scale-95"
                            >
                              RESTORE
                            </button>
                          )}
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

    </div>
  );
};
