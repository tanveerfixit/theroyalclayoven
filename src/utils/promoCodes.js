/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Registry of supported checkout promo codes.
 * Add new codes here to make them available on both frontend and backend.
 */
export const PROMO_CODES = {
  '10CLAYOVEN': {
    code: '10CLAYOVEN',
    discountPercent: 10,
    minSubtotal: 15.0,
    description: '10% off orders with a €15.00+ menu subtotal',
  },
};

/**
 * Validates a promo code against the menu subtotal and computes the discount amount.
 *
 * @param {string | null | undefined} rawCode
 * @param {number} subtotal
 * @returns {{ valid: boolean, code: string | null, discountAmount: number, discountPercent: number, error: string | null }}
 */
export function evaluatePromoCode(rawCode, subtotal) {
  const normalized = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  if (!normalized) {
    return { valid: false, code: null, discountAmount: 0, discountPercent: 0, error: null };
  }

  const rule = PROMO_CODES[normalized];
  if (!rule) {
    return {
      valid: false,
      code: null,
      discountAmount: 0,
      discountPercent: 0,
      error: `Promo code "${normalized}" is invalid.`,
    };
  }

  const numericSubtotal = Number(subtotal) || 0;
  if (numericSubtotal < rule.minSubtotal) {
    return {
      valid: false,
      code: null,
      discountAmount: 0,
      discountPercent: 0,
      error: `Minimum menu subtotal of €${rule.minSubtotal.toFixed(2)} is required for code ${rule.code} (current: €${numericSubtotal.toFixed(2)}).`,
    };
  }

  const discountAmount = Number(((numericSubtotal * rule.discountPercent) / 100).toFixed(2));
  return {
    valid: true,
    code: rule.code,
    discountAmount,
    discountPercent: rule.discountPercent,
    error: null,
  };
}
