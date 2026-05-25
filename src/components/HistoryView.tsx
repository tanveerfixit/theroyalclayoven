/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingBag, Calendar, Trash2, Clock, MapPin, Coffee, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Order, Reservation } from '../types';

export const HistoryView: React.FC<{ hideHeader?: boolean; showArchivedOnly?: boolean }> = ({ 
  hideHeader = false,
  showArchivedOnly = false
}) => {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [bookings, setBookings] = React.useState<Reservation[]>([]);

  const displayedOrders = orders.filter((o) => showArchivedOnly ? o.isArchived : !o.isArchived);

  React.useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const storedUser = localStorage.getItem('clay_oven_google_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const [ordersRes, bookingsRes] = await Promise.all([
          fetch(`/api/orders?email=${encodeURIComponent(user.email)}`),
          fetch(`/api/bookings?email=${encodeURIComponent(user.email)}`)
        ]);
        if (ordersRes.ok && bookingsRes.ok) {
          const ordersData = await ordersRes.json();
          const bookingsData = await bookingsRes.json();
          setOrders(ordersData);
          setBookings(bookingsData);
          return;
        }
      } catch (err) {
        console.error('Failed to fetch transactions from server', err);
      }
    }

    const storedOrders = localStorage.getItem('clay_oven_orders');
    const storedBookings = localStorage.getItem('clay_oven_bookings');
    
    if (storedOrders) setOrders(JSON.parse(storedOrders));
    if (storedBookings) setBookings(JSON.parse(storedBookings));
  };

  const handleCancelReservation = async (bookingId: string) => {
    if (!window.confirm('Do you genuinely wish to dismiss this dining reservation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      if (!response.ok) {
        throw new Error('Server update failed');
      }
    } catch (err) {
      console.error('Failed to cancel reservation on server', err);
    }

    const updated = bookings.map((bk) => 
      bk.id === bookingId ? { ...bk, status: 'Cancelled' as const } : bk
    );
    localStorage.setItem('clay_oven_bookings', JSON.stringify(updated));
    setBookings(updated);
  };

  const handleDeleteOrderLog = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order receipt from your history?')) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Server delete failed');
      }
    } catch (err) {
      console.error('Failed to delete order from server', err);
    }

    const updated = orders.filter((o) => o.id !== orderId);
    localStorage.setItem('clay_oven_orders', JSON.stringify(updated));
    setOrders(updated);
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-16 animate-fade-in ${hideHeader ? 'pt-2' : ''}`} id="history-view">
      
      {/* Overview Headings */}
      {!hideHeader && (
        <div className="text-center max-w-xl mx-auto pt-8 space-y-3">
          <span className="font-mono text-sm tracking-widest text-brand-accent uppercase font-bold px-2 py-0.5 bg-brand-dark/5 inline-block">
            PERSONAL DASHBOARD
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-dark">My Transactions</h1>
          <p className="text-sm text-brand-muted leading-relaxed font-normal">
            Monitor your active clay-oven deliveries, table reservations, and download dynamic receipts securely. Stored on your device browser state.
          </p>
        </div>
      )}

      <div className={showArchivedOnly ? "max-w-4xl mx-auto space-y-6" : "grid grid-cols-1 lg:grid-cols-2 gap-12"}>
        
        {/* COLUMN 1: TAKEAWAY ORDERS */}
        <section className="space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-brand-dark/10 pb-4">
            <ShoppingBag className="w-5 h-5 text-brand-accent" />
            <h2 className="font-serif text-xl font-bold text-brand-dark">Order Takeaway History</h2>
          </div>

          {displayedOrders.length === 0 ? (
            <div className="text-center py-16 bg-white border border-brand-dark/10 text-brand-muted space-y-2">
              <HelpCircle className="w-6 h-6 mx-auto text-brand-muted/50" />
              <p className="font-serif text-sm">
                {showArchivedOnly ? 'No archived order receipts in your history.' : 'No local takeaway orders placed yet.'}
              </p>
              <p className="font-mono text-xs uppercase text-brand-accent font-semibold">
                {showArchivedOnly ? 'Transactions you delete will be archived here.' : 'Start choosing food from the Takeaway tab.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4" id="orders-log-list">
              {displayedOrders.map((order) => (
                <div key={order.id} className="bg-white border border-brand-dark/10 p-6 space-y-4 relative">
                  
                  {/* Understated actions */}
                  <button
                    type="button"
                    onClick={() => handleDeleteOrderLog(order.id)}
                    className="absolute top-4 right-4 text-brand-muted hover:text-red-600 transition-colors"
                    title="Delete Receipt Log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-baseline justify-between pr-6">
                    <span className="font-mono text-sm font-bold text-brand-dark">
                      ORDER ID: {order.id}
                    </span>
                    <span className="font-mono text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 uppercase font-bold">
                      {order.status}
                    </span>
                  </div>

                  <div className="text-sm font-mono text-brand-muted space-y-2 py-1 border-t border-b border-brand-dark/5">
                    <div className="flex justify-between">
                      <span>Purchased Date</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fulfillment Type</span>
                      <span className="uppercase">{order.serviceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Preferred Time</span>
                      <span>{order.customerInfo.preferredTime}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <span className="font-serif font-bold text-brand-dark text-sm block">Items Configured:</span>
                    <ul className="space-y-1 font-mono text-sm text-brand-muted list-inside list-disc">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="truncate">
                          {item.quantity}x {item.name} {item.size ? `(${item.size})` : ''} 
                          {item.notes && <span className="text-brand-accent text-sm italic"> &mdash; &ldquo;{item.notes}&rdquo;</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-brand-dark/5 flex justify-between items-baseline font-mono text-sm">
                    <span className="text-brand-muted font-normal">Price Paid (incl. Packaging Fee)</span>
                    <span className="text-brand-dark font-bold text-base">&euro;{order.total.toFixed(2)}</span>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>

        {/* COLUMN 2: TABLE BOOKINGS */}
        {!showArchivedOnly && (
          <section className="space-y-6">
            <div className="flex items-center space-x-2.5 border-b border-brand-dark/10 pb-4">
              <Calendar className="w-5 h-5 text-brand-accent" />
              <h2 className="font-serif text-xl font-bold text-brand-dark">Dining Bookings Summary</h2>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-16 bg-white border border-brand-dark/10 text-brand-muted space-y-2">
                <HelpCircle className="w-6 h-6 mx-auto text-brand-muted/50" />
                <p className="font-serif text-sm">No active table reservations mapped.</p>
                <p className="font-mono text-xs uppercase text-brand-accent font-semibold">Reserve a sharp table slot directly.</p>
              </div>
            ) : (
              <div className="space-y-4" id="bookings-log-list">
                {bookings.map((booking) => {
                  const isCancelled = booking.status === 'Cancelled';
                  return (
                    <div key={booking.id} className={`bg-white border p-6 space-y-4 relative ${isCancelled ? 'border-brand-dark/5 opacity-60' : 'border-brand-dark/10'}`}>
                      
                      {/* Only show cancel logic if active */}
                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => handleCancelReservation(booking.id)}
                          className="absolute top-4 right-4 text-sm font-mono text-red-600 hover:text-red-800 uppercase flex items-center space-x-1 border border-red-200 hover:border-red-600 px-2 py-1"
                          title="Dismiss Table"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}

                      <div className="flex items-baseline justify-between pr-20">
                        <span className="font-mono text-sm font-bold text-brand-dark">
                          REF ID: {booking.id}
                        </span>
                        <span className={`font-mono text-sm border px-2 py-0.5 uppercase font-bold ${
                          isCancelled
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {booking.status}
                        </span>
                      </div>

                      <div className="text-sm font-mono text-brand-muted space-y-2 py-1 border-t border-b border-brand-dark/5">
                        <div className="flex justify-between">
                          <span>Dining Date</span>
                          <span className="text-brand-dark font-bold">{booking.date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Arrival Hour</span>
                          <span className="text-brand-dark font-bold">{booking.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Party Size</span>
                          <span className="text-brand-dark font-bold">{booking.partySize} Guests</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lounge Section</span>
                          <span className="text-brand-dark">{booking.diningArea}</span>
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="font-bold text-brand-dark block mb-1">Contact Registered:</span>
                        <p className="font-mono text-brand-muted underline text-sm">{booking.email} &bull; {booking.phone}</p>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>

    </div>
  );
};
