import { PROMO_CODES, evaluatePromoCode } from '../../src/utils/promoCodes.js';

/**
 * Evaluates a promo code or database voucher against the order subtotal.
 * Supports both static PROMO_CODES (e.g. 10CLAYOVEN) and DB-backed one-time/multi-use vouchers.
 *
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} db
 * @param {string | null | undefined} rawCode
 * @param {number} subtotal
 */
export async function evaluateVoucherOrPromo(db, rawCode, subtotal) {
  const normalized = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  if (!normalized) {
    return {
      valid: false,
      source: null,
      code: null,
      discountAmount: 0,
      discountType: 'percent',
      discountValue: 0,
      minSubtotal: 0,
      isOneTime: false,
      description: null,
      error: null,
    };
  }

  // 1. Check static promo registry first (e.g. 10CLAYOVEN)
  if (PROMO_CODES[normalized]) {
    const staticResult = evaluatePromoCode(normalized, subtotal);
    const rule = PROMO_CODES[normalized];
    return {
      valid: staticResult.valid,
      source: 'static',
      code: staticResult.code,
      discountAmount: staticResult.discountAmount,
      discountType: 'percent',
      discountValue: rule.discountPercent,
      minSubtotal: rule.minSubtotal,
      isOneTime: false,
      description: rule.description,
      error: staticResult.error,
    };
  }

  // 2. Check database vouchers table
  const [rows] = await db.query('SELECT * FROM vouchers WHERE code = ? LIMIT 1', [normalized]);
  if (rows.length === 0) {
    return {
      valid: false,
      source: 'db',
      code: null,
      discountAmount: 0,
      discountType: 'percent',
      discountValue: 0,
      minSubtotal: 0,
      isOneTime: false,
      description: null,
      error: `Voucher or promo code "${normalized}" is invalid.`,
    };
  }

  const voucher = rows[0];
  if (!voucher.is_active) {
    return {
      valid: false,
      source: 'db',
      code: null,
      discountAmount: 0,
      discountType: voucher.discount_type,
      discountValue: Number(voucher.discount_value),
      minSubtotal: Number(voucher.min_subtotal) || 0,
      isOneTime: Boolean(voucher.is_one_time),
      description: null,
      error: `Voucher "${normalized}" is currently disabled.`,
    };
  }

  if (voucher.expires_at && new Date(voucher.expires_at).getTime() < Date.now()) {
    return {
      valid: false,
      source: 'db',
      code: null,
      discountAmount: 0,
      discountType: voucher.discount_type,
      discountValue: Number(voucher.discount_value),
      minSubtotal: Number(voucher.min_subtotal) || 0,
      isOneTime: Boolean(voucher.is_one_time),
      description: null,
      error: `Voucher "${normalized}" has expired.`,
    };
  }

  if (voucher.is_one_time && voucher.used_at !== null) {
    return {
      valid: false,
      source: 'db',
      code: null,
      discountAmount: 0,
      discountType: voucher.discount_type,
      discountValue: Number(voucher.discount_value),
      minSubtotal: Number(voucher.min_subtotal) || 0,
      isOneTime: true,
      description: null,
      error: `Voucher "${normalized}" has already been redeemed.`,
    };
  }

  const numericSubtotal = Number(subtotal) || 0;
  const minSubtotal = Number(voucher.min_subtotal) || 0;
  if (numericSubtotal < minSubtotal) {
    return {
      valid: false,
      source: 'db',
      code: null,
      discountAmount: 0,
      discountType: voucher.discount_type,
      discountValue: Number(voucher.discount_value),
      minSubtotal,
      isOneTime: Boolean(voucher.is_one_time),
      description: null,
      error: `Minimum menu subtotal of €${minSubtotal.toFixed(2)} is required for voucher ${voucher.code} (current: €${numericSubtotal.toFixed(2)}).`,
    };
  }

  const discountValue = Number(voucher.discount_value) || 0;
  const discountAmount =
    voucher.discount_type === 'fixed'
      ? Number(Math.min(numericSubtotal, discountValue).toFixed(2))
      : Number(((numericSubtotal * discountValue) / 100).toFixed(2));

  const label =
    voucher.discount_type === 'fixed'
      ? `€${discountValue.toFixed(2)} off`
      : `${discountValue}% off`;

  return {
    valid: true,
    source: 'db',
    voucherId: voucher.id,
    code: voucher.code,
    discountAmount,
    discountType: voucher.discount_type,
    discountValue,
    minSubtotal,
    isOneTime: Boolean(voucher.is_one_time),
    description: label,
    error: null,
  };
}
