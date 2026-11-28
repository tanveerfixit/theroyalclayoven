import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Tag, Plus, Search, RefreshCw, Copy, Check, Trash2, Loader2,
  CheckCircle2, Ban, Clock, Mail, ShoppingBag, Sparkles
} from 'lucide-react';
import { Voucher } from '../types';

interface AdminVouchersTabProps {
  adminHeaders: (extra?: Record<string, string>) => Record<string, string>;
  onUnauthorized: () => void;
  onNotify: (payload: { isOpen: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }) => void;
  onViewOrder?: (orderId: string) => void;
}

export const AdminVouchersTab: React.FC<AdminVouchersTabProps> = ({
  adminHeaders,
  onUnauthorized,
  onNotify,
  onViewOrder,
}) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'used' | 'disabled' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Keep latest callbacks in refs so polling re-renders of AdminDashboard don't trigger redundant voucher fetches
  const adminHeadersRef = useRef(adminHeaders);
  adminHeadersRef.current = adminHeaders;
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Create form state
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [code, setCode] = useState('');
  const [prefix, setPrefix] = useState('RCO');
  const [count, setCount] = useState(10);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('10');
  const [minSubtotal, setMinSubtotal] = useState('0');
  const [isOneTime, setIsOneTime] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastCreatedCodes, setLastCreatedCodes] = useState<string[]>([]);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('q', debouncedSearch);

      const res = await fetch(`/api/admin/vouchers?${params.toString()}`, {
        headers: adminHeadersRef.current(),
      });
      if (res.status === 401) {
        onUnauthorizedRef.current();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setVouchers(data.vouchers || []);
      }
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericDiscount = parseFloat(discountValue);
    if (!Number.isFinite(numericDiscount) || numericDiscount <= 0) {
      onNotify({
        isOpen: true,
        type: 'error',
        title: 'Invalid Discount',
        message: 'Please enter a positive discount value.',
      });
      return;
    }

    setSubmitting(true);
    setLastCreatedCodes([]);
    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          code: mode === 'single' ? code.trim().toUpperCase() : undefined,
          prefix: mode === 'bulk' ? prefix.trim().toUpperCase() : 'RCO',
          count: mode === 'bulk' ? count : 1,
          discountType,
          discountValue: numericDiscount,
          minSubtotal: parseFloat(minSubtotal) || 0,
          isOneTime,
          expiresAt: expiresAt || null,
          note: note.trim() || null,
        }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        onNotify({
          isOpen: true,
          type: 'error',
          title: 'Voucher Creation Failed',
          message: data.error || 'Could not create voucher.',
        });
        return;
      }

      setLastCreatedCodes(data.codes || []);
      setCode('');
      setNote('');
      onNotify({
        isOpen: true,
        type: 'success',
        title: 'Vouchers Created',
        message: data.message || 'Voucher created successfully.',
      });
      await fetchVouchers();
    } catch (err) {
      console.error('Error creating voucher:', err);
      onNotify({
        isOpen: true,
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to connect to server while creating voucher.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const res = await fetch(`/api/admin/vouchers/${voucher.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ isActive: !voucher.isActive }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        await fetchVouchers();
      }
    } catch (err) {
      console.error('Failed to toggle voucher:', err);
    }
  };

  const handleDelete = async (voucher: Voucher) => {
    if (!window.confirm(`Delete unused voucher "${voucher.code}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/vouchers/${voucher.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        onNotify({
          isOpen: true,
          type: 'error',
          title: 'Cannot Delete',
          message: data.error || 'Failed to delete voucher.',
        });
        return;
      }
      onNotify({
        isOpen: true,
        type: 'success',
        title: 'Voucher Deleted',
        message: `Removed unused voucher ${voucher.code}.`,
      });
      await fetchVouchers();
    } catch (err) {
      console.error('Failed to delete voucher:', err);
    }
  };

  const getVoucherStatus = (v: Voucher) => {
    if (v.usedAt) return { label: 'Used', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (!v.isActive) return { label: 'Disabled', badge: 'bg-stone-100 text-stone-600 border-stone-200' };
    if (v.expiresAt && new Date(v.expiresAt).getTime() < Date.now()) {
      return { label: 'Expired', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: 'Available', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Create Voucher Panel */}
      <div className="bg-white border border-brand-dark/15 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-dark/10 pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-brand-dark flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-accent" />
              <span>Create One-Time &amp; Promo Vouchers</span>
            </h3>
            <p className="text-xs text-brand-muted mt-0.5">
              Generate single or bulk codes. Once redeemed at checkout, the customer email and order ID are logged below.
            </p>
          </div>
          <div className="flex bg-brand-beige/60 p-1 border border-brand-dark/10 shrink-0">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-colors ${
                mode === 'single' ? 'bg-brand-dark text-white' : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              Single Code
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-colors ${
                mode === 'bulk' ? 'bg-brand-dark text-white' : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              Bulk Generate
            </button>
          </div>
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {mode === 'single' ? (
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted font-bold mb-1">
                Voucher Code (blank = auto)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. VIP10 or blank"
                className="w-full border border-brand-dark/20 px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted font-bold mb-1">
                  Code Prefix
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="RCO"
                  className="w-full border border-brand-dark/20 px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted font-bold mb-1">
                  Quantity (1–100)
                </label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(Math.min(100, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                  className="w-full border border-brand-dark/20 px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand-accent"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted font-bold mb-1">
              Discount Type
            </label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
              className="w-full border border-brand-dark/20 px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:border-brand-accent"
            >
              <option value="percent">Percentage (% off)</option>
              <option value="fixed">Fixed Amount (€ off)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted font-bold mb-1">
              {discountType === 'percent' ? 'Discount (%)' : 'Discount (€)'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={discountType === 'percent' ? '100' : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
              className="w-full border border-brand-dark/20 px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted font-bold mb-1">
              Min Order Subtotal (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value)}
              className="w-full border border-brand-dark/20 px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted font-bold mb-1">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-brand-dark/20 px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand-accent"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-brand-muted font-bold mb-1">
              Internal Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Flyer campaign / Customer goodwill"
              className="w-full border border-brand-dark/20 px-3 py-2 text-xs focus:outline-none focus:border-brand-accent"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-mono text-brand-dark cursor-pointer">
              <input
                type="checkbox"
                checked={isOneTime}
                onChange={(e) => setIsOneTime(e.target.checked)}
                className="w-4 h-4 accent-brand-accent"
              />
              <span>One-time use only (automatically locks after 1 order)</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-accent hover:bg-brand-dark text-white px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{mode === 'bulk' ? `Generate ${count} Vouchers` : 'Create Voucher'}</span>
            </button>
          </div>
        </form>

        {lastCreatedCodes.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Generated {lastCreatedCodes.length} code{lastCreatedCodes.length > 1 ? 's' : ''}:
              </span>
              <button
                type="button"
                onClick={() => handleCopy(lastCreatedCodes.join('\n'))}
                className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copy All</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {lastCreatedCodes.map((c) => (
                <span key={c} className="font-mono text-[11px] bg-white border border-emerald-200 px-2 py-0.5 text-emerald-950">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-brand-dark/15 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'available', 'used', 'disabled', 'expired'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 text-[11px] font-mono font-bold uppercase transition-colors ${
                statusFilter === tab
                  ? 'bg-brand-dark text-white'
                  : 'bg-brand-beige/60 text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-brand-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, email, or order ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-brand-dark/20 focus:outline-none focus:border-brand-accent"
            />
          </div>
          <button
            type="button"
            onClick={fetchVouchers}
            className="p-2 border border-brand-dark/20 hover:bg-brand-beige/50 text-brand-dark"
            title="Refresh vouchers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Vouchers Audit Table */}
      <div className="bg-white border border-brand-dark/15 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[780px]">
          <thead>
            <tr className="border-b border-brand-dark/10 bg-brand-beige/40 font-mono text-[11px] uppercase tracking-wider text-brand-muted">
              <th className="p-3">Voucher Code</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Redeemed By (Email &amp; Order)</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-dark/10 text-xs">
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-brand-muted font-mono">
                  {loading ? 'Loading vouchers...' : 'No vouchers match the current filter.'}
                </td>
              </tr>
            ) : (
              vouchers.map((v) => {
                const st = getVoucherStatus(v);
                return (
                  <tr key={v.id} className="hover:bg-brand-beige/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-brand-dark">{v.code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(v.code)}
                          className="text-brand-muted hover:text-brand-dark p-1"
                          title="Copy code"
                        >
                          {copiedCode === v.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {v.note && <p className="text-[11px] text-brand-muted mt-0.5">{v.note}</p>}
                    </td>
                    <td className="p-3 font-mono">
                      <span className="font-bold text-brand-dark">
                        {v.discountType === 'fixed' ? `€${v.discountValue.toFixed(2)}` : `${v.discountValue}%`}
                      </span>
                      {v.minSubtotal > 0 && (
                        <span className="block text-[11px] text-brand-muted">Min €{v.minSubtotal.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {v.isOneTime ? 'One-Time' : 'Multi-Use'}
                      {v.expiresAt && (
                        <span className="block text-brand-muted">
                          Exp: {new Date(v.expiresAt).toLocaleDateString('en-IE')}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[11px] font-mono font-bold uppercase ${st.badge}`}>
                        {st.label === 'Used' && <CheckCircle2 className="w-3 h-3" />}
                        {st.label === 'Disabled' && <Ban className="w-3 h-3" />}
                        {st.label === 'Expired' && <Clock className="w-3 h-3" />}
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3">
                      {v.usedAt ? (
                        <div className="space-y-0.5">
                          {v.usedByEmail && (
                            <div className="flex items-center gap-1.5 font-mono text-brand-dark font-medium">
                              <Mail className="w-3 h-3 text-brand-accent shrink-0" />
                              <span>{v.usedByEmail}</span>
                            </div>
                          )}
                          {v.usedOrderId && (
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <ShoppingBag className="w-3 h-3 text-brand-muted shrink-0" />
                              {onViewOrder ? (
                                <button
                                  type="button"
                                  onClick={() => onViewOrder(v.usedOrderId!)}
                                  className="text-brand-accent hover:underline font-bold"
                                >
                                  {v.usedOrderId}
                                </button>
                              ) : (
                                <span className="text-brand-dark">{v.usedOrderId}</span>
                              )}
                              <span className="text-brand-muted">
                                &bull; {new Date(v.usedAt).toLocaleString('en-IE')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-brand-muted font-mono text-[11px]">Not redeemed yet</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {!v.usedAt && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(v)}
                              className="px-2 py-1 border border-brand-dark/20 text-[11px] font-mono uppercase hover:bg-brand-beige/60"
                            >
                              {v.isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(v)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200"
                              title="Delete unused voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
