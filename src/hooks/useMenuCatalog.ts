/**
 * useMenuCatalog — Shared hook for fetching the full menu catalog from the API.
 *
 * Replaces the identical fetch('/api/menu/full') logic duplicated across
 * OrderView.tsx, MenuView.tsx, and AdminDashboard.tsx.
 *
 * Returns the catalog data and a loading flag. Falls back to static seed
 * data (MENU_ITEMS / CATEGORIES) if the API is unreachable.
 */

import { useState, useEffect } from 'react';
import { MENU_ITEMS, CATEGORIES } from '../data/menu';
import type { MenuCategory, MenuItem, OptionGroup, MenuDeal } from '../types';

export interface MenuCatalog {
  categories: MenuCategory[];
  products: MenuItem[];
  optionGroups: OptionGroup[];
  deals: MenuDeal[];
  isLoading: boolean;
  error: string | null;
  /** Re-fetch the catalog (call after admin saves changes) */
  refresh: () => void;
}

/** Static seed fallback — mirrors the server initialisation categories */
const SEED_CATEGORIES: MenuCategory[] = CATEGORIES.map((name, i) => ({
  id: String(i + 1),
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  displayOrder: i,
  isActive: true,
}));

export function useMenuCatalog(): MenuCatalog {
  const [categories, setCategories] = useState<MenuCategory[]>(SEED_CATEGORIES);
  const [products, setProducts] = useState<MenuItem[]>(MENU_ITEMS);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [deals, setDeals] = useState<MenuDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchCatalog = async () => {
      try {
        const res = await fetch('/api/menu/full');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.categories?.length > 0) {
          setCategories(
            data.categories.map((c: any) => ({
              ...c,
              id: String(c.id),
              optionGroupIds: c.optionGroupIds?.map(String) ?? [],
            }))
          );
        }
        if (data.products?.length > 0) {
          setProducts(
            data.products
              .filter((p: any) => p.isActive !== false)
              .map((p: any) => ({
                ...p,
                id: String(p.id),
                categoryId: p.categoryId != null ? String(p.categoryId) : undefined,
                optionGroupIds: p.optionGroupIds?.map(String) ?? [],
              }))
          );
        }
        if (data.optionGroups) {
          setOptionGroups(
            data.optionGroups.map((g: any) => ({
              ...g,
              id: String(g.id),
              options: g.options?.map((o: any) => ({
                ...o,
                id: String(o.id),
                groupId: String(o.groupId ?? g.id),
              })) ?? [],
            }))
          );
        }
        if (data.deals) {
          setDeals(
            data.deals
              .filter((d: any) => d.isActive !== false)
              .map((d: any) => ({
                ...d,
                id: String(d.id),
                steps: d.steps?.map((s: any) => ({
                  ...s,
                  categoryId: s.categoryId != null ? String(s.categoryId) : undefined,
                })) ?? [],
              }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('useMenuCatalog: falling back to static catalog —', err);
          setError('Could not load menu from server. Showing local data.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchCatalog();
    return () => { cancelled = true; };
  }, [tick]);

  const refresh = () => setTick(t => t + 1);

  return { categories, products, optionGroups, deals, isLoading, error, refresh };
}
